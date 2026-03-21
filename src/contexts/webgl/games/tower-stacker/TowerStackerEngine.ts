import type { GameInstance } from "@core/GameInterface";
import { createProgram, createBuffer, createVAO, Mat4 } from "@webgl/shared";
import { createCube } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import {
	BLOCK_HEIGHT,
	START_SIZE,
	SWING_SPEED_INIT,
	SWING_SPEED_INC,
	SWING_SPEED_MAX,
	SWING_RANGE,
	FALL_SPEED,
	FALL_ROTATE_SPEED,
	type Block,
	type StackerState,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class TowerStackerEngine implements GameInstance {
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
	private uAlpha: WebGLUniformLocation;

	private modelMatrix = Mat4.create();
	private viewMatrix = Mat4.create();
	private projMatrix = Mat4.create();

	private state: StackerState;
	private cameraY = 5;
	private targetCameraY = 5;

	private resizeHandler: () => void;
	private keyDownHandler: (e: KeyboardEvent) => void;
	private touchHandler: ((e: TouchEvent) => void) | null = null;
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
		this.uAlpha = gl.getUniformLocation(this.program, "uAlpha")!;

		this.cubeMesh = this.buildMesh(gl, createCube(1));

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.clearColor(0.05, 0.05, 0.12, 1.0);

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
			}

			if (e.code === "Space" || e.code === "Enter") {
				e.preventDefault();
				this.handleDrop();
			}
		};
		window.addEventListener("keydown", this.keyDownHandler);

		// Touch: tap anywhere to drop
		const isTouchDevice =
			"ontouchstart" in window || navigator.maxTouchPoints > 0;

		if (isTouchDevice) {
			this.touchHandler = (e: TouchEvent) => {
				e.preventDefault();
				this.handleDrop();
			};
			canvas.addEventListener("touchstart", this.touchHandler, {
				passive: false,
			});
		}
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

		if (this.touchHandler) {
			this.canvas.removeEventListener("touchstart", this.touchHandler);
		}
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

	private createState(): StackerState {
		const baseBlock: Block = {
			x: 0,
			z: 0,
			w: START_SIZE,
			d: START_SIZE,
			y: 0,
			r: 0.4,
			g: 0.4,
			b: 0.5,
		};

		this.cameraY = 5;
		this.targetCameraY = 5;

		return {
			stack: [baseBlock],
			fallingPieces: [],
			currentX: 0,
			currentZ: 0,
			currentW: START_SIZE,
			currentD: START_SIZE,
			swingOnX: true,
			swingPos: 0,
			swingSpeed: SWING_SPEED_INIT,
			score: 0,
			phase: "playing",
			perfectStreak: 0,
		};
	}

	private handleDrop(): void {
		const s = this.state;

		if (s.phase === "gameover") {
			this.state = this.createState();

			return;
		}

		if (s.phase !== "playing") return;

		const top = s.stack[s.stack.length - 1];
		const newY = s.stack.length * BLOCK_HEIGHT;
		const color = this.levelColor(s.stack.length);

		if (s.swingOnX) {
			// Compute overlap on X axis
			const newX = s.swingPos;
			const overlapLeft = Math.max(newX - s.currentW / 2, top.x - top.w / 2);
			const overlapRight = Math.min(newX + s.currentW / 2, top.x + top.w / 2);
			const overlapW = overlapRight - overlapLeft;

			if (overlapW <= 0.05) {
				// Missed completely
				s.fallingPieces.push({
					x: newX,
					z: s.currentZ,
					w: s.currentW,
					d: s.currentD,
					y: newY,
					vy: 0,
					rotation: 0,
					...color,
				});
				s.phase = "gameover";

				return;
			}

			// Perfect check (within 0.1 tolerance)
			const isPerfect = Math.abs(overlapW - s.currentW) < 0.1;

			if (isPerfect) {
				s.perfectStreak++;
				// Perfect placement — keep full width
				s.stack.push({
					x: top.x,
					z: s.currentZ,
					w: s.currentW,
					d: s.currentD,
					y: newY,
					...color,
				});
			} else {
				s.perfectStreak = 0;
				const overlapCenterX = (overlapLeft + overlapRight) / 2;

				// Add the kept block
				s.stack.push({
					x: overlapCenterX,
					z: s.currentZ,
					w: overlapW,
					d: s.currentD,
					y: newY,
					...color,
				});

				// Create falling offcut
				const cutW = s.currentW - overlapW;
				const cutX =
					newX > top.x ? overlapRight + cutW / 2 : overlapLeft - cutW / 2;

				s.fallingPieces.push({
					x: cutX,
					z: s.currentZ,
					w: cutW,
					d: s.currentD,
					y: newY,
					vy: 0,
					rotation: 0,
					...color,
				});

				s.currentW = overlapW;
				s.currentX = overlapCenterX;
			}
		} else {
			// Compute overlap on Z axis
			const newZ = s.swingPos;
			const overlapFront = Math.max(newZ - s.currentD / 2, top.z - top.d / 2);
			const overlapBack = Math.min(newZ + s.currentD / 2, top.z + top.d / 2);
			const overlapD = overlapBack - overlapFront;

			if (overlapD <= 0.05) {
				s.fallingPieces.push({
					x: s.currentX,
					z: newZ,
					w: s.currentW,
					d: s.currentD,
					y: newY,
					vy: 0,
					rotation: 0,
					...color,
				});
				s.phase = "gameover";

				return;
			}

			const isPerfect = Math.abs(overlapD - s.currentD) < 0.1;

			if (isPerfect) {
				s.perfectStreak++;
				s.stack.push({
					x: s.currentX,
					z: top.z,
					w: s.currentW,
					d: s.currentD,
					y: newY,
					...color,
				});
			} else {
				s.perfectStreak = 0;
				const overlapCenterZ = (overlapFront + overlapBack) / 2;

				s.stack.push({
					x: s.currentX,
					z: overlapCenterZ,
					w: s.currentW,
					d: overlapD,
					y: newY,
					...color,
				});

				const cutD = s.currentD - overlapD;
				const cutZ =
					newZ > top.z ? overlapBack + cutD / 2 : overlapFront - cutD / 2;

				s.fallingPieces.push({
					x: s.currentX,
					z: cutZ,
					w: s.currentW,
					d: cutD,
					y: newY,
					vy: 0,
					rotation: 0,
					...color,
				});

				s.currentD = overlapD;
				s.currentZ = overlapCenterZ;
			}
		}

		s.score++;
		s.swingOnX = !s.swingOnX;
		s.swingPos = s.swingOnX ? -SWING_RANGE : -SWING_RANGE;
		s.swingSpeed = Math.min(SWING_SPEED_MAX, s.swingSpeed + SWING_SPEED_INC);

		// Update current position from new top
		const newTop = s.stack[s.stack.length - 1];

		s.currentX = newTop.x;
		s.currentZ = newTop.z;

		// Raise camera
		this.targetCameraY = newTop.y + 5;
	}

	private levelColor(level: number): { r: number; g: number; b: number } {
		const hue = (level * 37) % 360;
		const s = 0.6;
		const l = 0.55;

		// HSL to RGB
		const c = (1 - Math.abs(2 * l - 1)) * s;
		const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
		const m = l - c / 2;
		let r = 0;
		let g = 0;
		let b = 0;

		if (hue < 60) {
			r = c;
			g = x;
		} else if (hue < 120) {
			r = x;
			g = c;
		} else if (hue < 180) {
			g = c;
			b = x;
		} else if (hue < 240) {
			g = x;
			b = c;
		} else if (hue < 300) {
			r = x;
			b = c;
		} else {
			r = c;
			b = x;
		}

		return { r: r + m, g: g + m, b: b + m };
	}

	// ── Update ───────────────────────────────────────────────────────────

	private update(dt: number): void {
		const s = this.state;

		// Smooth camera follow
		this.cameraY += (this.targetCameraY - this.cameraY) * 2 * dt;

		// Swing the current block
		if (s.phase === "playing") {
			s.swingPos += s.swingSpeed * dt;

			if (s.swingPos > SWING_RANGE) {
				s.swingPos = SWING_RANGE;
				s.swingSpeed = -Math.abs(s.swingSpeed);
			} else if (s.swingPos < -SWING_RANGE) {
				s.swingPos = -SWING_RANGE;
				s.swingSpeed = Math.abs(s.swingSpeed);
			}
		}

		// Animate falling pieces
		for (let i = s.fallingPieces.length - 1; i >= 0; i--) {
			const p = s.fallingPieces[i];

			p.vy -= FALL_SPEED * dt;
			p.y += p.vy * dt;
			p.rotation += FALL_ROTATE_SPEED * dt;

			if (p.y < -10) {
				s.fallingPieces.splice(i, 1);
			}
		}
	}

	// ── Render ───────────────────────────────────────────────────────────

	private render(): void {
		const { gl, canvas, state: s } = this;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 5, aspect, 0.1, 200);

		// Camera looking at the tower from an angle
		const camX = 6;
		const camZ = 6;

		Mat4.lookAt(
			this.viewMatrix,
			[camX, this.cameraY, camZ],
			[0, this.cameraY - 3, 0],
			[0, 1, 0],
		);

		gl.uniformMatrix4fv(this.uView, false, this.viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.4, 0.8, 0.3);
		gl.uniform3f(this.uCameraPos, camX, this.cameraY, camZ);
		gl.uniform1f(this.uAlpha, 1.0);

		// ── Stacked blocks ───────────────────────────────────────────
		for (const block of s.stack) {
			this.drawBlock(
				block.x,
				block.y + BLOCK_HEIGHT / 2,
				block.z,
				block.w / 2,
				BLOCK_HEIGHT / 2,
				block.d / 2,
				block.r,
				block.g,
				block.b,
				0,
			);
		}

		// ── Current swinging block ───────────────────────────────────
		if (s.phase === "playing") {
			const newY = s.stack.length * BLOCK_HEIGHT;
			const color = this.levelColor(s.stack.length);
			const sx = s.swingOnX ? s.swingPos : s.currentX;
			const sz = s.swingOnX ? s.currentZ : s.swingPos;

			// Slightly transparent to show it's not placed yet
			gl.uniform1f(this.uAlpha, 0.85);
			this.drawBlock(
				sx,
				newY + BLOCK_HEIGHT / 2,
				sz,
				s.currentW / 2,
				BLOCK_HEIGHT / 2,
				s.currentD / 2,
				color.r,
				color.g,
				color.b,
				0,
			);
			gl.uniform1f(this.uAlpha, 1.0);
		}

		// ── Falling offcut pieces ────────────────────────────────────
		for (const p of s.fallingPieces) {
			gl.uniform1f(this.uAlpha, 0.7);
			this.drawBlock(
				p.x,
				p.y + BLOCK_HEIGHT / 2,
				p.z,
				p.w / 2,
				BLOCK_HEIGHT / 2,
				p.d / 2,
				p.r,
				p.g,
				p.b,
				p.rotation,
			);
		}

		gl.uniform1f(this.uAlpha, 1.0);
	}

	private drawBlock(
		x: number,
		y: number,
		z: number,
		sx: number,
		sy: number,
		sz: number,
		r: number,
		g: number,
		b: number,
		rotation: number,
	): void {
		const { gl } = this;

		Mat4.identity(this.modelMatrix);
		Mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);

		if (rotation !== 0) {
			Mat4.rotateX(this.modelMatrix, this.modelMatrix, rotation);
			Mat4.rotateZ(this.modelMatrix, this.modelMatrix, rotation * 0.7);
		}

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
