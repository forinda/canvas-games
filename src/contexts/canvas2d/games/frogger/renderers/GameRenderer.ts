import type { Renderable } from "@core/Renderable";
import type { FroggerState } from "../types";

const ROAD_COLOR = "#555555";
const RIVER_COLOR = "#1565c0";
const GRASS_COLOR = "#388e3c";
const START_COLOR = "#2e7d32";
const GOAL_COLOR = "#1b5e20";
const LOG_COLOR = "#795548";
const LOG_BARK = "#5d4037";
const PAD_COLOR = "#4caf50";
const PAD_OCCUPIED = "#81c784";

export class GameRenderer implements Renderable<FroggerState> {
	render(ctx: CanvasRenderingContext2D, state: FroggerState): void {
		const cw = state.cellW;
		const ch = state.cellH;

		// ── Draw lanes ────────────────────────────────────────────────
		for (let row = 0; row < state.lanes.length; row++) {
			const lane = state.lanes[row];
			const y = row * ch;

			switch (lane.kind) {
				case "road":
					ctx.fillStyle = ROAD_COLOR;
					ctx.fillRect(0, y, state.canvasW, ch);
					// Lane markings
					ctx.setLineDash([cw * 0.4, cw * 0.4]);
					ctx.strokeStyle = "#999";
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(0, y + ch);
					ctx.lineTo(state.canvasW, y + ch);
					ctx.stroke();
					ctx.setLineDash([]);
					break;

				case "river":
					ctx.fillStyle = RIVER_COLOR;
					ctx.fillRect(0, y, state.canvasW, ch);
					// Water wave lines
					ctx.strokeStyle = "rgba(255,255,255,0.12)";
					ctx.lineWidth = 1;

					for (let wx = 0; wx < state.canvasW; wx += cw * 0.8) {
						ctx.beginPath();
						ctx.moveTo(wx, y + ch * 0.5);
						ctx.quadraticCurveTo(
							wx + cw * 0.2,
							y + ch * 0.3,
							wx + cw * 0.4,
							y + ch * 0.5,
						);
						ctx.stroke();
					}

					break;

				case "safe":
					ctx.fillStyle = GRASS_COLOR;
					ctx.fillRect(0, y, state.canvasW, ch);
					break;

				case "start":
					ctx.fillStyle = START_COLOR;
					ctx.fillRect(0, y, state.canvasW, ch);
					break;

				case "goal":
					ctx.fillStyle = GOAL_COLOR;
					ctx.fillRect(0, y, state.canvasW, ch);
					break;
			}
		}

		// ── Draw lily pads ────────────────────────────────────────────
		for (const pad of state.lilyPads) {
			const px = pad.col * cw + cw * 0.5;
			const py = ch * 0.5;
			const radius = cw * 0.35;

			ctx.fillStyle = pad.occupied ? PAD_OCCUPIED : PAD_COLOR;
			ctx.beginPath();
			ctx.arc(px, py, radius, 0, Math.PI * 2);
			ctx.fill();

			// Leaf vein
			ctx.strokeStyle = "rgba(0,0,0,0.2)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(px, py - radius * 0.6);
			ctx.lineTo(px, py + radius * 0.6);
			ctx.stroke();

			if (pad.occupied) {
				// Draw small frog on occupied pad
				ctx.font = `${cw * 0.4}px sans-serif`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("🐸", px, py);
			}
		}

		// ── Draw logs ─────────────────────────────────────────────────
		for (const log of state.logs) {
			const ly = log.row * ch;
			const margin = ch * 0.1;

			ctx.fillStyle = LOG_COLOR;
			ctx.beginPath();
			ctx.roundRect(log.x, ly + margin, log.width, ch - margin * 2, ch * 0.2);
			ctx.fill();

			// Bark texture
			ctx.strokeStyle = LOG_BARK;
			ctx.lineWidth = 1;
			const step = cw * 0.6;

			for (let bx = log.x + step; bx < log.x + log.width - 4; bx += step) {
				ctx.beginPath();
				ctx.moveTo(bx, ly + margin + 3);
				ctx.lineTo(bx, ly + ch - margin - 3);
				ctx.stroke();
			}
		}

		// ── Draw vehicles ─────────────────────────────────────────────
		for (const v of state.vehicles) {
			const vy = v.row * ch;
			const margin = ch * 0.12;

			ctx.fillStyle = v.color;
			ctx.beginPath();
			ctx.roundRect(v.x, vy + margin, v.width, ch - margin * 2, 4);
			ctx.fill();

			// Windshield
			ctx.fillStyle = "rgba(200,230,255,0.5)";
			const wsW = Math.min(cw * 0.3, v.width * 0.2);
			const wsX = v.speed > 0 ? v.x + v.width - wsW - 3 : v.x + 3;

			ctx.fillRect(wsX, vy + margin + 3, wsW, ch - margin * 2 - 6);
		}

		// ── Draw frog ─────────────────────────────────────────────────
		this.drawFrog(ctx, state);
	}

	private drawFrog(ctx: CanvasRenderingContext2D, state: FroggerState): void {
		const frog = state.frog;
		const cw = state.cellW;
		const ch = state.cellH;
		const fx = frog.col * cw + frog.offsetX + cw * 0.5;
		const fy = frog.row * ch + frog.offsetY + ch * 0.5;

		if (state.dying) {
			// Death animation — red expanding circle
			const t = 1 - state.deathTimer / 0.6;

			ctx.fillStyle = `rgba(255, 0, 0, ${1 - t})`;
			ctx.beginPath();
			ctx.arc(fx, fy, cw * 0.3 + t * cw * 0.4, 0, Math.PI * 2);
			ctx.fill();

			ctx.font = `${cw * 0.5}px sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.globalAlpha = 1 - t;
			ctx.fillText("💀", fx, fy);
			ctx.globalAlpha = 1;

			return;
		}

		// Body
		const bodyR = cw * 0.35;

		ctx.fillStyle = "#66bb6a";
		ctx.beginPath();
		ctx.arc(fx, fy, bodyR, 0, Math.PI * 2);
		ctx.fill();

		// Eyes
		ctx.fillStyle = "#fff";
		const eyeR = cw * 0.1;
		const eyeOff = cw * 0.15;

		ctx.beginPath();
		ctx.arc(fx - eyeOff, fy - eyeOff, eyeR, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(fx + eyeOff, fy - eyeOff, eyeR, 0, Math.PI * 2);
		ctx.fill();

		// Pupils
		ctx.fillStyle = "#222";
		const pupilR = cw * 0.04;

		ctx.beginPath();
		ctx.arc(fx - eyeOff, fy - eyeOff, pupilR, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(fx + eyeOff, fy - eyeOff, pupilR, 0, Math.PI * 2);
		ctx.fill();
	}
}
