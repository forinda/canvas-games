import type { Renderable } from "@shared/Renderable";
import type { InvadersState } from "../types";
import { HUD_HEIGHT, PLAYER_W } from "../types";

export class HUDRenderer implements Renderable<InvadersState> {
	render(ctx: CanvasRenderingContext2D, state: InvadersState): void {
		// ── Top bar ─────────────────────────────────────────────────────────
		ctx.fillStyle = "#111";
		ctx.fillRect(0, 0, state.canvasW, HUD_HEIGHT);

		ctx.fillStyle = "#fff";
		ctx.font = "16px monospace";
		ctx.textBaseline = "middle";

		const midY = HUD_HEIGHT / 2;

		// Score
		ctx.textAlign = "left";
		ctx.fillText(`SCORE: ${state.score}`, 12, midY);

		// High score
		ctx.textAlign = "center";
		ctx.fillText(`HI: ${state.highScore}`, state.canvasW / 2, midY);

		// Level
		ctx.textAlign = "right";
		ctx.fillText(`LEVEL ${state.level}`, state.canvasW - 120, midY);

		// Lives (draw tiny ships)
		const livesX = state.canvasW - 100;

		for (let i = 0; i < state.lives; i++) {
			ctx.fillStyle = "#00ff88";
			const lx = livesX + i * (PLAYER_W * 0.5 + 4);

			ctx.fillRect(lx, midY - 4, PLAYER_W * 0.4, 8);
		}

		// ── Overlays ────────────────────────────────────────────────────────
		if (state.phase === "gameover") {
			this.drawOverlay(ctx, state, "GAME OVER", "Press SPACE to restart");
		} else if (state.phase === "levelclear") {
			this.drawOverlay(ctx, state, `WAVE ${state.level} CLEARED!`, "");
		} else if (state.phase === "paused") {
			this.drawOverlay(ctx, state, "PAUSED", "Press P to resume");
		}
	}

	private drawOverlay(
		ctx: CanvasRenderingContext2D,
		state: InvadersState,
		title: string,
		subtitle: string,
	): void {
		ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
		ctx.fillRect(0, 0, state.canvasW, state.canvasH);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.fillStyle = "#fff";
		ctx.font = "bold 36px monospace";
		ctx.fillText(title, state.canvasW / 2, state.canvasH / 2 - 20);

		if (subtitle) {
			ctx.font = "18px monospace";
			ctx.fillStyle = "#aaa";
			ctx.fillText(subtitle, state.canvasW / 2, state.canvasH / 2 + 24);
		}
	}
}
