import type { Updatable } from "@core/Updatable";
import type { InvadersState } from "../types";
import { PLAYER_BULLET_SPEED, BULLET_W, BULLET_H } from "../types";

export class PlayerSystem implements Updatable<InvadersState> {
	update(state: InvadersState, dt: number): void {
		if (state.phase === "gameover" || state.phase === "paused") return;

		const { player, input } = state;

		// ── Respawn timer ───────────────────────────────────────────────────
		if (state.phase === "respawning") {
			player.respawnTimer -= dt;

			if (player.respawnTimer <= 0) {
				player.alive = true;
				player.respawnTimer = 0;
				state.phase = "playing";
			}

			return;
		}

		if (!player.alive) return;

		// ── Movement ────────────────────────────────────────────────────────
		if (input.left) {
			player.x -= player.speed * dt;
		}

		if (input.right) {
			player.x += player.speed * dt;
		}

		// Clamp
		if (player.x < 0) player.x = 0;

		if (player.x + player.w > state.canvasW) {
			player.x = state.canvasW - player.w;
		}

		// ── Shooting ────────────────────────────────────────────────────────
		player.cooldownLeft -= dt;

		if (player.cooldownLeft < 0) player.cooldownLeft = 0;

		if (input.shoot && player.cooldownLeft <= 0) {
			state.bullets.push({
				x: player.x + player.w / 2 - BULLET_W / 2,
				y: player.y - BULLET_H,
				w: BULLET_W,
				h: BULLET_H,
				vy: PLAYER_BULLET_SPEED,
				fromPlayer: true,
				active: true,
			});
			player.cooldownLeft = player.shootCooldown;
		}
	}
}
