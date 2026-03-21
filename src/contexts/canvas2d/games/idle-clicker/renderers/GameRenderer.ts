import type { Renderable } from "@core/Renderable";
import type { IdleState } from "../types.ts";
import {
	BG_TIERS,
	SHOP_WIDTH_RATIO,
	SHOP_MIN_WIDTH,
	SHOP_MAX_WIDTH,
} from "../types.ts";

/**
 * Renders the main game area:
 * - Gradient background that evolves with progress
 * - Big clickable coin/crystal in center with pulse animation
 * - Click particles floating upward
 */
export class GameRenderer implements Renderable<IdleState> {
	render(ctx: CanvasRenderingContext2D, state: IdleState): void {
		const W = state.width;
		const H = state.height;
		const shopW = Math.max(
			SHOP_MIN_WIDTH,
			Math.min(SHOP_MAX_WIDTH, W * SHOP_WIDTH_RATIO),
		);
		const gameW = W - shopW;

		// Background gradient based on progression
		const tier = this.getBackgroundTier(state.totalCoinsEarned);
		const grad = ctx.createLinearGradient(0, 0, 0, H);

		grad.addColorStop(0, tier.from);
		grad.addColorStop(1, tier.to);
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, gameW, H);

		// Coin button
		const cx = gameW / 2;
		const cy = H * 0.45;
		const baseRadius = Math.min(gameW, H) * 0.15;
		const pulse = 1 + state.coinPulse * 0.15;
		const r = baseRadius * pulse;

		// Update button bounds in state
		state.coinButton.x = cx;
		state.coinButton.y = cy;
		state.coinButton.radius = baseRadius * 1.15; // Slightly larger hitbox

		// Glow
		const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2);

		glowGrad.addColorStop(0, "rgba(255, 193, 7, 0.3)");
		glowGrad.addColorStop(1, "rgba(255, 193, 7, 0)");
		ctx.fillStyle = glowGrad;
		ctx.beginPath();
		ctx.arc(cx, cy, r * 2, 0, Math.PI * 2);
		ctx.fill();

		// Coin circle
		const coinGrad = ctx.createRadialGradient(
			cx - r * 0.3,
			cy - r * 0.3,
			0,
			cx,
			cy,
			r,
		);

		coinGrad.addColorStop(0, "#ffe082");
		coinGrad.addColorStop(0.5, "#ffc107");
		coinGrad.addColorStop(1, "#f57f17");
		ctx.fillStyle = coinGrad;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.fill();

		// Coin border
		ctx.strokeStyle = "#ff8f00";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.stroke();

		// Dollar sign on coin
		ctx.fillStyle = "#e65100";
		ctx.font = `bold ${Math.floor(r * 0.8)}px monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("$", cx, cy);

		// Inner ring
		ctx.strokeStyle = "rgba(255, 224, 130, 0.5)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
		ctx.stroke();

		// "Click!" hint text below coin
		ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
		ctx.font = `${Math.floor(Math.min(16, gameW * 0.03))}px monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("Click to earn!", cx, cy + r + 20);

		// Click particles
		for (const p of state.particles) {
			if (p.alpha <= 0) continue;

			ctx.globalAlpha = p.alpha;
			ctx.fillStyle = "#ffc107";
			ctx.font = `bold ${Math.floor(Math.min(18, gameW * 0.035))}px monospace`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(p.text, p.x, p.y);
		}

		ctx.globalAlpha = 1;
	}

	private getBackgroundTier(totalCoins: number): { from: string; to: string } {
		let result = BG_TIERS[0];

		for (const tier of BG_TIERS) {
			if (totalCoins >= tier.threshold) {
				result = tier;
			}
		}

		return result;
	}
}
