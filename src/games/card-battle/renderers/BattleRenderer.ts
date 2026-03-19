import type { Renderable } from "@shared/Renderable";
import type { CardBattleState, CardInstance } from "../types";

/** Renders the battlefield: enemy, player HP bars, card hand, played cards */
export class BattleRenderer implements Renderable<CardBattleState> {
	render(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
		const W = state.canvasWidth;
		const H = state.canvasHeight;

		// Background
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, W, H);

		// Decorative battle area divider
		ctx.strokeStyle = "#333";
		ctx.lineWidth = 1;
		ctx.setLineDash([8, 8]);
		ctx.beginPath();
		ctx.moveTo(0, H / 2);
		ctx.lineTo(W, H / 2);
		ctx.stroke();
		ctx.setLineDash([]);

		this.renderEnemy(ctx, state);
		this.renderPlayer(ctx, state);
		this.renderCardHand(ctx, state);
		this.renderPlayedCards(ctx, state);
		this.renderEndTurnButton(ctx, state);
		this.renderEnemyPlayedCard(ctx, state);
		this.renderOverlays(ctx, state);
	}

	private renderEnemy(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
	): void {
		const W = state.canvasWidth;
		const enemy = state.enemy;
		const cx = W / 2;
		const cy = 100;

		// Enemy icon
		const icons = ["👺", "🗡️", "🐉"];
		const icon = icons[Math.min(state.round - 1, icons.length - 1)];

		ctx.font = "48px serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(icon, cx, cy);

		// Enemy name
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#e74c3c";
		ctx.fillText(enemy.name, cx, cy + 45);

		// HP bar
		this.renderHPBar(
			ctx,
			cx - 80,
			cy + 60,
			160,
			16,
			enemy.hp,
			enemy.maxHp,
			"#e74c3c",
		);

		// Block indicator
		if (enemy.block > 0) {
			ctx.font = "14px monospace";
			ctx.fillStyle = "#3498db";
			ctx.textAlign = "center";
			ctx.fillText(`🛡️ ${enemy.block}`, cx, cy + 90);
		}
	}

	private renderPlayer(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
	): void {
		const W = state.canvasWidth;
		const H = state.canvasHeight;
		const player = state.player;
		const cx = W / 2;
		const cy = H / 2 + 40;

		// Player icon
		ctx.font = "36px serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("🧙", cx, cy);

		// Player name
		ctx.font = "bold 14px monospace";
		ctx.fillStyle = "#2ecc71";
		ctx.fillText(player.name, cx, cy + 30);

		// HP bar
		this.renderHPBar(
			ctx,
			cx - 80,
			cy + 42,
			160,
			14,
			player.hp,
			player.maxHp,
			"#2ecc71",
		);

		// Block indicator
		if (player.block > 0) {
			ctx.font = "13px monospace";
			ctx.fillStyle = "#3498db";
			ctx.textAlign = "center";
			ctx.fillText(`🛡️ ${player.block}`, cx, cy + 68);
		}
	}

	private renderHPBar(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		hp: number,
		maxHp: number,
		color: string,
	): void {
		// Background
		ctx.fillStyle = "#333";
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 4);
		ctx.fill();

		// Fill
		const ratio = Math.max(0, hp / maxHp);

		if (ratio > 0) {
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.roundRect(x, y, w * ratio, h, 4);
			ctx.fill();
		}

		// Text
		ctx.font = `bold ${h - 2}px monospace`;
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`${hp}/${maxHp}`, x + w / 2, y + h / 2 + 1);
	}

	private renderCardHand(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
	): void {
		const W = state.canvasWidth;
		const H = state.canvasHeight;
		const hand = state.hand;
		const cardW = 100;
		const cardH = 140;
		const handY = H - cardH - 30;

		if (hand.length === 0) return;

		const totalW = Math.min(hand.length * (cardW + 10), W * 0.7);
		const spacing = hand.length > 1 ? totalW / (hand.length - 1) : 0;
		const startX = (W - totalW) / 2 - cardW / 2;

		for (let i = 0; i < hand.length; i++) {
			const cx = hand.length === 1 ? (W - cardW) / 2 : startX + i * spacing;
			const canPlay =
				hand[i].card.cost <= state.player.energy && state.phase === "player";

			this.renderCard(
				ctx,
				hand[i],
				cx,
				handY,
				cardW,
				cardH,
				canPlay,
				i === state.selectedCardIndex,
			);
		}
	}

	private renderCard(
		ctx: CanvasRenderingContext2D,
		ci: CardInstance,
		x: number,
		y: number,
		w: number,
		h: number,
		canPlay: boolean,
		selected: boolean,
	): void {
		const card = ci.card;

		// Card background
		const typeColors: Record<string, string> = {
			attack: "#c0392b",
			defense: "#2980b9",
			heal: "#27ae60",
			special: "#8e44ad",
		};

		ctx.save();

		// Shadow
		ctx.shadowColor = selected ? "#f1c40f" : "rgba(0,0,0,0.5)";
		ctx.shadowBlur = selected ? 15 : 6;
		ctx.shadowOffsetY = 3;

		// Card body
		ctx.fillStyle = canPlay ? typeColors[card.type] || "#555" : "#444";
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 8);
		ctx.fill();

		ctx.restore();

		// Border
		ctx.strokeStyle = selected ? "#f1c40f" : canPlay ? "#fff" : "#666";
		ctx.lineWidth = selected ? 3 : 1;
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 8);
		ctx.stroke();

		// Cost badge
		ctx.fillStyle = "#1a1a2e";
		ctx.beginPath();
		ctx.arc(x + 16, y + 16, 14, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#f1c40f";
		ctx.font = "bold 14px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`${card.cost}`, x + 16, y + 16);

		// Icon
		ctx.font = "28px serif";
		ctx.textAlign = "center";
		ctx.fillText(card.icon, x + w / 2, y + 48);

		// Name
		ctx.font = "bold 11px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText(card.name, x + w / 2, y + 78);

		// Description
		ctx.font = "9px monospace";
		ctx.fillStyle = "#ddd";
		ctx.fillText(card.description, x + w / 2, y + 98);

		// Value
		ctx.font = "bold 18px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText(`${card.value}`, x + w / 2, y + h - 22);

		if (!canPlay) {
			// Dim overlay for unplayable cards
			ctx.fillStyle = "rgba(0,0,0,0.4)";
			ctx.beginPath();
			ctx.roundRect(x, y, w, h, 8);
			ctx.fill();
		}
	}

	private renderPlayedCards(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
	): void {
		const W = state.canvasWidth;
		const H = state.canvasHeight;
		const played = state.playedCards;

		if (played.length === 0) return;

		const miniW = 50;
		const miniH = 70;
		const baseY = H / 2 - miniH - 20;
		const totalW = played.length * (miniW + 5);
		const startX = (W - totalW) / 2;

		ctx.font = "10px monospace";
		ctx.fillStyle = "#888";
		ctx.textAlign = "center";
		ctx.fillText("Played", W / 2, baseY - 8);

		for (let i = 0; i < played.length; i++) {
			const c = played[i].card;
			const x = startX + i * (miniW + 5);

			ctx.fillStyle = "#2a2a3e";
			ctx.beginPath();
			ctx.roundRect(x, baseY, miniW, miniH, 4);
			ctx.fill();
			ctx.strokeStyle = "#555";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(x, baseY, miniW, miniH, 4);
			ctx.stroke();
			ctx.font = "18px serif";
			ctx.textAlign = "center";
			ctx.fillText(c.icon, x + miniW / 2, baseY + 28);
			ctx.font = "8px monospace";
			ctx.fillStyle = "#aaa";
			ctx.fillText(c.name, x + miniW / 2, baseY + 52);
		}
	}

	private renderEnemyPlayedCard(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
	): void {
		if (!state.enemyPlayedCard) return;

		const W = state.canvasWidth;
		const card = state.enemyPlayedCard;

		const x = W / 2 - 35;
		const y = 170;
		const w = 70;
		const h = 50;

		ctx.fillStyle = "#3d1f1f";
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 4);
		ctx.fill();
		ctx.strokeStyle = "#e74c3c";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 4);
		ctx.stroke();

		ctx.font = "16px serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(card.icon, x + w / 2, y + 18);
		ctx.font = "8px monospace";
		ctx.fillStyle = "#e74c3c";
		ctx.fillText(card.name, x + w / 2, y + 38);
	}

	private renderEndTurnButton(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
	): void {
		if (state.phase !== "player") return;

		const W = state.canvasWidth;
		const H = state.canvasHeight;
		const btnW = 120;
		const btnH = 40;
		const btnX = W - btnW - 20;
		const btnY = H / 2 - btnH / 2;

		ctx.fillStyle = "#e67e22";
		ctx.beginPath();
		ctx.roundRect(btnX, btnY, btnW, btnH, 8);
		ctx.fill();

		ctx.strokeStyle = "#f39c12";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(btnX, btnY, btnW, btnH, 8);
		ctx.stroke();

		ctx.font = "bold 14px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("End Turn", btnX + btnW / 2, btnY + btnH / 2);
	}

	private renderOverlays(
		ctx: CanvasRenderingContext2D,
		state: CardBattleState,
	): void {
		if (!state.gameOver && state.phase !== "round-win") return;

		const W = state.canvasWidth;
		const H = state.canvasHeight;

		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		ctx.font = "bold 32px monospace";
		ctx.fillStyle =
			state.phase === "win"
				? "#f1c40f"
				: state.phase === "round-win"
					? "#2ecc71"
					: "#e74c3c";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		const title =
			state.phase === "win"
				? "VICTORY!"
				: state.phase === "round-win"
					? "ROUND CLEAR!"
					: "DEFEATED";

		ctx.fillText(title, W / 2, H / 2 - 30);

		ctx.font = "16px monospace";
		ctx.fillStyle = "#ccc";
		ctx.fillText(state.message, W / 2, H / 2 + 20);
	}
}
