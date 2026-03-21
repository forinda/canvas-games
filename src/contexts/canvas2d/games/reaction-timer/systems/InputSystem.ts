import type { InputHandler } from "@core/InputHandler";
import type { ReactionState } from "../types";
import { MAX_ROUNDS, MIN_DELAY_MS, MAX_DELAY_MS, LS_BEST_KEY } from "../types";

export class InputSystem implements InputHandler {
	private state: ReactionState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private keyHandler: (e: KeyboardEvent) => void;
	private clickHandler: () => void;

	constructor(
		state: ReactionState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
		this.clickHandler = () => this.handleAction();
	}

	attach(): void {
		window.addEventListener("keydown", this.keyHandler);
		this.canvas.addEventListener("click", this.clickHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyHandler);
		this.canvas.removeEventListener("click", this.clickHandler);
	}

	private handleKey(e: KeyboardEvent): void {
		if (e.key === "Escape") {
			this.onExit();

			return;
		}

		if (e.key === "h" || e.key === "H") {
			this.state.helpVisible = !this.state.helpVisible;

			return;
		}

		if (e.key === " " || e.key === "Enter") {
			e.preventDefault();
			this.handleAction();
		}
	}

	private handleAction(): void {
		const s = this.state;

		if (s.helpVisible) return;

		if (s.phase === "waiting") {
			// Clicked too early — screen is still red
			s.phase = "tooEarly";
			s.attempts.push({ reactionMs: 0, tooEarly: true });
			s.round += 1;

			return;
		}

		if (s.phase === "ready") {
			// Good click on green
			const reactionMs = performance.now() - s.greenAt;

			s.reactionMs = Math.round(reactionMs);
			s.phase = "result";
			s.attempts.push({ reactionMs: s.reactionMs, tooEarly: false });

			// Update all-time best
			if (
				s.reactionMs > 0 &&
				(s.bestAllTime === 0 || s.reactionMs < s.bestAllTime)
			) {
				s.bestAllTime = s.reactionMs;

				try {
					localStorage.setItem(LS_BEST_KEY, String(s.reactionMs));
				} catch {
					/* noop */
				}
			}

			s.round += 1;

			return;
		}

		if (s.phase === "tooEarly" || s.phase === "result") {
			// Advance to next round or finish
			if (s.round > MAX_ROUNDS) {
				s.finished = true;

				return;
			}

			// Start next waiting phase
			s.phase = "waiting";
			s.scheduledDelay =
				MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
			s.waitStartedAt = performance.now();
			s.reactionMs = 0;

			return;
		}
	}
}
