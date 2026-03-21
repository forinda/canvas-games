import type { GameInstance } from "@core/GameInterface";
import {
	createProgram,
	createBuffer,
	createVAO,
	Mat4,
	OrbitalCamera,
} from "@webgl/shared";
import { createCube, createPlane } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import {
	GRID_SIZE,
	VOXEL_SIZE,
	BLOCK_TYPES,
	type Voxel,
	type VoxelBuilderState,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class VoxelBuilderEngine implements GameInstance {
	private gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private running = false;
	private rafId = 0;

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
	private uAlpha: WebGLUniformLocation;

	private modelMatrix = Mat4.create();
	private projMatrix = Mat4.create();
	private camera: OrbitalCamera;

	private state: VoxelBuilderState;

	private resizeHandler: () => void;
	private keyDownHandler: (e: KeyboardEvent) => void;
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
		this.uAlpha = gl.getUniformLocation(this.program, "uAlpha")!;

		this.cubeMesh = this.buildMesh(gl, createCube(VOXEL_SIZE));
		this.planeMesh = this.buildMesh(gl, createPlane(1, 1));

		const center = (GRID_SIZE * VOXEL_SIZE) / 2;

		this.camera = new OrbitalCamera(canvas, {
			distance: 20,
			elevation: 0.6,
			azimuth: 0.4,
			target: [center, 3, center],
			minDistance: 8,
			maxDistance: 40,
		});

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.clearColor(0.55, 0.7, 0.85, 1.0);

		this.state = this.createState();

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);
		};
		window.addEventListener("resize", this.resizeHandler);
		gl.viewport(0, 0, canvas.width, canvas.height);

		this.keyDownHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				this.onExit();

				return;
			}

			const s = this.state;

			// Cursor movement
			if (e.code === "ArrowLeft" || e.code === "KeyA") {
				s.cursorX = Math.max(0, s.cursorX - 1);
			} else if (e.code === "ArrowRight" || e.code === "KeyD") {
				s.cursorX = Math.min(GRID_SIZE - 1, s.cursorX + 1);
			} else if (e.code === "ArrowUp" || e.code === "KeyW") {
				s.cursorZ = Math.max(0, s.cursorZ - 1);
			} else if (e.code === "ArrowDown" || e.code === "KeyS") {
				s.cursorZ = Math.min(GRID_SIZE - 1, s.cursorZ + 1);
			} else if (e.code === "KeyQ") {
				s.cursorY = Math.max(0, s.cursorY - 1);
			} else if (e.code === "KeyE") {
				s.cursorY = Math.min(GRID_SIZE - 1, s.cursorY + 1);
			}

			// Place block
			if (e.code === "Space" || e.code === "Enter") {
				e.preventDefault();
				const { cursorX: cx, cursorY: cy, cursorZ: cz } = s;

				if (!s.grid[cy][cz][cx]) {
					s.grid[cy][cz][cx] = { typeIdx: s.selectedType };
					s.blockCount++;
				}
			}

			// Remove block
			if (e.code === "KeyX" || e.code === "Backspace" || e.code === "Delete") {
				const { cursorX: cx, cursorY: cy, cursorZ: cz } = s;

				if (s.grid[cy][cz][cx]) {
					s.grid[cy][cz][cx] = null;
					s.blockCount--;
				}
			}

			// Block type selection (1-8)
			const num = parseInt(e.key);

			if (num >= 1 && num <= BLOCK_TYPES.length) {
				s.selectedType = num - 1;
			}

			// Clear all
			if (e.code === "KeyC" && e.ctrlKey) {
				for (let y = 0; y < GRID_SIZE; y++) {
					for (let z = 0; z < GRID_SIZE; z++) {
						for (let x = 0; x < GRID_SIZE; x++) {
							s.grid[y][z][x] = null;
						}
					}
				}

				s.blockCount = 0;
			}
		};
		window.addEventListener("keydown", this.keyDownHandler);
	}

	start(): void {
		this.running = true;
		this.loop();
	}

	destroy(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		this.camera.dispose();
		window.removeEventListener("resize", this.resizeHandler);
		window.removeEventListener("keydown", this.keyDownHandler);
	}

	private loop(): void {
		if (!this.running) return;

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private createState(): VoxelBuilderState {
		const grid: (Voxel | null)[][][] = [];

		for (let y = 0; y < GRID_SIZE; y++) {
			const layer: (Voxel | null)[][] = [];

			for (let z = 0; z < GRID_SIZE; z++) {
				const row: (Voxel | null)[] = [];

				for (let x = 0; x < GRID_SIZE; x++) {
					row.push(null);
				}

				layer.push(row);
			}

			grid.push(layer);
		}

		return {
			grid,
			selectedType: 0,
			cursorX: Math.floor(GRID_SIZE / 2),
			cursorY: 0,
			cursorZ: Math.floor(GRID_SIZE / 2),
			blockCount: 0,
		};
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
		gl.uniform3f(this.uLightDir, 0.4, 0.8, 0.3);
		gl.uniform3f(this.uCameraPos, camPos[0], camPos[1], camPos[2]);
		gl.uniform1f(this.uEmissive, 0.0);
		gl.uniform1f(this.uAlpha, 1.0);

		// ── Ground grid ──────────────────────────────────────────────
		const gridExtent = GRID_SIZE * VOXEL_SIZE;

		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [
			gridExtent / 2,
			-0.01,
			gridExtent / 2,
		]);
		Mat4.scale(this.modelMatrix, this.modelMatrix, [
			gridExtent / 2,
			1,
			gridExtent / 2,
		]);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, 0.35, 0.55, 0.3);
		this.drawMesh(this.planeMesh);

		// Grid lines
		for (let i = 0; i <= GRID_SIZE; i++) {
			const pos = i * VOXEL_SIZE;

			// X-axis lines
			this.drawBoxRaw(
				gridExtent / 2,
				0.005,
				pos,
				gridExtent / 2,
				0.005,
				0.02,
				0.2,
				0.3,
				0.2,
			);
			// Z-axis lines
			this.drawBoxRaw(
				pos,
				0.005,
				gridExtent / 2,
				0.02,
				0.005,
				gridExtent / 2,
				0.2,
				0.3,
				0.2,
			);
		}

		// ── Placed voxels ────────────────────────────────────────────
		for (let y = 0; y < GRID_SIZE; y++) {
			for (let z = 0; z < GRID_SIZE; z++) {
				for (let x = 0; x < GRID_SIZE; x++) {
					const voxel = s.grid[y][z][x];

					if (!voxel) continue;

					// Skip fully occluded voxels (simple check)
					if (this.isOccluded(x, y, z)) continue;

					const bt = BLOCK_TYPES[voxel.typeIdx];
					const wx = x * VOXEL_SIZE + VOXEL_SIZE / 2;
					const wy = y * VOXEL_SIZE + VOXEL_SIZE / 2;
					const wz = z * VOXEL_SIZE + VOXEL_SIZE / 2;

					Mat4.identity(this.modelMatrix);
					Mat4.translate(this.modelMatrix, this.modelMatrix, [wx, wy, wz]);
					Mat4.scale(this.modelMatrix, this.modelMatrix, [
						(VOXEL_SIZE / 2) * 0.98,
						(VOXEL_SIZE / 2) * 0.98,
						(VOXEL_SIZE / 2) * 0.98,
					]);
					gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
					gl.uniform3f(this.uColor, bt.color[0], bt.color[1], bt.color[2]);
					gl.uniform1f(this.uAlpha, 1.0);
					this.drawMesh(this.cubeMesh);
				}
			}
		}

		// ── Cursor (transparent highlight) ───────────────────────────
		const cx = s.cursorX * VOXEL_SIZE + VOXEL_SIZE / 2;
		const cy = s.cursorY * VOXEL_SIZE + VOXEL_SIZE / 2;
		const cz = s.cursorZ * VOXEL_SIZE + VOXEL_SIZE / 2;
		const pulse = 0.3 + Math.sin(performance.now() * 0.004) * 0.15;
		const selColor = BLOCK_TYPES[s.selectedType].color;

		gl.uniform1f(this.uAlpha, pulse);
		gl.uniform1f(this.uEmissive, 0.8);

		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [cx, cy, cz]);
		Mat4.scale(this.modelMatrix, this.modelMatrix, [
			VOXEL_SIZE / 2,
			VOXEL_SIZE / 2,
			VOXEL_SIZE / 2,
		]);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, selColor[0], selColor[1], selColor[2]);
		this.drawMesh(this.cubeMesh);

		gl.uniform1f(this.uAlpha, 1.0);
		gl.uniform1f(this.uEmissive, 0.0);

		// ── Palette display (small cubes in a row) ───────────────────
		gl.uniform1f(this.uEmissive, 0.3);

		for (let i = 0; i < BLOCK_TYPES.length; i++) {
			const bt = BLOCK_TYPES[i];
			const px = i * 1.2 - (BLOCK_TYPES.length * 1.2) / 2 + gridExtent / 2;
			const isSelected = i === s.selectedType;
			const size = isSelected ? 0.4 : 0.25;

			this.drawBoxRaw(
				px,
				-0.8,
				-1.5,
				size,
				size,
				size,
				bt.color[0],
				bt.color[1],
				bt.color[2],
			);
		}

		gl.uniform1f(this.uEmissive, 0.0);
	}

	private isOccluded(x: number, y: number, z: number): boolean {
		const g = this.state.grid;

		return (
			x > 0 &&
			x < GRID_SIZE - 1 &&
			y > 0 &&
			y < GRID_SIZE - 1 &&
			z > 0 &&
			z < GRID_SIZE - 1 &&
			g[y + 1][z][x] !== null &&
			g[y - 1][z][x] !== null &&
			g[y][z + 1][x] !== null &&
			g[y][z - 1][x] !== null &&
			g[y][z][x + 1] !== null &&
			g[y][z][x - 1] !== null
		);
	}

	private drawBoxRaw(
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
