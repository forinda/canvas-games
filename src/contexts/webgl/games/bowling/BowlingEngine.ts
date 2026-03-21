import type { GameInstance } from "@core/GameInterface";
import { createProgram, createBuffer, createVAO, Mat4 } from "@webgl/shared";
import { createCube, createSphere } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import {
	LANE_LENGTH,
	LANE_WIDTH,
	GUTTER_WIDTH,
	BALL_RADIUS,
	PIN_RADIUS,
	PIN_HEIGHT,
	BALL_MAX_SPEED,
	PIN_FALL_SPEED,
	TOTAL_FRAMES,
	PIN_POSITIONS,
	type Pin,
	type BowlingState,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class BowlingEngine implements GameInstance {
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
	private viewMatrix = Mat4.create();
	private projMatrix = Mat4.create();

	private state: BowlingState;

	// Aiming drag
	private isDragging = false;
	private dragStartX = 0;
	private dragStartY = 0;

	private resizeHandler: () => void;
	private keyDownHandler: (e: KeyboardEvent) => void;
	private mouseDownHandler: (e: MouseEvent) => void;
	private mouseMoveHandler: (e: MouseEvent) => void;
	private mouseUpHandler: (e: MouseEvent) => void;
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
		this.sphereMesh = this.buildMesh(gl, createSphere(BALL_RADIUS, 16));

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.12, 0.1, 0.08, 1.0);

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

			if (e.code === "KeyR") {
				this.state = this.createState();
			}

			if (
				(e.code === "Space" || e.code === "Enter") &&
				this.state.phase === "gameover"
			) {
				this.state = this.createState();
			}
		};
		window.addEventListener("keydown", this.keyDownHandler);

		// Drag to aim and throw
		this.mouseDownHandler = (e: MouseEvent) => {
			if (this.state.phase !== "aiming") return;

			this.isDragging = true;
			this.dragStartX = e.clientX;
			this.dragStartY = e.clientY;
		};
		this.mouseMoveHandler = (e: MouseEvent) => {
			if (!this.isDragging) return;

			const dx = e.clientX - this.dragStartX;
			const dy = this.dragStartY - e.clientY; // up = positive power

			this.state.aimX = Math.max(-1, Math.min(1, dx / 150));
			this.state.aimPower = Math.max(0, Math.min(1, dy / 200));
		};
		this.mouseUpHandler = () => {
			if (!this.isDragging) return;

			this.isDragging = false;

			if (this.state.phase === "aiming" && this.state.aimPower > 0.05) {
				this.throwBall();
			}
		};

		canvas.addEventListener("mousedown", this.mouseDownHandler);
		window.addEventListener("mousemove", this.mouseMoveHandler);
		window.addEventListener("mouseup", this.mouseUpHandler);
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
		this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
		window.removeEventListener("mousemove", this.mouseMoveHandler);
		window.removeEventListener("mouseup", this.mouseUpHandler);
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

	private createState(): BowlingState {
		return {
			ballX: 0,
			ballZ: 0,
			ballVX: 0,
			ballVZ: 0,
			ballSpin: 0,
			pins: this.createPins(),
			aimX: 0,
			aimPower: 0,
			phase: "aiming",
			frame: 1,
			roll: 1,
			scores: Array.from({ length: TOTAL_FRAMES }, () => []),
			knockedThisRoll: 0,
			settleTimer: 0,
			scoreDisplayTimer: 0,
			totalScore: 0,
		};
	}

	private createPins(): Pin[] {
		const pinZ = LANE_LENGTH - 2;

		return PIN_POSITIONS.map(([dz, dx]) => ({
			x: dx,
			z: pinZ + dz,
			standing: true,
			fallAngle: 0,
			fallDir: 0,
		}));
	}

	private throwBall(): void {
		const s = this.state;
		const speed = s.aimPower * BALL_MAX_SPEED;

		s.ballX = 0;
		s.ballZ = 1;
		s.ballVX = s.aimX * speed * 0.3;
		s.ballVZ = speed;
		s.ballSpin = 0;
		s.knockedThisRoll = 0;
		s.phase = "rolling";
	}

	// ── Update ───────────────────────────────────────────────────────────

	private update(dt: number): void {
		const s = this.state;

		if (s.phase === "rolling") {
			// Move ball
			s.ballZ += s.ballVZ * dt;
			s.ballX += s.ballVX * dt;
			s.ballSpin += s.ballVZ * dt * 3;

			// Gutter check
			const laneEdge = LANE_WIDTH / 2;

			if (Math.abs(s.ballX) > laneEdge) {
				// In the gutter — slow down and slide
				s.ballVX *= 0.95;
				s.ballVZ *= 0.98;
			}

			// Pin collision
			for (const pin of s.pins) {
				if (!pin.standing) continue;

				const dx = s.ballX - pin.x;
				const dz = s.ballZ - pin.z;
				const dist = Math.sqrt(dx * dx + dz * dz);

				if (dist < BALL_RADIUS + PIN_RADIUS) {
					pin.standing = false;
					pin.fallDir = Math.atan2(dx, dz);
					s.knockedThisRoll++;

					// Scatter nearby pins (chain reaction)
					for (const other of s.pins) {
						if (!other.standing || other === pin) continue;

						const odx = other.x - pin.x;
						const odz = other.z - pin.z;
						const oDist = Math.sqrt(odx * odx + odz * odz);

						if (oDist < 0.5) {
							other.standing = false;
							other.fallDir = Math.atan2(odx, odz);
							s.knockedThisRoll++;
						}
					}
				}
			}

			// Ball past pins or too slow
			if (s.ballZ > LANE_LENGTH + 2 || s.ballVZ < 0.5) {
				s.phase = "settling";
				s.settleTimer = 1.0;
			}
		}

		if (s.phase === "settling") {
			// Animate pin falls
			for (const pin of s.pins) {
				if (!pin.standing && pin.fallAngle < Math.PI / 2) {
					pin.fallAngle = Math.min(
						Math.PI / 2,
						pin.fallAngle + PIN_FALL_SPEED * dt,
					);
				}
			}

			s.settleTimer -= dt;

			if (s.settleTimer <= 0) {
				this.endRoll();
			}
		}

		if (s.phase === "score") {
			s.scoreDisplayTimer -= dt;

			if (s.scoreDisplayTimer <= 0) {
				this.nextRoll();
			}
		}
	}

	private endRoll(): void {
		const s = this.state;

		s.scores[s.frame - 1].push(s.knockedThisRoll);
		s.totalScore += s.knockedThisRoll;
		s.phase = "score";
		s.scoreDisplayTimer = 1.0;
	}

	private nextRoll(): void {
		const s = this.state;
		const standingCount = s.pins.filter((p) => p.standing).length;
		const isStrike = s.roll === 1 && standingCount === 0;
		const isSpare = s.roll === 2 && standingCount === 0;

		if (s.frame >= TOTAL_FRAMES) {
			// 10th frame special rules
			if (s.roll === 1 && isStrike) {
				// Reset pins for bonus roll 2
				s.pins = this.createPins();
				s.roll = 2;
				s.phase = "aiming";
				s.aimX = 0;
				s.aimPower = 0;

				return;
			}

			if (s.roll === 2 && (isStrike || isSpare)) {
				// Reset pins for bonus roll 3
				s.pins = this.createPins();
				s.roll = 3;
				s.phase = "aiming";
				s.aimX = 0;
				s.aimPower = 0;

				return;
			}

			s.phase = "gameover";

			return;
		}

		if (isStrike || s.roll === 2) {
			// Next frame
			s.frame++;
			s.roll = 1;
			s.pins = this.createPins();
		} else {
			// Second roll — keep standing pins
			s.roll = 2;
		}

		s.phase = "aiming";
		s.aimX = 0;
		s.aimPower = 0;
	}

	// ── Render ───────────────────────────────────────────────────────────

	private render(): void {
		const { gl, canvas, state: s } = this;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 5, aspect, 0.1, 200);

		// Camera: behind ball looking down the lane
		const camZ = s.phase === "rolling" ? Math.max(-2, s.ballZ - 6) : -3;

		Mat4.lookAt(
			this.viewMatrix,
			[0, 4, camZ],
			[0, 0, LANE_LENGTH * 0.6],
			[0, 1, 0],
		);

		gl.uniformMatrix4fv(this.uView, false, this.viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.2, 0.9, 0.3);
		gl.uniform3f(this.uCameraPos, 0, 4, camZ);
		gl.uniform1f(this.uEmissive, 0.0);

		// ── Lane surface ─────────────────────────────────────────────
		this.drawBox(
			0,
			-0.05,
			LANE_LENGTH / 2,
			LANE_WIDTH / 2,
			0.05,
			LANE_LENGTH / 2,
			0.7,
			0.55,
			0.35,
		);

		// Lane arrows (markers)
		for (let i = 0; i < 7; i++) {
			const az = 5 + i * 0.5;
			const ax = (i - 3) * 0.25;

			this.drawBox(ax, 0.01, az, 0.04, 0.01, 0.15, 0.5, 0.4, 0.3);
		}

		// Gutters
		this.drawBox(
			-(LANE_WIDTH / 2 + GUTTER_WIDTH / 2),
			-0.1,
			LANE_LENGTH / 2,
			GUTTER_WIDTH / 2,
			0.06,
			LANE_LENGTH / 2,
			0.2,
			0.2,
			0.2,
		);
		this.drawBox(
			LANE_WIDTH / 2 + GUTTER_WIDTH / 2,
			-0.1,
			LANE_LENGTH / 2,
			GUTTER_WIDTH / 2,
			0.06,
			LANE_LENGTH / 2,
			0.2,
			0.2,
			0.2,
		);

		// ── Ball ─────────────────────────────────────────────────────
		if (s.phase === "aiming") {
			// Show ball at start with aim guide
			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [0, BALL_RADIUS, 1]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 0.15, 0.15, 0.6);
			this.drawMesh(this.sphereMesh);

			// Aim line
			if (this.isDragging && s.aimPower > 0) {
				gl.uniform1f(this.uEmissive, 0.8);

				for (let i = 0; i < 8; i++) {
					const t = (i + 1) / 8;
					const az = 1 + t * 6;
					const ax = s.aimX * t * 2;

					this.drawBox(ax, 0.02, az, 0.03, 0.02, 0.08, 0.3, 1.0, 0.3);
				}

				gl.uniform1f(this.uEmissive, 0.0);
			}
		} else if (s.phase === "rolling") {
			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [
				s.ballX,
				BALL_RADIUS,
				s.ballZ,
			]);
			Mat4.rotateX(this.modelMatrix, this.modelMatrix, s.ballSpin);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 0.15, 0.15, 0.6);
			this.drawMesh(this.sphereMesh);
		}

		// ── Pins ─────────────────────────────────────────────────────
		for (const pin of s.pins) {
			Mat4.identity(this.modelMatrix);

			if (pin.standing) {
				Mat4.translate(this.modelMatrix, this.modelMatrix, [
					pin.x,
					PIN_HEIGHT / 2,
					pin.z,
				]);
			} else {
				// Fallen pin — rotate around base
				Mat4.translate(this.modelMatrix, this.modelMatrix, [
					pin.x,
					PIN_HEIGHT / 2,
					pin.z,
				]);
				Mat4.rotateY(this.modelMatrix, this.modelMatrix, pin.fallDir);
				Mat4.rotateX(this.modelMatrix, this.modelMatrix, pin.fallAngle);
			}

			Mat4.scale(this.modelMatrix, this.modelMatrix, [
				PIN_RADIUS,
				PIN_HEIGHT / 2,
				PIN_RADIUS,
			]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 0.95, 0.92, 0.88);
			this.drawMesh(this.cubeMesh);

			// Pin red stripe
			if (pin.standing) {
				this.drawBox(
					pin.x,
					PIN_HEIGHT * 0.7,
					pin.z,
					PIN_RADIUS * 1.1,
					PIN_HEIGHT * 0.05,
					PIN_RADIUS * 1.1,
					0.8,
					0.15,
					0.1,
				);
			}
		}

		// ── Back wall ────────────────────────────────────────────────
		this.drawBox(
			0,
			1,
			LANE_LENGTH + 0.5,
			LANE_WIDTH / 2 + GUTTER_WIDTH,
			1,
			0.1,
			0.3,
			0.25,
			0.2,
		);

		// ── Score display (frame indicators along the side) ──────────
		gl.uniform1f(this.uEmissive, 0.6);

		for (let f = 0; f < TOTAL_FRAMES; f++) {
			const fx = LANE_WIDTH / 2 + GUTTER_WIDTH + 0.5;
			const fz = 2 + f * 1.5;
			const isCurrentFrame = f === s.frame - 1;
			const hasScore = s.scores[f].length > 0;

			this.drawBox(
				fx,
				0.15,
				fz,
				0.2,
				0.15,
				0.5,
				isCurrentFrame ? 0.2 : 0.15,
				isCurrentFrame ? 0.8 : hasScore ? 0.4 : 0.2,
				isCurrentFrame ? 0.3 : 0.15,
			);
		}

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
