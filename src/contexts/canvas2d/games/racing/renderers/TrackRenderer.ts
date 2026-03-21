import type { Renderable } from "@core/Renderable";
import type { RacingState, TrackWaypoint } from "../types";

export class TrackRenderer implements Renderable<RacingState> {
	render(ctx: CanvasRenderingContext2D, state: RacingState): void {
		const { track, cameraX, cameraY, canvasW, canvasH } = state;
		const wp = track.waypoints;

		ctx.save();
		ctx.translate(-cameraX + canvasW / 2, -cameraY + canvasH / 2);

		// Grass background (large area)
		ctx.fillStyle = "#2d5a27";
		ctx.fillRect(
			cameraX - canvasW,
			cameraY - canvasH,
			canvasW * 3,
			canvasH * 3,
		);

		// Grass texture dots
		ctx.fillStyle = "#357a2e";
		const grassSeed = 42;

		for (let i = 0; i < 200; i++) {
			const gx = ((grassSeed * (i + 1) * 7) % 3000) - 500;
			const gy = ((grassSeed * (i + 1) * 13) % 2000) - 500;

			ctx.fillRect(gx, gy, 3, 3);
		}

		// Road surface
		ctx.strokeStyle = "#555";
		ctx.lineWidth = track.roadWidth;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.beginPath();
		ctx.moveTo(wp[0].x, wp[0].y);

		for (let i = 1; i < wp.length; i++) {
			ctx.lineTo(wp[i].x, wp[i].y);
		}

		ctx.closePath();
		ctx.stroke();

		// Road center dashes
		ctx.strokeStyle = "#777";
		ctx.lineWidth = 2;
		ctx.setLineDash([20, 20]);
		ctx.beginPath();
		ctx.moveTo(wp[0].x, wp[0].y);

		for (let i = 1; i < wp.length; i++) {
			ctx.lineTo(wp[i].x, wp[i].y);
		}

		ctx.closePath();
		ctx.stroke();
		ctx.setLineDash([]);

		// Road boundaries (white edges)
		this.drawBoundary(ctx, wp, track.roadWidth / 2, "#fff", 2);
		this.drawBoundary(ctx, wp, -track.roadWidth / 2, "#fff", 2);

		// Start/finish line
		this.drawStartLine(ctx, wp[0], wp[1], track.roadWidth);

		// Checkpoint markers (subtle)
		for (let i = 0; i < wp.length; i++) {
			if (i === 0) continue; // skip start line

			ctx.fillStyle = "rgba(255,255,0,0.15)";
			ctx.beginPath();
			ctx.arc(wp[i].x, wp[i].y, 8, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}

	private drawBoundary(
		ctx: CanvasRenderingContext2D,
		wp: TrackWaypoint[],
		offset: number,
		color: string,
		width: number,
	): void {
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		const pts = this.offsetPath(wp, offset);

		ctx.beginPath();
		ctx.moveTo(pts[0].x, pts[0].y);

		for (let i = 1; i < pts.length; i++) {
			ctx.lineTo(pts[i].x, pts[i].y);
		}

		ctx.closePath();
		ctx.stroke();
	}

	private offsetPath(wp: TrackWaypoint[], offset: number): TrackWaypoint[] {
		const result: TrackWaypoint[] = [];

		for (let i = 0; i < wp.length; i++) {
			const prev = wp[(i - 1 + wp.length) % wp.length];
			const next = wp[(i + 1) % wp.length];
			// Average normal
			const dx = next.x - prev.x;
			const dy = next.y - prev.y;
			const len = Math.hypot(dx, dy) || 1;
			const nx = -dy / len;
			const ny = dx / len;

			result.push({ x: wp[i].x + nx * offset, y: wp[i].y + ny * offset });
		}

		return result;
	}

	private drawStartLine(
		ctx: CanvasRenderingContext2D,
		start: TrackWaypoint,
		next: TrackWaypoint,
		roadWidth: number,
	): void {
		const dx = next.x - start.x;
		const dy = next.y - start.y;
		const len = Math.hypot(dx, dy) || 1;
		const nx = -dy / len;
		const ny = dx / len;
		const half = roadWidth / 2;

		// Checkered pattern
		const segments = 8;

		for (let i = 0; i < segments; i++) {
			const t = (i / segments) * 2 - 1; // -1 to 1
			const t2 = ((i + 1) / segments) * 2 - 1;
			const x1 = start.x + nx * half * t;
			const y1 = start.y + ny * half * t;
			const x2 = start.x + nx * half * t2;
			const y2 = start.y + ny * half * t2;

			ctx.strokeStyle = i % 2 === 0 ? "#fff" : "#222";
			ctx.lineWidth = 6;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}
	}
}
