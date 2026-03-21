import type { Renderable } from "@core/Renderable";
import type { HangmanState } from "../types";
import { MAX_WRONG } from "../types";
import type { InputSystem } from "../systems/InputSystem";

export class GameRenderer implements Renderable<HangmanState> {
	private inputSystem: InputSystem;

	constructor(inputSystem: InputSystem) {
		this.inputSystem = inputSystem;
	}

	render(ctx: CanvasRenderingContext2D, state: HangmanState): void {
		const W = state.canvasWidth;
		const H = state.canvasHeight;

		// Background
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, W, H);

		this.drawCategoryHint(ctx, state);
		this.drawGallows(ctx, state);
		this.drawWordBlanks(ctx, state);
		this.drawKeyboard(ctx, state);
	}

	private drawCategoryHint(
		ctx: CanvasRenderingContext2D,
		state: HangmanState,
	): void {
		const W = state.canvasWidth;

		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#8d6e63";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(`Category: ${state.category}`, W / 2, 16);
	}

	private drawGallows(
		ctx: CanvasRenderingContext2D,
		state: HangmanState,
	): void {
		const W = state.canvasWidth;
		const centerX = W / 2;
		const baseY = 240;
		const wrongCount = state.wrongGuesses.length;

		ctx.strokeStyle = "#e0c097";
		ctx.lineWidth = 4;
		ctx.lineCap = "round";

		// Base
		ctx.beginPath();
		ctx.moveTo(centerX - 80, baseY);
		ctx.lineTo(centerX + 80, baseY);
		ctx.stroke();

		// Pole
		ctx.beginPath();
		ctx.moveTo(centerX - 40, baseY);
		ctx.lineTo(centerX - 40, baseY - 180);
		ctx.stroke();

		// Top bar
		ctx.beginPath();
		ctx.moveTo(centerX - 40, baseY - 180);
		ctx.lineTo(centerX + 30, baseY - 180);
		ctx.stroke();

		// Rope
		ctx.beginPath();
		ctx.moveTo(centerX + 30, baseY - 180);
		ctx.lineTo(centerX + 30, baseY - 155);
		ctx.stroke();

		// Body parts (progressive 6 stages)
		const headCX = centerX + 30;
		const headCY = baseY - 140;
		const headR = 15;

		// Stage 1: Head
		if (wrongCount >= 1) {
			ctx.strokeStyle = "#ff6b6b";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
			ctx.stroke();
		}

		// Stage 2: Body
		if (wrongCount >= 2) {
			ctx.beginPath();
			ctx.moveTo(headCX, headCY + headR);
			ctx.lineTo(headCX, headCY + headR + 50);
			ctx.stroke();
		}

		// Stage 3: Left arm
		if (wrongCount >= 3) {
			ctx.beginPath();
			ctx.moveTo(headCX, headCY + headR + 15);
			ctx.lineTo(headCX - 25, headCY + headR + 40);
			ctx.stroke();
		}

		// Stage 4: Right arm
		if (wrongCount >= 4) {
			ctx.beginPath();
			ctx.moveTo(headCX, headCY + headR + 15);
			ctx.lineTo(headCX + 25, headCY + headR + 40);
			ctx.stroke();
		}

		// Stage 5: Left leg
		if (wrongCount >= 5) {
			ctx.beginPath();
			ctx.moveTo(headCX, headCY + headR + 50);
			ctx.lineTo(headCX - 25, headCY + headR + 80);
			ctx.stroke();
		}

		// Stage 6: Right leg
		if (wrongCount >= MAX_WRONG) {
			ctx.beginPath();
			ctx.moveTo(headCX, headCY + headR + 50);
			ctx.lineTo(headCX + 25, headCY + headR + 80);
			ctx.stroke();
		}
	}

	private drawWordBlanks(
		ctx: CanvasRenderingContext2D,
		state: HangmanState,
	): void {
		const W = state.canvasWidth;
		const letters = state.word.split("");
		const letterSpacing = Math.min(40, (W - 100) / letters.length);
		const totalW = letters.length * letterSpacing;
		const startX = (W - totalW) / 2;
		const y = 290;

		ctx.font = "bold 28px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";

		for (let i = 0; i < letters.length; i++) {
			const lx = startX + i * letterSpacing + letterSpacing / 2;

			// Underline
			ctx.strokeStyle = "#555";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(lx - letterSpacing * 0.35, y + 34);
			ctx.lineTo(lx + letterSpacing * 0.35, y + 34);
			ctx.stroke();

			// Letter
			if (state.guessedLetters.has(letters[i])) {
				ctx.fillStyle = "#ffffff";
				ctx.fillText(letters[i], lx, y);
			} else if (state.phase === "lost") {
				ctx.fillStyle = "#ff4444";
				ctx.fillText(letters[i], lx, y);
			}
		}
	}

	private drawKeyboard(
		ctx: CanvasRenderingContext2D,
		state: HangmanState,
	): void {
		const keys = this.inputSystem.getKeyboardLayout();

		for (const key of keys) {
			const guessed = state.guessedLetters.has(key.letter);
			const isWrong = state.wrongGuesses.includes(key.letter);
			const isCorrect = guessed && !isWrong;

			// Key background
			if (isWrong) {
				ctx.fillStyle = "rgba(255, 68, 68, 0.3)";
			} else if (isCorrect) {
				ctx.fillStyle = "rgba(76, 175, 80, 0.3)";
			} else {
				ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
			}

			ctx.beginPath();
			ctx.roundRect(key.x, key.y, key.w, key.h, 6);
			ctx.fill();

			// Key border
			if (isWrong) {
				ctx.strokeStyle = "#ff4444";
			} else if (isCorrect) {
				ctx.strokeStyle = "#4caf50";
			} else {
				ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
			}

			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.roundRect(key.x, key.y, key.w, key.h, 6);
			ctx.stroke();

			// Key letter
			ctx.font = `bold ${Math.min(16, key.w * 0.45)}px monospace`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			if (guessed) {
				ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
			} else {
				ctx.fillStyle = "#ffffff";
			}

			ctx.fillText(key.letter, key.x + key.w / 2, key.y + key.h / 2);
		}
	}
}
