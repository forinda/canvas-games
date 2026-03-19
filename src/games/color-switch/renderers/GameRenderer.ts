import type { Renderable } from "@shared/Renderable";
import type { ColorSwitchState } from "../types";
import {
	GAME_COLORS,
	GATE_RING_OUTER,
	GATE_RING_INNER,
	GATE_BAR_WIDTH,
	GATE_BAR_HEIGHT,
	GATE_SQUARE_SIZE,
	SWITCHER_RADIUS,
} from "../types";

export class GameRenderer implements Renderable<ColorSwitchState> {
	render(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
		const { canvasW, canvasH } = state;

		// Dark background
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, canvasW, canvasH);

		// Subtle grid pattern
		this.drawBackground(ctx, state);

		ctx.save();
		// Apply camera offset
		ctx.translate(0, state.cameraY);

		// Draw gates
		for (const gate of state.gates) {
			this.drawGate(ctx, gate, canvasW);
		}

		// Draw color switchers
		for (const sw of state.switchers) {
			if (!sw.consumed) {
				this.drawSwitcher(ctx, sw);
			}
		}

		// Draw ball
		this.drawBall(ctx, state);

		ctx.restore();

		// Death flash
		if (state.flashTimer > 0) {
			const alpha = state.flashTimer / 200;

			ctx.fillStyle = `rgba(255, 50, 50, ${alpha * 0.5})`;
			ctx.fillRect(0, 0, canvasW, canvasH);
		}
	}

	private drawBackground(
		ctx: CanvasRenderingContext2D,
		state: ColorSwitchState,
	): void {
		const { canvasW, canvasH } = state;

		ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
		ctx.lineWidth = 1;
		const gridSize = 40;
		const offsetY = ((state.cameraY % gridSize) + gridSize) % gridSize;

		for (let x = 0; x < canvasW; x += gridSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvasH);
			ctx.stroke();
		}

		for (let y = offsetY; y < canvasH + gridSize; y += gridSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(canvasW, y);
			ctx.stroke();
		}
	}

	private drawGate(
		ctx: CanvasRenderingContext2D,
		gate: {
			type: string;
			y: number;
			rotation: number;
			colors: string[];
			scored: boolean;
		},
		canvasW: number,
	): void {
		const cx = canvasW / 2;

		if (gate.type === "ring") {
			this.drawRingGate(ctx, cx, gate.y, gate.rotation, gate.colors);
		} else if (gate.type === "bar") {
			this.drawBarGate(ctx, cx, gate.y, gate.rotation, gate.colors);
		} else if (gate.type === "square") {
			this.drawSquareGate(ctx, cx, gate.y, gate.rotation, gate.colors);
		}
	}

	private drawRingGate(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		rotation: number,
		colors: string[],
	): void {
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(rotation);

		// Draw 4 colored quadrants
		for (let i = 0; i < 4; i++) {
			const startAngle = (i * Math.PI) / 2;
			const endAngle = ((i + 1) * Math.PI) / 2;

			ctx.beginPath();
			ctx.arc(0, 0, GATE_RING_OUTER, startAngle, endAngle);
			ctx.arc(0, 0, GATE_RING_INNER, endAngle, startAngle, true);
			ctx.closePath();
			ctx.fillStyle = colors[i];
			ctx.fill();

			// Subtle border between sections
			ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		ctx.restore();
	}

	private drawBarGate(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		rotation: number,
		colors: string[],
	): void {
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(rotation);

		const halfW = GATE_BAR_WIDTH / 2;
		const halfH = GATE_BAR_HEIGHT / 2;
		const sectionW = GATE_BAR_WIDTH / 4;

		for (let i = 0; i < 4; i++) {
			ctx.fillStyle = colors[i];
			ctx.fillRect(-halfW + i * sectionW, -halfH, sectionW, GATE_BAR_HEIGHT);

			ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
			ctx.lineWidth = 1;
			ctx.strokeRect(-halfW + i * sectionW, -halfH, sectionW, GATE_BAR_HEIGHT);
		}

		// Rounded ends
		ctx.beginPath();
		ctx.fillStyle = colors[0];
		ctx.arc(-halfW, 0, halfH, Math.PI / 2, Math.PI * 1.5);
		ctx.fill();
		ctx.beginPath();
		ctx.fillStyle = colors[3];
		ctx.arc(halfW, 0, halfH, -Math.PI / 2, Math.PI / 2);
		ctx.fill();

		ctx.restore();
	}

	private drawSquareGate(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		rotation: number,
		colors: string[],
	): void {
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(rotation);

		const halfSize = GATE_SQUARE_SIZE / 2;
		const thickness = 18;

		// Top side
		ctx.fillStyle = colors[0];
		ctx.fillRect(-halfSize, -halfSize, GATE_SQUARE_SIZE, thickness);

		// Right side
		ctx.fillStyle = colors[1];
		ctx.fillRect(halfSize - thickness, -halfSize, thickness, GATE_SQUARE_SIZE);

		// Bottom side
		ctx.fillStyle = colors[2];
		ctx.fillRect(-halfSize, halfSize - thickness, GATE_SQUARE_SIZE, thickness);

		// Left side
		ctx.fillStyle = colors[3];
		ctx.fillRect(-halfSize, -halfSize, thickness, GATE_SQUARE_SIZE);

		// Border
		ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
		ctx.lineWidth = 2;
		ctx.strokeRect(-halfSize, -halfSize, GATE_SQUARE_SIZE, GATE_SQUARE_SIZE);

		ctx.restore();
	}

	private drawSwitcher(
		ctx: CanvasRenderingContext2D,
		sw: { x: number; y: number; radius: number; rotation: number },
	): void {
		ctx.save();
		ctx.translate(sw.x, sw.y);
		ctx.rotate(sw.rotation);

		const r = SWITCHER_RADIUS;

		// Draw rainbow circle with 4 color segments
		for (let i = 0; i < 4; i++) {
			const startAngle = (i * Math.PI) / 2;
			const endAngle = ((i + 1) * Math.PI) / 2;

			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.arc(0, 0, r, startAngle, endAngle);
			ctx.closePath();
			ctx.fillStyle = GAME_COLORS[i];
			ctx.fill();
		}

		// White center dot
		ctx.beginPath();
		ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
		ctx.fillStyle = "#fff";
		ctx.fill();

		// Glow
		ctx.shadowColor = "#ffffff";
		ctx.shadowBlur = 12;
		ctx.beginPath();
		ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
		ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.shadowBlur = 0;

		ctx.restore();
	}

	private drawBall(
		ctx: CanvasRenderingContext2D,
		state: ColorSwitchState,
	): void {
		const ball = state.ball;

		ctx.save();
		ctx.translate(ball.x, ball.y);

		// Glow effect
		ctx.shadowColor = ball.color;
		ctx.shadowBlur = 20;

		// Ball body
		ctx.beginPath();
		ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
		ctx.fillStyle = ball.color;
		ctx.fill();

		// Inner highlight
		ctx.shadowBlur = 0;
		ctx.beginPath();
		ctx.arc(
			-ball.radius * 0.25,
			-ball.radius * 0.25,
			ball.radius * 0.45,
			0,
			Math.PI * 2,
		);
		ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
		ctx.fill();

		// Border
		ctx.beginPath();
		ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
		ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
		ctx.lineWidth = 2;
		ctx.stroke();

		ctx.restore();
	}
}
