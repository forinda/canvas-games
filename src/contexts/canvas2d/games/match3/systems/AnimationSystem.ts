import type { Updatable } from "@core/Updatable";
import type { Match3State } from "../types";
import { SWAP_DURATION } from "../types";

/**
 * Drives smooth gem position updates for swapping and falling.
 * Gem pixel positions are interpolated each frame so the renderer
 * can simply draw gems at their current (x, y).
 */
export class AnimationSystem implements Updatable<Match3State> {
	update(state: Match3State, _dt: number): void {
		const {
			board,
			cellSize,
			boardOffsetX,
			boardOffsetY,
			phase,
			phaseTimer,
			swapA,
			swapB,
		} = state;

		// Animate swap / swap-back by interpolating positions
		if ((phase === "swapping" || phase === "swap-back") && swapA && swapB) {
			const t = Math.min(phaseTimer / SWAP_DURATION, 1);
			const eased = this.easeInOutQuad(phase === "swap-back" ? 1 - t : t);

			const gemA = board[swapA.row]?.[swapA.col];
			const gemB = board[swapB.row]?.[swapB.col];

			if (gemA && gemB) {
				const axTarget = boardOffsetX + swapA.col * cellSize + cellSize / 2;
				const ayTarget = boardOffsetY + swapA.row * cellSize + cellSize / 2;
				const bxTarget = boardOffsetX + swapB.col * cellSize + cellSize / 2;
				const byTarget = boardOffsetY + swapB.row * cellSize + cellSize / 2;

				// During 'swapping', gemA is now at swapB position in the array (they were swapped)
				// so gemA needs to animate from swapA's visual spot to swapB's visual spot
				gemA.x = axTarget + (bxTarget - axTarget) * eased;
				gemA.y = ayTarget + (byTarget - ayTarget) * eased;
				gemB.x = bxTarget + (axTarget - bxTarget) * eased;
				gemB.y = byTarget + (ayTarget - byTarget) * eased;
			}
		}

		// Snap idle gems to their grid positions
		if (phase === "idle" || phase === "game-over") {
			for (let r = 0; r < state.rows; r++) {
				for (let c = 0; c < state.cols; c++) {
					const gem = board[r][c];

					if (gem && !gem.falling) {
						gem.x = boardOffsetX + c * cellSize + cellSize / 2;
						gem.y = boardOffsetY + r * cellSize + cellSize / 2;
						gem.scale = 1;
						gem.opacity = 1;
					}
				}
			}
		}
	}

	private easeInOutQuad(t: number): number {
		return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
	}
}
