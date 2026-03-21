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
	TANK_W,
	TANK_H,
	TANK_D,
	FISH_COUNT,
	FOOD_SINK_SPEED,
	FISH_SPEED,
	FISH_TURN_SPEED,
	SEPARATION_DIST,
	ALIGNMENT_DIST,
	COHESION_DIST,
	FOOD_ATTRACT_DIST,
	type Fish,
	type AquariumState,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class AquariumEngine implements GameInstance {
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
	private uTime: WebGLUniformLocation;

	private modelMatrix = Mat4.create();
	private projMatrix = Mat4.create();
	private camera: OrbitalCamera;
	private state: AquariumState;

	private resizeHandler: () => void;
	private keyHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent) => void;
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
		this.uTime = gl.getUniformLocation(this.program, "uTime")!;

		this.cubeMesh = this.buildMesh(gl, createCube(1));
		this.sphereMesh = this.buildMesh(gl, createSphere(1, 10));

		this.camera = new OrbitalCamera(canvas, {
			distance: 16,
			elevation: 0.3,
			azimuth: 0.3,
			target: [0, -TANK_H / 3, 0],
			minDistance: 8,
			maxDistance: 30,
		});

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.05, 0.12, 0.25, 1.0);

		this.state = this.createState();

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

			if (e.code === "Space") this.dropFood();
		};
		window.addEventListener("keydown", this.keyHandler);

		this.clickHandler = () => this.dropFood();
		canvas.addEventListener("click", this.clickHandler);
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
		this.canvas.removeEventListener("click", this.clickHandler);
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

	private createState(): AquariumState {
		const fish: Fish[] = [];

		for (let i = 0; i < FISH_COUNT; i++) {
			const hue = Math.random() * 360;
			const c = this.hslToRgb(hue, 0.7, 0.55);

			fish.push({
				x: (Math.random() - 0.5) * TANK_W * 0.8,
				y: -Math.random() * TANK_H * 0.8,
				z: (Math.random() - 0.5) * TANK_D * 0.8,
				vx: (Math.random() - 0.5) * 2,
				vy: 0,
				vz: (Math.random() - 0.5) * 2,
				yaw: Math.random() * Math.PI * 2,
				size: 0.2 + Math.random() * 0.3,
				r: c[0],
				g: c[1],
				b: c[2],
				tailPhase: Math.random() * Math.PI * 2,
			});
		}

		return { fish, food: [], phase: "viewing" };
	}

	private dropFood(): void {
		this.state.food.push({
			x: (Math.random() - 0.5) * TANK_W * 0.6,
			y: 0,
			z: (Math.random() - 0.5) * TANK_D * 0.6,
			life: 10,
		});
	}

	private update(dt: number): void {
		const s = this.state;

		// Food sinks
		for (let i = s.food.length - 1; i >= 0; i--) {
			s.food[i].y -= FOOD_SINK_SPEED * dt;
			s.food[i].life -= dt;

			if (s.food[i].life <= 0 || s.food[i].y < -TANK_H) {
				s.food.splice(i, 1);
			}
		}

		// Boid flocking + food attraction
		for (const fish of s.fish) {
			let sepX = 0,
				sepY = 0,
				sepZ = 0;
			let aliVX = 0,
				aliVZ = 0,
				aliCount = 0;
			let cohX = 0,
				cohY = 0,
				cohZ = 0,
				cohCount = 0;

			for (const other of s.fish) {
				if (other === fish) continue;

				const dx = other.x - fish.x;
				const dy = other.y - fish.y;
				const dz = other.z - fish.z;
				const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

				if (dist < SEPARATION_DIST && dist > 0.01) {
					sepX -= dx / dist;
					sepY -= dy / dist;
					sepZ -= dz / dist;
				}

				if (dist < ALIGNMENT_DIST) {
					aliVX += other.vx;
					aliVZ += other.vz;
					aliCount++;
				}

				if (dist < COHESION_DIST) {
					cohX += other.x;
					cohY += other.y;
					cohZ += other.z;
					cohCount++;
				}
			}

			// Steer toward food
			let foodX = 0,
				foodY = 0,
				foodZ = 0,
				hasFood = false;
			let closestFoodDist = Infinity;

			for (const f of s.food) {
				const dx = f.x - fish.x;
				const dy = f.y - fish.y;
				const dz = f.z - fish.z;
				const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

				if (dist < FOOD_ATTRACT_DIST && dist < closestFoodDist) {
					closestFoodDist = dist;
					foodX = dx;
					foodY = dy;
					foodZ = dz;
					hasFood = true;
				}

				// Eat food
				if (dist < 0.5) {
					f.life = 0;
				}
			}

			// Combine forces
			let fx = sepX * 1.5;
			let fy = sepY * 0.5;
			let fz = sepZ * 1.5;

			if (aliCount > 0) {
				fx += (aliVX / aliCount - fish.vx) * 0.3;
				fz += (aliVZ / aliCount - fish.vz) * 0.3;
			}

			if (cohCount > 0) {
				fx += (cohX / cohCount - fish.x) * 0.1;
				fy += (cohY / cohCount - fish.y) * 0.05;
				fz += (cohZ / cohCount - fish.z) * 0.1;
			}

			if (hasFood) {
				const fl = Math.sqrt(foodX * foodX + foodY * foodY + foodZ * foodZ);

				fx += (foodX / fl) * 3;
				fy += (foodY / fl) * 1.5;
				fz += (foodZ / fl) * 3;
			}

			// Tank bounds avoidance
			const margin = 1;

			if (fish.x < -TANK_W / 2 + margin) fx += 2;

			if (fish.x > TANK_W / 2 - margin) fx -= 2;

			if (fish.y < -TANK_H + margin) fy += 2;

			if (fish.y > -0.5) fy -= 2;

			if (fish.z < -TANK_D / 2 + margin) fz += 2;

			if (fish.z > TANK_D / 2 - margin) fz -= 2;

			fish.vx += fx * dt;
			fish.vy += fy * dt;
			fish.vz += fz * dt;

			// Clamp speed
			const speed = Math.sqrt(
				fish.vx * fish.vx + fish.vy * fish.vy + fish.vz * fish.vz,
			);

			if (speed > FISH_SPEED) {
				fish.vx = (fish.vx / speed) * FISH_SPEED;
				fish.vy = (fish.vy / speed) * FISH_SPEED;
				fish.vz = (fish.vz / speed) * FISH_SPEED;
			}

			fish.x += fish.vx * dt;
			fish.y += fish.vy * dt;
			fish.z += fish.vz * dt;

			// Face direction of movement
			if (speed > 0.1) {
				const targetYaw = Math.atan2(fish.vx, fish.vz);
				let diff = targetYaw - fish.yaw;

				while (diff > Math.PI) diff -= Math.PI * 2;

				while (diff < -Math.PI) diff += Math.PI * 2;

				fish.yaw += diff * FISH_TURN_SPEED * dt;
			}

			fish.tailPhase += (speed + 1) * 8 * dt;
		}
	}

	private render(): void {
		const { gl, canvas, state: s } = this;
		const time = performance.now() / 1000;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 200);

		const viewMatrix = this.camera.getViewMatrix();
		const camPos = this.camera.getPosition();

		gl.uniformMatrix4fv(this.uView, false, viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.2, 0.9, 0.3);
		gl.uniform3f(this.uCameraPos, camPos[0], camPos[1], camPos[2]);
		gl.uniform1f(this.uEmissive, 0.0);
		gl.uniform1f(this.uTime, time);

		// ── Sand floor ───────────────────────────────────────────────
		this.drawBox(
			0,
			-TANK_H - 0.1,
			0,
			TANK_W / 2,
			0.1,
			TANK_D / 2,
			0.65,
			0.55,
			0.35,
		);

		// ── Tank walls (transparent-ish) ─────────────────────────────
		const wallAlpha = 0.15;

		gl.uniform1f(this.uEmissive, wallAlpha);
		// Back
		this.drawBox(
			0,
			-TANK_H / 2,
			-TANK_D / 2 - 0.05,
			TANK_W / 2,
			TANK_H / 2,
			0.05,
			0.3,
			0.5,
			0.7,
		);
		// Left
		this.drawBox(
			-TANK_W / 2 - 0.05,
			-TANK_H / 2,
			0,
			0.05,
			TANK_H / 2,
			TANK_D / 2,
			0.3,
			0.5,
			0.7,
		);
		// Right
		this.drawBox(
			TANK_W / 2 + 0.05,
			-TANK_H / 2,
			0,
			0.05,
			TANK_H / 2,
			TANK_D / 2,
			0.3,
			0.5,
			0.7,
		);
		gl.uniform1f(this.uEmissive, 0.0);

		// ── Decorations (rocks) ──────────────────────────────────────
		this.drawBox(-3, -TANK_H + 0.3, 2, 0.5, 0.3, 0.4, 0.4, 0.38, 0.35);
		this.drawBox(4, -TANK_H + 0.4, -3, 0.6, 0.4, 0.5, 0.45, 0.4, 0.38);
		this.drawBox(0, -TANK_H + 0.2, -2, 0.3, 0.2, 0.3, 0.5, 0.45, 0.4);

		// ── Seaweed ──────────────────────────────────────────────────
		for (let i = 0; i < 5; i++) {
			const sx = -4 + i * 2.2;
			const sz = -3 + (i % 3);

			for (let j = 0; j < 4; j++) {
				const sway = Math.sin(time * 1.5 + i + j * 0.5) * 0.15;

				this.drawBox(
					sx + sway * j,
					-TANK_H + 0.3 + j * 0.35,
					sz,
					0.06,
					0.18,
					0.06,
					0.1,
					0.5,
					0.15,
				);
			}
		}

		// ── Fish ─────────────────────────────────────────────────────
		for (const fish of s.fish) {
			const m = Mat4.create();

			// Body
			Mat4.identity(m);
			Mat4.translate(m, m, [fish.x, fish.y, fish.z]);
			Mat4.rotateY(m, m, -fish.yaw);
			Mat4.scale(m, m, [fish.size * 0.6, fish.size * 0.4, fish.size]);
			gl.uniformMatrix4fv(this.uModel, false, m);
			gl.uniform3f(this.uColor, fish.r, fish.g, fish.b);
			this.drawMesh(this.sphereMesh);

			// Tail
			const tailAngle = Math.sin(fish.tailPhase) * 0.4;

			Mat4.identity(m);
			Mat4.translate(m, m, [fish.x, fish.y, fish.z]);
			Mat4.rotateY(m, m, -fish.yaw);
			Mat4.translate(m, m, [0, 0, -fish.size * 0.8]);
			Mat4.rotateY(m, m, tailAngle);
			Mat4.scale(m, m, [fish.size * 0.15, fish.size * 0.3, fish.size * 0.4]);
			gl.uniformMatrix4fv(this.uModel, false, m);
			gl.uniform3f(this.uColor, fish.r * 0.8, fish.g * 0.8, fish.b * 0.8);
			this.drawMesh(this.cubeMesh);
		}

		// ── Food particles ───────────────────────────────────────────
		gl.uniform1f(this.uEmissive, 0.5);

		for (const food of s.food) {
			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [
				food.x,
				food.y,
				food.z,
			]);
			Mat4.scale(this.modelMatrix, this.modelMatrix, [0.08, 0.08, 0.08]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 0.9, 0.7, 0.2);
			this.drawMesh(this.sphereMesh);
		}

		gl.uniform1f(this.uEmissive, 0.0);

		// ── Bubbles ──────────────────────────────────────────────────
		gl.uniform1f(this.uEmissive, 0.3);

		for (let i = 0; i < 6; i++) {
			const bx = Math.sin(time * 0.5 + i * 2) * 3;
			const by = -TANK_H + ((time * 0.8 + i * 1.3) % TANK_H);
			const bz = Math.cos(time * 0.3 + i * 3) * 2;
			const bSize = 0.05 + Math.sin(time + i) * 0.02;

			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [bx, by, bz]);
			Mat4.scale(this.modelMatrix, this.modelMatrix, [bSize, bSize, bSize]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 0.6, 0.8, 1.0);
			this.drawMesh(this.sphereMesh);
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

	private hslToRgb(h: number, s: number, l: number): [number, number, number] {
		const c = (1 - Math.abs(2 * l - 1)) * s;
		const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
		const m = l - c / 2;
		let r = 0,
			g = 0,
			b = 0;

		if (h < 60) {
			r = c;
			g = x;
		} else if (h < 120) {
			r = x;
			g = c;
		} else if (h < 180) {
			g = c;
			b = x;
		} else if (h < 240) {
			g = x;
			b = c;
		} else if (h < 300) {
			r = x;
			b = c;
		} else {
			r = c;
			b = x;
		}

		return [r + m, g + m, b + m];
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
