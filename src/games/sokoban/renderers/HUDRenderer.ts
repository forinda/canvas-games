import type { Renderable } from "@shared/Renderable";
import { COLORS, GAME_COLOR, type SokobanState } from "../types";
import { LEVELS } from "../data/levels";

export class HUDRenderer implements Renderable<SokobanState> {
	render(ctx: CanvasRenderingContext2D, state: SokobanState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		this.drawTopBar(ctx, state, W);

		if (state.levelComplete && !state.gameWon) {
			this.drawLevelCompleteOverlay(ctx, state, W, H);
		}

		if (state.gameWon) {
			this.drawGameWonOverlay(ctx, W, H);
		}
	}

	private drawTopBar(
		ctx: CanvasRenderingContext2D,
		state: SokobanState,
		W: number,
	): void {
		// Background bar
		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.fillRect(0, 0, W, 44);

		const fontSize = Math.min(16, W * 0.025);

		ctx.font = `bold ${fontSize}px monospace`;
		ctx.textBaseline = "middle";

		// Level
		ctx.fillStyle = GAME_COLOR;
		ctx.textAlign = "left";
		ctx.fillText(`Level ${state.level + 1} / ${LEVELS.length}`, 12, 22);

		// Moves
		ctx.fillStyle = COLORS.hud;
		ctx.textAlign = "center";
		ctx.fillText(`Moves: ${state.moves}`, W / 2, 22);

		// Hints
		ctx.fillStyle = COLORS.hudDim;
		ctx.textAlign = "right";
		const smallFont = Math.min(12, W * 0.018);

		ctx.font = `${smallFont}px monospace`;
		ctx.fillText("[Z] Undo  [R] Restart  [H] Help  [ESC] Exit", W - 12, 22);
	}

	private drawLevelCompleteOverlay(
		ctx: CanvasRenderingContext2D,
		state: SokobanState,
		W: number,
		H: number,
	): void {
		ctx.fillStyle = COLORS.overlay;
		ctx.fillRect(0, 0, W, H);

		const titleSize = Math.min(36, W * 0.06);

		ctx.font = `bold ${titleSize}px monospace`;
		ctx.fillStyle = COLORS.boxOnTarget;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Level Complete!", W / 2, H / 2 - 40);

		const subSize = Math.min(18, W * 0.03);

		ctx.font = `${subSize}px monospace`;
		ctx.fillStyle = COLORS.hud;
		ctx.fillText(`Completed in ${state.moves} moves`, W / 2, H / 2 + 10);

		ctx.fillStyle = COLORS.hudDim;
		const hintSize = Math.min(14, W * 0.022);

		ctx.font = `${hintSize}px monospace`;
		ctx.fillText("Press [Space] or [Enter] for next level", W / 2, H / 2 + 50);
	}

	private drawGameWonOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		ctx.fillStyle = COLORS.overlay;
		ctx.fillRect(0, 0, W, H);

		const titleSize = Math.min(42, W * 0.07);

		ctx.font = `bold ${titleSize}px monospace`;
		ctx.fillStyle = GAME_COLOR;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("You Win!", W / 2, H / 2 - 40);

		const subSize = Math.min(20, W * 0.03);

		ctx.font = `${subSize}px monospace`;
		ctx.fillStyle = COLORS.hud;
		ctx.fillText("All levels completed!", W / 2, H / 2 + 10);

		ctx.fillStyle = COLORS.hudDim;
		const hintSize = Math.min(14, W * 0.022);

		ctx.font = `${hintSize}px monospace`;
		ctx.fillText("Press [Space] or [Enter] to play again", W / 2, H / 2 + 50);
	}
}
