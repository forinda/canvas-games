import type { ActiveEnemy, GameStateData } from "../types";
import { ENEMY_DEFS } from "../data/enemies";

export class EnemyRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		state: GameStateData,
		cellSize: number,
	): void {
		const now = performance.now();

		for (const enemy of state.enemies) {
			if (enemy.dead || enemy.reachedEnd) continue;

			this.drawEnemy(ctx, enemy, cellSize, now);
		}
	}

	private drawEnemy(
		ctx: CanvasRenderingContext2D,
		enemy: ActiveEnemy,
		cellSize: number,
		now: number,
	) {
		const def = ENEMY_DEFS[enemy.type];
		const r = cellSize * def.size;
		const { x, y } = enemy;

		// Shadow
		ctx.shadowColor = "rgba(0,0,0,0.5)";
		ctx.shadowBlur = 5;

		// Body circle
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fillStyle = def.color;
		ctx.fill();

		// Boss pulsing glow
		if (enemy.type === "boss") {
			const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);

			ctx.beginPath();
			ctx.arc(x, y, r + 4 * pulse, 0, Math.PI * 2);
			ctx.strokeStyle = `rgba(255,0,0,${0.3 + 0.4 * pulse})`;
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		ctx.shadowBlur = 0;

		// Ghost transparency overlay
		if (enemy.type === "ghost") {
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fillStyle = "rgba(255,255,255,0.15)";
			ctx.fill();
		}

		// Slow indicator
		if (now < enemy.slowUntil) {
			ctx.beginPath();
			ctx.arc(x, y, r + 2, 0, Math.PI * 2);
			ctx.strokeStyle = "#4fc3f7";
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		// Icon
		ctx.font = `${Math.max(10, r * 1.2)}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(def.icon, x, y);

		// HP bar (show always for boss, otherwise only when recently hit)
		const showHpBar = enemy.type === "boss" || now < enemy.hpBarTimer;

		if (showHpBar) {
			const barW = r * 2.2;
			const barH = Math.max(3, r * 0.25);
			const barX = x - barW / 2;
			const barY = y - r - barH - 3;
			const hpPct = enemy.hp / enemy.maxHp;

			// Background
			ctx.fillStyle = "rgba(0,0,0,0.6)";
			ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

			// HP fill
			const hpColor =
				hpPct > 0.5 ? "#2ecc71" : hpPct > 0.25 ? "#f39c12" : "#e74c3c";

			ctx.fillStyle = hpColor;
			ctx.fillRect(barX, barY, barW * hpPct, barH);

			// HP text for boss
			if (enemy.type === "boss") {
				ctx.fillStyle = "#fff";
				ctx.font = `bold ${Math.max(8, barH + 4)}px monospace`;
				ctx.textAlign = "center";
				ctx.textBaseline = "bottom";
				ctx.fillText(`${enemy.hp}/${enemy.maxHp}`, x, barY - 2);
			}
		}
	}
}
