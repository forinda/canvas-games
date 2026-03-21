import type { Renderable } from "@core/Renderable";
import type { PacManState, Direction } from "../types";

export class GameRenderer implements Renderable<PacManState> {
	render(ctx: CanvasRenderingContext2D, state: PacManState): void {
		const { cellSize: cs, offsetX: ox, offsetY: oy } = state;

		// Clear canvas
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		this.renderMaze(ctx, state, cs, ox, oy);
		this.renderDots(ctx, state, cs, ox, oy);
		this.renderGhosts(ctx, state, cs, ox, oy);
		this.renderPacMan(ctx, state, cs, ox, oy);
	}

	private renderMaze(
		ctx: CanvasRenderingContext2D,
		state: PacManState,
		cs: number,
		ox: number,
		oy: number,
	): void {
		ctx.fillStyle = "#1a1a7e";
		ctx.strokeStyle = "#3333ff";
		ctx.lineWidth = 2;

		for (let y = 0; y < state.gridHeight; y++) {
			for (let x = 0; x < state.gridWidth; x++) {
				const cell = state.grid[y][x];

				if (cell.type === "wall") {
					const px = ox + x * cs;
					const py = oy + y * cs;

					ctx.fillRect(px, py, cs, cs);

					// Draw blue border on sides adjacent to non-wall
					this.drawWallBorders(ctx, state, x, y, px, py, cs);
				} else if (cell.type === "door") {
					const px = ox + x * cs;
					const py = oy + y * cs;

					ctx.fillStyle = "#ff88ff";
					ctx.fillRect(px, py + cs * 0.35, cs, cs * 0.3);
					ctx.fillStyle = "#1a1a7e";
				}
			}
		}
	}

	private drawWallBorders(
		ctx: CanvasRenderingContext2D,
		state: PacManState,
		x: number,
		y: number,
		px: number,
		py: number,
		cs: number,
	): void {
		const isWall = (cx: number, cy: number) => {
			if (cx < 0 || cx >= state.gridWidth || cy < 0 || cy >= state.gridHeight)
				return true;

			return state.grid[cy][cx].type === "wall";
		};

		ctx.strokeStyle = "#3333ff";
		ctx.lineWidth = 1.5;

		if (!isWall(x, y - 1)) {
			ctx.beginPath();
			ctx.moveTo(px, py);
			ctx.lineTo(px + cs, py);
			ctx.stroke();
		}

		if (!isWall(x, y + 1)) {
			ctx.beginPath();
			ctx.moveTo(px, py + cs);
			ctx.lineTo(px + cs, py + cs);
			ctx.stroke();
		}

		if (!isWall(x - 1, y)) {
			ctx.beginPath();
			ctx.moveTo(px, py);
			ctx.lineTo(px, py + cs);
			ctx.stroke();
		}

		if (!isWall(x + 1, y)) {
			ctx.beginPath();
			ctx.moveTo(px + cs, py);
			ctx.lineTo(px + cs, py + cs);
			ctx.stroke();
		}
	}

	private renderDots(
		ctx: CanvasRenderingContext2D,
		state: PacManState,
		cs: number,
		ox: number,
		oy: number,
	): void {
		const time = state.time;

		for (let y = 0; y < state.gridHeight; y++) {
			for (let x = 0; x < state.gridWidth; x++) {
				const cell = state.grid[y][x];
				const cx = ox + x * cs + cs / 2;
				const cy = oy + y * cs + cs / 2;

				if (cell.type === "dot") {
					ctx.fillStyle = "#ffcc99";
					ctx.beginPath();
					ctx.arc(cx, cy, cs * 0.12, 0, Math.PI * 2);
					ctx.fill();
				} else if (cell.type === "power") {
					// Pulsing power pellet
					const pulse = 0.6 + 0.4 * Math.sin(time * 6);
					const radius = cs * 0.3 * pulse;

					ctx.fillStyle = "#ffcc99";
					ctx.beginPath();
					ctx.arc(cx, cy, radius, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		}
	}

	private renderPacMan(
		ctx: CanvasRenderingContext2D,
		state: PacManState,
		cs: number,
		ox: number,
		oy: number,
	): void {
		const pac = state.pacman;
		const cx = ox + pac.pos.x * cs + cs / 2;
		const cy = oy + pac.pos.y * cs + cs / 2;
		const radius = cs * 0.45;

		const angle = this.dirToAngle(pac.dir);
		const mouth = pac.mouthAngle;

		ctx.fillStyle = "#ffff00";
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		ctx.arc(cx, cy, radius, angle + mouth, angle + Math.PI * 2 - mouth);
		ctx.closePath();
		ctx.fill();

		// Eye
		const eyeAngle = angle - 0.5;
		const eyeX = cx + Math.cos(eyeAngle) * radius * 0.45;
		const eyeY = cy + Math.sin(eyeAngle) * radius * 0.45;

		ctx.fillStyle = "#000";
		ctx.beginPath();
		ctx.arc(eyeX, eyeY, cs * 0.06, 0, Math.PI * 2);
		ctx.fill();
	}

	private renderGhosts(
		ctx: CanvasRenderingContext2D,
		state: PacManState,
		cs: number,
		ox: number,
		oy: number,
	): void {
		for (const ghost of state.ghosts) {
			if (!ghost.active && !ghost.eaten) continue;

			const cx = ox + ghost.pos.x * cs + cs / 2;
			const cy = oy + ghost.pos.y * cs + cs / 2;
			const r = cs * 0.45;

			if (ghost.eaten) {
				// Just draw eyes
				this.drawGhostEyes(ctx, cx, cy, r, ghost.dir);
				continue;
			}

			// Body color
			if (ghost.mode === "frightened") {
				const flashing =
					state.frightenedTimer < 2 && Math.floor(state.time * 8) % 2 === 0;

				ctx.fillStyle = flashing ? "#fff" : "#2222ff";
			} else {
				ctx.fillStyle = ghost.color;
			}

			// Ghost body - rounded top, wavy bottom
			ctx.beginPath();
			ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0);
			// Wavy bottom
			const bottom = cy + r * 0.85;
			const waveSize = r * 0.25;
			const segments = 3;
			const segW = (r * 2) / segments;

			ctx.lineTo(cx + r, bottom);

			for (let i = segments - 1; i >= 0; i--) {
				const sx = cx - r + i * segW;
				const waveOffset = Math.sin(state.time * 10 + i) * waveSize * 0.3;

				ctx.quadraticCurveTo(
					sx + segW * 0.5,
					bottom + waveSize + waveOffset,
					sx,
					bottom,
				);
			}

			ctx.closePath();
			ctx.fill();

			// Eyes
			if (ghost.mode === "frightened") {
				// Simple frightened face
				const eyeR = r * 0.15;

				ctx.fillStyle = "#fff";
				ctx.beginPath();
				ctx.arc(cx - r * 0.3, cy - r * 0.15, eyeR, 0, Math.PI * 2);
				ctx.fill();
				ctx.beginPath();
				ctx.arc(cx + r * 0.3, cy - r * 0.15, eyeR, 0, Math.PI * 2);
				ctx.fill();

				// Wobbly mouth
				ctx.strokeStyle = "#fff";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(cx - r * 0.4, cy + r * 0.25);

				for (let i = 0; i < 4; i++) {
					const mx = cx - r * 0.4 + ((r * 0.8) / 4) * (i + 0.5);
					const my = cy + r * 0.25 + (i % 2 === 0 ? -r * 0.1 : r * 0.1);

					ctx.lineTo(mx, my);
				}

				ctx.lineTo(cx + r * 0.4, cy + r * 0.25);
				ctx.stroke();
			} else {
				this.drawGhostEyes(ctx, cx, cy, r, ghost.dir);
			}
		}
	}

	private drawGhostEyes(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		r: number,
		dir: Direction,
	): void {
		const eyeR = r * 0.22;
		const pupilR = r * 0.11;
		const eyeOffX = r * 0.3;
		const eyeY = cy - r * 0.15;

		// Direction offset for pupils
		let pdx = 0;
		let pdy = 0;

		switch (dir) {
			case "up":
				pdy = -pupilR * 0.5;
				break;
			case "down":
				pdy = pupilR * 0.5;
				break;
			case "left":
				pdx = -pupilR * 0.5;
				break;
			case "right":
				pdx = pupilR * 0.5;
				break;
		}

		for (const sign of [-1, 1]) {
			const ex = cx + sign * eyeOffX;

			// White of eye
			ctx.fillStyle = "#fff";
			ctx.beginPath();
			ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
			ctx.fill();
			// Pupil
			ctx.fillStyle = "#00f";
			ctx.beginPath();
			ctx.arc(ex + pdx, eyeY + pdy, pupilR, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private dirToAngle(dir: Direction): number {
		switch (dir) {
			case "right":
				return 0;
			case "down":
				return Math.PI * 0.5;
			case "left":
				return Math.PI;
			case "up":
				return Math.PI * 1.5;
			default:
				return 0;
		}
	}
}
