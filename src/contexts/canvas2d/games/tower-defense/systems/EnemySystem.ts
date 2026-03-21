import type {
	ActiveEnemy,
	DamageNumber,
	EnemyType,
	GameStateData,
	Particle,
} from "../types";
import { ENEMY_DEFS } from "../data/enemies";
import { advanceEnemy, getEnemyPixelPos } from "./PathSystem";
import { EconomySystem } from "./EconomySystem";
import type { GridSystem } from "./GridSystem";

let _enemyCounter = 0;
let _particleCounter = 0;
const MAX_PARTICLES = 200;

export class EnemySystem {
	static spawnEnemy(
		state: GameStateData,
		type: EnemyType,
		hpMultiplier = 1,
		speedMultiplier = 1,
	): void {
		const def = ENEMY_DEFS[type];
		const id = `enemy_${++_enemyCounter}`;
		const enemy: ActiveEnemy = {
			id,
			type,
			hp: Math.round(def.baseHp * hpMultiplier),
			maxHp: Math.round(def.baseHp * hpMultiplier),
			speed: def.baseSpeed * speedMultiplier,
			baseSpeed: def.baseSpeed * speedMultiplier,
			slowUntil: 0,
			reward: def.reward,
			waypointIndex: 1,
			progress: 0,
			x: 0,
			y: 0,
			dead: false,
			reachedEnd: false,
			hpBarTimer: 0,
		};

		state.enemies.push(enemy);
	}

	static update(state: GameStateData, dt: number, grid: GridSystem): void {
		const now = performance.now();

		for (const enemy of state.enemies) {
			if (enemy.dead || enemy.reachedEnd) continue;

			// Apply slow
			const slowActive = now < enemy.slowUntil;
			const immune = ENEMY_DEFS[enemy.type].immuneToSlow;
			const effectiveSpeed =
				slowActive && !immune ? enemy.baseSpeed * 0.5 : enemy.baseSpeed;

			enemy.speed = effectiveSpeed;

			const distanceCells = effectiveSpeed * dt;
			const reachedEnd = advanceEnemy(enemy, distanceCells);

			// Update pixel position
			const pos = getEnemyPixelPos(enemy, grid.cellSize, grid.gridOffsetY);

			enemy.x = pos.x;
			enemy.y = pos.y;

			if (reachedEnd) {
				enemy.reachedEnd = true;
				state.lives = Math.max(0, state.lives - 1);

				if (state.lives <= 0) {
					state.screen = "gameover";
				}
			}
		}

		// Single-pass: process dead/ended and keep alive in one loop
		const alive: ActiveEnemy[] = [];

		for (const e of state.enemies) {
			if (e.dead) {
				EconomySystem.earnGold(state, e.reward);
				EconomySystem.addScore(state, e.maxHp);
				EnemySystem.spawnDeathParticles(
					state,
					e.x,
					e.y,
					ENEMY_DEFS[e.type].color,
				);
			} else if (!e.reachedEnd) {
				alive.push(e);
			}
		}

		state.enemies = alive;
	}

	static applyDamage(
		state: GameStateData,
		enemyId: string,
		damage: number,
		slowFactor: number,
		slowDuration = 2000,
	): void {
		const enemy = state.enemies.find((e) => e.id === enemyId);

		if (!enemy || enemy.dead) return;

		enemy.hp -= damage;
		enemy.hpBarTimer = performance.now() + 2000;

		// Floating damage number
		const dmgNum: DamageNumber = {
			id: `dn_${++_particleCounter}`,
			x: enemy.x + (Math.random() - 0.5) * 10,
			y: enemy.y - 12,
			text: `-${damage}`,
			color: slowFactor > 0 ? "#4fc3f7" : "#ff5252",
			alpha: 1,
			age: 0,
		};

		state.damageNumbers.push(dmgNum);

		if (slowFactor > 0 && !ENEMY_DEFS[enemy.type].immuneToSlow) {
			enemy.slowUntil = performance.now() + slowDuration;
		}

		if (enemy.hp <= 0) {
			enemy.dead = true;
		}
	}

	static applyAreaDamage(
		state: GameStateData,
		cx: number,
		cy: number,
		radius: number,
		damage: number,
		slowFactor: number,
		excludeId?: string,
	): void {
		for (const enemy of state.enemies) {
			if (enemy.dead || enemy.id === excludeId) continue;

			const dx = enemy.x - cx;
			const dy = enemy.y - cy;

			if (dx * dx + dy * dy <= radius * radius) {
				EnemySystem.applyDamage(state, enemy.id, damage, slowFactor);
			}
		}
	}

	private static spawnDeathParticles(
		state: GameStateData,
		x: number,
		y: number,
		color: string,
	): void {
		// Cap total particles to avoid unbounded growth
		if (state.particles.length >= MAX_PARTICLES) return;

		for (let i = 0; i < 8; i++) {
			const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
			const speed = 60 + Math.random() * 80;
			const p: Particle = {
				id: `p_${++_particleCounter}`,
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				radius: 3 + Math.random() * 3,
				color,
				alpha: 1,
				decay: 0.04 + Math.random() * 0.02,
				done: false,
			};

			state.particles.push(p);
		}
	}
}
