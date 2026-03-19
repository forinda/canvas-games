import type { InputHandler } from "@shared/InputHandler";
import type { CardBattleState } from "../types";

export interface InputCallbacks {
	onPlayCard(index: number): void;
	onEndTurn(): void;
	onContinue(): void;
	onRestart(): void;
	onExit(): void;
	onToggleHelp(): void;
}

/** Handles click input for card selection, end turn button, and overlays */
export class InputSystem implements InputHandler {
	private canvas: HTMLCanvasElement;
	private state: CardBattleState;
	private callbacks: InputCallbacks;
	private clickHandler: (e: MouseEvent) => void;
	private keyHandler: (e: KeyboardEvent) => void;

	constructor(
		canvas: HTMLCanvasElement,
		state: CardBattleState,
		callbacks: InputCallbacks,
	) {
		this.canvas = canvas;
		this.state = state;
		this.callbacks = callbacks;

		this.clickHandler = (e: MouseEvent) => this.handleClick(e);
		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
	}

	attach(): void {
		this.canvas.addEventListener("click", this.clickHandler);
		window.addEventListener("keydown", this.keyHandler);
	}

	detach(): void {
		this.canvas.removeEventListener("click", this.clickHandler);
		window.removeEventListener("keydown", this.keyHandler);
	}

	private handleKey(e: KeyboardEvent): void {
		if (e.key === "Escape") {
			this.callbacks.onExit();

			return;
		}

		if (e.key === "h" || e.key === "H") {
			this.callbacks.onToggleHelp();

			return;
		}
	}

	private handleClick(e: MouseEvent): void {
		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const s = this.state;
		const W = s.canvasWidth;
		const H = s.canvasHeight;

		// If help is visible, clicking anywhere closes it
		if (s.helpVisible) {
			this.callbacks.onToggleHelp();

			return;
		}

		// Game over or round-win overlays
		if (s.phase === "win" || s.phase === "lose") {
			this.callbacks.onRestart();

			return;
		}

		if (s.phase === "round-win") {
			this.callbacks.onContinue();

			return;
		}

		// Only allow input during player phase
		if (s.phase !== "player") return;

		// Check End Turn button (top-right area)
		const btnW = 120;
		const btnH = 40;
		const btnX = W - btnW - 20;
		const btnY = H / 2 - btnH / 2;

		if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
			this.callbacks.onEndTurn();

			return;
		}

		// Check cards in hand (bottom area, fan layout)
		const cardW = 100;
		const cardH = 140;
		const handY = H - cardH - 30;
		const handCount = s.hand.length;

		if (handCount === 0) return;

		const totalW = Math.min(handCount * (cardW + 10), W * 0.7);
		const spacing = handCount > 1 ? totalW / (handCount - 1) : 0;
		const startX = (W - totalW) / 2 - cardW / 2;

		// Check from right to left (top cards drawn last)
		for (let i = handCount - 1; i >= 0; i--) {
			const cx = handCount === 1 ? (W - cardW) / 2 : startX + i * spacing;

			if (x >= cx && x <= cx + cardW && y >= handY && y <= handY + cardH) {
				this.callbacks.onPlayCard(i);

				return;
			}
		}
	}
}
