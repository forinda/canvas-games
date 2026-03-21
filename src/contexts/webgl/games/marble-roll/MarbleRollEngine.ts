import type { GameInstance } from "@core/GameInterface";
import {
	createProgram,
	createBuffer,
	createVAO,
	Mat4,
	Vec3,
	OrbitalCamera,
} from "@webgl/shared";
import {
	createSphere,
	createPlane,
	createCube,
} from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import {
	MARBLE_RADIUS,
	GRAVITY,
	TILT_MAX,
	TILT_SPEED,
	FRICTION,
	LEVELS,
	type MarbleState,
	type Gem,
	type LevelData,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class MarbleRollEngine implements GameInstance {
	private gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	// GL resources
	private program: WebGLProgram;

	// Meshes
	private sphereMesh: Mesh;
	private planeMesh: Mesh;
	private cubeMesh: Mesh;

	// Uniforms
	private uModel: WebGLUniformLocation;
	private uView: WebGLUniformLocation;
	private uProjection: WebGLUniformLocation;
	private uLightDir: WebGLUniformLocation;
	private uColor: WebGLUniformLocation;
	private uCameraPos: WebGLUniformLocation;

	// Matrices
	private modelMatrix = Mat4.create();
	private projMatrix = Mat4.create();

	// Camera
	private camera: OrbitalCamera;

	// Game state
	private state: MarbleState;
	private currentLevel: LevelData;
	private gems: Gem[];

	// Input
	private keys: Record<string, boolean> = {};

	// Handlers
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

		// Shaders
		this.program = createProgram(gl, VERT_SRC, FRAG_SRC);
		this.uModel = gl.getUniformLocation(this.program, "uModel")!;
		this.uView = gl.getUniformLocation(this.program, "uView")!;
		this.uProjection = gl.getUniformLocation(this.program, "uProjection")!;
		this.uLightDir = gl.getUniformLocation(this.program, "uLightDir")!;
		this.uColor = gl.getUniformLocation(this.program, "uColor")!;
		this.uCameraPos = gl.getUniformLocation(this.program, "uCameraPos")!;

		// Meshes
		this.sphereMesh = this.buildMesh(gl, createSphere(MARBLE_RADIUS, 20));
		this.planeMesh = this.buildMesh(gl, createPlane(1, 1));
		this.cubeMesh = this.buildMesh(gl, createCube(1));

		// Camera
		this.camera = new OrbitalCamera(canvas, {
			distance: 12,
			elevation: 0.8,
			azimuth: 0.3,
			minDistance: 6,
			maxDistance: 25,
		});

		// GL state
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.03, 0.03, 0.08, 1.0);

		// Level
		this.currentLevel = LEVELS[0];
		this.gems = this.currentLevel.gems.map((g) => ({ ...g }));
		this.state = this.createState(0);

		// Resize
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);
		};
		window.addEventListener("resize", this.resizeHandler);
		gl.viewport(0, 0, canvas.width, canvas.height);

		// Input
		this.keyDownHandler = (e: KeyboardEvent) => {
			this.keys[e.code] = true;

			if (e.key === "Escape") {
				e.preventDefault();
				this.onExit();
			}

			if (e.code === "KeyR") {
				this.resetLevel();
			}

			if (
				(e.code === "Space" || e.code === "Enter") &&
				(this.state.phase === "won" || this.state.phase === "fell")
			) {
				if (this.state.phase === "won") {
					this.nextLevel();
				} else {
					this.resetLevel();
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

	private createState(levelIdx: number): MarbleState {
		const lvl = LEVELS[levelIdx % LEVELS.length];

		this.currentLevel = lvl;
		this.gems = lvl.gems.map((g) => ({ ...g }));

		return {
			x: lvl.startX,
			y: MARBLE_RADIUS,
			z: lvl.startZ,
			vx: 0,
			vy: 0,
			vz: 0,
			tiltX: 0,
			tiltZ: 0,
			targetTiltX: 0,
			targetTiltZ: 0,
			phase: "playing",
			level: levelIdx,
			gems: 0,
			totalGems: lvl.gems.length,
		};
	}

	private resetLevel(): void {
		this.state = this.createState(this.state.level);
	}

	private nextLevel(): void {
		this.state = this.createState(this.state.level + 1);
	}

	// ── Update ───────────────────────────────────────────────────────────

	private update(dt: number): void {
		const s = this.state;

		if (s.phase !== "playing") return;

		// Input → target tilt
		s.targetTiltX = 0;
		s.targetTiltZ = 0;

		if (this.keys["ArrowUp"] || this.keys["KeyW"]) s.targetTiltX = -TILT_MAX;

		if (this.keys["ArrowDown"] || this.keys["KeyS"]) s.targetTiltX = TILT_MAX;

		if (this.keys["ArrowLeft"] || this.keys["KeyA"]) s.targetTiltZ = TILT_MAX;

		if (this.keys["ArrowRight"] || this.keys["KeyD"]) s.targetTiltZ = -TILT_MAX;

		// Smooth tilt interpolation
		s.tiltX += (s.targetTiltX - s.tiltX) * TILT_SPEED * dt;
		s.tiltZ += (s.targetTiltZ - s.tiltZ) * TILT_SPEED * dt;

		// Gravity along tilted surface
		const ax = Math.sin(s.tiltZ) * GRAVITY;
		const az = Math.sin(s.tiltX) * GRAVITY;

		s.vx += ax * dt;
		s.vz += az * dt;

		// Friction
		s.vx *= FRICTION;
		s.vz *= FRICTION;

		// Move
		s.x += s.vx * dt;
		s.z += s.vz * dt;

		// Platform bounds check
		const size = this.currentLevel.size;

		if (
			s.x < -size - 0.5 ||
			s.x > size + 0.5 ||
			s.z < -size - 0.5 ||
			s.z > size + 0.5
		) {
			s.phase = "fell";

			return;
		}

		// Edge bounce
		if (s.x < -size + MARBLE_RADIUS) {
			s.x = -size + MARBLE_RADIUS;
			s.vx = Math.abs(s.vx) * 0.4;
		}

		if (s.x > size - MARBLE_RADIUS) {
			s.x = size - MARBLE_RADIUS;
			s.vx = -Math.abs(s.vx) * 0.4;
		}

		if (s.z < -size + MARBLE_RADIUS) {
			s.z = -size + MARBLE_RADIUS;
			s.vz = Math.abs(s.vz) * 0.4;
		}

		if (s.z > size - MARBLE_RADIUS) {
			s.z = size - MARBLE_RADIUS;
			s.vz = -Math.abs(s.vz) * 0.4;
		}

		// Gem collection
		for (const gem of this.gems) {
			if (gem.collected) continue;

			const dx = s.x - gem.x;
			const dz = s.z - gem.z;

			if (dx * dx + dz * dz < 0.5 * 0.5) {
				gem.collected = true;
				s.gems++;
			}
		}

		// Goal check
		const gdx = s.x - this.currentLevel.goalX;
		const gdz = s.z - this.currentLevel.goalZ;

		if (gdx * gdx + gdz * gdz < 0.6 * 0.6 && s.gems >= s.totalGems) {
			s.phase = "won";
		}
	}

	// ── Render ───────────────────────────────────────────────────────────

	private render(): void {
		const { gl, canvas, state: s } = this;
		const time = performance.now() / 1000;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		// Projection
		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 200);

		// View
		const viewMatrix = this.camera.getViewMatrix();
		const camPos = this.camera.getPosition();

		gl.uniformMatrix4fv(this.uView, false, viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.4, 0.8, 0.3);
		gl.uniform3f(this.uCameraPos, camPos[0], camPos[1], camPos[2]);

		// ── Platform ─────────────────────────────────────────────────
		const size = this.currentLevel.size;

		Mat4.identity(this.modelMatrix);
		Mat4.rotateX(this.modelMatrix, this.modelMatrix, s.tiltX);
		Mat4.rotateZ(this.modelMatrix, this.modelMatrix, s.tiltZ);
		Mat4.scale(this.modelMatrix, this.modelMatrix, [size * 2, 1, size * 2]);

		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, 0.25, 0.3, 0.4);
		this.drawMesh(this.planeMesh);

		// ── Platform edges (thin cubes) ──────────────────────────────
		this.drawEdge(-size, 0, 0, 0.1, 0.15, size);
		this.drawEdge(size, 0, 0, 0.1, 0.15, size);
		this.drawEdge(0, 0, -size, size, 0.15, 0.1);
		this.drawEdge(0, 0, size, size, 0.15, 0.1);

		// ── Marble ───────────────────────────────────────────────────
		Mat4.identity(this.modelMatrix);
		// Apply platform tilt to marble position
		const tiltMat = Mat4.create();

		Mat4.rotateX(tiltMat, tiltMat, s.tiltX);
		Mat4.rotateZ(tiltMat, tiltMat, s.tiltZ);
		const marbleWorld = Vec3.create(s.x, s.y, s.z);
		const transformed = Vec3.create();

		// Manual mat4 × vec3 transform
		transformed[0] =
			tiltMat[0] * marbleWorld[0] +
			tiltMat[4] * marbleWorld[1] +
			tiltMat[8] * marbleWorld[2] +
			tiltMat[12];
		transformed[1] =
			tiltMat[1] * marbleWorld[0] +
			tiltMat[5] * marbleWorld[1] +
			tiltMat[9] * marbleWorld[2] +
			tiltMat[13];
		transformed[2] =
			tiltMat[2] * marbleWorld[0] +
			tiltMat[6] * marbleWorld[1] +
			tiltMat[10] * marbleWorld[2] +
			tiltMat[14];

		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, transformed);

		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, 0.9, 0.2, 0.2);
		this.drawMesh(this.sphereMesh);

		// ── Gems ─────────────────────────────────────────────────────
		for (const gem of this.gems) {
			if (gem.collected) continue;

			const gemWorld = Vec3.create(gem.x, 0.25, gem.z);
			const gemT = Vec3.create();

			gemT[0] =
				tiltMat[0] * gemWorld[0] +
				tiltMat[4] * gemWorld[1] +
				tiltMat[8] * gemWorld[2] +
				tiltMat[12];
			gemT[1] =
				tiltMat[1] * gemWorld[0] +
				tiltMat[5] * gemWorld[1] +
				tiltMat[9] * gemWorld[2] +
				tiltMat[13];
			gemT[2] =
				tiltMat[2] * gemWorld[0] +
				tiltMat[6] * gemWorld[1] +
				tiltMat[10] * gemWorld[2] +
				tiltMat[14];

			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, gemT);
			Mat4.rotateY(this.modelMatrix, this.modelMatrix, time * 2);
			Mat4.scale(this.modelMatrix, this.modelMatrix, [0.15, 0.15, 0.15]);

			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 1.0, 0.85, 0.0);
			this.drawMesh(this.cubeMesh);
		}

		// ── Goal marker ──────────────────────────────────────────────
		const allCollected = s.gems >= s.totalGems;
		const goalWorld = Vec3.create(
			this.currentLevel.goalX,
			0.05,
			this.currentLevel.goalZ,
		);
		const goalT = Vec3.create();

		goalT[0] =
			tiltMat[0] * goalWorld[0] +
			tiltMat[4] * goalWorld[1] +
			tiltMat[8] * goalWorld[2] +
			tiltMat[12];
		goalT[1] =
			tiltMat[1] * goalWorld[0] +
			tiltMat[5] * goalWorld[1] +
			tiltMat[9] * goalWorld[2] +
			tiltMat[13];
		goalT[2] =
			tiltMat[2] * goalWorld[0] +
			tiltMat[6] * goalWorld[1] +
			tiltMat[10] * goalWorld[2] +
			tiltMat[14];

		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, goalT);
		Mat4.scale(this.modelMatrix, this.modelMatrix, [0.5, 0.05, 0.5]);

		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);

		if (allCollected) {
			gl.uniform3f(this.uColor, 0.2, 0.9, 0.3);
		} else {
			gl.uniform3f(this.uColor, 0.4, 0.4, 0.4);
		}

		this.drawMesh(this.cubeMesh);

		// ── HUD (2D overlay via separate canvas or DOM would be better,
		//    but for simplicity we disable depth and draw screen-aligned) ──
		// We skip canvas HUD since we're pure WebGL. Status is shown via
		// the goal marker color (green = ready, gray = collect gems first).
	}

	private drawEdge(
		x: number,
		y: number,
		z: number,
		sx: number,
		sy: number,
		sz: number,
	): void {
		const { gl, state: s } = this;

		Mat4.identity(this.modelMatrix);
		Mat4.rotateX(this.modelMatrix, this.modelMatrix, s.tiltX);
		Mat4.rotateZ(this.modelMatrix, this.modelMatrix, s.tiltZ);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
		Mat4.scale(this.modelMatrix, this.modelMatrix, [sx, sy, sz]);

		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, 0.35, 0.4, 0.5);
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
