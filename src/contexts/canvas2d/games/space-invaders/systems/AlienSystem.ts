import type { Updatable } from "@core/Updatable";
import {
	type Alien,
	type InvadersState,
	ALIEN_BASE_SPEED,
	ALIEN_DROP,
	ALIEN_SHOOT_INTERVAL,
	ALIEN_BULLET_SPEED,
	BULLET_W,
	BULLET_H,
} from "../types";

export class AlienSystem implements Updatable<InvadersState> {
	update(state: InvadersState, dt: number): void {
		if (state.phase !== "playing") return;

		const alive = state.aliens.filter((a) => a.alive);

		if (alive.length === 0) return;

		// ── Speed scales with how many aliens remain ────────────────────────
		const totalAliens = state.aliens.length;
		const ratio = alive.length / totalAliens; // 1 → 0

		// Speed multiplier: goes from 1× at full grid to ~4× at last alien
		state.alienSpeedMultiplier = 1 + (1 - ratio) * 3;

		const speed =
			ALIEN_BASE_SPEED *
			state.alienSpeedMultiplier *
			(1 + (state.level - 1) * 0.15); // 15% faster per level

		// ── Horizontal movement ─────────────────────────────────────────────
		const dx = speed * state.alienDir * dt;
		let shouldDrop = false;

		for (const a of alive) {
			a.x += dx;

			if (a.x + a.w > state.canvasW - 4 || a.x < 4) {
				shouldDrop = true;
			}
		}

		if (shouldDrop) {
			state.alienDir = (state.alienDir * -1) as 1 | -1;

			for (const a of alive) {
				a.y += ALIEN_DROP;
			}

			// Check if aliens reached the player row → instant game over
			for (const a of alive) {
				if (a.y + a.h >= state.player.y) {
					state.lives = 0;
					state.phase = "gameover";

					return;
				}
			}
		}

		// ── Alien shooting ──────────────────────────────────────────────────
		const shootInterval = ALIEN_SHOOT_INTERVAL / (1 + (state.level - 1) * 0.1);

		state.alienShootTimer -= dt;

		if (state.alienShootTimer <= 0) {
			state.alienShootTimer = shootInterval * (0.5 + Math.random());

			// Pick a random bottom-row alien per column to shoot
			const bottomAliens = this.getBottomAliens(alive);

			if (bottomAliens.length > 0) {
				const shooter =
					bottomAliens[Math.floor(Math.random() * bottomAliens.length)];

				state.bullets.push({
					x: shooter.x + shooter.w / 2 - BULLET_W / 2,
					y: shooter.y + shooter.h,
					w: BULLET_W,
					h: BULLET_H,
					vy: ALIEN_BULLET_SPEED,
					fromPlayer: false,
					active: true,
				});
			}
		}
	}

	/** For each column, find the lowest alive alien. */
	private getBottomAliens(alive: Alien[]) {
		const cols = new Map<number, (typeof alive)[0]>();

		for (const a of alive) {
			const existing = cols.get(a.col);

			if (!existing || a.row > existing.row) {
				cols.set(a.col, a);
			}
		}

		return [...cols.values()];
	}
}
