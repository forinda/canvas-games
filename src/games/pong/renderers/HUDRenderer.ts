import type { Renderable } from "@shared/Renderable";
import type { PongState } from "../types";
import { HelpOverlay } from "@shared/HelpOverlay";
import { PONG_HELP } from "../data/help";

const ACCENT = "#26c6da";

export class HUDRenderer implements Renderable<PongState> {
	private helpOverlay = new HelpOverlay();

	render(ctx: CanvasRenderingContext2D, state: PongState): void {
		this.drawScores(ctx, state);

		switch (state.phase) {
			case "mode-select":
				this.drawModeSelect(ctx, state);
				break;
			case "start":
				this.drawStartOverlay(ctx, state);
				break;
			case "paused":
				this.drawPausedOverlay(ctx, state);
				break;
			case "win":
				this.drawWinOverlay(ctx, state);
				break;
		}

		// Help overlay (toggled with H)
		this.helpOverlay.visible = state.showHelp;
		this.helpOverlay.render(ctx, PONG_HELP, "Pong", ACCENT);
	}

	// ── Private ──────────────────────────────────────────────────────────────

	private drawScores(ctx: CanvasRenderingContext2D, s: PongState): void {
		const size = Math.min(72, s.canvasW * 0.06);

		ctx.font = `bold ${size}px monospace`;
		ctx.fillStyle = "rgba(255,255,255,0.2)";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";

		// Left score
		ctx.fillText(String(s.leftScore), s.canvasW / 4, 30);
		// Right score
		ctx.fillText(String(s.rightScore), (s.canvasW * 3) / 4, 30);
	}

	private drawModeSelect(ctx: CanvasRenderingContext2D, s: PongState): void {
		const W = s.canvasW;
		const H = s.canvasH;
		const cx = W / 2;
		const cy = H / 2;

		this.dimBackground(ctx, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = `bold ${Math.min(48, W * 0.06)}px monospace`;
		ctx.fillStyle = ACCENT;
		ctx.fillText("PONG", cx, cy - 90);

		ctx.font = `${Math.min(20, W * 0.025)}px monospace`;
		ctx.fillStyle = "#ccc";
		ctx.fillText("Select Mode", cx, cy - 40);

		ctx.font = `bold ${Math.min(22, W * 0.028)}px monospace`;
		ctx.fillStyle = "#fff";
		ctx.fillText("[1]  vs AI", cx, cy + 10);
		ctx.fillText("[2]  vs Player (Local)", cx, cy + 50);

		ctx.font = `${Math.min(14, W * 0.018)}px monospace`;
		ctx.fillStyle = "#666";
		ctx.fillText("[H] Help  |  [ESC] Exit", cx, cy + 110);
	}

	private drawStartOverlay(ctx: CanvasRenderingContext2D, s: PongState): void {
		const cx = s.canvasW / 2;
		const cy = s.canvasH / 2;

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = `${Math.min(22, s.canvasW * 0.028)}px monospace`;
		ctx.fillStyle = "#ccc";
		const modeLabel = s.mode === "ai" ? "vs AI" : "vs Player";

		ctx.fillText(`Mode: ${modeLabel}`, cx, cy - 20);

		ctx.font = `${Math.min(18, s.canvasW * 0.022)}px monospace`;
		ctx.fillStyle = ACCENT;
		ctx.fillText("Press SPACE or ENTER to start", cx, cy + 20);
	}

	private drawPausedOverlay(ctx: CanvasRenderingContext2D, s: PongState): void {
		const W = s.canvasW;
		const H = s.canvasH;

		this.dimBackground(ctx, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `bold ${Math.min(36, W * 0.045)}px monospace`;
		ctx.fillStyle = ACCENT;
		ctx.fillText("PAUSED", W / 2, H / 2 - 20);

		ctx.font = `${Math.min(16, W * 0.02)}px monospace`;
		ctx.fillStyle = "#999";
		ctx.fillText("Press [P] to resume", W / 2, H / 2 + 20);
	}

	private drawWinOverlay(ctx: CanvasRenderingContext2D, s: PongState): void {
		const W = s.canvasW;
		const H = s.canvasH;
		const cx = W / 2;
		const cy = H / 2;

		this.dimBackground(ctx, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		let winnerLabel: string;

		if (s.mode === "ai") {
			winnerLabel = s.winner === "left" ? "You Win!" : "AI Wins!";
		} else {
			winnerLabel = s.winner === "left" ? "Player 1 Wins!" : "Player 2 Wins!";
		}

		ctx.font = `bold ${Math.min(42, W * 0.05)}px monospace`;
		ctx.fillStyle = ACCENT;
		ctx.fillText(winnerLabel, cx, cy - 50);

		ctx.font = `${Math.min(28, W * 0.035)}px monospace`;
		ctx.fillStyle = "#fff";
		ctx.fillText(`${s.leftScore} - ${s.rightScore}`, cx, cy);

		ctx.font = `${Math.min(16, W * 0.02)}px monospace`;
		ctx.fillStyle = "#999";
		ctx.fillText(
			"[SPACE] Play Again  |  [M] Mode Select  |  [ESC] Exit",
			cx,
			cy + 50,
		);
	}

	private dimBackground(
		ctx: CanvasRenderingContext2D,
		w: number,
		h: number,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, w, h);
	}
}
