import type { Updatable } from "@shared/Updatable";
import type { BalloonState, Balloon } from "../types";
import {
	BALLOON_RADIUS_MIN,
	BALLOON_RADIUS_MAX,
	BALLOON_SPEED_MIN,
	BALLOON_SPEED_MAX,
	BALLOON_COLORS,
	SPAWN_INTERVAL_BASE,
	SPAWN_INTERVAL_MIN,
	SPAWN_RAMP_RATE,
} from "../types";

export class BalloonSystem implements Updatable<BalloonState> {
	private canvasWidth: number;
	private canvasHeight: number;

	constructor(canvasWidth: number, canvasHeight: number) {
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
	}

	resize(w: number, h: number): void {
		this.canvasWidth = w;
		this.canvasHeight = h;
	}

	update(state: BalloonState, dt: number): void {
		if (state.phase !== "playing" || state.paused) return;

		const dtSec = dt / 1000;

		// Ramp spawn rate based on elapsed time
		state.spawnInterval = Math.max(
			SPAWN_INTERVAL_MIN,
			SPAWN_INTERVAL_BASE - state.elapsed * SPAWN_RAMP_RATE,
		);

		// Spawn timer
		state.spawnTimer -= dt;

		if (state.spawnTimer <= 0) {
			state.spawnTimer = state.spawnInterval;
			this.spawnBalloon(state);
		}

		// Move balloons upward
		for (let i = state.balloons.length - 1; i >= 0; i--) {
			const b = state.balloons[i];

			if (b.popped) {
				// Remove popped balloons after a short delay (particles handled in ScoreSystem)
				state.balloons.splice(i, 1);
				continue;
			}

			// Float upward
			b.y -= b.speed * dtSec;

			// Gentle horizontal wobble
			b.wobbleOffset += dtSec * 2;
			b.x += Math.sin(b.wobbleOffset) * 0.5;

			// Escaped off the top — lose a life
			if (b.y + b.radius < -10) {
				state.balloons.splice(i, 1);
				state.lives -= 1;
				state.combo = 0;
				state.comboTimer = 0;

				if (state.lives <= 0) {
					state.lives = 0;
					state.phase = "gameover";
				}
			}
		}
	}

	private spawnBalloon(state: BalloonState): void {
		const radius =
			BALLOON_RADIUS_MIN +
			Math.random() * (BALLOON_RADIUS_MAX - BALLOON_RADIUS_MIN);
		const speed =
			BALLOON_SPEED_MIN +
			Math.random() * (BALLOON_SPEED_MAX - BALLOON_SPEED_MIN);
		const color =
			BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
		const margin = radius + 10;
		const x = margin + Math.random() * (this.canvasWidth - margin * 2);

		const balloon: Balloon = {
			x: x,
			y: this.canvasHeight + radius + 10,
			radius: radius,
			color: color,
			speed: speed,
			popped: false,
			popParticles: [],
			wobbleOffset: Math.random() * Math.PI * 2,
		};

		state.balloons.push(balloon);
	}
}
