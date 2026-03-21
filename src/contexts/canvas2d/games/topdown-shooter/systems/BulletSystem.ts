import type { Updatable } from "@core/Updatable";
import type { ShooterState } from "../types";
import { BULLET_LIFETIME, ARENA_PADDING } from "../types";

export class BulletSystem implements Updatable<ShooterState> {
	update(state: ShooterState, dt: number): void {
		const { bullets, enemies, player, particles } = state;

		for (let i = bullets.length - 1; i >= 0; i--) {
			const b = bullets[i];

			b.pos.x += b.vel.x * dt;
			b.pos.y += b.vel.y * dt;
			b.age += dt;

			// Remove if expired or out of arena
			if (
				b.age > BULLET_LIFETIME ||
				b.pos.x < ARENA_PADDING ||
				b.pos.x > state.canvasW - ARENA_PADDING ||
				b.pos.y < ARENA_PADDING ||
				b.pos.y > state.canvasH - ARENA_PADDING
			) {
				bullets.splice(i, 1);
				continue;
			}

			if (b.fromPlayer) {
				// ── Player bullet vs enemies ─────────────────────────────
				for (let j = enemies.length - 1; j >= 0; j--) {
					const e = enemies[j];
					const dx = b.pos.x - e.pos.x;
					const dy = b.pos.y - e.pos.y;
					const dist = Math.sqrt(dx * dx + dy * dy);

					if (dist < b.radius + e.radius) {
						e.hp -= 1;
						bullets.splice(i, 1);

						// Hit particles
						for (let k = 0; k < 4; k++) {
							const angle = Math.random() * Math.PI * 2;
							const spd = 50 + Math.random() * 100;

							particles.push({
								pos: { x: b.pos.x, y: b.pos.y },
								vel: { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
								age: 0,
								lifetime: 0.25,
								color: e.color,
								radius: 3,
							});
						}

						if (e.hp <= 0) {
							// Death burst
							for (let k = 0; k < 10; k++) {
								const angle = Math.random() * Math.PI * 2;
								const spd = 60 + Math.random() * 160;

								particles.push({
									pos: { x: e.pos.x, y: e.pos.y },
									vel: { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
									age: 0,
									lifetime: 0.4,
									color: e.color,
									radius: 4,
								});
							}

							state.score +=
								e.type === "tank"
									? 30
									: e.type === "ranged"
										? 20
										: e.type === "fast"
											? 15
											: 10;
							state.kills += 1;
							enemies.splice(j, 1);
						}

						break; // bullet consumed
					}
				}
			} else {
				// ── Enemy bullet vs player ───────────────────────────────
				const dx = b.pos.x - player.pos.x;
				const dy = b.pos.y - player.pos.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < b.radius + player.radius && player.invincibleTimer <= 0) {
					player.hp -= 8;
					player.invincibleTimer = 0.3;
					bullets.splice(i, 1);

					for (let k = 0; k < 5; k++) {
						const angle = Math.random() * Math.PI * 2;
						const spd = 60 + Math.random() * 80;

						particles.push({
							pos: { x: player.pos.x, y: player.pos.y },
							vel: { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
							age: 0,
							lifetime: 0.3,
							color: "#ff5252",
							radius: 3,
						});
					}

					if (player.hp <= 0) {
						player.hp = 0;
						state.gameOver = true;
					}
				}
			}
		}

		// ── Update particles ─────────────────────────────────────────
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];

			p.pos.x += p.vel.x * dt;
			p.pos.y += p.vel.y * dt;
			p.age += dt;

			if (p.age >= p.lifetime) {
				particles.splice(i, 1);
			}
		}
	}
}
