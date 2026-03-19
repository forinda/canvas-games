import type { Renderable } from "@shared/Renderable";
import type { GolfState } from "../types";
import { SUNK_DISPLAY_TIME } from "../types";
import { COURSES } from "../data/courses";
import { CourseSystem } from "../systems/CourseSystem";

export class HUDRenderer implements Renderable<GolfState> {
	private courseSystem: CourseSystem;

	constructor() {
		this.courseSystem = new CourseSystem();
	}

	render(ctx: CanvasRenderingContext2D, state: GolfState): void {
		const W = ctx.canvas.width;

		// Top HUD bar
		this.drawTopBar(ctx, state, W);

		// Sunk overlay
		if (state.holeSunk) {
			this.drawSunkOverlay(ctx, state);
		}

		// Game complete overlay
		if (state.gameComplete) {
			this.drawCompleteOverlay(ctx, state);
		}

		// Help hint
		if (!state.showHelp && !state.gameComplete) {
			ctx.font = "11px monospace";
			ctx.fillStyle = "rgba(255,255,255,0.3)";
			ctx.textAlign = "right";
			ctx.textBaseline = "bottom";
			ctx.fillText(
				"[H] Help  [R] Restart  [ESC] Exit",
				W - 12,
				ctx.canvas.height - 8,
			);
		}
	}

	private drawTopBar(
		ctx: CanvasRenderingContext2D,
		state: GolfState,
		W: number,
	): void {
		// Semi-transparent bar
		ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
		ctx.fillRect(0, 0, W, 44);

		const course = COURSES[state.currentHole];

		ctx.font = "bold 14px monospace";
		ctx.textBaseline = "middle";
		ctx.textAlign = "left";

		// Hole number
		ctx.fillStyle = "#4caf50";
		ctx.fillText(`Hole ${state.currentHole + 1}/${state.totalHoles}`, 12, 22);

		// Par
		ctx.fillStyle = "#aaa";
		ctx.font = "13px monospace";
		ctx.fillText(`Par ${course.par}`, 170, 22);

		// Strokes
		ctx.fillStyle = "#fff";
		ctx.fillText(`Strokes: ${state.strokes}`, 260, 22);

		// Total score
		ctx.textAlign = "right";
		const scoreLabel =
			state.totalScore === 0
				? "E"
				: state.totalScore > 0
					? `+${state.totalScore}`
					: `${state.totalScore}`;

		ctx.fillStyle =
			state.totalScore < 0
				? "#4caf50"
				: state.totalScore === 0
					? "#fff"
					: "#e53935";
		ctx.font = "bold 14px monospace";
		ctx.fillText(`Total: ${scoreLabel}`, W - 12, 22);
	}

	private drawSunkOverlay(
		ctx: CanvasRenderingContext2D,
		state: GolfState,
	): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;
		const elapsed = performance.now() - state.sunkTimer;

		if (elapsed > SUNK_DISPLAY_TIME) return;

		const alpha =
			Math.min(1, elapsed / 300) *
			(1 - Math.max(0, (elapsed - SUNK_DISPLAY_TIME + 400) / 400));
		const course = COURSES[state.currentHole];
		const label = this.courseSystem.getParLabel(state.strokes, course.par);

		ctx.save();
		ctx.globalAlpha = Math.max(0, alpha);

		ctx.fillStyle = "rgba(0,0,0,0.5)";
		ctx.fillRect(0, H * 0.35, W, H * 0.3);

		ctx.font = "bold 36px monospace";
		ctx.fillStyle = "#FFD700";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Hole In!", W / 2, H * 0.45);

		ctx.font = "bold 22px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText(
			`${state.strokes} stroke${state.strokes !== 1 ? "s" : ""} - ${label}`,
			W / 2,
			H * 0.55,
		);

		ctx.restore();
	}

	private drawCompleteOverlay(
		ctx: CanvasRenderingContext2D,
		state: GolfState,
	): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
		ctx.fillRect(0, 0, W, H);

		const panelW = Math.min(400, W * 0.8);
		const panelH = Math.min(500, H * 0.8);
		const px = (W - panelW) / 2;
		const py = (H - panelH) / 2;

		ctx.fillStyle = "#1a1a2e";
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.fill();

		ctx.strokeStyle = "#388e3c";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(px, py, panelW, panelH, 12);
		ctx.stroke();

		let y = py + 30;

		ctx.font = "bold 24px monospace";
		ctx.fillStyle = "#FFD700";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("Game Complete!", W / 2, y);
		y += 45;

		// Scorecard
		ctx.font = "12px monospace";
		ctx.textAlign = "left";

		const colHole = px + 20;
		const colPar = px + 80;
		const colStrokes = px + 150;
		const colResult = px + 240;

		// Header
		ctx.fillStyle = "#388e3c";
		ctx.fillText("Hole", colHole, y);
		ctx.fillText("Par", colPar, y);
		ctx.fillText("Strokes", colStrokes, y);
		ctx.fillText("Result", colResult, y);
		y += 22;

		// Divider
		ctx.strokeStyle = "rgba(255,255,255,0.1)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(px + 15, y);
		ctx.lineTo(px + panelW - 15, y);
		ctx.stroke();
		y += 10;

		let totalStrokes = 0;
		let totalPar = 0;

		for (let i = 0; i < state.totalHoles; i++) {
			const strokes = state.strokesPerHole[i];
			const par = COURSES[i].par;
			const diff = strokes - par;

			totalStrokes += strokes;
			totalPar += par;

			ctx.fillStyle = "#ccc";
			ctx.fillText(`${i + 1}`, colHole, y);
			ctx.fillText(`${par}`, colPar, y);
			ctx.fillText(`${strokes}`, colStrokes, y);

			ctx.fillStyle = diff < 0 ? "#4caf50" : diff === 0 ? "#fff" : "#e53935";
			ctx.fillText(this.courseSystem.getParLabel(strokes, par), colResult, y);
			y += 20;
		}

		// Total
		y += 5;
		ctx.strokeStyle = "rgba(255,255,255,0.1)";
		ctx.beginPath();
		ctx.moveTo(px + 15, y);
		ctx.lineTo(px + panelW - 15, y);
		ctx.stroke();
		y += 15;

		ctx.font = "bold 14px monospace";
		ctx.fillStyle = "#fff";
		ctx.fillText("Total", colHole, y);
		ctx.fillText(`${totalPar}`, colPar, y);
		ctx.fillText(`${totalStrokes}`, colStrokes, y);

		const finalDiff = totalStrokes - totalPar;
		const finalLabel =
			finalDiff === 0
				? "Even"
				: finalDiff > 0
					? `+${finalDiff}`
					: `${finalDiff}`;

		ctx.fillStyle =
			finalDiff < 0 ? "#4caf50" : finalDiff === 0 ? "#fff" : "#e53935";
		ctx.fillText(finalLabel, colResult, y);

		y += 40;
		ctx.font = "13px monospace";
		ctx.fillStyle = "#888";
		ctx.textAlign = "center";
		ctx.fillText("Press [R] to play again  [ESC] to exit", W / 2, y);
	}
}
