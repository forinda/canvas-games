import type { Renderable } from "@core/Renderable";
import type { MemoryState } from "../types";
import { DIFFICULTIES, GAME_COLOR } from "../types";

/**
 * Draws the HUD: moves counter, pairs found, timer, difficulty selector,
 * and overlay screens (start, paused, won).
 */
export class HUDRenderer implements Renderable<MemoryState> {
	render(ctx: CanvasRenderingContext2D, state: MemoryState): void {
		const W = state.canvasW;

		// --- Top HUD bar ---
		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.fillRect(0, 0, W, 48);

		ctx.font = "bold 14px monospace";
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";

		// Moves
		ctx.fillStyle = GAME_COLOR;
		ctx.fillText("MOVES", 16, 24);
		ctx.fillStyle = "#fff";
		ctx.fillText(String(state.moves), 84, 24);

		// Pairs found
		ctx.fillStyle = GAME_COLOR;
		ctx.fillText("PAIRS", 140, 24);
		ctx.fillStyle = "#4ade80";
		ctx.fillText(`${state.pairsFound}/${state.totalPairs}`, 200, 24);

		// Timer
		ctx.textAlign = "right";
		ctx.fillStyle = GAME_COLOR;
		const timeStr = this.formatTime(state.elapsedTime);

		ctx.fillText(timeStr, W - 16, 24);

		// Difficulty label
		ctx.textAlign = "center";
		ctx.fillStyle = "#888";
		ctx.font = "12px monospace";
		ctx.fillText(DIFFICULTIES[state.difficulty].label, W / 2, 24);

		// Best scores
		if (state.bestMoves !== null || state.bestTime !== null) {
			ctx.font = "11px monospace";
			ctx.fillStyle = "#666";
			const bestParts: string[] = [];

			if (state.bestMoves !== null)
				bestParts.push(`Best: ${state.bestMoves} moves`);

			if (state.bestTime !== null)
				bestParts.push(this.formatTime(state.bestTime));

			ctx.fillText(bestParts.join(" | "), W / 2, 40);
		}

		// --- Overlays ---
		if (!state.started) {
			this.drawStartOverlay(ctx, state);
		} else if (state.paused) {
			this.drawOverlay(ctx, state, "PAUSED", "Press [P] to resume");
		} else if (state.gameOver) {
			this.drawWinOverlay(ctx, state);
		}
	}

	private drawStartOverlay(
		ctx: CanvasRenderingContext2D,
		state: MemoryState,
	): void {
		const W = state.canvasW;
		const H = state.canvasH;

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		const panelW = Math.min(440, W * 0.75);
		const panelH = 220;
		const px = (W - panelW) / 2;
		const py = (H - panelH) / 2;

		ctx.fillStyle = "#12121f";
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = GAME_COLOR;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.stroke();

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = "bold 26px monospace";
		ctx.fillStyle = GAME_COLOR;
		ctx.fillText("Memory Match", W / 2, py + 40);

		// Difficulty selector
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText(DIFFICULTIES[state.difficulty].label, W / 2, py + 90);

		ctx.font = "13px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText("\u2190 / \u2192  Change difficulty", W / 2, py + 115);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText("Click or [Space] to start  |  [H] Help", W / 2, py + 155);

		ctx.font = "12px monospace";
		ctx.fillStyle = "#666";
		ctx.fillText("[ESC] Exit  |  [P] Pause  |  [R] Restart", W / 2, py + 185);
	}

	private drawWinOverlay(
		ctx: CanvasRenderingContext2D,
		state: MemoryState,
	): void {
		const W = state.canvasW;
		const H = state.canvasH;

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		const panelW = Math.min(420, W * 0.75);
		const panelH = 200;
		const px = (W - panelW) / 2;
		const py = (H - panelH) / 2;

		ctx.fillStyle = "#12121f";
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = GAME_COLOR;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.stroke();

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = "bold 28px monospace";
		ctx.fillStyle = "#4ade80";
		ctx.fillText("YOU WIN!", W / 2, py + 40);

		ctx.font = "16px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText(
			`${state.moves} moves  |  ${this.formatTime(state.elapsedTime)}`,
			W / 2,
			py + 80,
		);

		if (state.bestMoves !== null) {
			ctx.font = "13px monospace";
			ctx.fillStyle = "#aaa";
			ctx.fillText(
				`Best: ${state.bestMoves} moves  |  ${this.formatTime(state.bestTime ?? 0)}`,
				W / 2,
				py + 110,
			);
		}

		ctx.font = "14px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText(
			"[Space] Play again  |  \u2190\u2192 Change difficulty",
			W / 2,
			py + 150,
		);

		ctx.font = "12px monospace";
		ctx.fillStyle = "#666";
		ctx.fillText("[ESC] Exit", W / 2, py + 178);
	}

	private drawOverlay(
		ctx: CanvasRenderingContext2D,
		state: MemoryState,
		title: string,
		subtitle: string,
	): void {
		const W = state.canvasW;
		const H = state.canvasH;

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		const panelW = Math.min(400, W * 0.7);
		const panelH = 160;
		const px = (W - panelW) / 2;
		const py = (H - panelH) / 2;

		ctx.fillStyle = "#12121f";
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = GAME_COLOR;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.stroke();

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = "bold 28px monospace";
		ctx.fillStyle = GAME_COLOR;
		ctx.fillText(title, W / 2, py + 55);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText(subtitle, W / 2, py + 105);
	}

	private formatTime(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	}
}
