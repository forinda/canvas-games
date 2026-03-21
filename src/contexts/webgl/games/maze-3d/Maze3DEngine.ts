import type { GameInstance } from "@core/GameInterface";
import {
	createProgram,
	createBuffer,
	createVAO,
	Mat4,
	FPSCamera,
} from "@webgl/shared";
import { createCube } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import { generateMaze } from "./mazeGen";
import {
	CELL_SIZE,
	WALL_HEIGHT,
	WALL_THICK,
	PLAYER_RADIUS,
	PLAYER_HEIGHT,
	getMazeSize,
	type Maze3DState,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class Maze3DEngine implements GameInstance {
	private gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private program: WebGLProgram;
	private cubeMesh: Mesh;

	private uModel: WebGLUniformLocation;
	private uView: WebGLUniformLocation;
	private uProjection: WebGLUniformLocation;
	private uLightDir: WebGLUniformLocation;
	private uColor: WebGLUniformLocation;
	private uCameraPos: WebGLUniformLocation;
	private uFogDensity: WebGLUniformLocation;

	private modelMatrix = Mat4.create();
	private projMatrix = Mat4.create();

	private camera: FPSCamera;
	private state: Maze3DState;

	private resizeHandler: () => void;
	private keyHandler: (e: KeyboardEvent) => void;
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
		this.uFogDensity = gl.getUniformLocation(this.program, "uFogDensity")!;

		this.cubeMesh = this.buildMesh(gl, createCube(1));

		// Initialize level
		this.state = this.createLevel(0);

		// FPS camera at player start
		this.camera = new FPSCamera(canvas, {
			position: [
				this.state.playerCol * CELL_SIZE + CELL_SIZE / 2,
				PLAYER_HEIGHT,
				this.state.playerRow * CELL_SIZE + CELL_SIZE / 2,
			],
			moveSpeed: 4,
			lookSensitivity: 0.002,
		});

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.02, 0.02, 0.06, 1.0);

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);
		};
		window.addEventListener("resize", this.resizeHandler);
		gl.viewport(0, 0, canvas.width, canvas.height);

		this.keyHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();

				// Release pointer lock first
				if (document.pointerLockElement === canvas) {
					document.exitPointerLock();
				}

				this.onExit();
			}

			if (
				(e.code === "Space" || e.code === "Enter") &&
				this.state.phase === "won"
			) {
				this.advanceLevel();
			}
		};
		window.addEventListener("keydown", this.keyHandler);
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
		window.removeEventListener("keydown", this.keyHandler);
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

	// ── Level ────────────────────────────────────────────────────────────

	private createLevel(level: number): Maze3DState {
		const { rows, cols } = getMazeSize(level);
		const grid = generateMaze(rows, cols);

		return {
			grid,
			rows,
			cols,
			playerRow: 0,
			playerCol: 0,
			exitRow: rows - 1,
			exitCol: cols - 1,
			phase: "playing",
			level,
			timer: 0,
		};
	}

	private advanceLevel(): void {
		this.state = this.createLevel(this.state.level + 1);

		// Reset camera position
		this.camera.dispose();
		this.camera = new FPSCamera(this.canvas, {
			position: [CELL_SIZE / 2, PLAYER_HEIGHT, CELL_SIZE / 2],
			moveSpeed: 4,
			lookSensitivity: 0.002,
		});
	}

	// ── Update ───────────────────────────────────────────────────────────

	private update(dt: number): void {
		if (this.state.phase !== "playing") return;

		this.state.timer += dt;

		const pos = this.camera.getPosition();

		// Move camera
		this.camera.update(dt);

		// Collision: push camera out of walls
		this.resolveCollisions(pos);

		// Keep camera at player height
		pos[1] = PLAYER_HEIGHT;

		// Update player grid position
		this.state.playerCol = Math.floor(pos[0] / CELL_SIZE);
		this.state.playerRow = Math.floor(pos[2] / CELL_SIZE);

		// Clamp to grid
		this.state.playerCol = Math.max(
			0,
			Math.min(this.state.cols - 1, this.state.playerCol),
		);
		this.state.playerRow = Math.max(
			0,
			Math.min(this.state.rows - 1, this.state.playerRow),
		);

		// Win check
		if (
			this.state.playerRow === this.state.exitRow &&
			this.state.playerCol === this.state.exitCol
		) {
			this.state.phase = "won";
		}
	}

	private resolveCollisions(pos: Float32Array): void {
		const { grid, rows, cols } = this.state;
		const r = PLAYER_RADIUS;

		// Check the cell the player is in and adjacent cells
		const col = Math.floor(pos[0] / CELL_SIZE);
		const row = Math.floor(pos[2] / CELL_SIZE);

		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				const cr = row + dr;
				const cc = col + dc;

				if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) {
					// Push out of world bounds
					if (pos[0] < r) pos[0] = r;

					if (pos[2] < r) pos[2] = r;

					if (pos[0] > cols * CELL_SIZE - r) pos[0] = cols * CELL_SIZE - r;

					if (pos[2] > rows * CELL_SIZE - r) pos[2] = rows * CELL_SIZE - r;

					continue;
				}

				const cell = grid[cr][cc];
				const cx = cc * CELL_SIZE;
				const cz = cr * CELL_SIZE;

				// North wall (z = cz)
				if (cell.walls.north && pos[2] < cz + r && pos[2] > cz - r) {
					if (pos[0] > cx && pos[0] < cx + CELL_SIZE) {
						pos[2] = cz + r;
					}
				}

				// South wall (z = cz + CELL_SIZE)
				if (
					cell.walls.south &&
					pos[2] > cz + CELL_SIZE - r &&
					pos[2] < cz + CELL_SIZE + r
				) {
					if (pos[0] > cx && pos[0] < cx + CELL_SIZE) {
						pos[2] = cz + CELL_SIZE - r;
					}
				}

				// West wall (x = cx)
				if (cell.walls.west && pos[0] < cx + r && pos[0] > cx - r) {
					if (pos[2] > cz && pos[2] < cz + CELL_SIZE) {
						pos[0] = cx + r;
					}
				}

				// East wall (x = cx + CELL_SIZE)
				if (
					cell.walls.east &&
					pos[0] > cx + CELL_SIZE - r &&
					pos[0] < cx + CELL_SIZE + r
				) {
					if (pos[2] > cz && pos[2] < cz + CELL_SIZE) {
						pos[0] = cx + CELL_SIZE - r;
					}
				}
			}
		}
	}

	// ── Render ───────────────────────────────────────────────────────────

	private render(): void {
		const { gl, canvas, state } = this;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 3, aspect, 0.1, 200);

		const viewMatrix = this.camera.getViewMatrix();
		const camPos = this.camera.getPosition();

		gl.uniformMatrix4fv(this.uView, false, viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.3, 0.8, 0.2);
		gl.uniform3f(this.uCameraPos, camPos[0], camPos[1], camPos[2]);
		gl.uniform1f(this.uFogDensity, 0.06);

		// ── Floor ────────────────────────────────────────────────────
		const totalW = state.cols * CELL_SIZE;
		const totalH = state.rows * CELL_SIZE;

		this.drawBox(
			totalW / 2,
			-0.05,
			totalH / 2,
			totalW / 2,
			0.05,
			totalH / 2,
			0.15,
			0.18,
			0.22,
		);

		// ── Ceiling ──────────────────────────────────────────────────
		this.drawBox(
			totalW / 2,
			WALL_HEIGHT + 0.05,
			totalH / 2,
			totalW / 2,
			0.05,
			totalH / 2,
			0.08,
			0.08,
			0.12,
		);

		// ── Walls ────────────────────────────────────────────────────
		const hw = WALL_THICK / 2;
		const hh = WALL_HEIGHT / 2;

		for (let r = 0; r < state.rows; r++) {
			for (let c = 0; c < state.cols; c++) {
				const cell = state.grid[r][c];
				const cx = c * CELL_SIZE;
				const cz = r * CELL_SIZE;

				// North wall
				if (cell.walls.north) {
					this.drawBox(
						cx + CELL_SIZE / 2,
						hh,
						cz,
						CELL_SIZE / 2,
						hh,
						hw,
						0.3,
						0.25,
						0.35,
					);
				}

				// West wall
				if (cell.walls.west) {
					this.drawBox(
						cx,
						hh,
						cz + CELL_SIZE / 2,
						hw,
						hh,
						CELL_SIZE / 2,
						0.28,
						0.23,
						0.33,
					);
				}

				// South wall (only draw for last row)
				if (r === state.rows - 1 && cell.walls.south) {
					this.drawBox(
						cx + CELL_SIZE / 2,
						hh,
						cz + CELL_SIZE,
						CELL_SIZE / 2,
						hh,
						hw,
						0.3,
						0.25,
						0.35,
					);
				}

				// East wall (only draw for last column)
				if (c === state.cols - 1 && cell.walls.east) {
					this.drawBox(
						cx + CELL_SIZE,
						hh,
						cz + CELL_SIZE / 2,
						hw,
						hh,
						CELL_SIZE / 2,
						0.28,
						0.23,
						0.33,
					);
				}
			}
		}

		// ── Exit marker (glowing green pillar) ───────────────────────
		const exitX = state.exitCol * CELL_SIZE + CELL_SIZE / 2;
		const exitZ = state.exitRow * CELL_SIZE + CELL_SIZE / 2;
		const pulse = 0.5 + Math.sin(performance.now() * 0.003) * 0.3;

		this.drawBox(
			exitX,
			0.5,
			exitZ,
			0.2,
			0.5,
			0.2,
			0.1 * pulse,
			0.9 * pulse,
			0.2 * pulse,
		);
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
