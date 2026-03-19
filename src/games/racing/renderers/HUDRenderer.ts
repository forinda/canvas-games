import type { Renderable } from "@shared/Renderable";
import type { RacingState } from "../types";
import { MAX_SPEED, TOTAL_LAPS, PLAYER_COLOR } from "../types";

export class HUDRenderer implements Renderable<RacingState> {
	render(ctx: CanvasRenderingContext2D, state: RacingState): void {
		const W = state.canvasW;
		const H = state.canvasH;

		// ── Top bar ──
		this.renderTopBar(ctx, state, W);

		// ── Speed gauge (bottom-right) ──
		this.renderSpeedGauge(ctx, state, W, H);

		// ── Mini position list (right side) ──
		this.renderPositions(ctx, state, W);

		// ── Countdown overlay ──
		if (state.phase === "countdown") {
			this.renderCountdown(ctx, state, W, H);
		}

		// ── Paused overlay ──
		if (state.paused) {
			this.renderOverlay(ctx, W, H, "PAUSED", "Press [P] to resume");
		}

		// ── Finished overlay ──
		if (state.phase === "finished") {
			this.renderFinished(ctx, state, W, H);
		}
	}

	private renderTopBar(
		ctx: CanvasRenderingContext2D,
		state: RacingState,
		W: number,
	): void {
		// Background
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, 44);

		ctx.font = "bold 16px monospace";
		ctx.textBaseline = "middle";
		const y = 22;

		// Lap counter (left)
		ctx.fillStyle = "#fff";
		ctx.textAlign = "left";
		const lap = Math.min(state.player.laps + 1, TOTAL_LAPS);

		ctx.fillText(`Lap ${lap}/${TOTAL_LAPS}`, 16, y);

		// Race timer (center)
		ctx.textAlign = "center";
		ctx.fillStyle = "#ffd700";
		const mins = Math.floor(state.raceTime / 60);
		const secs = Math.floor(state.raceTime % 60);
		const ms = Math.floor((state.raceTime % 1) * 100);

		ctx.fillText(
			`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`,
			W / 2,
			y,
		);

		// Position (right)
		const pos = this.getPlayerPosition(state);

		ctx.textAlign = "right";
		ctx.fillStyle = pos === 1 ? "#ffd700" : pos === 2 ? "#c0c0c0" : "#cd7f32";
		ctx.fillText(`${this.ordinal(pos)}`, W - 16, y);
	}

	private renderSpeedGauge(
		ctx: CanvasRenderingContext2D,
		state: RacingState,
		W: number,
		H: number,
	): void {
		const gaugeW = 160;
		const gaugeH = 20;
		const x = W - gaugeW - 16;
		const y = H - 40;
		const speedRatio = Math.abs(state.player.speed) / MAX_SPEED;

		// Background
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(x - 4, y - 20, gaugeW + 8, gaugeH + 28);

		// Label
		ctx.font = "bold 11px monospace";
		ctx.fillStyle = "#aaa";
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText("SPEED", x, y - 4);

		// Speed value
		ctx.textAlign = "right";
		ctx.fillStyle = "#fff";
		ctx.fillText(
			`${Math.round(Math.abs(state.player.speed))}`,
			x + gaugeW,
			y - 4,
		);

		// Bar background
		ctx.fillStyle = "#333";
		ctx.fillRect(x, y, gaugeW, gaugeH);

		// Bar fill
		const r = Math.round(255 * speedRatio);
		const g = Math.round(255 * (1 - speedRatio));

		ctx.fillStyle = `rgb(${r},${g},80)`;
		ctx.fillRect(x, y, gaugeW * speedRatio, gaugeH);

		// Border
		ctx.strokeStyle = "#888";
		ctx.lineWidth = 1;
		ctx.strokeRect(x, y, gaugeW, gaugeH);
	}

	private renderPositions(
		ctx: CanvasRenderingContext2D,
		state: RacingState,
		W: number,
	): void {
		const x = W - 140;
		const startY = 60;

		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.fillRect(x - 8, startY - 4, 136, state.positions.length * 22 + 8);

		ctx.font = "12px monospace";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";

		state.positions.forEach((car, i) => {
			const y = startY + i * 22;

			ctx.fillStyle = car.isPlayer ? PLAYER_COLOR : car.color;
			ctx.fillRect(x, y + 2, 10, 10);
			ctx.fillStyle = car.isPlayer ? "#fff" : "#ccc";
			ctx.fillText(`${i + 1}. ${car.name}`, x + 16, y);
		});
	}

	private renderCountdown(
		ctx: CanvasRenderingContext2D,
		state: RacingState,
		W: number,
		H: number,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.4)";
		ctx.fillRect(0, 0, W, H);

		const num = Math.ceil(state.countdownTimer);
		const text = num > 0 ? num.toString() : "GO!";
		const scale = 1 + (state.countdownTimer % 1) * 0.3;

		ctx.save();
		ctx.translate(W / 2, H / 2);
		ctx.scale(scale, scale);

		ctx.font = "bold 80px monospace";
		ctx.fillStyle = num > 0 ? "#fff" : "#4caf50";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, 0, 0);
		ctx.restore();
	}

	private renderFinished(
		ctx: CanvasRenderingContext2D,
		state: RacingState,
		W: number,
		H: number,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.7)";
		ctx.fillRect(0, 0, W, H);

		const pos = this.getPlayerPosition(state);
		const cx = W / 2;
		let y = H / 2 - 80;

		ctx.font = "bold 48px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = pos === 1 ? "#ffd700" : "#fff";
		ctx.fillText("RACE COMPLETE", cx, y);

		y += 60;
		ctx.font = "bold 36px monospace";
		ctx.fillStyle = pos === 1 ? "#ffd700" : pos === 2 ? "#c0c0c0" : "#cd7f32";
		ctx.fillText(`You finished ${this.ordinal(pos)}!`, cx, y);

		y += 50;
		ctx.font = "20px monospace";
		ctx.fillStyle = "#ccc";
		const t = state.player.finishTime;
		const mins = Math.floor(t / 60);
		const secs = Math.floor(t % 60);
		const ms = Math.floor((t % 1) * 100);

		ctx.fillText(
			`Time: ${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`,
			cx,
			y,
		);

		y += 50;
		ctx.font = "16px monospace";
		ctx.fillStyle = "#888";
		ctx.fillText("Press [Space] or [R] to restart", cx, y);
		ctx.fillText("Press [ESC] to exit", cx, y + 24);
	}

	private renderOverlay(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
		title: string,
		subtitle: string,
	): void {
		ctx.fillStyle = "rgba(0,0,0,0.6)";
		ctx.fillRect(0, 0, W, H);

		ctx.font = "bold 48px monospace";
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(title, W / 2, H / 2 - 20);

		ctx.font = "18px monospace";
		ctx.fillStyle = "#aaa";
		ctx.fillText(subtitle, W / 2, H / 2 + 30);
	}

	private getPlayerPosition(state: RacingState): number {
		const idx = state.positions.indexOf(state.player);

		return idx >= 0 ? idx + 1 : state.positions.length;
	}

	private ordinal(n: number): string {
		const s = ["th", "st", "nd", "rd"];
		const v = n % 100;

		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}
}
