import type { Renderable } from "@shared/Renderable";
import type { CardBattleState } from "../types";

/** Renders HP, energy, turn counter, round info, and messages */
export class HUDRenderer implements Renderable<CardBattleState> {
	render(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
		const W = state.canvasWidth;

		this.renderTopBar(ctx, state, W);
		this.renderEnergyDisplay(ctx, state, W);
		this.renderMessage(ctx, state, W);
		this.renderDeckInfo(ctx, state, W);
		this.renderHelpHint(ctx, state, W);
	}

	private renderTopBar(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
		W: number,
	): void {
		// Background bar
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, 32);

		ctx.font = "bold 13px monospace";
		ctx.textBaseline = "middle";
		const y = 16;

		// Round
		ctx.fillStyle = "#8e44ad";
		ctx.textAlign = "left";
		ctx.fillText(`Round ${state.round}/${state.maxRounds}`, 12, y);

		// Turn
		ctx.fillStyle = "#f39c12";
		ctx.fillText(`Turn ${state.turn}`, 160, y);

		// Phase
		ctx.fillStyle = "#bbb";
		ctx.textAlign = "center";
		const phaseLabels: Record<string, string> = {
			draw: "Drawing...",
			player: "Your Turn",
			enemy: "Enemy Turn",
			resolve: "Resolving...",
			win: "Victory!",
			lose: "Defeated",
			"round-win": "Round Clear!",
		};

		ctx.fillText(phaseLabels[state.phase] || "", W / 2, y);

		// Player HP summary (right side)
		ctx.textAlign = "right";
		ctx.fillStyle = "#2ecc71";
		ctx.fillText(`HP: ${state.player.hp}/${state.player.maxHp}`, W - 12, y);
	}

	private renderEnergyDisplay(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
		_W: number,
	): void {
		const H = state.canvasHeight;
		const x = 20;
		const y = H / 2 + 10;

		ctx.font = "bold 14px monospace";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillStyle = "#f1c40f";
		ctx.fillText("Energy", x, y);

		// Energy pips
		for (let i = 0; i < state.player.maxEnergy; i++) {
			const px = x + i * 22;
			const py = y + 18;

			ctx.font = "16px serif";
			ctx.fillText(i < state.player.energy ? "⚡" : "○", px, py);
		}
	}

	private renderMessage(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
		W: number,
	): void {
		if (!state.message || state.gameOver || state.phase === "round-win") return;

		const H = state.canvasHeight;

		ctx.font = "14px monospace";
		ctx.fillStyle = "#f1c40f";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(state.message, W / 2, H / 2 + 90);
	}

	private renderDeckInfo(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
		_W: number,
	): void {
		const H = state.canvasHeight;

		ctx.font = "11px monospace";
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillStyle = "#666";
		ctx.fillText(
			`Deck: ${state.deck.length}  |  Discard: ${state.discard.length}`,
			12,
			H - 8,
		);
	}

	private renderHelpHint(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
		W: number,
	): void {
		const H = state.canvasHeight;

		ctx.font = "11px monospace";
		ctx.textAlign = "right";
		ctx.textBaseline = "bottom";
		ctx.fillStyle = "#555";
		ctx.fillText("[H] Help  [ESC] Exit", W - 12, H - 8);
	}
}
