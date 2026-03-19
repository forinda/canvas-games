import type { Renderable } from "@shared/Renderable";
import type { ReactionState } from "../types";
import { MAX_ROUNDS } from "../types";

export class GameRenderer implements Renderable<ReactionState> {
	render(ctx: CanvasRenderingContext2D, state: ReactionState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Background color based on phase
		if (state.finished) {
			ctx.fillStyle = "#1a1a2e";
		} else if (state.phase === "waiting") {
			ctx.fillStyle = "#cc0000";
		} else if (state.phase === "ready") {
			ctx.fillStyle = "#00aa00";
		} else if (state.phase === "tooEarly") {
			ctx.fillStyle = "#2244cc";
		} else if (state.phase === "result") {
			ctx.fillStyle = "#1a1a2e";
		}

		ctx.fillRect(0, 0, W, H);

		const cx = W / 2;
		const cy = H / 2;

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		if (state.finished) {
			this.renderFinalScreen(ctx, state, cx, cy, W);

			return;
		}

		if (state.phase === "waiting") {
			ctx.font = `bold ${Math.min(48, W * 0.06)}px monospace`;
			ctx.fillStyle = "#ffffff";
			ctx.fillText("Wait for green...", cx, cy - 30);

			ctx.font = `${Math.min(20, W * 0.03)}px monospace`;
			ctx.fillStyle = "rgba(255,255,255,0.6)";
			ctx.fillText(
				`Round ${Math.min(state.round, MAX_ROUNDS)} of ${MAX_ROUNDS}`,
				cx,
				cy + 30,
			);
		}

		if (state.phase === "ready") {
			ctx.font = `bold ${Math.min(64, W * 0.08)}px monospace`;
			ctx.fillStyle = "#ffffff";
			ctx.fillText("CLICK NOW!", cx, cy - 30);

			ctx.font = `${Math.min(20, W * 0.03)}px monospace`;
			ctx.fillStyle = "rgba(255,255,255,0.7)";
			ctx.fillText("Click or press Space", cx, cy + 30);
		}

		if (state.phase === "tooEarly") {
			ctx.font = `bold ${Math.min(48, W * 0.06)}px monospace`;
			ctx.fillStyle = "#ffffff";
			ctx.fillText("Too early!", cx, cy - 30);

			ctx.font = `${Math.min(20, W * 0.03)}px monospace`;
			ctx.fillStyle = "rgba(255,255,255,0.6)";
			ctx.fillText("Click or press Space to continue", cx, cy + 30);
		}

		if (state.phase === "result") {
			ctx.font = `bold ${Math.min(64, W * 0.08)}px monospace`;
			ctx.fillStyle = "#00ff88";
			ctx.fillText(`${state.reactionMs} ms`, cx, cy - 40);

			ctx.font = `${Math.min(22, W * 0.03)}px monospace`;
			ctx.fillStyle = "#cccccc";
			const label =
				state.reactionMs < 200
					? "Incredible!"
					: state.reactionMs < 300
						? "Great!"
						: state.reactionMs < 400
							? "Good"
							: "Keep trying!";

			ctx.fillText(label, cx, cy + 10);

			ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
			ctx.fillStyle = "rgba(255,255,255,0.5)";
			const nextText =
				state.round > MAX_ROUNDS
					? "Click to see results"
					: "Click or press Space to continue";

			ctx.fillText(nextText, cx, cy + 50);
		}
	}

	private renderFinalScreen(
		ctx: CanvasRenderingContext2D,
		state: ReactionState,
		cx: number,
		cy: number,
		W: number,
	): void {
		const valid = state.attempts.filter((a) => !a.tooEarly);
		const avg =
			valid.length > 0
				? Math.round(valid.reduce((s, a) => s + a.reactionMs, 0) / valid.length)
				: 0;
		const best =
			valid.length > 0 ? Math.min(...valid.map((a) => a.reactionMs)) : 0;

		ctx.font = `bold ${Math.min(40, W * 0.05)}px monospace`;
		ctx.fillStyle = "#ff5722";
		ctx.fillText("Game Over!", cx, cy - 120);

		ctx.font = `${Math.min(24, W * 0.03)}px monospace`;
		ctx.fillStyle = "#ffffff";

		if (valid.length > 0) {
			ctx.fillText(`Average: ${avg} ms`, cx, cy - 60);
			ctx.fillText(`Best: ${best} ms`, cx, cy - 25);
		} else {
			ctx.fillText("No valid attempts!", cx, cy - 40);
		}

		ctx.fillStyle = "#888";
		ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
		ctx.fillText(
			`All-time best: ${state.bestAllTime > 0 ? state.bestAllTime + " ms" : "N/A"}`,
			cx,
			cy + 15,
		);

		// Per-round summary
		ctx.font = `${Math.min(16, W * 0.022)}px monospace`;
		let y = cy + 55;

		for (let i = 0; i < state.attempts.length; i++) {
			const a = state.attempts[i];
			const text = a.tooEarly
				? `Round ${i + 1}: Too early`
				: `Round ${i + 1}: ${a.reactionMs} ms`;

			ctx.fillStyle = a.tooEarly ? "#ff6666" : "#aaffaa";
			ctx.fillText(text, cx, y);
			y += 24;
		}

		ctx.fillStyle = "rgba(255,255,255,0.4)";
		ctx.font = `${Math.min(16, W * 0.02)}px monospace`;
		ctx.fillText("Press ESC to exit", cx, y + 20);
	}
}
