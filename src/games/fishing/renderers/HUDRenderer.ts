import type { Renderable } from "@shared/Renderable";
import type { FishingState } from "../types";
import { RARITY_COLORS } from "../types";
import { FISH_SPECIES } from "../data/fish";

export class HUDRenderer implements Renderable<FishingState> {
	render(ctx: CanvasRenderingContext2D, state: FishingState): void {
		const W = state.width;
		const H = state.height;

		// ── Top-left stats ──
		this.drawStats(ctx, state);

		// ── Phase-specific UI ──
		switch (state.phase) {
			case "idle":
				this.drawIdlePrompt(ctx, W, H);
				break;
			case "casting":
				this.drawPowerMeter(ctx, state, W, H);
				break;
			case "waiting":
				this.drawWaitingHint(ctx, state, W, H);
				break;
			case "hooking":
				this.drawHookWindow(ctx, state, W, H);
				break;
			case "reeling":
				this.drawTensionMeter(ctx, state, W, H);
				break;
		}

		// ── Catch popup ──
		if (state.catchPopupTimer > 0 && state.lastCatch) {
			this.drawCatchPopup(ctx, state, W, H);
		}

		// ── Catalog overlay ──
		if (state.showCatalog) {
			this.drawCatalog(ctx, state, W, H);
		}

		// ── Bottom hint ──
		ctx.font = "12px monospace";
		ctx.fillStyle = "rgba(255,255,255,0.3)";
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText("[H] Help  [C] Catalog  [ESC] Exit", W / 2, H - 8);
	}

	private drawStats(ctx: CanvasRenderingContext2D, state: FishingState): void {
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(`Score: ${state.totalScore}`, 16, 16);
		ctx.font = "13px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText(`Fish caught: ${state.totalCaught}`, 16, 38);
		ctx.fillText(
			`Species: ${state.catalog.size}/${FISH_SPECIES.length}`,
			16,
			56,
		);
	}

	private drawIdlePrompt(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		ctx.font = "bold 20px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Press SPACE to cast your line!", W / 2, H * 0.75);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText("Hold to charge, release to cast", W / 2, H * 0.75 + 28);
	}

	private drawPowerMeter(
		ctx: CanvasRenderingContext2D,
		state: FishingState,
		W: number,
		H: number,
	): void {
		const meterW = 300;
		const meterH = 24;
		const x = (W - meterW) / 2;
		const y = H * 0.75;

		// Label
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText("CAST POWER", W / 2, y - 8);

		// Background
		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.beginPath();
		ctx.roundRect(x, y, meterW, meterH, 4);
		ctx.fill();

		// Power fill (oscillates)
		const displayPower =
			state.castPower <= 1 ? state.castPower : 2 - state.castPower;
		const fillW = displayPower * meterW;

		// Color gradient based on power
		let color = "#4caf50";

		if (displayPower > 0.7) color = "#ff9800";

		if (displayPower > 0.9) color = "#f44336";

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.roundRect(x, y, fillW, meterH, 4);
		ctx.fill();

		// Sweet spot indicator
		ctx.strokeStyle = "#ffd54f";
		ctx.lineWidth = 2;
		const sweetX = x + meterW * 0.8;

		ctx.beginPath();
		ctx.moveTo(sweetX, y - 4);
		ctx.lineTo(sweetX, y + meterH + 4);
		ctx.stroke();

		// Percentage text
		ctx.font = "bold 13px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`${Math.round(displayPower * 100)}%`, W / 2, y + meterH / 2);

		ctx.font = "12px monospace";
		ctx.fillStyle = "#aaa";
		ctx.textBaseline = "top";
		ctx.fillText("Release SPACE to cast", W / 2, y + meterH + 8);
	}

	private drawWaitingHint(
		ctx: CanvasRenderingContext2D,
		state: FishingState,
		W: number,
		H: number,
	): void {
		const dots = ".".repeat(Math.floor(state.waitElapsed * 2) % 4);

		ctx.font = "16px monospace";
		ctx.fillStyle = "#4fc3f7";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`Waiting for a bite${dots}`, W / 2, H * 0.75);
	}

	private drawHookWindow(
		ctx: CanvasRenderingContext2D,
		state: FishingState,
		W: number,
		H: number,
	): void {
		// Flashing alert
		const flash = Math.sin(state.time * 15) > 0;

		ctx.font = "bold 24px monospace";
		ctx.fillStyle = flash ? "#ff1744" : "#ff8a80";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("FISH ON! Click or press SPACE!", W / 2, H * 0.7);

		// Timer bar
		const barW = 200;
		const barH = 12;
		const bx = (W - barW) / 2;
		const by = H * 0.7 + 24;
		const pct = Math.max(0, state.hookWindowTimer / state.hookWindowDuration);

		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.beginPath();
		ctx.roundRect(bx, by, barW, barH, 3);
		ctx.fill();

		ctx.fillStyle = pct > 0.3 ? "#ff9800" : "#f44336";
		ctx.beginPath();
		ctx.roundRect(bx, by, barW * pct, barH, 3);
		ctx.fill();
	}

	private drawTensionMeter(
		ctx: CanvasRenderingContext2D,
		state: FishingState,
		W: number,
		H: number,
	): void {
		// Fish info
		if (state.currentFish) {
			ctx.font = "bold 16px monospace";
			ctx.fillStyle = RARITY_COLORS[state.currentFish.rarity];
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.fillText(
				`${state.currentFish.icon} Reeling: ${state.currentFish.name}`,
				W / 2,
				H * 0.62,
			);
		}

		// ── Tension meter (vertical bar on right) ──
		const barW = 30;
		const barH = H * 0.4;
		const bx = W - 60;
		const by = (H - barH) / 2;

		// Background
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.beginPath();
		ctx.roundRect(bx, by, barW, barH, 6);
		ctx.fill();

		// Green zone (0.3 - 0.7)
		const greenTop = by + barH * 0.3;
		const greenBottom = by + barH * 0.7;

		ctx.fillStyle = "rgba(76,175,80,0.3)";
		ctx.fillRect(bx, greenTop, barW, greenBottom - greenTop);

		// Danger zones
		ctx.fillStyle = "rgba(244,67,54,0.2)";
		ctx.fillRect(bx, by, barW, greenTop - by);
		ctx.fillRect(bx, greenBottom, barW, by + barH - greenBottom);

		// Tension indicator
		const tensionY = by + barH * (1 - state.reelTension);

		ctx.fillStyle =
			state.reelTension > 0.3 && state.reelTension < 0.7
				? "#4caf50"
				: "#f44336";
		ctx.beginPath();
		ctx.roundRect(bx - 4, tensionY - 4, barW + 8, 8, 4);
		ctx.fill();

		// Label
		ctx.font = "bold 11px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("TENSION", bx + barW / 2, by + barH + 8);

		// ── Progress bar (bottom center) ──
		const progW = 300;
		const progH = 16;
		const px = (W - progW) / 2;
		const py = H * 0.82;

		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.beginPath();
		ctx.roundRect(px, py, progW, progH, 4);
		ctx.fill();

		ctx.fillStyle = "#2196f3";
		ctx.beginPath();
		ctx.roundRect(px, py, progW * state.reelProgress, progH, 4);
		ctx.fill();

		ctx.font = "bold 11px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(
			`Reel: ${Math.round(state.reelProgress * 100)}%`,
			W / 2,
			py + progH / 2,
		);

		// Instructions
		ctx.font = "12px monospace";
		ctx.fillStyle = "#aaa";
		ctx.textBaseline = "top";
		ctx.fillText(
			"Hold SPACE to reel — keep tension in the green zone!",
			W / 2,
			py + progH + 8,
		);
	}

	private drawCatchPopup(
		ctx: CanvasRenderingContext2D,
		state: FishingState,
		W: number,
		H: number,
	): void {
		const caught = state.lastCatch!;
		const alpha = Math.min(1, state.catchPopupTimer);

		ctx.globalAlpha = alpha;

		// Panel
		const panelW = 320;
		const panelH = 140;
		const px = (W - panelW) / 2;
		const py = H * 0.25;

		ctx.fillStyle = "rgba(0,0,0,0.85)";
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = RARITY_COLORS[caught.fish.rarity];
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.stroke();

		// Title
		ctx.font = "bold 18px monospace";
		ctx.fillStyle = "#ffd54f";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("CATCH!", W / 2, py + 12);

		// Fish info
		ctx.font = "bold 20px monospace";
		ctx.fillStyle = RARITY_COLORS[caught.fish.rarity];
		ctx.fillText(`${caught.fish.icon} ${caught.fish.name}`, W / 2, py + 40);

		ctx.font = "14px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText(
			`${caught.size} cm  •  ${caught.fish.rarity.toUpperCase()}`,
			W / 2,
			py + 70,
		);

		ctx.fillStyle = "#4caf50";
		ctx.fillText(`+${caught.fish.points} points`, W / 2, py + 92);

		ctx.globalAlpha = 1;
	}

	private drawCatalog(
		ctx: CanvasRenderingContext2D,
		state: FishingState,
		W: number,
		H: number,
	): void {
		// Dim overlay
		ctx.fillStyle = "rgba(0,0,0,0.85)";
		ctx.fillRect(0, 0, W, H);

		const panelW = Math.min(600, W * 0.8);
		const panelH = Math.min(520, H * 0.85);
		const px = (W - panelW) / 2;
		const py = (H - panelH) / 2;

		ctx.fillStyle = "#12121f";
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = "#0288d1";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.stroke();

		// Title
		ctx.font = "bold 20px monospace";
		ctx.fillStyle = "#0288d1";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("Fish Catalog", W / 2, py + 16);

		ctx.font = "12px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText(
			`${state.catalog.size}/${FISH_SPECIES.length} species discovered`,
			W / 2,
			py + 42,
		);

		// Fish grid
		let row = 0;
		const startY = py + 68;
		const colW = panelW / 2 - 20;

		for (let i = 0; i < FISH_SPECIES.length; i++) {
			const fish = FISH_SPECIES[i];
			const entry = state.catalog.get(fish.name);
			const col = i % 2;

			if (i % 2 === 0 && i > 0) row++;

			const fx = px + 20 + col * (colW + 20);
			const fy = startY + row * 36;

			if (fy + 36 > py + panelH - 30) break; // overflow guard

			if (entry) {
				ctx.font = "14px monospace";
				ctx.fillStyle = RARITY_COLORS[fish.rarity];
				ctx.textAlign = "left";
				ctx.fillText(`${fish.icon} ${fish.name}`, fx, fy);

				ctx.font = "11px monospace";
				ctx.fillStyle = "#888";
				ctx.fillText(
					`x${entry.count}  best: ${entry.bestSize}cm`,
					fx + 8,
					fy + 18,
				);
			} else {
				ctx.font = "14px monospace";
				ctx.fillStyle = "#444";
				ctx.textAlign = "left";
				ctx.fillText(`??? ${fish.rarity}`, fx, fy);
			}
		}

		// Close hint
		ctx.font = "12px monospace";
		ctx.fillStyle = "#555";
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText("Press [C] to close", W / 2, py + panelH - 8);
	}
}
