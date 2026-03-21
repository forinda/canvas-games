import type { Updatable } from "@core/Updatable";
import type { PlatState } from "../types";

export class CollisionSystem implements Updatable<PlatState> {
	update(state: PlatState, dt: number): void {
		const s = state;

		// Platform collision
		s.onGround = false;

		for (const p of s.platforms) {
			// Moving platforms
			if (
				p.type === "moving" &&
				p.origX !== undefined &&
				p.moveRange &&
				p.moveSpeed
			) {
				p.x =
					p.origX +
					Math.sin(performance.now() * 0.001 * (p.moveSpeed / 60)) *
						p.moveRange;
			}

			if (
				s.px + s.pw > p.x &&
				s.px < p.x + p.w &&
				s.py + s.ph > p.y &&
				s.py + s.ph < p.y + p.h + s.vy * dt + 10
			) {
				if (s.vy >= 0) {
					s.py = p.y - s.ph;
					s.vy = 0;
					s.onGround = true;

					if (p.type === "crumble") {
						p.crumbleTimer = (p.crumbleTimer ?? 0) + dt;

						if (p.crumbleTimer > 0.8) {
							p.y = 9999; // remove
						}
					}
				}
			}
		}

		// Fall death
		if (s.py > 700) {
			s.lives--;

			if (s.lives <= 0) {
				s.gameOver = true;

				return;
			}

			s.px = 60;
			s.py = 460;
			s.vx = 0;
			s.vy = 0;
		}
	}
}
