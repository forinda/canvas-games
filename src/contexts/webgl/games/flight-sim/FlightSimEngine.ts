import type { GameInstance } from "@core/GameInterface";
import { createProgram, createBuffer, createVAO, Mat4 } from "@webgl/shared";
import { createCube, createSphere } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import { generateHeightmap, getHeight, buildTerrainMesh } from "./terrain";
import {
	TERRAIN_SIZE,
	TERRAIN_SCALE,
	PLANE_SPEED,
	PITCH_SPEED,
	ROLL_SPEED,
	YAW_FROM_ROLL,
	MIN_ALTITUDE,
	RING_COUNT,
	RING_RADIUS,
	type Ring,
	type FlightState,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class FlightSimEngine implements GameInstance {
	private gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private program: WebGLProgram;
	private cubeMesh: Mesh;
	private sphereMesh: Mesh;
	private terrainMesh: Mesh;

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

	private state: FlightState;
	private heights: Float32Array;
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
		this.sphereMesh = this.buildMesh(gl, createSphere(1, 12));

		// Generate terrain
		this.heights = generateHeightmap();
		const terrainData = buildTerrainMesh(this.heights);

		this.terrainMesh = this.buildMesh(
			gl,
			terrainData as unknown as PrimitiveData,
		);

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.6, 0.75, 0.9, 1.0);

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
				(this.state.phase === "crashed" || this.state.phase === "won")
			) {
				this.heights = generateHeightmap();
				const td = buildTerrainMesh(this.heights);

				this.terrainMesh = this.buildMesh(
					this.gl,
					td as unknown as PrimitiveData,
				);
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

	private createState(): FlightState {
		const worldSize = TERRAIN_SIZE * TERRAIN_SCALE;
		const cx = worldSize / 2;
		const cz = worldSize / 2;
		const startY = getHeight(this.heights, cx, cz) + 20;

		// Generate rings at random positions above terrain
		const rings: Ring[] = [];

		for (let i = 0; i < RING_COUNT; i++) {
			const rx = 20 + Math.random() * (worldSize - 40);
			const rz = 20 + Math.random() * (worldSize - 40);
			const terrainH = getHeight(this.heights, rx, rz);

			rings.push({
				x: rx,
				y: terrainH + 8 + Math.random() * 10,
				z: rz,
				collected: false,
			});
		}

		return {
			planeX: cx,
			planeY: startY,
			planeZ: cz,
			pitch: 0,
			roll: 0,
			yaw: 0,
			speed: PLANE_SPEED,
			rings,
			collected: 0,
			totalRings: RING_COUNT,
			phase: "flying",
			timer: 0,
		};
	}

	private update(dt: number): void {
		const s = this.state;

		if (s.phase !== "flying") return;

		s.timer += dt;

		// Input
		if (this.keys["ArrowUp"] || this.keys["KeyW"]) {
			s.pitch -= PITCH_SPEED * dt;
		}

		if (this.keys["ArrowDown"] || this.keys["KeyS"]) {
			s.pitch += PITCH_SPEED * dt;
		}

		if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
			s.roll -= ROLL_SPEED * dt;
		}

		if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
			s.roll += ROLL_SPEED * dt;
		}

		// Damping
		s.pitch *= 0.95;
		s.roll *= 0.95;
		s.pitch = Math.max(-1.2, Math.min(1.2, s.pitch));
		s.roll = Math.max(-1.2, Math.min(1.2, s.roll));

		// Yaw from roll (bank turning)
		s.yaw += s.roll * YAW_FROM_ROLL * dt;

		// Move forward in facing direction
		const cosP = Math.cos(s.pitch);

		s.planeX += Math.sin(s.yaw) * cosP * s.speed * dt;
		s.planeZ += Math.cos(s.yaw) * cosP * s.speed * dt;
		s.planeY -= Math.sin(s.pitch) * s.speed * dt;

		// World bounds wrap
		const worldSize = TERRAIN_SIZE * TERRAIN_SCALE;

		if (s.planeX < 0) s.planeX += worldSize;

		if (s.planeX > worldSize) s.planeX -= worldSize;

		if (s.planeZ < 0) s.planeZ += worldSize;

		if (s.planeZ > worldSize) s.planeZ -= worldSize;

		// Ground collision
		const groundH = getHeight(this.heights, s.planeX, s.planeZ);

		if (s.planeY < groundH + MIN_ALTITUDE) {
			s.phase = "crashed";

			return;
		}

		// Ring collection
		for (const ring of s.rings) {
			if (ring.collected) continue;

			const dx = s.planeX - ring.x;
			const dy = s.planeY - ring.y;
			const dz = s.planeZ - ring.z;

			if (dx * dx + dy * dy + dz * dz < RING_RADIUS * RING_RADIUS * 4) {
				ring.collected = true;
				s.collected++;

				if (s.collected >= s.totalRings) {
					s.phase = "won";
				}
			}
		}
	}

	private render(): void {
		const { gl, canvas, state: s } = this;
		const time = performance.now() / 1000;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 3.5, aspect, 0.5, 500);

		// Chase camera behind and above plane
		const camDist = 10;
		const camH = 4;
		const camX = s.planeX - Math.sin(s.yaw) * camDist;
		const camZ = s.planeZ - Math.cos(s.yaw) * camDist;
		const camY = s.planeY + camH;

		Mat4.lookAt(
			this.viewMatrix,
			[camX, camY, camZ],
			[s.planeX, s.planeY, s.planeZ],
			[0, 1, 0],
		);

		gl.uniformMatrix4fv(this.uView, false, this.viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.3, 0.8, 0.4);
		gl.uniform3f(this.uCameraPos, camX, camY, camZ);
		gl.uniform1f(this.uEmissive, 0.0);
		gl.uniform1f(this.uFogDensity, 0.004);

		// ── Terrain ──────────────────────────────────────────────────
		Mat4.identity(this.modelMatrix);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, 0.3, 0.55, 0.2);
		this.drawMesh(this.terrainMesh);

		// ── Plane ────────────────────────────────────────────────────
		if (s.phase === "flying") {
			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [
				s.planeX,
				s.planeY,
				s.planeZ,
			]);
			Mat4.rotateY(this.modelMatrix, this.modelMatrix, -s.yaw);
			Mat4.rotateX(this.modelMatrix, this.modelMatrix, s.pitch);
			Mat4.rotateZ(this.modelMatrix, this.modelMatrix, -s.roll);

			// Fuselage
			const m = Mat4.create();

			m.set(this.modelMatrix);
			Mat4.scale(m, m, [0.4, 0.25, 1.2]);
			gl.uniformMatrix4fv(this.uModel, false, m);
			gl.uniform3f(this.uColor, 0.85, 0.85, 0.9);
			this.drawMesh(this.cubeMesh);

			// Wings
			m.set(this.modelMatrix);
			Mat4.scale(m, m, [2.5, 0.06, 0.5]);
			gl.uniformMatrix4fv(this.uModel, false, m);
			gl.uniform3f(this.uColor, 0.7, 0.7, 0.8);
			this.drawMesh(this.cubeMesh);

			// Tail
			m.set(this.modelMatrix);
			Mat4.translate(m, m, [0, 0.3, -1.0]);
			Mat4.scale(m, m, [0.8, 0.06, 0.3]);
			gl.uniformMatrix4fv(this.uModel, false, m);
			gl.uniform3f(this.uColor, 0.7, 0.7, 0.8);
			this.drawMesh(this.cubeMesh);

			// Vertical stabilizer
			m.set(this.modelMatrix);
			Mat4.translate(m, m, [0, 0.5, -1.0]);
			Mat4.scale(m, m, [0.06, 0.4, 0.3]);
			gl.uniformMatrix4fv(this.uModel, false, m);
			gl.uniform3f(this.uColor, 0.7, 0.2, 0.2);
			this.drawMesh(this.cubeMesh);

			// Engine glow
			gl.uniform1f(this.uEmissive, 0.8);
			m.set(this.modelMatrix);
			Mat4.translate(m, m, [0, 0, -1.3]);
			Mat4.scale(m, m, [0.15, 0.15, 0.1]);
			gl.uniformMatrix4fv(this.uModel, false, m);
			gl.uniform3f(this.uColor, 0.3, 0.5, 1.0);
			this.drawMesh(this.cubeMesh);
			gl.uniform1f(this.uEmissive, 0.0);
		}

		// ── Rings ────────────────────────────────────────────────────
		for (const ring of s.rings) {
			if (ring.collected) continue;

			gl.uniform1f(this.uEmissive, 0.6);

			// Draw ring as 12 small spheres in a circle
			for (let i = 0; i < 12; i++) {
				const angle = (i / 12) * Math.PI * 2 + time;
				const rx = ring.x + Math.cos(angle) * RING_RADIUS;
				const ry = ring.y + Math.sin(angle) * RING_RADIUS;

				Mat4.identity(this.modelMatrix);
				Mat4.translate(this.modelMatrix, this.modelMatrix, [rx, ry, ring.z]);
				Mat4.scale(this.modelMatrix, this.modelMatrix, [0.25, 0.25, 0.25]);
				gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
				gl.uniform3f(this.uColor, 1.0, 0.85, 0.0);
				this.drawMesh(this.sphereMesh);
			}

			gl.uniform1f(this.uEmissive, 0.0);
		}
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
