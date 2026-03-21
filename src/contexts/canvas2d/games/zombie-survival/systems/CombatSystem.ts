import type { Updatable } from "@core/Updatable";
import type { GameState } from "../types.ts";
import {
	ARENA_W,
	ARENA_H,
	BULLET_RADIUS,
	BARRICADE_SIZE,
	PLAYER_RADIUS,
} from "../types.ts";

export class CombatSystem implements Updatable<GameState> {
	update(state: GameState, dt: number): void {
		this.updateBullets(state, dt);
		this.checkBulletZombieCollisions(state);
		this.checkZombiePlayerDamage(state, dt);
		this.checkZombieBarricadeDamage(state, dt);
		this.updateParticles(state, dt);
	}

	private updateBullets(state: GameState, dt: number): void {
		for (const b of state.bullets) {
			if (b.dead) continue;

			b.x += b.vx * dt;
			b.y += b.vy * dt;

			// Out of arena
			if (b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) {
				b.dead = true;
			}
		}

		state.bullets = state.bullets.filter((b) => !b.dead);
	}

	private checkBulletZombieCollisions(state: GameState): void {
		for (const b of state.bullets) {
			if (b.dead) continue;

			for (const z of state.zombies) {
				if (z.dead) continue;

				const dx = b.x - z.x;
				const dy = b.y - z.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < BULLET_RADIUS + z.radius) {
					z.hp -= b.damage;
					b.dead = true;

					// Blood particles
					this.spawnBlood(state, z.x, z.y);

					if (z.hp <= 0) {
						z.dead = true;
						state.score +=
							z.type === "tank" ? 30 : z.type === "runner" ? 15 : 10;
						state.totalKills++;
						state.zombiesRemainingInWave = Math.max(
							0,
							state.zombiesRemainingInWave - 1,
						);
					}

					break; // bullet hits one zombie
				}
			}
		}
	}

	private checkZombiePlayerDamage(state: GameState, _dt: number): void {
		const player = state.player;

		if (player.invincibleTimer > 0) return;

		for (const z of state.zombies) {
			if (z.dead) continue;

			if (z.state !== "attacking_player" && z.state !== "chasing") continue;

			const dx = player.x - z.x;
			const dy = player.y - z.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < PLAYER_RADIUS + z.radius + 4) {
				if (z.attackCooldown <= 0) {
					player.hp -= z.damage;
					player.invincibleTimer = 0.5;
					z.attackCooldown = z.attackInterval;

					// Knockback player slightly
					if (dist > 0.1) {
						player.x += (dx / dist) * 20;
						player.y += (dy / dist) * 20;
					}

					if (player.hp <= 0) {
						player.hp = 0;
						state.screen = "gameover";
					}

					break;
				}
			}
		}
	}

	private checkZombieBarricadeDamage(state: GameState, _dt: number): void {
		for (const z of state.zombies) {
			if (z.dead) continue;

			if (z.state !== "attacking_barricade" || z.targetBarricadeId === null)
				continue;

			const barricade = state.barricades.find(
				(b) => b.id === z.targetBarricadeId && !b.dead,
			);

			if (!barricade) continue;

			const dx = barricade.x - z.x;
			const dy = barricade.y - z.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < z.radius + BARRICADE_SIZE / 2 + 4) {
				if (z.attackCooldown <= 0) {
					barricade.hp -= z.damage;
					z.attackCooldown = z.attackInterval;

					// Wood splinter particles
					this.spawnSplinters(state, barricade.x, barricade.y);

					if (barricade.hp <= 0) {
						barricade.dead = true;
						z.state = "chasing";
						z.targetBarricadeId = null;
					}
				}
			}
		}

		// Remove dead barricades
		state.barricades = state.barricades.filter((b) => !b.dead);
	}

	private spawnBlood(state: GameState, x: number, y: number): void {
		for (let i = 0; i < 4; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 30 + Math.random() * 60;

			state.particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				alpha: 1,
				decay: 2 + Math.random(),
				color: "#8b0000",
				radius: 2 + Math.random() * 2,
			});
		}
	}

	private spawnSplinters(state: GameState, x: number, y: number): void {
		for (let i = 0; i < 3; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 20 + Math.random() * 40;

			state.particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				alpha: 1,
				decay: 2.5 + Math.random(),
				color: "#8B4513",
				radius: 2 + Math.random() * 2,
			});
		}
	}

	private updateParticles(state: GameState, dt: number): void {
		for (const p of state.particles) {
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.alpha -= p.decay * dt;
		}

		state.particles = state.particles.filter((p) => p.alpha > 0);

		// Cap particles
		if (state.particles.length > 200) {
			state.particles.splice(0, state.particles.length - 200);
		}
	}
}
