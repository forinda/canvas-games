import type { Updatable } from "@shared/Updatable";
import type { ShooterState, Enemy, EnemyType } from "../types";
import { ARENA_PADDING, BULLET_SPEED, BULLET_RADIUS } from "../types";

interface EnemyTemplate {
	type: EnemyType;
	hp: number;
	speed: number;
	radius: number;
	color: string;
	damage: number;
}

const TEMPLATES: Record<EnemyType, EnemyTemplate> = {
	normal: {
		type: "normal",
		hp: 2,
		speed: 100,
		radius: 14,
		color: "#ef5350",
		damage: 10,
	},
	fast: {
		type: "fast",
		hp: 1,
		speed: 190,
		radius: 10,
		color: "#ffa726",
		damage: 8,
	},
	tank: {
		type: "tank",
		hp: 6,
		speed: 55,
		radius: 22,
		color: "#8d6e63",
		damage: 20,
	},
	ranged: {
		type: "ranged",
		hp: 2,
		speed: 60,
		radius: 13,
		color: "#ab47bc",
		damage: 8,
	},
};

export class EnemySystem implements Updatable<ShooterState> {
	update(state: ShooterState, dt: number): void {
		const { player, enemies } = state;

		for (const e of enemies) {
			// ── Chase AI ───────────────────────────────────────────────
			const dx = player.pos.x - e.pos.x;
			const dy = player.pos.y - e.pos.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist > 0) {
				// Ranged enemies stop at distance 200
				const chase = e.type === "ranged" ? dist > 200 : true;

				if (chase) {
					e.vel.x = (dx / dist) * e.speed;
					e.vel.y = (dy / dist) * e.speed;
				} else {
					e.vel.x = 0;
					e.vel.y = 0;
				}
			}

			e.pos.x += e.vel.x * dt;
			e.pos.y += e.vel.y * dt;

			// Clamp inside arena
			const pad = ARENA_PADDING + e.radius;

			e.pos.x = Math.max(pad, Math.min(state.canvasW - pad, e.pos.x));
			e.pos.y = Math.max(pad, Math.min(state.canvasH - pad, e.pos.y));

			// ── Ranged enemy shooting ──────────────────────────────────
			if (e.type === "ranged") {
				e.shootTimer -= dt;

				if (e.shootTimer <= 0 && dist < 400) {
					e.shootTimer = 2.0;
					state.bullets.push({
						pos: { x: e.pos.x, y: e.pos.y },
						vel: {
							x: (dx / dist) * BULLET_SPEED * 0.45,
							y: (dy / dist) * BULLET_SPEED * 0.45,
						},
						age: 0,
						radius: BULLET_RADIUS,
						fromPlayer: false,
					});
				}
			}

			// ── Collision with player ──────────────────────────────────
			if (dist < e.radius + player.radius && player.invincibleTimer <= 0) {
				player.hp -= e.damage;
				player.invincibleTimer = 0.5;

				// Knockback particles
				for (let i = 0; i < 6; i++) {
					const angle = Math.random() * Math.PI * 2;
					const spd = 80 + Math.random() * 120;

					state.particles.push({
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

	/** Spawn a single enemy at a random edge position */
	spawnEnemy(state: ShooterState, wave: number): void {
		const type = this.pickType(wave);
		const tmpl = TEMPLATES[type];

		const pos = this.randomEdgePosition(state.canvasW, state.canvasH);

		const enemy: Enemy = {
			pos,
			vel: { x: 0, y: 0 },
			hp: tmpl.hp + Math.floor(wave / 4),
			maxHp: tmpl.hp + Math.floor(wave / 4),
			radius: tmpl.radius,
			speed: tmpl.speed + wave * 3,
			type: tmpl.type,
			color: tmpl.color,
			shootTimer: 1.5,
			damage: tmpl.damage,
		};

		state.enemies.push(enemy);
	}

	private pickType(wave: number): EnemyType {
		const r = Math.random();

		if (wave < 2) return "normal";

		if (wave < 4) return r < 0.3 ? "fast" : "normal";

		if (wave < 6) {
			if (r < 0.2) return "tank";

			if (r < 0.5) return "fast";

			return "normal";
		}

		// Wave 6+: all types
		if (r < 0.15) return "ranged";

		if (r < 0.35) return "tank";

		if (r < 0.55) return "fast";

		return "normal";
	}

	private randomEdgePosition(w: number, h: number) {
		const pad = ARENA_PADDING + 30;
		const side = Math.floor(Math.random() * 4);

		switch (side) {
			case 0:
				return { x: pad, y: pad + Math.random() * (h - 2 * pad) }; // left
			case 1:
				return { x: w - pad, y: pad + Math.random() * (h - 2 * pad) }; // right
			case 2:
				return { x: pad + Math.random() * (w - 2 * pad), y: pad }; // top
			default:
				return { x: pad + Math.random() * (w - 2 * pad), y: h - pad }; // bottom
		}
	}
}
