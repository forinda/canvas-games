import type { GameStateData } from "../types";
import { EnemySystem } from "./EnemySystem";

const MAX_PROJECTILES = 150;

export class CombatSystem {
	static update(state: GameStateData, dt: number): void {
		// Cap projectile count — remove oldest if exceeded
		if (state.projectiles.length > MAX_PROJECTILES) {
			state.projectiles.splice(0, state.projectiles.length - MAX_PROJECTILES);
		}

		for (const proj of state.projectiles) {
			if (proj.done) continue;

			// Find current target to track its position
			const target = state.enemies.find((e) => e.id === proj.targetId);

			if (target && !target.dead && !target.reachedEnd) {
				// Steer toward current target position
				proj.toX = target.x;
				proj.toY = target.y;
			}

			// Move projectile
			const dx = proj.toX - proj.x;
			const dy = proj.toY - proj.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const travel = proj.speed * dt;

			if (dist <= travel + 1) {
				// Hit!
				proj.x = proj.toX;
				proj.y = proj.toY;
				proj.done = true;

				if (proj.splashRadius > 0) {
					// Splash damage
					EnemySystem.applyAreaDamage(
						state,
						proj.x,
						proj.y,
						proj.splashRadius,
						proj.damage,
						proj.slowFactor,
					);
				} else if (target && !target.dead) {
					EnemySystem.applyDamage(
						state,
						target.id,
						proj.damage,
						proj.slowFactor,
					);
				}
			} else {
				// Still traveling
				const nx = dx / dist;
				const ny = dy / dist;

				proj.x += nx * travel;
				proj.y += ny * travel;
			}
		}

		// Clean up done projectiles
		state.projectiles = state.projectiles.filter((p) => !p.done);
	}
}
