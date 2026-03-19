import type { Renderable } from "@shared/Renderable.ts";
import type { IdleState } from "../types.ts";
import { SHOP_WIDTH_RATIO, SHOP_MIN_WIDTH, SHOP_MAX_WIDTH } from "../types.ts";
import { formatNumber } from "../utils.ts";

/**
 * Renders the heads-up display:
 * - Total coins (large, formatted)
 * - CPS rate
 * - Click power
 * - Total clicks counter
 */
export class HUDRenderer implements Renderable<IdleState> {
	render(ctx: CanvasRenderingContext2D, state: IdleState): void {
		const W = state.width;
		const H = state.height;
		const shopW = Math.max(
			SHOP_MIN_WIDTH,
			Math.min(SHOP_MAX_WIDTH, W * SHOP_WIDTH_RATIO),
		);
		const gameW = W - shopW;
		const cx = gameW / 2;

		// Total coins — large display at top
		ctx.fillStyle = "#ffc107";
		ctx.font = `bold ${Math.min(42, gameW * 0.07)}px monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(`${formatNumber(state.coins)}`, cx, 30);

		// "coins" label
		ctx.fillStyle = "rgba(255, 193, 7, 0.6)";
		ctx.font = `${Math.min(16, gameW * 0.03)}px monospace`;
		ctx.fillText("coins", cx, 30 + Math.min(48, gameW * 0.08));

		// CPS rate
		ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
		ctx.font = `${Math.min(14, gameW * 0.028)}px monospace`;
		ctx.fillText(
			`${formatNumber(state.cps)} per second`,
			cx,
			H * 0.45 + Math.min(gameW, H) * 0.15 + 50,
		);

		// Stats at bottom-left of game area
		const statsX = 16;
		const statsY = H - 60;

		ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
		ctx.font = `${Math.min(12, gameW * 0.025)}px monospace`;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(
			`Click power: ${formatNumber(state.clickPower)}`,
			statsX,
			statsY,
		);
		ctx.fillText(
			`Total clicks: ${state.totalClicks.toLocaleString()}`,
			statsX,
			statsY + 18,
		);

		// Controls hint
		ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
		ctx.font = `${Math.min(11, gameW * 0.022)}px monospace`;
		ctx.textAlign = "center";
		ctx.fillText("[H] Help  [ESC] Exit", cx, H - 16);
	}
}
