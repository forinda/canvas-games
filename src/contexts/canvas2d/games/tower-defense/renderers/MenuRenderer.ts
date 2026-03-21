import type { GameStateData } from "../types";
import type { InputSystem } from "../systems/InputSystem";

export class MenuRenderer {
	render(
		ctx: CanvasRenderingContext2D,
		state: GameStateData,
		canvasW: number,
		canvasH: number,
		input: InputSystem,
	): void {
		input.menuButtonRects = [];

		switch (state.screen) {
			case "menu":
				this.renderMainMenu(ctx, state, canvasW, canvasH, input);
				break;
			case "paused":
				this.renderPauseMenu(ctx, state, canvasW, canvasH, input);
				break;
			case "gameover":
				this.renderGameOver(ctx, state, canvasW, canvasH, input);
				break;
			case "win":
				this.renderWin(ctx, state, canvasW, canvasH, input);
				break;
		}
	}

	private renderMainMenu(
		ctx: CanvasRenderingContext2D,
		_state: GameStateData,
		w: number,
		h: number,
		input: InputSystem,
	) {
		// Full background
		const grad = ctx.createLinearGradient(0, 0, 0, h);

		grad.addColorStop(0, "#0a1a0a");
		grad.addColorStop(1, "#0d2a0d");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, w, h);

		// Decorative grid lines
		ctx.strokeStyle = "rgba(46,204,113,0.06)";
		ctx.lineWidth = 1;

		for (let x = 0; x < w; x += 40) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}

		for (let y = 0; y < h; y += 40) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}

		// Title
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.font = `bold ${Math.min(72, w * 0.1)}px monospace`;
		ctx.fillStyle = "#2ecc71";
		ctx.shadowColor = "#2ecc71";
		ctx.shadowBlur = 20;
		ctx.fillText("TOWER DEFENSE", w / 2, h * 0.28);
		ctx.shadowBlur = 0;

		ctx.font = `${Math.min(18, w * 0.025)}px monospace`;
		ctx.fillStyle = "#4a7a4a";
		ctx.fillText(
			"Defend your base – place towers, survive the waves!",
			w / 2,
			h * 0.37,
		);

		// Mode buttons
		const modes: { label: string; key: string; desc: string; color: string }[] =
			[
				{
					label: "CLASSIC",
					key: "classic",
					desc: "10 waves · 20 lives · 200 gold",
					color: "#2ecc71",
				},
				{
					label: "ENDLESS",
					key: "endless",
					desc: "Infinite waves · 15 lives · 150 gold",
					color: "#e67e22",
				},
				{
					label: "CHALLENGE",
					key: "challenge",
					desc: "10 waves · 10 lives · 100 gold",
					color: "#e74c3c",
				},
			];

		const btnW = Math.min(220, w * 0.28);
		const btnH = 70;
		const spacing = 20;
		const totalW = modes.length * btnW + (modes.length - 1) * spacing;
		const startX = (w - totalW) / 2;
		const btnY = h * 0.5;

		modes.forEach((mode, i) => {
			const bx = startX + i * (btnW + spacing);

			this.drawMenuButton(
				ctx,
				bx,
				btnY,
				btnW,
				btnH,
				mode.label,
				mode.desc,
				mode.color,
			);
			input.menuButtonRects.push({
				label: mode.key,
				x: bx,
				y: btnY,
				w: btnW,
				h: btnH,
			});
		});

		// Exit to platform button
		const exitW = Math.min(160, w * 0.2);
		const exitH = 40;
		const exitX = (w - exitW) / 2;
		const exitY = h * 0.72;

		this.drawMenuButton(ctx, exitX, exitY, exitW, exitH, "EXIT", "", "#666");
		input.menuButtonRects.push({
			label: "exit",
			x: exitX,
			y: exitY,
			w: exitW,
			h: exitH,
		});

		// Controls help
		ctx.font = `${Math.min(13, w * 0.018)}px monospace`;
		ctx.fillStyle = "#2a4a2a";
		ctx.textAlign = "center";
		ctx.fillText(
			"Click a cell to place a tower · [P] Pause · [ESC] Deselect · [Space] Start Wave",
			w / 2,
			h * 0.85,
		);
	}

	private renderPauseMenu(
		ctx: CanvasRenderingContext2D,
		_state: GameStateData,
		w: number,
		h: number,
		input: InputSystem,
	) {
		// Dim overlay
		ctx.fillStyle = "rgba(0,0,0,0.65)";
		ctx.fillRect(0, 0, w, h);

		const pw = 320;
		const ph = 220;
		const px = (w - pw) / 2;
		const py = (h - ph) / 2;

		ctx.fillStyle = "#0d1a0d";
		ctx.beginPath();
		ctx.roundRect(px, py, pw, ph, 14);
		ctx.fill();
		ctx.strokeStyle = "#2ecc71";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, pw, ph, 14);
		ctx.stroke();

		ctx.font = "bold 28px monospace";
		ctx.fillStyle = "#2ecc71";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("PAUSED", px + pw / 2, py + 24);

		const btnW2 = 120;
		const btnH2 = 40;
		const gap = 16;
		const by = py + 100;
		const bx1 = px + pw / 2 - btnW2 - gap / 2;
		const bx2 = px + pw / 2 + gap / 2;

		this.drawMenuButton(ctx, bx1, by, btnW2, btnH2, "RESUME", "", "#2ecc71");
		input.menuButtonRects.push({
			label: "resume",
			x: bx1,
			y: by,
			w: btnW2,
			h: btnH2,
		});

		this.drawMenuButton(ctx, bx2, by, btnW2, btnH2, "MAIN MENU", "", "#e67e22");
		input.menuButtonRects.push({
			label: "menu",
			x: bx2,
			y: by,
			w: btnW2,
			h: btnH2,
		});

		// Exit to platform
		const exitW2 = 100;
		const exitBx = px + (pw - exitW2) / 2;
		const exitBy = by + btnH2 + 16;

		this.drawMenuButton(ctx, exitBx, exitBy, exitW2, btnH2, "EXIT", "", "#666");
		input.menuButtonRects.push({
			label: "exit",
			x: exitBx,
			y: exitBy,
			w: exitW2,
			h: btnH2,
		});

		ctx.font = "13px monospace";
		ctx.fillStyle = "#4a7a4a";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("[P] to resume", px + pw / 2, py + ph - 24);
	}

	private renderGameOver(
		ctx: CanvasRenderingContext2D,
		state: GameStateData,
		w: number,
		h: number,
		input: InputSystem,
	) {
		const grad = ctx.createRadialGradient(
			w / 2,
			h / 2,
			0,
			w / 2,
			h / 2,
			Math.max(w, h),
		);

		grad.addColorStop(0, "rgba(80,0,0,0.95)");
		grad.addColorStop(1, "rgba(0,0,0,0.98)");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, w, h);

		ctx.textAlign = "center";
		ctx.font = `bold ${Math.min(80, w * 0.11)}px monospace`;
		ctx.fillStyle = "#e74c3c";
		ctx.shadowColor = "#e74c3c";
		ctx.shadowBlur = 30;
		ctx.textBaseline = "middle";
		ctx.fillText("GAME OVER", w / 2, h * 0.3);
		ctx.shadowBlur = 0;

		ctx.font = `${Math.min(20, w * 0.03)}px monospace`;
		ctx.fillStyle = "#aaa";
		ctx.fillText(
			`Score: ${state.score}   Wave: ${state.currentWave}`,
			w / 2,
			h * 0.45,
		);

		if (state.score >= state.highScore && state.score > 0) {
			ctx.fillStyle = "#ffd700";
			ctx.fillText("NEW HIGH SCORE!", w / 2, h * 0.52);
		}

		const bw = 160;
		const bh = 50;
		const by2 = h * 0.62;
		const bx1 = w / 2 - bw - 12;
		const bx2 = w / 2 + 12;

		this.drawMenuButton(ctx, bx1, by2, bw, bh, "PLAY AGAIN", "", "#2ecc71");
		input.menuButtonRects.push({
			label: "restart",
			x: bx1,
			y: by2,
			w: bw,
			h: bh,
		});

		this.drawMenuButton(ctx, bx2, by2, bw, bh, "MAIN MENU", "", "#e67e22");
		input.menuButtonRects.push({ label: "menu", x: bx2, y: by2, w: bw, h: bh });
	}

	private renderWin(
		ctx: CanvasRenderingContext2D,
		state: GameStateData,
		w: number,
		h: number,
		input: InputSystem,
	) {
		const grad = ctx.createRadialGradient(
			w / 2,
			h / 2,
			0,
			w / 2,
			h / 2,
			Math.max(w, h),
		);

		grad.addColorStop(0, "rgba(0,60,0,0.96)");
		grad.addColorStop(1, "rgba(0,0,0,0.98)");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, w, h);

		ctx.textAlign = "center";
		ctx.font = `bold ${Math.min(72, w * 0.1)}px monospace`;
		ctx.fillStyle = "#2ecc71";
		ctx.shadowColor = "#2ecc71";
		ctx.shadowBlur = 30;
		ctx.textBaseline = "middle";
		ctx.fillText("YOU WIN! 🏆", w / 2, h * 0.3);
		ctx.shadowBlur = 0;

		ctx.font = `${Math.min(20, w * 0.03)}px monospace`;
		ctx.fillStyle = "#aaa";
		ctx.fillText(`Final Score: ${state.score}`, w / 2, h * 0.45);
		ctx.fillText(`Lives remaining: ${state.lives}`, w / 2, h * 0.52);

		const bw = 160;
		const bh = 50;
		const by3 = h * 0.64;
		const bx1 = w / 2 - bw - 12;
		const bx2 = w / 2 + 12;

		this.drawMenuButton(ctx, bx1, by3, bw, bh, "PLAY AGAIN", "", "#2ecc71");
		input.menuButtonRects.push({
			label: "restart",
			x: bx1,
			y: by3,
			w: bw,
			h: bh,
		});

		this.drawMenuButton(ctx, bx2, by3, bw, bh, "MAIN MENU", "", "#e67e22");
		input.menuButtonRects.push({ label: "menu", x: bx2, y: by3, w: bw, h: bh });
	}

	private drawMenuButton(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		title: string,
		subtitle: string,
		color: string,
	) {
		ctx.fillStyle = `${color}22`;
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 10);
		ctx.fill();

		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(x, y, w, h, 10);
		ctx.stroke();

		ctx.font = `bold 16px monospace`;
		ctx.fillStyle = color;
		ctx.textAlign = "center";
		ctx.textBaseline = subtitle ? "alphabetic" : "middle";
		ctx.fillText(title, x + w / 2, subtitle ? y + h / 2 + 2 : y + h / 2);

		if (subtitle) {
			ctx.font = `10px monospace`;
			ctx.fillStyle = `${color}99`;
			ctx.textBaseline = "top";
			ctx.fillText(subtitle, x + w / 2, y + h / 2 + 6);
		}
	}
}
