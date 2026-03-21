import type { GameInstance } from "@core/GameInterface";
import {
	createProgram,
	createBuffer,
	createVAO,
	Mat4,
	OrbitalCamera,
} from "@webgl/shared";
import { createCube, createSphere } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import {
	TABLE_W,
	TABLE_H,
	PADDLE_W,
	PADDLE_H,
	PADDLE_D,
	BALL_R,
	BALL_SPEED_INIT,
	BALL_SPEED_MAX,
	BALL_SPEED_INC,
	PADDLE_SPEED,
	AI_SPEED,
	WIN_SCORE,
	WALL_H,
	type Pong3DState,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class Pong3DEngine implements GameInstance {
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
	private uEmissive: WebGLUniformLocation;

	private modelMatrix = Mat4.create();
	private projMatrix = Mat4.create();
	private camera: OrbitalCamera;

	private state: Pong3DState;
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

		this.cubeMesh = this.buildMesh(gl, createCube(1));
		this.sphereMesh = this.buildMesh(gl, createSphere(BALL_R, 16));

		this.camera = new OrbitalCamera(canvas, {
			distance: 14,
			elevation: 0.7,
			azimuth: 0,
			minDistance: 8,
			maxDistance: 25,
		});

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.02, 0.02, 0.06, 1.0);

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

			if (e.code === "Space" || e.code === "Enter") {
				if (this.state.phase === "start") {
					this.state.phase = "playing";
					this.launchBall();
				} else if (this.state.phase === "win") {
					this.state = this.createState();
				}
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
		this.camera.dispose();
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

	private createState(): Pong3DState {
		return {
			ballX: 0,
			ballZ: 0,
			ballVX: 0,
			ballVZ: 0,
			ballSpeed: BALL_SPEED_INIT,
			playerX: 0,
			aiX: 0,
			playerScore: 0,
			aiScore: 0,
			phase: "start",
			winner: null,
			scoreTimer: 0,
			rallyHits: 0,
		};
	}

	private launchBall(): void {
		const s = this.state;
		const angle = (Math.random() - 0.5) * Math.PI * 0.4;
		const dir = Math.random() < 0.5 ? 1 : -1;

		s.ballVX = Math.sin(angle) * s.ballSpeed;
		s.ballVZ = Math.cos(angle) * s.ballSpeed * dir;
		s.ballX = 0;
		s.ballZ = 0;
		s.rallyHits = 0;
	}

	// ── Update ───────────────────────────────────────────────────────────

	private update(dt: number): void {
		const s = this.state;

		if (s.phase === "scored") {
			s.scoreTimer -= dt;

			if (s.scoreTimer <= 0) {
				if (s.playerScore >= WIN_SCORE || s.aiScore >= WIN_SCORE) {
					s.phase = "win";
					s.winner = s.playerScore >= WIN_SCORE ? "player" : "ai";
				} else {
					s.phase = "playing";
					this.launchBall();
				}
			}

			return;
		}

		if (s.phase !== "playing") return;

		// Player input
		if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
			s.playerX -= PADDLE_SPEED * dt;
		}

		if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
			s.playerX += PADDLE_SPEED * dt;
		}

		// Clamp player paddle
		const maxX = TABLE_W / 2 - PADDLE_W / 2;

		s.playerX = Math.max(-maxX, Math.min(maxX, s.playerX));

		// AI
		const aiTarget = s.ballX;
		const aiDiff = aiTarget - s.aiX;

		s.aiX += Math.sign(aiDiff) * Math.min(Math.abs(aiDiff), AI_SPEED * dt);
		s.aiX = Math.max(-maxX, Math.min(maxX, s.aiX));

		// Ball movement
		s.ballX += s.ballVX * dt;
		s.ballZ += s.ballVZ * dt;

		// Wall bounce (left/right)
		const wallLimit = TABLE_W / 2 - BALL_R;

		if (s.ballX < -wallLimit) {
			s.ballX = -wallLimit;
			s.ballVX = Math.abs(s.ballVX);
		} else if (s.ballX > wallLimit) {
			s.ballX = wallLimit;
			s.ballVX = -Math.abs(s.ballVX);
		}

		// Player paddle (near side, +Z)
		const playerZ = TABLE_H / 2 - PADDLE_D / 2;

		if (
			s.ballVZ > 0 &&
			s.ballZ + BALL_R >= playerZ - PADDLE_D / 2 &&
			s.ballZ - BALL_R <= playerZ + PADDLE_D / 2 &&
			s.ballX >= s.playerX - PADDLE_W / 2 - BALL_R &&
			s.ballX <= s.playerX + PADDLE_W / 2 + BALL_R
		) {
			s.ballVZ = -Math.abs(s.ballVZ);
			// Angle based on hit position
			const hitPos = (s.ballX - s.playerX) / (PADDLE_W / 2);

			s.ballVX = hitPos * s.ballSpeed * 0.7;
			s.ballZ = playerZ - PADDLE_D / 2 - BALL_R;
			s.rallyHits++;
			s.ballSpeed = Math.min(BALL_SPEED_MAX, s.ballSpeed + BALL_SPEED_INC);
			// Re-normalize velocity to new speed
			const len = Math.sqrt(s.ballVX * s.ballVX + s.ballVZ * s.ballVZ);

			s.ballVX = (s.ballVX / len) * s.ballSpeed;
			s.ballVZ = (s.ballVZ / len) * s.ballSpeed;
		}

		// AI paddle (far side, -Z)
		const aiZ = -(TABLE_H / 2 - PADDLE_D / 2);

		if (
			s.ballVZ < 0 &&
			s.ballZ - BALL_R <= aiZ + PADDLE_D / 2 &&
			s.ballZ + BALL_R >= aiZ - PADDLE_D / 2 &&
			s.ballX >= s.aiX - PADDLE_W / 2 - BALL_R &&
			s.ballX <= s.aiX + PADDLE_W / 2 + BALL_R
		) {
			s.ballVZ = Math.abs(s.ballVZ);
			const hitPos = (s.ballX - s.aiX) / (PADDLE_W / 2);

			s.ballVX = hitPos * s.ballSpeed * 0.7;
			s.ballZ = aiZ + PADDLE_D / 2 + BALL_R;
			s.rallyHits++;
			s.ballSpeed = Math.min(BALL_SPEED_MAX, s.ballSpeed + BALL_SPEED_INC);
			const len = Math.sqrt(s.ballVX * s.ballVX + s.ballVZ * s.ballVZ);

			s.ballVX = (s.ballVX / len) * s.ballSpeed;
			s.ballVZ = (s.ballVZ / len) * s.ballSpeed;
		}

		// Score
		if (s.ballZ > TABLE_H / 2 + 1) {
			s.aiScore++;
			s.phase = "scored";
			s.scoreTimer = 1;
			s.ballSpeed = BALL_SPEED_INIT;
		} else if (s.ballZ < -(TABLE_H / 2 + 1)) {
			s.playerScore++;
			s.phase = "scored";
			s.scoreTimer = 1;
			s.ballSpeed = BALL_SPEED_INIT;
		}
	}

	// ── Render ───────────────────────────────────────────────────────────

	private render(): void {
		const { gl, canvas, state: s } = this;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 200);

		const viewMatrix = this.camera.getViewMatrix();
		const camPos = this.camera.getPosition();

		gl.uniformMatrix4fv(this.uView, false, viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.3, 0.9, 0.2);
		gl.uniform3f(this.uCameraPos, camPos[0], camPos[1], camPos[2]);
		gl.uniform1f(this.uEmissive, 0.0);

		// ── Table surface ────────────────────────────────────────────
		this.drawBox(0, -0.1, 0, TABLE_W / 2, 0.1, TABLE_H / 2, 0.08, 0.12, 0.18);

		// Center line
		this.drawBox(0, 0.01, 0, TABLE_W / 2, 0.01, 0.03, 0.15, 0.2, 0.3);

		// ── Walls (left + right) ─────────────────────────────────────
		this.drawBox(
			-(TABLE_W / 2 + 0.1),
			WALL_H / 2,
			0,
			0.1,
			WALL_H / 2,
			TABLE_H / 2,
			0.15,
			0.2,
			0.3,
		);
		this.drawBox(
			TABLE_W / 2 + 0.1,
			WALL_H / 2,
			0,
			0.1,
			WALL_H / 2,
			TABLE_H / 2,
			0.15,
			0.2,
			0.3,
		);

		// ── Player paddle (+Z side) ──────────────────────────────────
		const playerZ = TABLE_H / 2 - PADDLE_D / 2;

		this.drawBox(
			s.playerX,
			PADDLE_H / 2,
			playerZ,
			PADDLE_W / 2,
			PADDLE_H / 2,
			PADDLE_D / 2,
			0.2,
			0.6,
			1.0,
		);

		// ── AI paddle (-Z side) ──────────────────────────────────────
		const aiZ = -(TABLE_H / 2 - PADDLE_D / 2);

		this.drawBox(
			s.aiX,
			PADDLE_H / 2,
			aiZ,
			PADDLE_W / 2,
			PADDLE_H / 2,
			PADDLE_D / 2,
			1.0,
			0.3,
			0.2,
		);

		// ── Ball ─────────────────────────────────────────────────────
		gl.uniform1f(this.uEmissive, 0.6);
		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [
			s.ballX,
			BALL_R,
			s.ballZ,
		]);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, 1.0, 1.0, 0.8);
		this.drawMesh(this.sphereMesh);
		gl.uniform1f(this.uEmissive, 0.0);

		// ── Score indicators (cubes along the sides) ─────────────────
		for (let i = 0; i < s.playerScore; i++) {
			this.drawBox(
				-(TABLE_W / 2 + 0.5),
				0.15,
				TABLE_H / 2 - 1 - i * 0.6,
				0.15,
				0.15,
				0.15,
				0.2,
				0.6,
				1.0,
			);
		}

		for (let i = 0; i < s.aiScore; i++) {
			this.drawBox(
				TABLE_W / 2 + 0.5,
				0.15,
				-(TABLE_H / 2 - 1 - i * 0.6),
				0.15,
				0.15,
				0.15,
				1.0,
				0.3,
				0.2,
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

	// ── Mesh helpers ─────────────────────────────────────────────────────

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
