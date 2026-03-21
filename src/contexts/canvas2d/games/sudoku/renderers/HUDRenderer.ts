import type { Renderable } from "@core/Renderable";
import {
	GRID,
	GAME_COLOR,
	type SudokuState,
	type Difficulty,
	DIFFICULTY_PRESETS,
} from "../types";

export class HUDRenderer implements Renderable<SudokuState> {
	render(ctx: CanvasRenderingContext2D, state: SudokuState): void {
		const W = ctx.canvas.width;

		this.renderTopBar(ctx, state, W);
		this.renderNumberPad(ctx, state, W);
		this.renderOverlays(ctx, state, W);
	}

	private renderTopBar(
		ctx: CanvasRenderingContext2D,
		state: SudokuState,
		W: number,
	): void {
		// Difficulty buttons
		const btnY = 8;
		const btnH = 28;
		const difficulties: Difficulty[] = ["easy", "medium", "hard"];
		let btnX = 10;

		for (const diff of difficulties) {
			const label = DIFFICULTY_PRESETS[diff].label;
			const btnW = label.length * 9 + 16;
			const isActive = state.difficulty === diff;

			ctx.fillStyle = isActive ? GAME_COLOR : "#2a2a3e";
			ctx.beginPath();
			ctx.roundRect(btnX, btnY, btnW, btnH, 6);
			ctx.fill();

			if (!isActive) {
				ctx.strokeStyle = "#555";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.roundRect(btnX, btnY, btnW, btnH, 6);
				ctx.stroke();
			}

			ctx.fillStyle = isActive ? "#fff" : "#aaa";
			ctx.font = "13px monospace";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(label, btnX + btnW / 2, btnY + btnH / 2);

			btnX += btnW + 8;
		}

		// Timer (right side)
		const minutes = Math.floor(state.timer / 60);
		const seconds = state.timer % 60;
		const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

		ctx.fillStyle = "#ccc";
		ctx.font = "bold 16px monospace";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		ctx.fillText(timeStr, W - 15, btnY + btnH / 2);

		// Notes mode indicator
		if (state.notesMode) {
			ctx.fillStyle = GAME_COLOR;
			ctx.font = "13px monospace";
			ctx.textAlign = "right";
			ctx.fillText("NOTES ON", W - 80, btnY + btnH / 2);
		}
	}

	private renderNumberPad(
		ctx: CanvasRenderingContext2D,
		state: SudokuState,
		W: number,
	): void {
		const { offsetY, cellSize } = state;
		const padY = offsetY + GRID * cellSize + 15;
		const padBtnSize = Math.min(cellSize, 40);
		const gap = 4;
		const padTotalW = 9 * padBtnSize + 8 * gap;
		const padStartX = (W - padTotalW) / 2;

		for (let i = 0; i < 9; i++) {
			const num = i + 1;
			const bx = padStartX + i * (padBtnSize + gap);

			// Count how many of this number are placed
			let count = 0;

			for (let r = 0; r < GRID; r++) {
				for (let c = 0; c < GRID; c++) {
					if (state.board[r][c].value === num) count++;
				}
			}

			const completed = count >= 9;

			ctx.fillStyle = completed ? "#1a1a2e" : "#2a2a3e";
			ctx.beginPath();
			ctx.roundRect(bx, padY, padBtnSize, padBtnSize, 6);
			ctx.fill();

			ctx.strokeStyle = completed ? "#333" : GAME_COLOR;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.roundRect(bx, padY, padBtnSize, padBtnSize, 6);
			ctx.stroke();

			ctx.fillStyle = completed ? "#555" : "#ddd";
			ctx.font = `bold ${Math.max(12, padBtnSize * 0.45)}px monospace`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(String(num), bx + padBtnSize / 2, padY + padBtnSize / 2);
		}

		// Notes toggle button
		const notesX = padStartX + padTotalW + 12;
		const notesW = 60;

		ctx.fillStyle = state.notesMode ? GAME_COLOR : "#2a2a3e";
		ctx.beginPath();
		ctx.roundRect(notesX, padY, notesW, padBtnSize, 6);
		ctx.fill();

		ctx.strokeStyle = state.notesMode ? GAME_COLOR : "#555";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(notesX, padY, notesW, padBtnSize, 6);
		ctx.stroke();

		ctx.fillStyle = state.notesMode ? "#fff" : "#aaa";
		ctx.font = "11px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Notes", notesX + notesW / 2, padY + padBtnSize / 2);

		// Controls hint
		const hintY = padY + padBtnSize + 14;

		ctx.fillStyle = "#555";
		ctx.font = "11px monospace";
		ctx.textAlign = "center";
		ctx.fillText(
			"[N] Notes  [U] Undo  [R] New  [H] Help  [Esc] Exit",
			W / 2,
			hintY,
		);
	}

	private renderOverlays(
		ctx: CanvasRenderingContext2D,
		state: SudokuState,
		W: number,
	): void {
		if (state.status !== "won") return;

		const H = ctx.canvas.height;

		// Dim overlay
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, H);

		// Victory text
		ctx.fillStyle = GAME_COLOR;
		ctx.font = "bold 36px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Puzzle Complete!", W / 2, H / 2 - 30);

		const minutes = Math.floor(state.timer / 60);
		const seconds = state.timer % 60;
		const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

		ctx.fillStyle = "#ccc";
		ctx.font = "18px monospace";
		ctx.fillText(`Time: ${timeStr}`, W / 2, H / 2 + 15);

		ctx.fillStyle = "#777";
		ctx.font = "14px monospace";
		ctx.fillText("Press [R] for a new game", W / 2, H / 2 + 50);
	}
}
