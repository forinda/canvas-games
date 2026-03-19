import type { Renderable } from "@shared/Renderable";
import type { CityState } from "../types";
import { HUD_HEIGHT } from "../types";

export class HUDRenderer implements Renderable<CityState> {
	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	render(ctx: CanvasRenderingContext2D, state: CityState): void {
		const s = state;
		const W = this.canvas.width;
		const H = this.canvas.height;

		// HUD background
		ctx.fillStyle = "#0d1a0d";
		ctx.fillRect(0, 0, W, HUD_HEIGHT);
		ctx.fillStyle = "#2a4a2a";
		ctx.fillRect(0, HUD_HEIGHT - 2, W, 2);

		ctx.font = "bold 13px monospace";
		ctx.textBaseline = "middle";
		const cy = HUD_HEIGHT / 2;

		ctx.fillStyle = "#666";
		ctx.textAlign = "left";
		ctx.fillText("< EXIT", 12, cy);

		let hx = 90;
		const stats: [string, string, string][] = [
			["\u{1F465}", `${s.population}`, "#3498db"],
			["\u{1F4B0}", `${s.money}`, "#f1c40f"],
			[
				"\u{1F60A}",
				`${s.happiness}%`,
				s.happiness > 60 ? "#2ecc71" : s.happiness > 30 ? "#f39c12" : "#e74c3c",
			],
			["\u26A1", `${s.power}`, s.power >= 0 ? "#f39c12" : "#e74c3c"],
			["\u{1F33E}", `${s.food}`, s.food >= 0 ? "#6abf45" : "#e74c3c"],
		];

		for (const [icon, val, color] of stats) {
			ctx.font = "16px sans-serif";
			ctx.textAlign = "left";
			ctx.fillText(icon, hx, cy);
			ctx.font = "bold 12px monospace";
			ctx.fillStyle = color;
			ctx.fillText(val, hx + 22, cy);
			hx += 80;
		}

		// Speed indicator
		ctx.fillStyle = "#666";
		ctx.font = "12px monospace";
		ctx.textAlign = "right";
		ctx.fillText(`Speed: ${"\u25B6".repeat(s.speed)} [+/-]`, W - 12, cy);

		// Message
		if (s.message && s.messageTimer > 0) {
			ctx.fillStyle = `rgba(0,0,0,${Math.min(0.7, s.messageTimer)})`;
			ctx.fillRect(0, HUD_HEIGHT + 4, W, 28);
			ctx.font = "bold 13px monospace";
			ctx.fillStyle = "#f39c12";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(s.message, W / 2, HUD_HEIGHT + 18);
		}

		// Start overlay
		if (!s.started) {
			this.drawOverlay(
				ctx,
				W,
				H,
				"CITY BUILDER",
				"Select a building from the panel, click the grid to place.\nManage population, food, power, and happiness!",
				"#3498db",
			);
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
		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = `bold ${Math.min(52, W * 0.06)}px monospace`;
		ctx.fillStyle = color;
		ctx.shadowColor = color;
		ctx.shadowBlur = 20;
		ctx.fillText(title, W / 2, H * 0.35);
		ctx.shadowBlur = 0;
		ctx.font = `${Math.min(14, W * 0.02)}px monospace`;
		ctx.fillStyle = "#aaa";
		sub
			.split("\n")
			.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.48 + i * 22));
	}
}
