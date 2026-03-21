import type { Updatable } from "@core/Updatable";
import type { IdleState, ClickParticle } from "../types.ts";

/**
 * Processes click rewards:
 * - Adds coins based on click power
 * - Spawns floating text particles
 * - Triggers coin pulse animation
 */
export class ClickSystem implements Updatable<IdleState> {
	/** Queue of pending clicks to process */
	private pendingClicks: { x: number; y: number }[] = [];

	/** Enqueue a click to be processed next frame */
	registerClick(x: number, y: number): void {
		this.pendingClicks.push({ x, y });
	}

	update(state: IdleState, dt: number): void {
		// Process pending clicks
		for (const click of this.pendingClicks) {
			const earned = state.clickPower;

			state.coins += earned;
			state.totalCoinsEarned += earned;
			state.totalClicks++;

			// Trigger pulse
			state.coinPulse = 1.0;

			// Spawn particle
			const particle: ClickParticle = {
				x: click.x + (Math.random() - 0.5) * 40,
				y: click.y - 10,
				text: `+${formatClickAmount(earned)}`,
				alpha: 1,
				vy: -60 - Math.random() * 40,
				life: 1.0,
			};

			state.particles.push(particle);
		}

		this.pendingClicks.length = 0;

		// Update particles
		const dtSec = dt / 1000;

		for (let i = state.particles.length - 1; i >= 0; i--) {
			const p = state.particles[i];

			p.y += p.vy * dtSec;
			p.life -= dtSec * 1.2;
			p.alpha = Math.max(0, p.life);

			if (p.life <= 0) {
				state.particles.splice(i, 1);
			}
		}

		// Decay pulse
		if (state.coinPulse > 0) {
			state.coinPulse = Math.max(0, state.coinPulse - dtSec * 5);
		}
	}
}

function formatClickAmount(n: number): string {
	if (n >= 1) return Math.floor(n).toString();

	return n.toFixed(1);
}
