import type { Renderable } from "@shared/Renderable";
import type { GolfState } from "../types";

import { COURSES } from "../data/courses";

export class GameRenderer implements Renderable<GolfState> {
	render(ctx: CanvasRenderingContext2D, state: GolfState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Background
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, W, H);

		ctx.save();
		ctx.translate(state.courseOffsetX, state.courseOffsetY);

		const course = COURSES[state.currentHole];

		// Draw green area
		this.drawGreen(ctx, course.walls);

		// Draw slopes
		this.drawSlopes(ctx, state);

		// Draw walls
		this.drawWalls(ctx, state);

		// Draw obstacles
		this.drawObstacles(ctx, state);

		// Draw hole
		this.drawHole(ctx, state);

		// Draw ball
		this.drawBall(ctx, state);

		ctx.restore();

		// Draw aim line (in screen coordinates)
		if (state.aiming && state.aimStart && state.aimEnd) {
			this.drawAimLine(ctx, state);
		}
	}

	private drawGreen(
		ctx: CanvasRenderingContext2D,
		walls: { x1: number; y1: number; x2: number; y2: number }[],
	): void {
		// Find bounding box from outer walls (first 4 walls)
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		const outerCount = Math.min(4, walls.length);

		for (let i = 0; i < outerCount; i++) {
			const w = walls[i];

			minX = Math.min(minX, w.x1, w.x2);
			minY = Math.min(minY, w.y1, w.y2);
			maxX = Math.max(maxX, w.x1, w.x2);
			maxY = Math.max(maxY, w.y1, w.y2);
		}

		// Course green
		ctx.fillStyle = "#2d7a3a";
		ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

		// Subtle lighter edge
		ctx.strokeStyle = "#1e5c2a";
		ctx.lineWidth = 3;
		ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

		// Grass texture (subtle lines)
		ctx.strokeStyle = "rgba(50, 140, 60, 0.3)";
		ctx.lineWidth = 1;

		for (let y = minY; y < maxY; y += 12) {
			ctx.beginPath();
			ctx.moveTo(minX, y);
			ctx.lineTo(maxX, y);
			ctx.stroke();
		}
	}

	private drawSlopes(ctx: CanvasRenderingContext2D, state: GolfState): void {
		const course = COURSES[state.currentHole];

		for (let i = 0; i < course.slopes.length; i++) {
			const slope = course.slopes[i];

			ctx.fillStyle = "rgba(100, 180, 100, 0.4)";
			ctx.fillRect(slope.x, slope.y, slope.width, slope.height);

			// Draw arrows to indicate slope direction
			ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
			ctx.lineWidth = 1.5;

			const arrowSpacing = 30;
			const arrowSize = 8;

			for (
				let ax = slope.x + arrowSpacing;
				ax < slope.x + slope.width;
				ax += arrowSpacing
			) {
				for (
					let ay = slope.y + arrowSpacing;
					ay < slope.y + slope.height;
					ay += arrowSpacing
				) {
					ctx.beginPath();
					ctx.moveTo(ax, ay);
					ctx.lineTo(ax + slope.dirX * arrowSize, ay + slope.dirY * arrowSize);
					ctx.stroke();

					// Arrowhead
					const angle = Math.atan2(slope.dirY, slope.dirX);

					ctx.beginPath();
					ctx.moveTo(ax + slope.dirX * arrowSize, ay + slope.dirY * arrowSize);
					ctx.lineTo(
						ax + slope.dirX * arrowSize - Math.cos(angle - 0.5) * 4,
						ay + slope.dirY * arrowSize - Math.sin(angle - 0.5) * 4,
					);
					ctx.moveTo(ax + slope.dirX * arrowSize, ay + slope.dirY * arrowSize);
					ctx.lineTo(
						ax + slope.dirX * arrowSize - Math.cos(angle + 0.5) * 4,
						ay + slope.dirY * arrowSize - Math.sin(angle + 0.5) * 4,
					);
					ctx.stroke();
				}
			}
		}
	}

	private drawWalls(ctx: CanvasRenderingContext2D, state: GolfState): void {
		const course = COURSES[state.currentHole];

		ctx.strokeStyle = "#5c3a1e";
		ctx.lineWidth = 4;
		ctx.lineCap = "round";

		for (let i = 0; i < course.walls.length; i++) {
			const wall = course.walls[i];

			ctx.beginPath();
			ctx.moveTo(wall.x1, wall.y1);
			ctx.lineTo(wall.x2, wall.y2);
			ctx.stroke();
		}
	}

	private drawObstacles(ctx: CanvasRenderingContext2D, state: GolfState): void {
		const course = COURSES[state.currentHole];

		for (let i = 0; i < course.obstacles.length; i++) {
			const obs = course.obstacles[i];

			if (obs.shape === "circle" && obs.radius) {
				ctx.fillStyle = "#8B4513";
				ctx.beginPath();
				ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
				ctx.fill();

				ctx.strokeStyle = "#6B3410";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
				ctx.stroke();
			} else {
				ctx.fillStyle = "#8B4513";
				ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

				ctx.strokeStyle = "#6B3410";
				ctx.lineWidth = 2;
				ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
			}
		}
	}

	private drawHole(ctx: CanvasRenderingContext2D, state: GolfState): void {
		const course = COURSES[state.currentHole];
		const hole = course.hole;

		// Hole shadow
		ctx.fillStyle = "#111";
		ctx.beginPath();
		ctx.arc(hole.pos.x, hole.pos.y, hole.radius, 0, Math.PI * 2);
		ctx.fill();

		// Hole rim
		ctx.strokeStyle = "#444";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(hole.pos.x, hole.pos.y, hole.radius, 0, Math.PI * 2);
		ctx.stroke();

		// Flag pole
		ctx.strokeStyle = "#ccc";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(hole.pos.x, hole.pos.y);
		ctx.lineTo(hole.pos.x, hole.pos.y - 40);
		ctx.stroke();

		// Flag
		ctx.fillStyle = "#e53935";
		ctx.beginPath();
		ctx.moveTo(hole.pos.x, hole.pos.y - 40);
		ctx.lineTo(hole.pos.x + 18, hole.pos.y - 33);
		ctx.lineTo(hole.pos.x, hole.pos.y - 26);
		ctx.closePath();
		ctx.fill();
	}

	private drawBall(ctx: CanvasRenderingContext2D, state: GolfState): void {
		const ball = state.ball;

		if (state.holeSunk) return;

		// Ball shadow
		ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
		ctx.beginPath();
		ctx.ellipse(
			ball.pos.x + 2,
			ball.pos.y + 3,
			ball.radius,
			ball.radius * 0.6,
			0,
			0,
			Math.PI * 2,
		);
		ctx.fill();

		// Ball
		const grad = ctx.createRadialGradient(
			ball.pos.x - 2,
			ball.pos.y - 2,
			1,
			ball.pos.x,
			ball.pos.y,
			ball.radius,
		);

		grad.addColorStop(0, "#ffffff");
		grad.addColorStop(1, "#ddd");

		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = "#bbb";
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
		ctx.stroke();
	}

	private drawAimLine(ctx: CanvasRenderingContext2D, state: GolfState): void {
		const start = state.aimStart!;
		const end = state.aimEnd!;

		const dx = start.x - end.x;
		const dy = start.y - end.y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		const power = Math.min(dist, 200);
		const powerRatio = power / 200;

		// Direction line from ball (opposite to drag)
		const ballScreenX = state.ball.pos.x + state.courseOffsetX;
		const ballScreenY = state.ball.pos.y + state.courseOffsetY;

		const angle = Math.atan2(dy, dx);
		const lineLen = 30 + powerRatio * 80;

		const endX = ballScreenX + Math.cos(angle) * lineLen;
		const endY = ballScreenY + Math.sin(angle) * lineLen;

		// Power color: green -> yellow -> red
		const r = Math.floor(255 * powerRatio);
		const g = Math.floor(255 * (1 - powerRatio));
		const color = `rgb(${r}, ${g}, 50)`;

		// Dotted aim line
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(ballScreenX, ballScreenY);
		ctx.lineTo(endX, endY);
		ctx.stroke();
		ctx.setLineDash([]);

		// Power indicator circle around ball
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(ballScreenX, ballScreenY, 15 + powerRatio * 15, 0, Math.PI * 2);
		ctx.stroke();

		// Power text
		const powerPercent = Math.round(powerRatio * 100);

		ctx.font = "bold 12px monospace";
		ctx.fillStyle = color;
		ctx.textAlign = "center";
		ctx.textBaseline = "bottom";
		ctx.fillText(`${powerPercent}%`, ballScreenX, ballScreenY - 25);
	}
}
