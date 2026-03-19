import type { Renderable } from "@shared/Renderable";
import type { AntColonyState } from "../types";
import { HelpOverlay } from "@shared/HelpOverlay";
import { antColonyHelp, GAME_COLOR, GAME_NAME } from "../data/help";

export class HUDRenderer implements Renderable<AntColonyState> {
	private helpOverlay = new HelpOverlay();

	render(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// ── Top-left stats panel ──
		this._drawStatsPanel(ctx, state);

		// ── Task allocation bars ──
		this._drawTaskBars(ctx, state);

		// ── Season indicator ──
		this._drawSeason(ctx, state, W);

		// ── Start screen ──
		if (!state.started) {
			this._drawStartScreen(ctx, W, H);

			return;
		}

		// ── Paused overlay ──
		if (state.paused) {
			ctx.fillStyle = "rgba(0,0,0,0.5)";
			ctx.fillRect(0, 0, W, H);
			ctx.font = "bold 32px monospace";
			ctx.fillStyle = "#fff";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("PAUSED", W / 2, H / 2);
			ctx.font = "14px monospace";
			ctx.fillStyle = "#aaa";
			ctx.fillText("Press [P] to resume", W / 2, H / 2 + 30);
		}

		// ── Game over ──
		if (state.gameOver) {
			ctx.fillStyle = "rgba(0,0,0,0.7)";
			ctx.fillRect(0, 0, W, H);
			ctx.font = "bold 36px monospace";
			ctx.fillStyle = "#e74c3c";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("COLONY COLLAPSED", W / 2, H / 2 - 20);
			ctx.font = "16px monospace";
			ctx.fillStyle = "#ccc";
			ctx.fillText(
				`Survived ${state.year} year${state.year !== 1 ? "s" : ""}`,
				W / 2,
				H / 2 + 20,
			);
			ctx.font = "13px monospace";
			ctx.fillStyle = "#888";
			ctx.fillText("Press [Space] to restart", W / 2, H / 2 + 50);
		}

		// ── Help overlay ──
		this.helpOverlay.visible = state.showHelp;
		this.helpOverlay.render(ctx, antColonyHelp, GAME_NAME, GAME_COLOR);

		// ── Bottom hint ──
		if (!state.showHelp && !state.gameOver && !state.paused) {
			ctx.font = "11px monospace";
			ctx.fillStyle = "rgba(255,255,255,0.35)";
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.fillText("[H] Help  |  [P] Pause  |  [ESC] Exit", W / 2, H - 8);
		}
	}

	private _drawStatsPanel(
		ctx: CanvasRenderingContext2D,
		state: AntColonyState,
	): void {
		const x = 12;
		let y = 16;
		const lh = 18;

		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.beginPath();
		ctx.roundRect(6, 4, 170, 100, 8);
		ctx.fill();

		ctx.font = "bold 12px monospace";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";

		ctx.fillStyle = "#ffd700";
		ctx.fillText(`Population: ${state.colony.population}`, x, y);
		y += lh;

		ctx.fillStyle = "#50c832";
		ctx.fillText(`Food: ${Math.floor(state.colony.food)}`, x, y);
		y += lh;

		ctx.fillStyle = "#c8a060";
		const tunnelsDone = state.tunnels.filter((t) => t.complete).length;

		ctx.fillText(`Tunnels: ${tunnelsDone}/${state.tunnels.length}`, x, y);
		y += lh;

		ctx.fillStyle = "#aaa";
		ctx.fillText(`Year ${state.year} - ${state.season}`, x, y);
		y += lh;

		ctx.fillStyle = "#777";
		const pct = Math.floor((state.seasonTimer / 30) * 100);

		ctx.fillText(`Season progress: ${pct}%`, x, y);
	}

	private _drawTaskBars(
		ctx: CanvasRenderingContext2D,
		state: AntColonyState,
	): void {
		const x = 12;
		const y = 114;
		const barW = 150;
		const barH = 8;
		const gap = 14;

		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.beginPath();
		ctx.roundRect(6, y - 6, 170, 60, 8);
		ctx.fill();

		const tasks: {
			label: string;
			key: string;
			value: number;
			color: string;
		}[] = [
			{
				label: "Forage",
				key: "1",
				value: state.taskRatio.forage,
				color: "#4ade80",
			},
			{
				label: "Build",
				key: "2",
				value: state.taskRatio.build,
				color: "#f59e0b",
			},
			{
				label: "Idle",
				key: "3",
				value: state.taskRatio.idle,
				color: "#94a3b8",
			},
		];

		for (let i = 0; i < tasks.length; i++) {
			const t = tasks[i];
			const by = y + i * gap;

			ctx.font = "9px monospace";
			ctx.fillStyle = "#aaa";
			ctx.textAlign = "left";
			ctx.textBaseline = "top";
			ctx.fillText(`[${t.key}] ${t.label}`, x, by);

			// Bar bg
			const bx = x + 80;

			ctx.fillStyle = "rgba(255,255,255,0.1)";
			ctx.fillRect(bx, by + 1, barW - 80, barH);
			// Bar fill
			ctx.fillStyle = t.color;
			ctx.fillRect(bx, by + 1, (barW - 80) * t.value, barH);

			// Percentage
			ctx.fillStyle = "#ccc";
			ctx.font = "8px monospace";
			ctx.textAlign = "right";
			ctx.fillText(`${Math.round(t.value * 100)}%`, x + barW + 12, by + 1);
		}
	}

	private _drawSeason(
		ctx: CanvasRenderingContext2D,
		state: AntColonyState,
		W: number,
	): void {
		const seasonIcons: Record<string, string> = {
			spring: "\u{1F331}",
			summer: "\u{2600}\uFE0F",
			autumn: "\u{1F342}",
			winter: "\u{2744}\uFE0F",
		};

		ctx.font = "20px serif";
		ctx.textAlign = "right";
		ctx.textBaseline = "top";
		ctx.fillText(seasonIcons[state.season] || "", W - 14, 10);
	}

	private _drawStartScreen(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, H);

		ctx.font = "bold 36px monospace";
		ctx.fillStyle = GAME_COLOR;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("\u{1F41C} Ant Colony", W / 2, H / 2 - 40);

		ctx.font = "16px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText("Click anywhere to start", W / 2, H / 2 + 10);

		ctx.font = "12px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText(
			"Left-click to place food | Right-click to dig tunnels",
			W / 2,
			H / 2 + 40,
		);
		ctx.fillText("[1/2/3] Adjust task ratios | [H] Help", W / 2, H / 2 + 58);
	}
}
