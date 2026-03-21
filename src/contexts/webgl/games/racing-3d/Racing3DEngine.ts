import type { GameInstance } from "@core/GameInterface";
import { createProgram, createBuffer, createVAO, Mat4 } from "@webgl/shared";
import { createCube, createPlane } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import {
	TRACK_WIDTH,
	MAX_SPEED,
	ACCELERATION,
	BRAKE_FORCE,
	STEER_SPEED,
	FRICTION,
	OFF_TRACK_FRICTION,
	AI_COUNT,
	TOTAL_LAPS,
	TRACK_WAYPOINTS,
	type Car,
	type Racing3DState,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class Racing3DEngine implements GameInstance {
	private gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private program: WebGLProgram;
	private cubeMesh: Mesh;
	private planeMesh: Mesh;

	private uModel: WebGLUniformLocation;
	private uView: WebGLUniformLocation;
	private uProjection: WebGLUniformLocation;
	private uLightDir: WebGLUniformLocation;
	private uColor: WebGLUniformLocation;
	private uCameraPos: WebGLUniformLocation;
	private uEmissive: WebGLUniformLocation;
	private uFogDensity: WebGLUniformLocation;

	private modelMatrix = Mat4.create();
	private viewMatrix = Mat4.create();
	private projMatrix = Mat4.create();

	private state: Racing3DState;
	private keys: Record<string, boolean> = {};

	private resizeHandler: () => void;
	private keyDownHandler: (e: KeyboardEvent) => void;
	private keyUpHandler: (e: KeyboardEvent) => void;
	private onExit: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.canvas = canvas;
		this.onExit = onExit;

		const gl = canvas.getContext("webgl2");

		if (!gl) throw new Error("WebGL2 not supported");

		this.gl = gl;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.program = createProgram(gl, VERT_SRC, FRAG_SRC);
		this.uModel = gl.getUniformLocation(this.program, "uModel")!;
		this.uView = gl.getUniformLocation(this.program, "uView")!;
		this.uProjection = gl.getUniformLocation(this.program, "uProjection")!;
		this.uLightDir = gl.getUniformLocation(this.program, "uLightDir")!;
		this.uColor = gl.getUniformLocation(this.program, "uColor")!;
		this.uCameraPos = gl.getUniformLocation(this.program, "uCameraPos")!;
		this.uEmissive = gl.getUniformLocation(this.program, "uEmissive")!;
		this.uFogDensity = gl.getUniformLocation(this.program, "uFogDensity")!;

		this.cubeMesh = this.buildMesh(gl, createCube(1));

		this.planeMesh = this.buildMesh(gl, createPlane(1, 1));

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.6, 0.75, 0.85, 1.0);

		this.state = this.createState();

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);
		};
		window.addEventListener("resize", this.resizeHandler);
		gl.viewport(0, 0, canvas.width, canvas.height);

		this.keyDownHandler = (e: KeyboardEvent) => {
			this.keys[e.code] = true;

			if (e.key === "Escape") {
				e.preventDefault();
				this.onExit();
			}

			if (
				(e.code === "Space" || e.code === "Enter") &&
				this.state.phase === "finished"
			) {
				this.state = this.createState();
			}
		};
		this.keyUpHandler = (e: KeyboardEvent) => {
			this.keys[e.code] = false;
		};
		window.addEventListener("keydown", this.keyDownHandler);
		window.addEventListener("keyup", this.keyUpHandler);
	}

	start(): void {
		this.running = true;
		this.lastTime = performance.now() / 1000;
		this.loop();
	}

	destroy(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		window.removeEventListener("resize", this.resizeHandler);
		window.removeEventListener("keydown", this.keyDownHandler);
		window.removeEventListener("keyup", this.keyUpHandler);
	}

	private loop(): void {
		if (!this.running) return;

		const now = performance.now() / 1000;
		const dt = Math.min(now - this.lastTime, 0.05);

		this.lastTime = now;
		this.update(dt);
		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	// ── State ────────────────────────────────────────────────────────────

	private createState(): Racing3DState {
		const wp = TRACK_WAYPOINTS[0];
		const wp1 = TRACK_WAYPOINTS[1];
		const startAngle = Math.atan2(wp1.z - wp.z, wp1.x - wp.x);

		const player: Car = {
			x: wp.x,
			z: wp.z,
			angle: startAngle,
			speed: 0,
			waypointIdx: 1,
			laps: 0,
			color: [0.2, 0.5, 1.0],
			isPlayer: true,
			name: "You",
			finished: false,
		};

		const aiColors: [number, number, number][] = [
			[1.0, 0.3, 0.2],
			[0.2, 0.8, 0.3],
			[1.0, 0.7, 0.1],
		];
		const aiCars: Car[] = [];

		for (let i = 0; i < AI_COUNT; i++) {
			const offset = (i + 1) * 3;

			aiCars.push({
				x: wp.x - Math.cos(startAngle) * offset + (i % 2 === 0 ? 2 : -2),
				z: wp.z - Math.sin(startAngle) * offset,
				angle: startAngle,
				speed: 0,
				waypointIdx: 1,
				laps: 0,
				color: aiColors[i % aiColors.length],
				isPlayer: false,
				name: `AI ${i + 1}`,
				finished: false,
			});
		}

		return {
			player,
			aiCars,
			phase: "countdown",
			countdown: 3,
			raceTime: 0,
			positions: [player, ...aiCars],
		};
	}

	// ── Update ───────────────────────────────────────────────────────────

	private update(dt: number): void {
		const s = this.state;

		if (s.phase === "countdown") {
			s.countdown -= dt;

			if (s.countdown <= 0) {
				s.phase = "racing";
			}

			return;
		}

		if (s.phase !== "racing") return;

		s.raceTime += dt;

		// Player input
		if (this.keys["ArrowUp"] || this.keys["KeyW"]) {
			s.player.speed = Math.min(MAX_SPEED, s.player.speed + ACCELERATION * dt);
		} else if (this.keys["ArrowDown"] || this.keys["KeyS"]) {
			s.player.speed = Math.max(
				-MAX_SPEED * 0.3,
				s.player.speed - BRAKE_FORCE * dt,
			);
		}

		if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
			s.player.angle -= STEER_SPEED * dt * (s.player.speed > 0 ? 1 : -1);
		}

		if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
			s.player.angle += STEER_SPEED * dt * (s.player.speed > 0 ? 1 : -1);
		}

		this.updateCar(s.player, dt);

		// AI
		for (const ai of s.aiCars) {
			this.updateAI(ai, dt);
			this.updateCar(ai, dt);
		}

		// Update positions
		const all = [s.player, ...s.aiCars];

		all.sort((a, b) => {
			if (b.laps !== a.laps) return b.laps - a.laps;

			return b.waypointIdx - a.waypointIdx;
		});
		s.positions = all;

		// Check win
		if (s.player.laps >= TOTAL_LAPS) {
			s.player.finished = true;
			s.phase = "finished";
		}
	}

	private updateCar(car: Car, dt: number): void {
		// Move
		car.x += Math.cos(car.angle) * car.speed * dt;
		car.z += Math.sin(car.angle) * car.speed * dt;

		// Friction
		const onTrack = this.isOnTrack(car.x, car.z);

		car.speed *= onTrack ? FRICTION : OFF_TRACK_FRICTION;

		if (Math.abs(car.speed) < 0.1) car.speed = 0;

		// Waypoint progression
		const wp = TRACK_WAYPOINTS[car.waypointIdx];
		const dx = wp.x - car.x;
		const dz = wp.z - car.z;

		if (dx * dx + dz * dz < 25) {
			car.waypointIdx++;

			if (car.waypointIdx >= TRACK_WAYPOINTS.length) {
				car.waypointIdx = 0;
				car.laps++;
			}
		}
	}

	private updateAI(ai: Car, dt: number): void {
		const wp = TRACK_WAYPOINTS[ai.waypointIdx];
		const targetAngle = Math.atan2(wp.z - ai.z, wp.x - ai.x);
		let angleDiff = targetAngle - ai.angle;

		// Normalize angle
		while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

		while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

		ai.angle +=
			Math.sign(angleDiff) *
			Math.min(Math.abs(angleDiff), STEER_SPEED * 0.8 * dt);
		ai.speed = Math.min(
			MAX_SPEED * (0.7 + Math.random() * 0.1),
			ai.speed + ACCELERATION * 0.7 * dt,
		);
	}

	private isOnTrack(px: number, pz: number): boolean {
		const wps = TRACK_WAYPOINTS;
		let minDist = Infinity;

		for (let i = 0; i < wps.length; i++) {
			const a = wps[i];
			const b = wps[(i + 1) % wps.length];
			const dist = this.pointToSegmentDist(px, pz, a.x, a.z, b.x, b.z);

			if (dist < minDist) minDist = dist;
		}

		return minDist < TRACK_WIDTH / 2;
	}

	private pointToSegmentDist(
		px: number,
		pz: number,
		ax: number,
		az: number,
		bx: number,
		bz: number,
	): number {
		const abx = bx - ax;
		const abz = bz - az;
		const apx = px - ax;
		const apz = pz - az;
		const t = Math.max(
			0,
			Math.min(1, (apx * abx + apz * abz) / (abx * abx + abz * abz)),
		);
		const closestX = ax + t * abx;
		const closestZ = az + t * abz;
		const dx = px - closestX;
		const dz = pz - closestZ;

		return Math.sqrt(dx * dx + dz * dz);
	}

	// ── Render ───────────────────────────────────────────────────────────

	private render(): void {
		const { gl, canvas, state: s } = this;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 300);

		// Chase camera behind player
		const camDist = 8;
		const camHeight = 4;
		const camX = s.player.x - Math.cos(s.player.angle) * camDist;
		const camZ = s.player.z - Math.sin(s.player.angle) * camDist;
		const lookX = s.player.x + Math.cos(s.player.angle) * 5;
		const lookZ = s.player.z + Math.sin(s.player.angle) * 5;

		Mat4.lookAt(
			this.viewMatrix,
			[camX, camHeight, camZ],
			[lookX, 0.5, lookZ],
			[0, 1, 0],
		);

		gl.uniformMatrix4fv(this.uView, false, this.viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.3, 0.8, 0.4);
		gl.uniform3f(this.uCameraPos, camX, camHeight, camZ);
		gl.uniform1f(this.uEmissive, 0.0);
		gl.uniform1f(this.uFogDensity, 0.008);

		// ── Ground plane ─────────────────────────────────────────────
		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [20, -0.05, 25]);
		Mat4.scale(this.modelMatrix, this.modelMatrix, [80, 1, 80]);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, 0.25, 0.5, 0.2);
		this.drawMesh(this.planeMesh);

		// ── Track segments ───────────────────────────────────────────
		const wps = TRACK_WAYPOINTS;

		for (let i = 0; i < wps.length; i++) {
			const a = wps[i];
			const b = wps[(i + 1) % wps.length];
			const mx = (a.x + b.x) / 2;
			const mz = (a.z + b.z) / 2;
			const dx = b.x - a.x;
			const dz = b.z - a.z;
			const len = Math.sqrt(dx * dx + dz * dz);
			const angle = Math.atan2(dz, dx);

			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [mx, 0.01, mz]);
			Mat4.rotateY(this.modelMatrix, this.modelMatrix, -angle);
			Mat4.scale(this.modelMatrix, this.modelMatrix, [
				len / 2,
				0.02,
				TRACK_WIDTH / 2,
			]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 0.3, 0.3, 0.35);
			this.drawMesh(this.cubeMesh);

			// Center line
			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [mx, 0.02, mz]);
			Mat4.rotateY(this.modelMatrix, this.modelMatrix, -angle);
			Mat4.scale(this.modelMatrix, this.modelMatrix, [len / 2, 0.01, 0.05]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 0.8, 0.8, 0.2);
			this.drawMesh(this.cubeMesh);
		}

		// ── Cars ─────────────────────────────────────────────────────
		const allCars = [s.player, ...s.aiCars];

		for (const car of allCars) {
			// Car body
			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [car.x, 0.35, car.z]);
			Mat4.rotateY(this.modelMatrix, this.modelMatrix, -car.angle);
			Mat4.scale(this.modelMatrix, this.modelMatrix, [0.8, 0.25, 0.4]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, car.color[0], car.color[1], car.color[2]);
			this.drawMesh(this.cubeMesh);

			// Car roof
			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [
				car.x - Math.cos(car.angle) * 0.15,
				0.55,
				car.z - Math.sin(car.angle) * 0.15,
			]);
			Mat4.rotateY(this.modelMatrix, this.modelMatrix, -car.angle);
			Mat4.scale(this.modelMatrix, this.modelMatrix, [0.4, 0.15, 0.35]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(
				this.uColor,
				car.color[0] * 0.7,
				car.color[1] * 0.7,
				car.color[2] * 0.7,
			);
			this.drawMesh(this.cubeMesh);

			// Shadow blob
			this.drawBox(car.x, 0.01, car.z, 0.7, 0.01, 0.35, 0.1, 0.1, 0.1);
		}

		// ── Waypoint markers (small posts) ───────────────────────────
		for (let i = 0; i < wps.length; i++) {
			const wp = wps[i];

			this.drawBox(
				wp.x + TRACK_WIDTH / 2 + 0.5,
				0.5,
				wp.z,
				0.1,
				0.5,
				0.1,
				0.8,
				0.1,
				0.1,
			);
			this.drawBox(
				wp.x - TRACK_WIDTH / 2 - 0.5,
				0.5,
				wp.z,
				0.1,
				0.5,
				0.1,
				0.8,
				0.1,
				0.1,
			);
		}
	}

	private drawBox(
		x: number,
		y: number,
		z: number,
		sx: number,
		sy: number,
		sz: number,
		r: number,
		g: number,
		b: number,
	): void {
		const { gl } = this;

		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
		Mat4.scale(this.modelMatrix, this.modelMatrix, [sx, sy, sz]);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, r, g, b);
		this.drawMesh(this.cubeMesh);
	}

	private buildMesh(gl: WebGL2RenderingContext, data: PrimitiveData): Mesh {
		const vao = createVAO(gl);

		gl.bindVertexArray(vao);

		const posBuf = createBuffer(gl, data.positions);

		gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		const normBuf = createBuffer(gl, data.normals);

		gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

		const idxBuf = createBuffer(gl, data.indices, gl.ELEMENT_ARRAY_BUFFER);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
		gl.bindVertexArray(null);

		return { vao, indexCount: data.indices.length };
	}

	private drawMesh(mesh: Mesh): void {
		this.gl.bindVertexArray(mesh.vao);
		this.gl.drawElements(
			this.gl.TRIANGLES,
			mesh.indexCount,
			this.gl.UNSIGNED_SHORT,
			0,
		);
	}
}
