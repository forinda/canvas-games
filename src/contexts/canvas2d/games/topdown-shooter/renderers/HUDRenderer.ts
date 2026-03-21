import type { Renderable } from "@core/Renderable";
import type { ShooterState } from "../types";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@core/GameInterface";

const GAME_COLOR = "#e53935";

export class HUDRenderer implements Renderable<ShooterState> {
	private helpOverlay = new HelpOverlay();
	private help: GameHelp;

	constructor(help: GameHelp) {
		this.help = help;
	}

	toggleHelp(): void {
		this.helpOverlay.toggle();
	}

	get helpVisible(): boolean {
		return this.helpOverlay.visible;
	}

	render(ctx: CanvasRenderingContext2D, state: ShooterState): void {
		const W = state.canvasW;

		// ── HP bar ───────────────────────────────────────────────────
		const barW = 200;
		const barH = 16;
		const barX = 20;
		const barY = 20;
		const hpFrac = state.player.hp / state.player.maxHp;

		ctx.fillStyle = "#333";
		ctx.beginPath();
		ctx.roundRect(barX, barY, barW, barH, 4);
		ctx.fill();

		const hpColor =
			hpFrac > 0.5 ? "#4caf50" : hpFrac > 0.25 ? "#ff9800" : "#f44336";

		ctx.fillStyle = hpColor;
		ctx.beginPath();
		ctx.roundRect(barX, barY, barW * hpFrac, barH, 4);
		ctx.fill();

		ctx.strokeStyle = "#555";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(barX, barY, barW, barH, 4);
		ctx.stroke();

		ctx.font = "bold 11px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(
			`${state.player.hp} / ${state.player.maxHp}`,
			barX + barW / 2,
			barY + barH / 2,
		);

		// ── Wave / Score / Kills ─────────────────────────────────────
		ctx.font = "bold 14px monospace";
		ctx.fillStyle = "#ddd";
		ctx.textAlign = "right";
		ctx.textBaseline = "top";
		const waveLabel = state.waveData.active
			? `Wave ${state.waveData.wave}`
			: `Next wave in ${Math.max(0, state.waveData.betweenWaveTimer).toFixed(1)}s`;

		ctx.fillText(waveLabel, W - 20, 20);
		ctx.fillText(`Score: ${state.score}`, W - 20, 40);
		ctx.fillText(`Kills: ${state.kills}`, W - 20, 60);

		if (state.highScore > 0) {
			ctx.fillStyle = "#999";
			ctx.font = "12px monospace";
			ctx.fillText(`Best: ${state.highScore}`, W - 20, 80);
		}

		// ── Help hint ────────────────────────────────────────────────
		ctx.font = "11px monospace";
		ctx.fillStyle = "#555";
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText("[H] Help  [P] Pause  [ESC] Exit", 20, state.canvasH - 10);

		// ── Paused overlay ───────────────────────────────────────────
		if (state.paused && !this.helpOverlay.visible) {
			ctx.fillStyle = "rgba(0,0,0,0.6)";
			ctx.fillRect(0, 0, W, state.canvasH);
			ctx.font = "bold 36px monospace";
			ctx.fillStyle = "#fff";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("PAUSED", W / 2, state.canvasH / 2);
			ctx.font = "16px monospace";
			ctx.fillStyle = "#aaa";
			ctx.fillText("Press [P] to resume", W / 2, state.canvasH / 2 + 40);
		}

		// ── Start screen ─────────────────────────────────────────────
		if (!state.started) {
			ctx.fillStyle = "rgba(0,0,0,0.7)";
			ctx.fillRect(0, 0, W, state.canvasH);
			ctx.font = "bold 40px monospace";
			ctx.fillStyle = GAME_COLOR;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("TOP-DOWN SHOOTER", W / 2, state.canvasH / 2 - 40);
			ctx.font = "18px monospace";
			ctx.fillStyle = "#ccc";
			ctx.fillText(
				"Click or press Space to start",
				W / 2,
				state.canvasH / 2 + 10,
			);
			ctx.font = "14px monospace";
			ctx.fillStyle = "#888";
			ctx.fillText(
				"WASD to move, Mouse to aim, Click to shoot",
				W / 2,
				state.canvasH / 2 + 45,
			);
		}

		// ── Game Over overlay ────────────────────────────────────────
		if (state.gameOver) {
			ctx.fillStyle = "rgba(0,0,0,0.75)";
			ctx.fillRect(0, 0, W, state.canvasH);
			ctx.font = "bold 42px monospace";
			ctx.fillStyle = "#f44336";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("GAME OVER", W / 2, state.canvasH / 2 - 50);
			ctx.font = "bold 20px monospace";
			ctx.fillStyle = "#fff";
			ctx.fillText(
				`Score: ${state.score}  |  Wave: ${state.waveData.wave}  |  Kills: ${state.kills}`,
				W / 2,
				state.canvasH / 2,
			);

			if (state.score >= state.highScore && state.highScore > 0) {
				ctx.fillStyle = "#ffeb3b";
				ctx.font = "bold 16px monospace";
				ctx.fillText("NEW HIGH SCORE!", W / 2, state.canvasH / 2 + 30);
			}

			ctx.font = "16px monospace";
			ctx.fillStyle = "#aaa";
			ctx.fillText(
				"Click or press Space to restart",
				W / 2,
				state.canvasH / 2 + 65,
			);
		}

		// ── Help overlay (on top of everything) ──────────────────────
		this.helpOverlay.render(ctx, this.help, "Top-Down Shooter", GAME_COLOR);
	}
}
