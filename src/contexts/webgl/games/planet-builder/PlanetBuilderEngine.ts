import type { GameInstance } from "@core/GameInterface";
import {
	createProgram,
	createBuffer,
	createVAO,
	Mat4,
	OrbitalCamera,
} from "@webgl/shared";
import { createSphere, createCube } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import {
	SPHERE_SEGMENTS,
	BASE_RADIUS,
	DEFORM_STRENGTH,
	DEFORM_RADIUS,
	SMOOTH_STRENGTH,
	ROTATE_SPEED,
	type PlanetState,
	type BrushMode,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class PlanetBuilderEngine implements GameInstance {
	private gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private running = false;
	private rafId = 0;

	private program: WebGLProgram;
	private cubeMesh: Mesh;
	private planetVAO: WebGLVertexArrayObject;
	private planetIndexCount: number;
	private planetPosBuffer: WebGLBuffer;
	private planetNormBuffer: WebGLBuffer;

	// Base sphere data (undeformed)
	private basePositions: Float32Array;
	private planetIndices: Uint16Array;

	// Deformed copies uploaded each frame
	private deformedPositions: Float32Array;
	private deformedNormals: Float32Array;

	private uModel: WebGLUniformLocation;
	private uView: WebGLUniformLocation;
	private uProjection: WebGLUniformLocation;
	private uLightDir: WebGLUniformLocation;
	private uColor: WebGLUniformLocation;
	private uCameraPos: WebGLUniformLocation;
	private uEmissive: WebGLUniformLocation;
	private uUsePlanetColor: WebGLUniformLocation;

	private modelMatrix = Mat4.create();
	private projMatrix = Mat4.create();
	private camera: OrbitalCamera;
	private state: PlanetState;

	private isDragging = false;
	private resizeHandler: () => void;
	private keyHandler: (e: KeyboardEvent) => void;
	private mouseDownHandler: (e: MouseEvent) => void;
	private mouseMoveHandler: (e: MouseEvent) => void;
	private mouseUpHandler: () => void;
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
		this.uUsePlanetColor = gl.getUniformLocation(
			this.program,
			"uUsePlanetColor",
		)!;

		this.cubeMesh = this.buildMesh(gl, createCube(1));

		// Build planet sphere
		const sphere = createSphere(BASE_RADIUS, SPHERE_SEGMENTS);

		this.basePositions = new Float32Array(sphere.positions);

		this.planetIndices = sphere.indices;
		this.deformedPositions = new Float32Array(sphere.positions);
		this.deformedNormals = new Float32Array(sphere.normals);
		this.planetIndexCount = sphere.indices.length;

		// Create dynamic buffers
		this.planetVAO = createVAO(gl);
		gl.bindVertexArray(this.planetVAO);

		this.planetPosBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.planetPosBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.deformedPositions, gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		this.planetNormBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.planetNormBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.deformedNormals, gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

		const idxBuf = createBuffer(gl, sphere.indices, gl.ELEMENT_ARRAY_BUFFER);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
		gl.bindVertexArray(null);

		this.camera = new OrbitalCamera(canvas, {
			distance: 3.5,
			elevation: 0.3,
			azimuth: 0,
			minDistance: 2,
			maxDistance: 8,
		});

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.02, 0.02, 0.06, 1.0);

		const vertCount = this.basePositions.length / 3;

		this.state = {
			deform: new Float32Array(vertCount),
			brushMode: "raise",
			autoRotate: true,
			rotationY: 0,
		};

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
				this.onExit();
			}

			if (e.code === "Digit1") this.state.brushMode = "raise";

			if (e.code === "Digit2") this.state.brushMode = "lower";

			if (e.code === "Digit3") this.state.brushMode = "smooth";

			if (e.code === "KeyR") {
				this.state.deform.fill(0);
				this.applyDeformation();
			}

			if (e.code === "KeyT") this.state.autoRotate = !this.state.autoRotate;
		};
		window.addEventListener("keydown", this.keyHandler);

		// Right-click drag to sculpt (left-click is orbit camera)
		this.mouseDownHandler = (e: MouseEvent) => {
			if (e.button === 2) {
				e.preventDefault();
				this.isDragging = true;
			}
		};
		this.mouseMoveHandler = (e: MouseEvent) => {
			if (!this.isDragging) return;

			this.sculptAt(e.clientX, e.clientY);
		};
		this.mouseUpHandler = () => {
			this.isDragging = false;
		};

		canvas.addEventListener("mousedown", this.mouseDownHandler);
		window.addEventListener("mousemove", this.mouseMoveHandler);
		window.addEventListener("mouseup", this.mouseUpHandler);
		canvas.addEventListener("contextmenu", (e) => e.preventDefault());
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
		window.removeEventListener("keydown", this.keyHandler);
		this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
		window.removeEventListener("mousemove", this.mouseMoveHandler);
		window.removeEventListener("mouseup", this.mouseUpHandler);
	}

	private loop(): void {
		if (!this.running) return;

		if (this.state.autoRotate) {
			this.state.rotationY += ROTATE_SPEED * (1 / 60);
		}

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private sculptAt(screenX: number, screenY: number): void {
		// Ray-sphere intersection to find sculpt point
		const rect = this.canvas.getBoundingClientRect();
		const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
		const ndcY = -(((screenY - rect.top) / rect.height) * 2 - 1);

		const aspect = this.canvas.width / this.canvas.height;
		const vp = Mat4.create();

		Mat4.perspective(vp, Math.PI / 4, aspect, 0.1, 200);
		Mat4.multiply(vp, vp, this.camera.getViewMatrix());

		// Also apply model rotation
		const model = Mat4.create();

		Mat4.rotateY(model, model, this.state.rotationY);
		Mat4.multiply(vp, vp, model);

		const invVP = Mat4.create();

		Mat4.invert(invVP, vp);

		const near = this.unproject(invVP, ndcX, ndcY, -1);
		const far = this.unproject(invVP, ndcX, ndcY, 1);

		const dirX = far[0] - near[0];
		const dirY = far[1] - near[1];
		const dirZ = far[2] - near[2];

		// Ray-sphere intersection (unit sphere at origin)
		const a = dirX * dirX + dirY * dirY + dirZ * dirZ;
		const b = 2 * (near[0] * dirX + near[1] * dirY + near[2] * dirZ);
		const c =
			near[0] * near[0] +
			near[1] * near[1] +
			near[2] * near[2] -
			(BASE_RADIUS + 0.5) * (BASE_RADIUS + 0.5);
		const disc = b * b - 4 * a * c;

		if (disc < 0) return;

		const t = (-b - Math.sqrt(disc)) / (2 * a);

		if (t < 0) return;

		const hitX = near[0] + dirX * t;
		const hitY = near[1] + dirY * t;
		const hitZ = near[2] + dirZ * t;

		// Apply brush to nearby vertices
		const vertCount = this.basePositions.length / 3;

		for (let i = 0; i < vertCount; i++) {
			const vx = this.basePositions[i * 3];
			const vy = this.basePositions[i * 3 + 1];
			const vz = this.basePositions[i * 3 + 2];

			// Angular distance on sphere surface
			const dot = vx * hitX + vy * hitY + vz * hitZ;
			const angle = Math.acos(
				Math.min(
					1,
					Math.max(
						-1,
						dot /
							(BASE_RADIUS *
								Math.sqrt(hitX * hitX + hitY * hitY + hitZ * hitZ)),
					),
				),
			);

			if (angle < DEFORM_RADIUS) {
				const falloff = 1 - angle / DEFORM_RADIUS;
				const strength = falloff * falloff;

				if (this.state.brushMode === "raise") {
					this.state.deform[i] += DEFORM_STRENGTH * strength;
				} else if (this.state.brushMode === "lower") {
					this.state.deform[i] -= DEFORM_STRENGTH * strength;
				} else {
					// Smooth: average with neighbors (simplified)
					this.state.deform[i] *= 1 - SMOOTH_STRENGTH * strength;
				}

				this.state.deform[i] = Math.max(
					-0.3,
					Math.min(0.5, this.state.deform[i]),
				);
			}
		}

		this.applyDeformation();
	}

	private applyDeformation(): void {
		const { gl } = this;
		const vertCount = this.basePositions.length / 3;

		for (let i = 0; i < vertCount; i++) {
			const bx = this.basePositions[i * 3];
			const by = this.basePositions[i * 3 + 1];
			const bz = this.basePositions[i * 3 + 2];
			const len = Math.sqrt(bx * bx + by * by + bz * bz);
			const d = this.state.deform[i];

			// Displace along normal (radial direction for sphere)
			const scale = (len + d) / len;

			this.deformedPositions[i * 3] = bx * scale;
			this.deformedPositions[i * 3 + 1] = by * scale;
			this.deformedPositions[i * 3 + 2] = bz * scale;
		}

		// Recompute normals from deformed positions
		this.deformedNormals.fill(0);

		for (let i = 0; i < this.planetIndices.length; i += 3) {
			const i0 = this.planetIndices[i];
			const i1 = this.planetIndices[i + 1];
			const i2 = this.planetIndices[i + 2];

			const ax =
				this.deformedPositions[i1 * 3] - this.deformedPositions[i0 * 3];
			const ay =
				this.deformedPositions[i1 * 3 + 1] - this.deformedPositions[i0 * 3 + 1];
			const az =
				this.deformedPositions[i1 * 3 + 2] - this.deformedPositions[i0 * 3 + 2];
			const bx =
				this.deformedPositions[i2 * 3] - this.deformedPositions[i0 * 3];
			const by =
				this.deformedPositions[i2 * 3 + 1] - this.deformedPositions[i0 * 3 + 1];
			const bz =
				this.deformedPositions[i2 * 3 + 2] - this.deformedPositions[i0 * 3 + 2];

			const nx = ay * bz - az * by;
			const ny = az * bx - ax * bz;
			const nz = ax * by - ay * bx;

			for (const idx of [i0, i1, i2]) {
				this.deformedNormals[idx * 3] += nx;
				this.deformedNormals[idx * 3 + 1] += ny;
				this.deformedNormals[idx * 3 + 2] += nz;
			}
		}

		// Normalize
		for (let i = 0; i < vertCount; i++) {
			const nx = this.deformedNormals[i * 3];
			const ny = this.deformedNormals[i * 3 + 1];
			const nz = this.deformedNormals[i * 3 + 2];
			const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

			this.deformedNormals[i * 3] = nx / len;
			this.deformedNormals[i * 3 + 1] = ny / len;
			this.deformedNormals[i * 3 + 2] = nz / len;
		}

		// Upload
		gl.bindBuffer(gl.ARRAY_BUFFER, this.planetPosBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.deformedPositions);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.planetNormBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.deformedNormals);
	}

	private unproject(
		invVP: Float32Array,
		x: number,
		y: number,
		z: number,
	): [number, number, number] {
		const w = invVP[3] * x + invVP[7] * y + invVP[11] * z + invVP[15];

		return [
			(invVP[0] * x + invVP[4] * y + invVP[8] * z + invVP[12]) / w,
			(invVP[1] * x + invVP[5] * y + invVP[9] * z + invVP[13]) / w,
			(invVP[2] * x + invVP[6] * y + invVP[10] * z + invVP[14]) / w,
		];
	}

	private render(): void {
		const { gl, canvas } = this;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 200);

		const viewMatrix = this.camera.getViewMatrix();
		const camPos = this.camera.getPosition();

		gl.uniformMatrix4fv(this.uView, false, viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.5, 0.7, 0.3);
		gl.uniform3f(this.uCameraPos, camPos[0], camPos[1], camPos[2]);
		gl.uniform1f(this.uEmissive, 0.0);
		gl.uniform1f(this.uUsePlanetColor, 1.0);

		// ── Planet ───────────────────────────────────────────────────
		Mat4.identity(this.modelMatrix);
		Mat4.rotateY(this.modelMatrix, this.modelMatrix, this.state.rotationY);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, 0.3, 0.5, 0.2);

		gl.bindVertexArray(this.planetVAO);
		gl.drawElements(gl.TRIANGLES, this.planetIndexCount, gl.UNSIGNED_SHORT, 0);
		gl.bindVertexArray(null);

		// ── Stars (small cubes far away) ─────────────────────────────
		gl.uniform1f(this.uUsePlanetColor, 0.0);
		gl.uniform1f(this.uEmissive, 1.0);

		for (let i = 0; i < 40; i++) {
			// Deterministic star positions from index
			const phi = (i * 2.399) % (Math.PI * 2);
			const theta = Math.acos(1 - 2 * ((i * 0.618) % 1));
			const dist = 15;
			const sx = Math.sin(theta) * Math.cos(phi) * dist;
			const sy = Math.sin(theta) * Math.sin(phi) * dist;
			const sz = Math.cos(theta) * dist;

			this.drawBox(sx, sy, sz, 0.03, 0.03, 0.03, 0.9, 0.9, 1.0);
		}

		gl.uniform1f(this.uEmissive, 0.0);

		// ── Brush mode indicator (small cube in corner) ──────────────
		const modeColors: Record<BrushMode, [number, number, number]> = {
			raise: [0.2, 0.8, 0.2],
			lower: [0.8, 0.2, 0.2],
			smooth: [0.2, 0.5, 0.8],
		};
		const mc = modeColors[this.state.brushMode];

		gl.uniform1f(this.uEmissive, 0.6);
		this.drawBox(-2, 2, 0, 0.15, 0.15, 0.15, mc[0], mc[1], mc[2]);
		gl.uniform1f(this.uEmissive, 0.0);
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

		gl.uniform1f(this.uUsePlanetColor, 0.0);
		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
		Mat4.scale(this.modelMatrix, this.modelMatrix, [sx, sy, sz]);
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniform3f(this.uColor, r, g, b);
		gl.bindVertexArray(this.cubeMesh.vao);
		gl.drawElements(
			gl.TRIANGLES,
			this.cubeMesh.indexCount,
			gl.UNSIGNED_SHORT,
			0,
		);
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
}
