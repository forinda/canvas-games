import type { GameStateData, TowerType } from "../types";
import type { GridSystem } from "../systems/GridSystem";
import type { InputSystem } from "../systems/InputSystem";
import {
	TOWER_DEFS,
	upgradeCost,
	sellRefund,
	getTowerStats,
} from "../data/towers";

const TOWER_ORDER: TowerType[] = ["archer", "cannon", "frost", "sniper"];

export class UIRenderer {
	readonly panelHeight = 110;

	render(
		ctx: CanvasRenderingContext2D,
		state: GameStateData,
		canvasW: number,
		canvasH: number,
		_grid: GridSystem,
		input: InputSystem,
	): void {
		const panelY = canvasH - this.panelHeight;

		// Panel background
		ctx.fillStyle = "#0d1a0d";
		ctx.fillRect(0, panelY, canvasW, this.panelHeight);
		ctx.fillStyle = "#2a4a2a";
		ctx.fillRect(0, panelY, canvasW, 2);

		// Tower selection cards
		const cardW = 100;
		const cardH = 88;
		const cardPad = 10;
		const cardY = panelY + (this.panelHeight - cardH) / 2;

		input.towerCardRects = [];

		TOWER_ORDER.forEach((type, i) => {
			const def = TOWER_DEFS[type];
			const cardX = cardPad + i * (cardW + cardPad);
			const isSelected = state.selectedTowerType === type;
			const canAfford = state.gold >= def.cost;

			// Card background
			ctx.fillStyle = isSelected
				? "#1a3d1a"
				: canAfford
					? "#162816"
					: "#1a1a1a";
			ctx.beginPath();
			ctx.roundRect(cardX, cardY, cardW, cardH, 8);
			ctx.fill();

			// Border
			ctx.strokeStyle = isSelected ? def.color : canAfford ? "#2a5a2a" : "#333";
			ctx.lineWidth = isSelected ? 2.5 : 1.5;
			ctx.beginPath();
			ctx.roundRect(cardX, cardY, cardW, cardH, 8);
			ctx.stroke();

			// Icon
			ctx.font = `${Math.min(28, cardH * 0.32)}px sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.globalAlpha = canAfford ? 1 : 0.4;
			ctx.fillText(def.icon, cardX + cardW / 2, cardY + 8);
			ctx.globalAlpha = 1;

			// Name
			ctx.font = `bold 12px monospace`;
			ctx.fillStyle = canAfford ? "#eee" : "#555";
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillText(def.name, cardX + cardW / 2, cardY + 42);

			// Cost
			ctx.font = `11px monospace`;
			ctx.fillStyle = canAfford ? "#f1c40f" : "#555";
			ctx.fillText(`💰 ${def.cost}`, cardX + cardW / 2, cardY + 58);

			// Selected glow
			if (isSelected) {
				ctx.shadowColor = def.color;
				ctx.shadowBlur = 12;
				ctx.beginPath();
				ctx.roundRect(cardX, cardY, cardW, cardH, 8);
				ctx.strokeStyle = def.color;
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.shadowBlur = 0;
			}

			input.towerCardRects.push({
				type,
				x: cardX,
				y: cardY,
				w: cardW,
				h: cardH,
			});
		});

		// Start wave button (right side)
		const btnW = 140;
		const btnH = 48;
		const btnX = canvasW - btnW - cardPad;
		const btnY = panelY + (this.panelHeight - btnH) / 2;

		const canStart = !state.waveInProgress && state.spawnQueue.length === 0;
		const isFirstWave = state.currentWave === 0;
		const btnLabel = isFirstWave
			? "▶ Start Game"
			: canStart
				? "▶ Next Wave"
				: "⏳ Wave...";

		ctx.fillStyle = canStart ? "#1b5e20" : "#2a2a2a";
		ctx.beginPath();
		ctx.roundRect(btnX, btnY, btnW, btnH, 10);
		ctx.fill();

		ctx.strokeStyle = canStart ? "#4caf50" : "#444";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(btnX, btnY, btnW, btnH, 10);
		ctx.stroke();

		ctx.font = "bold 14px monospace";
		ctx.fillStyle = canStart ? "#a5d6a7" : "#555";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(btnLabel, btnX + btnW / 2, btnY + btnH / 2);

		if (canStart) {
			input.startWaveRect = { x: btnX, y: btnY, w: btnW, h: btnH };
		} else {
			input.startWaveRect = null;
		}

		// Pause hint
		ctx.font = "11px monospace";
		ctx.fillStyle = "#444";
		ctx.textAlign = "center";
		ctx.fillText(
			"[P] Pause  [ESC] Deselect",
			btnX + btnW / 2,
			btnY + btnH + 14,
		);

		// Between-wave countdown bar
		if (
			!state.waveInProgress &&
			state.betweenWaveCountdown > 0 &&
			state.currentWave > 0
		) {
			const totalDelay = 5000;
			const pct = state.betweenWaveCountdown / totalDelay;
			const barW = btnW;
			const barH2 = 4;
			const barX = btnX;
			const barY2 = btnY - 10;

			ctx.fillStyle = "#1a2a1a";
			ctx.fillRect(barX, barY2, barW, barH2);
			ctx.fillStyle = "#4caf50";
			ctx.fillRect(barX, barY2, barW * (1 - pct), barH2);
		}

		// ── Upgrade panel ─────────────────────────────────────────────────────────
		if (state.selectedPlacedTowerId) {
			this.renderUpgradePanel(ctx, state, canvasW, canvasH, input);
		}
	}

	private renderUpgradePanel(
		ctx: CanvasRenderingContext2D,
		state: GameStateData,
		canvasW: number,
		canvasH: number,
		input: InputSystem,
	) {
		const tower = state.towers.find(
			(t) => t.id === state.selectedPlacedTowerId,
		);

		if (!tower) return;

		const def = TOWER_DEFS[tower.type];
		const stats = getTowerStats(tower.type, tower.level);
		const panelW = 220;
		const panelH = 200;
		const panelX = canvasW - panelW - 12;
		const panelY2 = canvasH - this.panelHeight - panelH - 12;

		// Panel background
		ctx.fillStyle = "rgba(10,20,10,0.95)";
		ctx.beginPath();
		ctx.roundRect(panelX, panelY2, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = def.color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(panelX, panelY2, panelW, panelH, 12);
		ctx.stroke();

		// Title
		ctx.font = "bold 16px monospace";
		ctx.fillStyle = "#eee";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(`${def.icon} ${def.name}`, panelX + 14, panelY2 + 14);

		// Level stars
		ctx.font = "14px sans-serif";
		ctx.fillStyle = "#ffd700";
		ctx.textAlign = "right";
		ctx.fillText(
			"★".repeat(tower.level) + "☆".repeat(3 - tower.level),
			panelX + panelW - 14,
			panelY2 + 14,
		);

		// Stats
		const statY = panelY2 + 44;
		const lineH = 20;

		ctx.font = "12px monospace";
		ctx.textAlign = "left";
		ctx.fillStyle = "#aaa";
		ctx.fillText(`DMG:  ${stats.damage}`, panelX + 14, statY);
		ctx.fillText(`RNG:  ${stats.range}px`, panelX + 14, statY + lineH);
		ctx.fillText(
			`SPD:  ${(1000 / stats.fireInterval).toFixed(1)}/s`,
			panelX + 14,
			statY + lineH * 2,
		);

		if (stats.splashRadius > 0) {
			ctx.fillStyle = "#ff7043";
			ctx.fillText(
				`SPLASH: ${stats.splashRadius}px`,
				panelX + 14,
				statY + lineH * 3,
			);
		}

		if (stats.slowFactor > 0) {
			ctx.fillStyle = "#4fc3f7";
			ctx.fillText(
				`SLOW: ${stats.slowFactor * 100}%`,
				panelX + 14,
				statY + lineH * 3,
			);
		}

		const btnY = panelY2 + panelH - 50;
		const btnH = 32;
		const halfW = (panelW - 42) / 2;

		// Upgrade button
		const canUpgrade = tower.level < 3;
		const upCost = canUpgrade ? upgradeCost(def, tower.level) : 0;
		const canAffordUp = canUpgrade && state.gold >= upCost;
		const upBtnX = panelX + 14;

		this.drawButton(
			ctx,
			upBtnX,
			btnY,
			halfW,
			btnH,
			canUpgrade ? `⬆ ${upCost}💰` : "★ MAX",
			canAffordUp && canUpgrade,
		);
		input.upgradeRect =
			canAffordUp && canUpgrade
				? { x: upBtnX, y: btnY, w: halfW, h: btnH }
				: null;

		// Sell button (shows "Confirm?" on second click)
		const refund = sellRefund(tower.totalInvested);
		const sellBtnX = panelX + 14 + halfW + 14;
		const isPendingSell = state.pendingSellTowerId === tower.id;
		const sellLabel = isPendingSell ? "Confirm?" : `💰 ${refund}`;
		const sellColor = isPendingSell ? "#d32f2f" : "#b71c1c";

		this.drawButton(
			ctx,
			sellBtnX,
			btnY,
			halfW,
			btnH,
			sellLabel,
			true,
			sellColor,
		);
		input.sellRect = { x: sellBtnX, y: btnY, w: halfW, h: btnH };

		// Close X
		const closeSize = 22;
		const closeX = panelX + panelW - closeSize - 8;
		const closeY2 = panelY2 + 8;

		ctx.fillStyle = "#333";
		ctx.beginPath();
		ctx.roundRect(closeX, closeY2, closeSize, closeSize, 4);
		ctx.fill();
		ctx.font = "bold 14px monospace";
		ctx.fillStyle = "#aaa";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("✕", closeX + closeSize / 2, closeY2 + closeSize / 2);
		input.closePanelRect = {
			x: closeX,
			y: closeY2,
			w: closeSize,
			h: closeSize,
		};
	}

	private drawButton(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		label: string,
		active: boolean,
		activeColor = "#1b5e20",
	) {
		ctx.fillStyle = active ? activeColor : "#1a1a1a";
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 6);
		ctx.fill();

		ctx.strokeStyle = active ? "#4caf50" : "#333";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 6);
		ctx.stroke();

		ctx.font = "bold 12px monospace";
		ctx.fillStyle = active ? "#a5d6a7" : "#555";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label, x + w / 2, y + h / 2);
	}
}
