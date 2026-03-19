import type { Renderable } from "@shared/Renderable";
import type { WhackState } from "../types";
import { GRID_COLS, GRID_ROWS, RISE_DURATION, SINK_DURATION } from "../types";

export class GameRenderer implements Renderable<WhackState> {
	render(ctx: CanvasRenderingContext2D, state: WhackState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Background
		ctx.fillStyle = "#5d8a3c";
		ctx.fillRect(0, 0, W, H);

		// Draw a subtle grass pattern
		ctx.fillStyle = "#4e7a30";

		for (let x = 0; x < W; x += 40) {
			for (let y = 0; y < H; y += 40) {
				if ((x + y) % 80 === 0) {
					ctx.fillRect(x, y, 40, 40);
				}
			}
		}

		const gridSize = Math.min(W * 0.8, H * 0.65);
		const cellW = gridSize / GRID_COLS;
		const cellH = gridSize / GRID_ROWS;
		const gridX = (W - gridSize) / 2;
		const gridY = (H - gridSize) / 2 + 40;

		// Draw holes and moles
		for (let row = 0; row < GRID_ROWS; row++) {
			for (let col = 0; col < GRID_COLS; col++) {
				const idx = row * GRID_COLS + col;
				const hole = state.holes[idx];
				const cx = gridX + col * cellW + cellW / 2;
				const cy = gridY + row * cellH + cellH / 2;
				const holeRadiusX = cellW * 0.35;
				const holeRadiusY = cellH * 0.18;
				const moleRadius = Math.min(cellW, cellH) * 0.22;

				// Draw hole (dark ellipse)
				ctx.fillStyle = "#2a1a0a";
				ctx.beginPath();
				ctx.ellipse(
					cx,
					cy + holeRadiusY * 0.5,
					holeRadiusX,
					holeRadiusY,
					0,
					0,
					Math.PI * 2,
				);
				ctx.fill();

				// Hole rim
				ctx.strokeStyle = "#3d2b1a";
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.ellipse(
					cx,
					cy + holeRadiusY * 0.5,
					holeRadiusX + 2,
					holeRadiusY + 2,
					0,
					0,
					Math.PI * 2,
				);
				ctx.stroke();

				// Draw mole if active
				if (hole.state !== "empty") {
					let popFraction = 1;

					if (hole.state === "rising") {
						popFraction = hole.timer / RISE_DURATION;
					} else if (hole.state === "sinking") {
						popFraction = 1 - hole.timer / SINK_DURATION;
					}

					popFraction = Math.max(0, Math.min(1, popFraction));

					const moleY = cy - moleRadius * popFraction * 1.2;

					// Save context for clipping mole below hole
					ctx.save();
					ctx.beginPath();
					ctx.rect(
						cx - holeRadiusX,
						0,
						holeRadiusX * 2,
						cy + holeRadiusY * 0.5,
					);
					ctx.clip();

					if (hole.hit) {
						// Hit indicator — dizzy mole
						ctx.globalAlpha = 0.5 * popFraction;
					}

					// Mole body
					if (hole.isBomb) {
						// Bomb mole — red/dark
						ctx.fillStyle = "#cc2222";
						ctx.beginPath();
						ctx.arc(cx, moleY, moleRadius, 0, Math.PI * 2);
						ctx.fill();

						// Fuse
						ctx.strokeStyle = "#ffaa00";
						ctx.lineWidth = 2;
						ctx.beginPath();
						ctx.moveTo(cx, moleY - moleRadius);
						ctx.quadraticCurveTo(
							cx + 8,
							moleY - moleRadius - 12,
							cx + 4,
							moleY - moleRadius - 8,
						);
						ctx.stroke();

						// Spark
						ctx.fillStyle = "#ffff00";
						ctx.beginPath();
						ctx.arc(cx + 4, moleY - moleRadius - 8, 3, 0, Math.PI * 2);
						ctx.fill();

						// Eyes (X marks)
						ctx.strokeStyle = "#fff";
						ctx.lineWidth = 2;
						const eyeY = moleY - moleRadius * 0.15;

						for (const side of [-1, 1]) {
							const ex = cx + side * moleRadius * 0.35;

							ctx.beginPath();
							ctx.moveTo(ex - 4, eyeY - 4);
							ctx.lineTo(ex + 4, eyeY + 4);
							ctx.moveTo(ex + 4, eyeY - 4);
							ctx.lineTo(ex - 4, eyeY + 4);
							ctx.stroke();
						}
					} else {
						// Normal mole — brown
						ctx.fillStyle = "#8B5E3C";
						ctx.beginPath();
						ctx.arc(cx, moleY, moleRadius, 0, Math.PI * 2);
						ctx.fill();

						// Darker inner
						ctx.fillStyle = "#6B3F1F";
						ctx.beginPath();
						ctx.arc(
							cx,
							moleY + moleRadius * 0.15,
							moleRadius * 0.6,
							0,
							Math.PI * 2,
						);
						ctx.fill();

						// Eyes
						ctx.fillStyle = "#fff";
						const eyeY = moleY - moleRadius * 0.2;

						for (const side of [-1, 1]) {
							const ex = cx + side * moleRadius * 0.3;

							ctx.beginPath();
							ctx.arc(ex, eyeY, moleRadius * 0.15, 0, Math.PI * 2);
							ctx.fill();
							// Pupil
							ctx.fillStyle = "#111";
							ctx.beginPath();
							ctx.arc(ex, eyeY, moleRadius * 0.07, 0, Math.PI * 2);
							ctx.fill();
							ctx.fillStyle = "#fff";
						}

						// Nose
						ctx.fillStyle = "#d4836a";
						ctx.beginPath();
						ctx.arc(
							cx,
							moleY + moleRadius * 0.1,
							moleRadius * 0.12,
							0,
							Math.PI * 2,
						);
						ctx.fill();
					}

					ctx.globalAlpha = 1;
					ctx.restore();
				}
			}
		}

		// Particles
		for (const p of state.particles) {
			const alpha = Math.max(0, p.life / 600);

			ctx.globalAlpha = alpha;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;

		// Hammer effect
		if (state.hammerEffect) {
			const h = state.hammerEffect;
			const alpha = h.timer / 150;

			ctx.globalAlpha = alpha;
			ctx.font = `${32 + (1 - alpha) * 16}px serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("🔨", h.x, h.y - 10);
			ctx.globalAlpha = 1;
		}
	}
}
