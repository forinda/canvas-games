import type { GameInstance } from "@core/GameInterface";
import { createProgram, createBuffer, createVAO, Mat4 } from "@webgl/shared";
import { createCube, createSphere } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import {
	LANE_COUNT,
	LANE_WIDTH,
	PLAYER_SIZE,
	GROUND_SEGMENT_LEN,
	VISIBLE_SEGMENTS,
	INITIAL_SPEED,
	SPEED_INCREMENT,
	MAX_SPEED,
	JUMP_VELOCITY,
	GRAVITY,
	LANE_SWITCH_SPEED,
	OBSTACLE_MIN_GAP,
	laneX,
	type Obstacle,
	type RunnerState,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class EndlessRunnerEngine implements GameInstance {
	private gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private program: WebGLProgram;
	private cubeMesh: Mesh;
	private sphereMesh: Mesh;

	private uModel: WebGLUniformLocation;
	private uView: WebGLUniformLocation;
	private uProjection: WebGLUniformLocation;
	private uLightDir: WebGLUniformLocation;
	private uColor: WebGLUniformLocation;
	private uCameraPos: WebGLUniformLocation;
	private uFogNear: WebGLUniformLocation;
	private uFogFar: WebGLUniformLocation;

	private modelMatrix = Mat4.create();
	private viewMatrix = Mat4.create();
	private projMatrix = Mat4.create();

	private state: RunnerState;
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
		this.uFogNear = gl.getUniformLocation(this.program, "uFogNear")!;
		this.uFogFar = gl.getUniformLocation(this.program, "uFogFar")!;

		this.cubeMesh = this.buildMesh(gl, createCube(1));
		this.sphereMesh = this.buildMesh(gl, createSphere(0.3, 10));

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.55, 0.7, 0.85, 1.0); // sky blue

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

			const s = this.state;

			if (s.phase === "start") {
				if (e.code === "Space" || e.code === "Enter") {
					s.phase = "playing";
				}

				return;
			}

			if (s.phase === "dead") {
				if (e.code === "Space" || e.code === "Enter") {
					this.state = this.createState();
					this.state.phase = "playing";
				}

				return;
			}

			if (e.code === "ArrowLeft" || e.code === "KeyA") {
				if (s.lane > 0) s.lane--;
			}

			if (e.code === "ArrowRight" || e.code === "KeyD") {
				if (s.lane < LANE_COUNT - 1) s.lane++;
			}

			if (
				(e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") &&
				s.isGrounded
			) {
				s.velocityY = JUMP_VELOCITY;
				s.isGrounded = false;
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

	private createState(): RunnerState {
		return {
			lane: 1,
			playerX: 0,
			playerY: PLAYER_SIZE / 2,
			velocityY: 0,
			isGrounded: true,
			distance: 0,
			speed: INITIAL_SPEED,
			score: 0,
			coins: 0,
			obstacles: [],
			collectibles: [],
			nextSpawnZ: 20,
			phase: "start",
		};
	}

	// ── Update ───────────────────────────────────────────────────────────

	private update(dt: number): void {
		const s = this.state;

		if (s.phase !== "playing") return;

		// Move forward
		s.distance += s.speed * dt;
		s.speed = Math.min(MAX_SPEED, s.speed + SPEED_INCREMENT * dt);
		s.score = Math.floor(s.distance);

		// Smooth lane switching
		const targetX = laneX(s.lane);
		const dx = targetX - s.playerX;

		s.playerX += Math.sign(dx) * Math.min(Math.abs(dx), LANE_SWITCH_SPEED * dt);

		// Jump / gravity
		if (!s.isGrounded) {
			s.velocityY -= GRAVITY * dt;
			s.playerY += s.velocityY * dt;

			if (s.playerY <= PLAYER_SIZE / 2) {
				s.playerY = PLAYER_SIZE / 2;
				s.velocityY = 0;
				s.isGrounded = true;
			}
		}

		// Spawn obstacles
		while (s.nextSpawnZ < s.distance + VISIBLE_SEGMENTS * GROUND_SEGMENT_LEN) {
			this.spawnRow(s.nextSpawnZ);
			s.nextSpawnZ += OBSTACLE_MIN_GAP + Math.random() * 4;
		}

		// Remove passed obstacles/collectibles
		s.obstacles = s.obstacles.filter((o) => o.z > s.distance - 5);
		s.collectibles = s.collectibles.filter(
			(c) => c.z > s.distance - 5 && !c.collected,
		);

		// Collision detection
		for (const obs of s.obstacles) {
			const relZ = obs.z - s.distance;

			if (relZ > -0.5 && relZ < 0.8) {
				const obsX = laneX(obs.lane);

				if (Math.abs(s.playerX - obsX) < LANE_WIDTH * 0.4) {
					// Check vertical — can jump over low obstacles
					if (obs.type === "low" && s.playerY > obs.h + 0.1) {
						continue;
					}

					s.phase = "dead";

					return;
				}
			}
		}

		// Coin collection
		for (const coin of s.collectibles) {
			if (coin.collected) continue;

			const relZ = coin.z - s.distance;

			if (relZ > -0.5 && relZ < 0.5) {
				const coinX = laneX(coin.lane);

				if (
					Math.abs(s.playerX - coinX) < LANE_WIDTH * 0.4 &&
					Math.abs(s.playerY - 0.8) < 0.6
				) {
					coin.collected = true;
					s.coins++;
				}
			}
		}
	}

	private spawnRow(z: number): void {
		const s = this.state;

		// Spawn 1-2 obstacles leaving at least 1 lane open
		const blockedLanes = new Set<number>();
		const obstacleCount = Math.random() < 0.4 ? 2 : 1;

		for (let i = 0; i < obstacleCount; i++) {
			let lane: number;

			do {
				lane = Math.floor(Math.random() * LANE_COUNT);
			} while (blockedLanes.has(lane) && blockedLanes.size < LANE_COUNT - 1);

			if (blockedLanes.size >= LANE_COUNT - 1) break;

			blockedLanes.add(lane);

			const type: Obstacle["type"] =
				Math.random() < 0.3 ? "low" : Math.random() < 0.5 ? "tall" : "block";

			s.obstacles.push({
				lane,
				z,
				type,
				w: LANE_WIDTH * 0.7,
				h: type === "low" ? 0.5 : type === "tall" ? 2.0 : 1.0,
				d: 0.6,
			});
		}

		// Spawn coin in a free lane
		const freeLanes: number[] = [];

		for (let i = 0; i < LANE_COUNT; i++) {
			if (!blockedLanes.has(i)) freeLanes.push(i);
		}

		if (freeLanes.length > 0 && Math.random() < 0.5) {
			s.collectibles.push({
				lane: freeLanes[Math.floor(Math.random() * freeLanes.length)],
				z,
				collected: false,
			});
		}
	}

	// ── Render ───────────────────────────────────────────────────────────

	private render(): void {
		const { gl, canvas, state: s } = this;
		const time = performance.now() / 1000;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 300);

		// Chase camera behind and above player
		const camZ = -5;
		const camY = 4;

		Mat4.lookAt(
			this.viewMatrix,
			[s.playerX * 0.3, camY, camZ],
			[s.playerX * 0.5, 1, 10],
			[0, 1, 0],
		);

		gl.uniformMatrix4fv(this.uView, false, this.viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.3, 0.8, 0.4);
		gl.uniform3f(this.uCameraPos, s.playerX * 0.3, camY, camZ);
		gl.uniform1f(this.uFogNear, 40);
		gl.uniform1f(this.uFogFar, VISIBLE_SEGMENTS * GROUND_SEGMENT_LEN);

		// ── Ground segments ──────────────────────────────────────────
		const groundW = LANE_COUNT * LANE_WIDTH + 2;
		const startSeg = Math.floor(s.distance / GROUND_SEGMENT_LEN);

		for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
			const segZ =
				(startSeg + i) * GROUND_SEGMENT_LEN +
				GROUND_SEGMENT_LEN / 2 -
				s.distance;
			const shade = i % 2 === 0 ? 0.35 : 0.3;

			this.drawBox(
				0,
				-0.1,
				segZ,
				groundW / 2,
				0.1,
				GROUND_SEGMENT_LEN / 2,
				shade,
				shade + 0.1,
				shade,
			);
		}

		// ── Lane dividers ────────────────────────────────────────────
		for (let l = 0; l <= LANE_COUNT; l++) {
			const x = (l - LANE_COUNT / 2) * LANE_WIDTH;

			for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
				const segZ =
					(startSeg + i) * GROUND_SEGMENT_LEN +
					GROUND_SEGMENT_LEN / 2 -
					s.distance;

				this.drawBox(
					x,
					0.01,
					segZ,
					0.04,
					0.01,
					GROUND_SEGMENT_LEN / 2 - 0.3,
					0.6,
					0.6,
					0.6,
				);
			}
		}

		// ── Player ───────────────────────────────────────────────────
		this.drawBox(
			s.playerX,
			s.playerY,
			0,
			PLAYER_SIZE / 2,
			PLAYER_SIZE / 2,
			PLAYER_SIZE / 2,
			0.2,
			0.5,
			1.0,
		);
		// Player head
		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [
			s.playerX,
			s.playerY + PLAYER_SIZE * 0.7,
			0,
		]);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, 0.9, 0.75, 0.6);
		this.drawMesh(this.sphereMesh);

		// ── Obstacles ────────────────────────────────────────────────
		for (const obs of s.obstacles) {
			const relZ = obs.z - s.distance;
			const ox = laneX(obs.lane);
			let r = 0.8;
			let g = 0.2;
			let b = 0.2;

			if (obs.type === "low") {
				r = 0.9;
				g = 0.6;
				b = 0.1;
			} else if (obs.type === "tall") {
				r = 0.5;
				g = 0.2;
				b = 0.5;
			}

			this.drawBox(
				ox,
				obs.h / 2,
				relZ,
				obs.w / 2,
				obs.h / 2,
				obs.d / 2,
				r,
				g,
				b,
			);
		}

		// ── Collectibles (spinning coins) ────────────────────────────
		for (const coin of s.collectibles) {
			if (coin.collected) continue;

			const relZ = coin.z - s.distance;
			const cx = laneX(coin.lane);

			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [cx, 0.8, relZ]);
			Mat4.rotateY(this.modelMatrix, this.modelMatrix, time * 3);
			Mat4.scale(this.modelMatrix, this.modelMatrix, [0.2, 0.2, 0.06]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 1.0, 0.85, 0.0);
			this.drawMesh(this.cubeMesh);
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
