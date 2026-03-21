import type { GameInstance } from "@core/GameInterface";
import { createProgram, createBuffer, createVAO, Mat4 } from "@webgl/shared";
import { createCube, createSphere } from "@webgl/shared/Primitives";
import type { PrimitiveData } from "@webgl/shared/Primitives";
import { VERT_SRC, FRAG_SRC } from "./shaders";
import {
	ARENA_W,
	ARENA_H,
	PLAYER_SPEED,
	BULLET_SPEED,
	BULLET_COOLDOWN,
	ASTEROID_SPEED_MIN,
	ASTEROID_SPEED_MAX,
	ASTEROID_SPAWN_INTERVAL_INIT,
	ASTEROID_SPAWN_INTERVAL_MIN,
	ENEMY_SPEED,
	ENEMY_SHOOT_INTERVAL,
	type ShooterState,
} from "./types";

interface Mesh {
	vao: WebGLVertexArrayObject;
	indexCount: number;
}

export class SpaceShooterEngine implements GameInstance {
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

	private state: ShooterState;
	private keys: Record<string, boolean> = {};
	private mouseX = 0;
	private mouseY = 0;

	private resizeHandler: () => void;
	private keyDownHandler: (e: KeyboardEvent) => void;
	private keyUpHandler: (e: KeyboardEvent) => void;
	private mouseMoveHandler: (e: MouseEvent) => void;
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

		this.cubeMesh = this.buildMesh(gl, createCube(1));
		this.sphereMesh = this.buildMesh(gl, createSphere(1, 12));

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.clearColor(0.01, 0.01, 0.04, 1.0);

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

			if (
				(e.code === "Space" || e.code === "Enter") &&
				(this.state.phase === "start" || this.state.phase === "dead")
			) {
				this.state = this.createState();
				this.state.phase = "playing";
			}
		};
		this.keyUpHandler = (e: KeyboardEvent) => {
			this.keys[e.code] = false;
		};
		this.mouseMoveHandler = (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();

			this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			this.mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
		};
		this.clickHandler = () => {
			if (this.state.phase === "playing") {
				this.shoot();
			}
		};

		window.addEventListener("keydown", this.keyDownHandler);
		window.addEventListener("keyup", this.keyUpHandler);
		canvas.addEventListener("mousemove", this.mouseMoveHandler);
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
		window.removeEventListener("resize", this.resizeHandler);
		window.removeEventListener("keydown", this.keyDownHandler);
		window.removeEventListener("keyup", this.keyUpHandler);
		this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
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

	private createState(): ShooterState {
		return {
			playerX: 0,
			playerY: 0,
			bullets: [],
			asteroids: [],
			enemies: [],
			explosions: [],
			shootCooldown: 0,
			score: 0,
			lives: 3,
			spawnTimer: 0,
			spawnInterval: ASTEROID_SPAWN_INTERVAL_INIT,
			waveTimer: 0,
			phase: "start",
			invulnTimer: 0,
		};
	}

	private shoot(): void {
		const s = this.state;

		if (s.shootCooldown > 0) return;

		s.bullets.push({
			x: s.playerX,
			y: s.playerY,
			z: 0,
			vz: BULLET_SPEED,
			isEnemy: false,
		});
		s.shootCooldown = BULLET_COOLDOWN;
	}

	// ── Update ───────────────────────────────────────────────────────────

	private update(dt: number): void {
		const s = this.state;

		if (s.phase !== "playing") return;

		s.waveTimer += dt;
		s.shootCooldown = Math.max(0, s.shootCooldown - dt);
		s.invulnTimer = Math.max(0, s.invulnTimer - dt);

		// Player movement via keys
		if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
			s.playerX -= PLAYER_SPEED * dt;
		}

		if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
			s.playerX += PLAYER_SPEED * dt;
		}

		if (this.keys["ArrowUp"] || this.keys["KeyW"]) {
			s.playerY += PLAYER_SPEED * dt;
		}

		if (this.keys["ArrowDown"] || this.keys["KeyS"]) {
			s.playerY -= PLAYER_SPEED * dt;
		}

		// Also follow mouse gently
		const targetX = (this.mouseX * ARENA_W) / 2;
		const targetY = (this.mouseY * ARENA_H) / 2;

		s.playerX += (targetX - s.playerX) * 3 * dt;
		s.playerY += (targetY - s.playerY) * 3 * dt;

		// Clamp
		s.playerX = Math.max(
			-ARENA_W / 2 + 0.5,
			Math.min(ARENA_W / 2 - 0.5, s.playerX),
		);
		s.playerY = Math.max(
			-ARENA_H / 2 + 0.5,
			Math.min(ARENA_H / 2 - 0.5, s.playerY),
		);

		// Auto-shoot with Space held
		if (this.keys["Space"] && s.shootCooldown <= 0) {
			this.shoot();
		}

		// Spawn asteroids
		s.spawnTimer += dt;
		s.spawnInterval = Math.max(
			ASTEROID_SPAWN_INTERVAL_MIN,
			ASTEROID_SPAWN_INTERVAL_INIT - s.waveTimer * 0.01,
		);

		if (s.spawnTimer >= s.spawnInterval) {
			s.spawnTimer = 0;
			this.spawnAsteroid();
		}

		// Spawn enemies occasionally
		if (Math.random() < 0.003 + s.waveTimer * 0.0001) {
			this.spawnEnemy();
		}

		// Update bullets
		for (let i = s.bullets.length - 1; i >= 0; i--) {
			const b = s.bullets[i];

			b.z += (b.isEnemy ? -b.vz : b.vz) * dt;

			if (b.z > 80 || b.z < -5) {
				s.bullets.splice(i, 1);
			}
		}

		// Update asteroids
		for (let i = s.asteroids.length - 1; i >= 0; i--) {
			const a = s.asteroids[i];

			a.z -= a.vz * dt;
			a.rotX += a.rotSpeedX * dt;
			a.rotY += a.rotSpeedY * dt;

			if (a.z < -5) {
				s.asteroids.splice(i, 1);
				continue;
			}

			// Bullet-asteroid collision
			for (let j = s.bullets.length - 1; j >= 0; j--) {
				const b = s.bullets[j];

				if (b.isEnemy) continue;

				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const dz = b.z - a.z;

				if (dx * dx + dy * dy + dz * dz < a.size * a.size * 1.5) {
					a.hp--;
					s.bullets.splice(j, 1);

					if (a.hp <= 0) {
						s.explosions.push({
							x: a.x,
							y: a.y,
							z: a.z,
							timer: 0,
							maxTime: 0.4,
							size: a.size,
						});
						s.asteroids.splice(i, 1);
						s.score += Math.round(a.size * 10);
					}

					break;
				}
			}
		}

		// Update enemies
		for (let i = s.enemies.length - 1; i >= 0; i--) {
			const e = s.enemies[i];

			e.z -= ENEMY_SPEED * 0.3 * dt;
			e.x += e.vx * dt;

			if (e.x < -ARENA_W / 2 || e.x > ARENA_W / 2) {
				e.vx = -e.vx;
			}

			e.shootTimer -= dt;

			if (e.shootTimer <= 0 && e.z < 60) {
				e.shootTimer = ENEMY_SHOOT_INTERVAL;
				s.bullets.push({
					x: e.x,
					y: e.y,
					z: e.z,
					vz: 15,
					isEnemy: true,
				});
			}

			if (e.z < -5) {
				s.enemies.splice(i, 1);
				continue;
			}

			// Bullet-enemy collision
			for (let j = s.bullets.length - 1; j >= 0; j--) {
				const b = s.bullets[j];

				if (b.isEnemy) continue;

				const dx = b.x - e.x;
				const dy = b.y - e.y;
				const dz = b.z - e.z;

				if (dx * dx + dy * dy + dz * dz < 2) {
					e.hp--;
					s.bullets.splice(j, 1);

					if (e.hp <= 0) {
						s.explosions.push({
							x: e.x,
							y: e.y,
							z: e.z,
							timer: 0,
							maxTime: 0.5,
							size: 1.5,
						});
						s.enemies.splice(i, 1);
						s.score += 50;
					}

					break;
				}
			}
		}

		// Player collision with asteroids/enemy bullets
		if (s.invulnTimer <= 0) {
			for (const a of s.asteroids) {
				const dx = s.playerX - a.x;
				const dy = s.playerY - a.y;
				const dz = -a.z;

				if (dx * dx + dy * dy + dz * dz < a.size * a.size + 0.5) {
					this.playerHit();

					break;
				}
			}

			for (const b of s.bullets) {
				if (!b.isEnemy) continue;

				const dx = s.playerX - b.x;
				const dy = s.playerY - b.y;

				if (b.z < 2 && dx * dx + dy * dy < 1) {
					this.playerHit();

					break;
				}
			}
		}

		// Update explosions
		for (let i = s.explosions.length - 1; i >= 0; i--) {
			s.explosions[i].timer += dt;

			if (s.explosions[i].timer >= s.explosions[i].maxTime) {
				s.explosions.splice(i, 1);
			}
		}
	}

	private playerHit(): void {
		const s = this.state;

		s.lives--;
		s.invulnTimer = 1.5;

		if (s.lives <= 0) {
			s.phase = "dead";
			s.explosions.push({
				x: s.playerX,
				y: s.playerY,
				z: 0,
				timer: 0,
				maxTime: 0.6,
				size: 2,
			});
		}
	}

	private spawnAsteroid(): void {
		const size = 0.5 + Math.random() * 1.5;

		this.state.asteroids.push({
			x: (Math.random() - 0.5) * ARENA_W,
			y: (Math.random() - 0.5) * ARENA_H,
			z: 60 + Math.random() * 20,
			vz:
				ASTEROID_SPEED_MIN +
				Math.random() * (ASTEROID_SPEED_MAX - ASTEROID_SPEED_MIN),
			size,
			rotX: 0,
			rotY: 0,
			rotSpeedX: (Math.random() - 0.5) * 4,
			rotSpeedY: (Math.random() - 0.5) * 4,
			hp: Math.ceil(size),
		});
	}

	private spawnEnemy(): void {
		this.state.enemies.push({
			x: (Math.random() - 0.5) * ARENA_W,
			y: (Math.random() - 0.5) * ARENA_H * 0.5,
			z: 65,
			vx: (Math.random() - 0.5) * ENEMY_SPEED,
			shootTimer: ENEMY_SHOOT_INTERVAL,
			hp: 2,
		});
	}

	// ── Render ───────────────────────────────────────────────────────────

	private render(): void {
		const { gl, canvas, state: s } = this;
		const time = performance.now() / 1000;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const aspect = canvas.width / canvas.height;

		Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 300);
		Mat4.lookAt(this.viewMatrix, [0, 0, -5], [0, 0, 20], [0, 1, 0]);

		gl.uniformMatrix4fv(this.uView, false, this.viewMatrix);
		gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
		gl.uniform3f(this.uLightDir, 0.3, 0.5, -0.8);
		gl.uniform3f(this.uCameraPos, 0, 0, -5);
		gl.uniform1f(this.uEmissive, 0.0);

		// ── Player ship ──────────────────────────────────────────────
		if (s.phase === "playing") {
			const blink = s.invulnTimer > 0 && Math.sin(time * 20) > 0;

			if (!blink) {
				// Body
				this.drawBox(s.playerX, s.playerY, 0, 0.3, 0.15, 0.5, 0.2, 0.5, 0.9);
				// Wings
				this.drawBox(
					s.playerX - 0.5,
					s.playerY,
					0.1,
					0.2,
					0.08,
					0.3,
					0.15,
					0.4,
					0.8,
				);
				this.drawBox(
					s.playerX + 0.5,
					s.playerY,
					0.1,
					0.2,
					0.08,
					0.3,
					0.15,
					0.4,
					0.8,
				);
				// Engine glow
				gl.uniform1f(this.uEmissive, 0.8);
				this.drawBox(
					s.playerX,
					s.playerY,
					-0.4,
					0.12,
					0.1,
					0.15,
					0.3,
					0.6,
					1.0,
				);
				gl.uniform1f(this.uEmissive, 0.0);
			}
		}

		// ── Player bullets ───────────────────────────────────────────
		gl.uniform1f(this.uEmissive, 0.9);

		for (const b of s.bullets) {
			if (b.isEnemy) continue;

			this.drawBox(b.x, b.y, b.z, 0.05, 0.05, 0.3, 0.3, 1.0, 0.3);
		}

		// ── Enemy bullets ────────────────────────────────────────────
		for (const b of s.bullets) {
			if (!b.isEnemy) continue;

			this.drawBox(b.x, b.y, b.z, 0.06, 0.06, 0.2, 1.0, 0.2, 0.2);
		}

		gl.uniform1f(this.uEmissive, 0.0);

		// ── Asteroids ────────────────────────────────────────────────
		for (const a of s.asteroids) {
			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [a.x, a.y, a.z]);
			Mat4.rotateX(this.modelMatrix, this.modelMatrix, a.rotX);
			Mat4.rotateY(this.modelMatrix, this.modelMatrix, a.rotY);
			Mat4.scale(this.modelMatrix, this.modelMatrix, [a.size, a.size, a.size]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 0.45, 0.35, 0.3);
			this.drawMesh(this.sphereMesh);
		}

		// ── Enemies ──────────────────────────────────────────────────
		for (const e of s.enemies) {
			// Body
			this.drawBox(e.x, e.y, e.z, 0.4, 0.15, 0.3, 0.8, 0.15, 0.15);
			// Cockpit
			gl.uniform1f(this.uEmissive, 0.5);
			this.drawBox(e.x, e.y + 0.1, e.z - 0.1, 0.15, 0.1, 0.15, 1.0, 0.3, 0.3);
			gl.uniform1f(this.uEmissive, 0.0);
		}

		// ── Explosions ───────────────────────────────────────────────
		gl.uniform1f(this.uEmissive, 1.0);

		for (const exp of s.explosions) {
			const t = exp.timer / exp.maxTime;
			const scale = exp.size * (0.5 + t * 2);
			const fade = 1 - t;

			Mat4.identity(this.modelMatrix);
			Mat4.translate(this.modelMatrix, this.modelMatrix, [exp.x, exp.y, exp.z]);
			Mat4.scale(this.modelMatrix, this.modelMatrix, [scale, scale, scale]);
			gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
			gl.uniform3f(this.uColor, 1.0 * fade, 0.5 * fade, 0.1 * fade);
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
