import type { Updatable } from "@shared/Updatable";
import type { InvadersState, Bullet, Shield } from "../types";

function rectsOverlap(
	ax: number,
	ay: number,
	aw: number,
	ah: number,
	bx: number,
	by: number,
	bw: number,
	bh: number,
): boolean {
	return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export class CollisionSystem implements Updatable<InvadersState> {
	update(state: InvadersState, _dt: number): void {
		if (state.phase !== "playing" && state.phase !== "respawning") return;

		const activeBullets = state.bullets.filter((b) => b.active);

		for (const bullet of activeBullets) {
			// ── Off-screen removal ────────────────────────────────────────────
			if (bullet.y + bullet.h < 0 || bullet.y > state.canvasH) {
				bullet.active = false;
				continue;
			}

			if (bullet.fromPlayer) {
				// Player bullet → aliens
				for (const alien of state.aliens) {
					if (!alien.alive) continue;

					if (
						rectsOverlap(
							bullet.x,
							bullet.y,
							bullet.w,
							bullet.h,
							alien.x,
							alien.y,
							alien.w,
							alien.h,
						)
					) {
						alien.alive = false;
						bullet.active = false;
						state.score += alien.points;

						if (state.score > state.highScore) {
							state.highScore = state.score;
						}

						break;
					}
				}

				// Player bullet → UFO
				if (bullet.active && state.ufo?.active) {
					const u = state.ufo;

					if (
						rectsOverlap(
							bullet.x,
							bullet.y,
							bullet.w,
							bullet.h,
							u.x,
							u.y,
							u.w,
							u.h,
						)
					) {
						state.score += u.points;

						if (state.score > state.highScore) {
							state.highScore = state.score;
						}

						u.active = false;
						bullet.active = false;
					}
				}
			} else {
				// Alien bullet → player
				if (state.player.alive) {
					const p = state.player;

					if (
						rectsOverlap(
							bullet.x,
							bullet.y,
							bullet.w,
							bullet.h,
							p.x,
							p.y,
							p.w,
							p.h,
						)
					) {
						bullet.active = false;
						this.killPlayer(state);
						continue;
					}
				}
			}

			// Any bullet → shields
			if (bullet.active) {
				this.checkShields(bullet, state.shields);
			}
		}

		// Purge inactive bullets
		state.bullets = state.bullets.filter((b) => b.active);

		// ── Check level clear ───────────────────────────────────────────────
		if (state.aliens.every((a) => !a.alive) && state.phase === "playing") {
			state.phase = "levelclear";
			state.levelClearTimer = 2.0;
		}
	}

	private killPlayer(state: InvadersState): void {
		state.player.alive = false;
		state.lives--;

		if (state.lives <= 0) {
			state.phase = "gameover";
		} else {
			state.phase = "respawning";
			state.player.respawnTimer = 1.5;
			// Reset player position
			state.player.x = state.canvasW / 2 - state.player.w / 2;
		}
	}

	private checkShields(bullet: Bullet, shields: Shield[]): void {
		for (const shield of shields) {
			const shieldPxW = shield.cols * shield.blockSize;
			const shieldPxH = shield.rows * shield.blockSize;

			if (
				!rectsOverlap(
					bullet.x,
					bullet.y,
					bullet.w,
					bullet.h,
					shield.x,
					shield.y,
					shieldPxW,
					shieldPxH,
				)
			) {
				continue;
			}

			// Find which pixels are hit and remove them
			const localX = bullet.x - shield.x;
			const localY = bullet.y - shield.y;

			const colStart = Math.max(0, Math.floor(localX / shield.blockSize));
			const colEnd = Math.min(
				shield.cols - 1,
				Math.floor((localX + bullet.w) / shield.blockSize),
			);

			// For player bullets (going up), erode from bottom; for alien bullets, from top
			const rowStart = Math.max(0, Math.floor(localY / shield.blockSize));
			const rowEnd = Math.min(
				shield.rows - 1,
				Math.floor((localY + bullet.h) / shield.blockSize),
			);

			let hit = false;

			for (let r = rowStart; r <= rowEnd; r++) {
				for (let c = colStart; c <= colEnd; c++) {
					if (shield.grid[r][c]) {
						shield.grid[r][c] = false;
						hit = true;
					}
				}
			}

			if (hit) {
				bullet.active = false;

				return;
			}
		}
	}
}
