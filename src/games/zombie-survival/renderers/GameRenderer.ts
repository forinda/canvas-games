import type { Renderable } from "@shared/Renderable.ts";
import type { GameState } from "../types.ts";
import {
	ARENA_W,
	ARENA_H,
	PLAYER_RADIUS,
	BARRICADE_SIZE,
	FLASHLIGHT_RANGE,
	FLASHLIGHT_ANGLE,
	BULLET_RADIUS,
} from "../types.ts";
import { ZOMBIE_DEFS } from "../data/zombies.ts";

export class GameRenderer implements Renderable<GameState> {
	render(ctx: CanvasRenderingContext2D, state: GameState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		// Compute scale and offset to fit arena
		const scale = Math.min(W / ARENA_W, H / ARENA_H);
		const offsetX = (W - ARENA_W * scale) / 2;
		const offsetY = (H - ARENA_H * scale) / 2;

		ctx.save();
		ctx.translate(offsetX, offsetY);
		ctx.scale(scale, scale);

		// ─── Background ──────────────────────────────────
		this.drawBackground(ctx, state);

		// ─── Barricades ──────────────────────────────────
		this.drawBarricades(ctx, state);

		// ─── Bullets ─────────────────────────────────────
		this.drawBullets(ctx, state);

		// ─── Zombies ─────────────────────────────────────
		this.drawZombies(ctx, state);

		// ─── Player ──────────────────────────────────────
		this.drawPlayer(ctx, state);

		// ─── Particles ───────────────────────────────────
		this.drawParticles(ctx, state);

		// ─── Flashlight darkness overlay (night only) ────
		if (state.timeOfDay === "night") {
			this.drawFlashlightOverlay(ctx, state);
		}

		ctx.restore();
	}

	private drawBackground(
		ctx: CanvasRenderingContext2D,
		state: GameState,
	): void {
		if (state.timeOfDay === "day") {
			ctx.fillStyle = "#1a2a1a";
		} else {
			ctx.fillStyle = "#0a0e0a";
		}

		ctx.fillRect(0, 0, ARENA_W, ARENA_H);

		// Grid lines (subtle)
		ctx.strokeStyle =
			state.timeOfDay === "day"
				? "rgba(255,255,255,0.03)"
				: "rgba(255,255,255,0.015)";
		ctx.lineWidth = 1;
		const gridSize = 50;

		for (let x = 0; x <= ARENA_W; x += gridSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, ARENA_H);
			ctx.stroke();
		}

		for (let y = 0; y <= ARENA_H; y += gridSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(ARENA_W, y);
			ctx.stroke();
		}

		// Arena border
		ctx.strokeStyle = state.timeOfDay === "day" ? "#2d5a2d" : "#1a1a2e";
		ctx.lineWidth = 3;
		ctx.strokeRect(0, 0, ARENA_W, ARENA_H);
	}

	private drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
		const p = state.player;

		// Blink when invincible
		if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 10) % 2 === 0)
			return;

		ctx.save();
		ctx.translate(p.x, p.y);

		// Body
		ctx.fillStyle = "#3498db";
		ctx.beginPath();
		ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
		ctx.fill();

		// Direction indicator (gun barrel)
		ctx.strokeStyle = "#ecf0f1";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(
			Math.cos(p.angle) * (PLAYER_RADIUS + 8),
			Math.sin(p.angle) * (PLAYER_RADIUS + 8),
		);
		ctx.stroke();

		// Eyes
		const eyeOffset = 5;
		const eyeAngle1 = p.angle - 0.3;
		const eyeAngle2 = p.angle + 0.3;

		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(
			Math.cos(eyeAngle1) * eyeOffset,
			Math.sin(eyeAngle1) * eyeOffset,
			2.5,
			0,
			Math.PI * 2,
		);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(
			Math.cos(eyeAngle2) * eyeOffset,
			Math.sin(eyeAngle2) * eyeOffset,
			2.5,
			0,
			Math.PI * 2,
		);
		ctx.fill();

		ctx.restore();
	}

	private drawZombies(ctx: CanvasRenderingContext2D, state: GameState): void {
		for (const z of state.zombies) {
			if (z.dead) continue;

			const def = ZOMBIE_DEFS[z.type];

			ctx.save();
			ctx.translate(z.x, z.y);

			// Body
			ctx.fillStyle = def.color;
			ctx.beginPath();
			ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
			ctx.fill();

			// Outline
			ctx.strokeStyle = "rgba(0,0,0,0.5)";
			ctx.lineWidth = 1.5;
			ctx.stroke();

			// HP bar (if damaged)
			if (z.hp < z.maxHp) {
				const barW = z.radius * 2.2;
				const barH = 3;
				const barY = -z.radius - 7;

				ctx.fillStyle = "#333";
				ctx.fillRect(-barW / 2, barY, barW, barH);
				ctx.fillStyle =
					z.hp > z.maxHp * 0.5
						? "#2ecc71"
						: z.hp > z.maxHp * 0.25
							? "#f1c40f"
							: "#e74c3c";
				ctx.fillRect(-barW / 2, barY, barW * (z.hp / z.maxHp), barH);
			}

			// Type indicator for tank
			if (z.type === "tank") {
				ctx.fillStyle = "rgba(255,255,255,0.3)";
				ctx.beginPath();
				ctx.arc(0, 0, z.radius * 0.5, 0, Math.PI * 2);
				ctx.fill();
			}

			ctx.restore();
		}
	}

	private drawBullets(ctx: CanvasRenderingContext2D, state: GameState): void {
		ctx.fillStyle = "#f1c40f";

		for (const b of state.bullets) {
			if (b.dead) continue;

			ctx.beginPath();
			ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	private drawBarricades(
		ctx: CanvasRenderingContext2D,
		state: GameState,
	): void {
		for (const b of state.barricades) {
			if (b.dead) continue;

			const half = BARRICADE_SIZE / 2;

			// Wooden barricade look
			ctx.fillStyle = "#8B4513";
			ctx.fillRect(b.x - half, b.y - half, BARRICADE_SIZE, BARRICADE_SIZE);

			// Cross planks
			ctx.strokeStyle = "#A0522D";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(b.x - half + 4, b.y - half + 4);
			ctx.lineTo(b.x + half - 4, b.y + half - 4);
			ctx.moveTo(b.x + half - 4, b.y - half + 4);
			ctx.lineTo(b.x - half + 4, b.y + half - 4);
			ctx.stroke();

			// Border
			ctx.strokeStyle = "#5D3A1A";
			ctx.lineWidth = 2;
			ctx.strokeRect(b.x - half, b.y - half, BARRICADE_SIZE, BARRICADE_SIZE);

			// HP bar
			if (b.hp < b.maxHp) {
				const barW = BARRICADE_SIZE;
				const barH = 3;
				const barY = b.y - half - 6;

				ctx.fillStyle = "#333";
				ctx.fillRect(b.x - half, barY, barW, barH);
				ctx.fillStyle = b.hp > b.maxHp * 0.5 ? "#2ecc71" : "#e74c3c";
				ctx.fillRect(b.x - half, barY, barW * (b.hp / b.maxHp), barH);
			}
		}
	}

	private drawParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
		for (const p of state.particles) {
			ctx.globalAlpha = Math.max(0, p.alpha);
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.globalAlpha = 1;
	}

	private drawFlashlightOverlay(
		ctx: CanvasRenderingContext2D,
		state: GameState,
	): void {
		const p = state.player;

		// Create darkness with flashlight cone cut out
		ctx.save();
		ctx.globalCompositeOperation = "source-over";

		// Dark overlay
		ctx.fillStyle = "rgba(0,0,0,0.75)";
		ctx.beginPath();
		ctx.rect(0, 0, ARENA_W, ARENA_H);

		// Cut out flashlight cone using even-odd rule
		ctx.moveTo(p.x, p.y);
		const startAngle = p.angle - FLASHLIGHT_ANGLE;
		const endAngle = p.angle + FLASHLIGHT_ANGLE;

		ctx.arc(p.x, p.y, FLASHLIGHT_RANGE, startAngle, endAngle);
		ctx.closePath();

		// Also cut out a small circle around the player (ambient glow)
		ctx.moveTo(p.x + 40, p.y);
		ctx.arc(p.x, p.y, 40, 0, Math.PI * 2, true);

		ctx.fill("evenodd");

		// Flashlight cone glow
		const gradient = ctx.createRadialGradient(
			p.x,
			p.y,
			0,
			p.x,
			p.y,
			FLASHLIGHT_RANGE,
		);

		gradient.addColorStop(0, "rgba(255,255,200,0.06)");
		gradient.addColorStop(1, "rgba(255,255,200,0)");

		ctx.globalCompositeOperation = "lighter";
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.moveTo(p.x, p.y);
		ctx.arc(p.x, p.y, FLASHLIGHT_RANGE, startAngle, endAngle);
		ctx.closePath();
		ctx.fill();

		ctx.restore();
	}
}
