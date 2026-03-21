import type { Renderable } from "@core/Renderable";
import type { BreakoutState } from "../types";
import { MAX_LEVEL } from "../types";

export class HUDRenderer implements Renderable<BreakoutState> {
	render(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
		const W = state.canvasW;
		const H = state.canvasH;

		// Top bar
		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, 40);

		ctx.font = "bold 14px monospace";
		ctx.textBaseline = "middle";

		// Exit button
		ctx.fillStyle = "#666";
		ctx.textAlign = "left";
		ctx.fillText("< EXIT", 12, 20);

		// Score
		ctx.fillStyle = "#e74c3c";
		ctx.textAlign = "center";
		ctx.fillText(`Score: ${state.score}`, W / 2 - 80, 20);

		// Level
		ctx.fillStyle = "#3498db";
		ctx.fillText(`Level: ${state.level}/${MAX_LEVEL}`, W / 2 + 80, 20);

		// Lives
		ctx.fillStyle = "#e74c3c";
		ctx.textAlign = "right";
		const heartsStr = "\u2764".repeat(state.lives);

		ctx.fillText(heartsStr, W - 60, 20);

		// High score
		if (state.highScore > 0) {
			ctx.fillStyle = "#666";
			ctx.fillText(`Best: ${state.highScore}`, W - 12, 20);
		}

		// Active effects indicators
		this.drawEffects(ctx, state);

		// Overlays
		switch (state.phase) {
			case "start":
				this.drawOverlay(
					ctx,
					W,
					H,
					"BREAKOUT",
					"Click or press SPACE to start\nMove mouse to control paddle",
					"#e74c3c",
				);
				break;
			case "paused":
				this.drawOverlay(ctx, W, H, "PAUSED", "Press P to resume", "#f39c12");
				break;
			case "gameover":
				this.drawOverlay(
					ctx,
					W,
					H,
					"GAME OVER",
					`Final Score: ${state.score}\nClick or press SPACE to restart`,
					"#ef4444",
				);
				break;
			case "win":
				this.drawOverlay(
					ctx,
					W,
					H,
					"YOU WIN!",
					`Final Score: ${state.score}\nClick or press SPACE to play again`,
					"#2ecc71",
				);
				break;
		}
	}

	private drawEffects(
		ctx: CanvasRenderingContext2D,
		state: BreakoutState,
	): void {
		const activeEffects = state.effects.filter(
			(e) => e.remaining > 0 && e.type !== "multiball",
		);

		if (activeEffects.length === 0) return;

		const colors: Record<string, string> = {
			wide: "#f39c12",
			slow: "#9b59b6",
		};
		const labels: Record<string, string> = {
			wide: "WIDE",
			slow: "SLOW",
		};

		ctx.font = "bold 11px monospace";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";

		let offsetX = 12;
		const y = 50;

		for (const effect of activeEffects) {
			const color = colors[effect.type] ?? "#fff";
			const label = labels[effect.type] ?? effect.type.toUpperCase();
			const secs = Math.ceil(effect.remaining / 1000);

			ctx.fillStyle = color;
			ctx.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() * 0.005);
			ctx.fillText(`${label} ${secs}s`, offsetX, y);
			ctx.globalAlpha = 1;
			offsetX += 80;
		}
	}

	private drawOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
		title: string,
		sub: string,
		color: string,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.75)";
		ctx.fillRect(0, 0, W, H);

		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `bold ${Math.min(64, W * 0.08)}px monospace`;
		ctx.fillStyle = color;
		ctx.shadowColor = color;
		ctx.shadowBlur = 20;
		ctx.fillText(title, W / 2, H * 0.35);
		ctx.shadowBlur = 0;

		// Multi-line subtitle
		const lines = sub.split("\n");

		ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
		ctx.fillStyle = "#aaa";

		for (let i = 0; i < lines.length; i++) {
			ctx.fillText(lines[i], W / 2, H * 0.48 + i * 24);
		}
	}
}
