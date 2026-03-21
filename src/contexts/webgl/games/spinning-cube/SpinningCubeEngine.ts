import type { GameInstance } from "@core/GameInterface";
import {
	createProgram,
	createBuffer,
	createVAO,
	Mat4,
	OrbitalCamera,
} from "@webgl/shared";
import { createCube } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";

export class SpinningCubeEngine implements GameInstance {
	private gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private running = false;
	private rafId = 0;
	private startTime = 0;

	// GL resources
	private program: WebGLProgram;
	private vao: WebGLVertexArrayObject;
	private indexCount: number;

	// Uniform locations
	private uModel: WebGLUniformLocation;
	private uView: WebGLUniformLocation;
	private uProjection: WebGLUniformLocation;
	private uLightDir: WebGLUniformLocation;
	private uTime: WebGLUniformLocation;

	// Matrices
	private modelMatrix = Mat4.create();
	private projMatrix = Mat4.create();

	// Camera
	private camera: OrbitalCamera;

	// Resize
	private resizeHandler: () => void;
	private onExit: () => void;
	private keyHandler: (e: KeyboardEvent) => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.canvas = canvas;
		this.onExit = onExit;

		const gl = canvas.getContext("webgl2");

		if (!gl) throw new Error("WebGL2 not supported");

		this.gl = gl;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		// Compile shaders + link program
		this.program = createProgram(gl, VERT_SRC, FRAG_SRC);

		// Get uniform locations
		this.uModel = gl.getUniformLocation(this.program, "uModel")!;
		this.uView = gl.getUniformLocation(this.program, "uView")!;
		this.uProjection = gl.getUniformLocation(this.program, "uProjection")!;
		this.uLightDir = gl.getUniformLocation(this.program, "uLightDir")!;
		this.uTime = gl.getUniformLocation(this.program, "uTime")!;

		// Create cube geometry
		const cube = createCube(1.5);

		this.indexCount = cube.indices.length;

		// Set up VAO
		this.vao = createVAO(gl);
		gl.bindVertexArray(this.vao);

		// Position buffer → attribute 0
		const posBuf = createBuffer(gl, cube.positions);

		gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		// Normal buffer → attribute 1
		const normBuf = createBuffer(gl, cube.normals);

		gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

		// Index buffer
		const idxBuf = createBuffer(gl, cube.indices, gl.ELEMENT_ARRAY_BUFFER);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);

		gl.bindVertexArray(null);

		// Camera (orbital — drag to rotate, scroll to zoom)
		this.camera = new OrbitalCamera(canvas, {
			distance: 4,
			elevation: 0.4,
			azimuth: 0.6,
		});

		// GL state
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.04, 0.04, 0.1, 1.0);

		// Resize
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);
		};
		window.addEventListener("resize", this.resizeHandler);
		gl.viewport(0, 0, canvas.width, canvas.height);

		// ESC to exit
		this.keyHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				this.onExit();
			}
		};
		window.addEventListener("keydown", this.keyHandler);
	}

	start(): void {
		this.running = true;
		this.startTime = performance.now() / 1000;
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

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private render(): void {
		const { gl, canvas } = this;
		const time = performance.now() / 1000 - this.startTime;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		// Model matrix — gentle auto-rotation
		Mat4.identity(this.modelMatrix);
		Mat4.rotateY(this.modelMatrix, this.modelMatrix, time * 0.5);
		Mat4.rotateX(this.modelMatrix, this.modelMatrix, time * 0.3);

		// Projection matrix
		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 100);

		// View matrix from orbital camera
		const viewMatrix = this.camera.getViewMatrix();

		// Upload uniforms
		gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
		gl.uniformMatrix4fv(this.uView, false, viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.5, 0.7, 0.5); // normalized-ish light direction
		gl.uniform1f(this.uTime, time);

		// Draw cube
		gl.bindVertexArray(this.vao);
		gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
		gl.bindVertexArray(null);
	}
}
