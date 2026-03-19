import type { InputHandler } from "@shared/InputHandler";
import type { WhackState } from "../types";
import {
	GRID_COLS,
	GRID_ROWS,
	MOLE_POINTS,
	BOMB_PENALTY,
	HS_KEY,
} from "../types";

export class InputSystem implements InputHandler {
	private state: WhackState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private onReset: () => void;
	private keyHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent) => void;

	constructor(
		state: WhackState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
		onReset: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;
		this.onReset = onReset;
		this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
		this.clickHandler = (e: MouseEvent) => this.handleClick(e);
	}

	attach(): void {
		window.addEventListener("keydown", this.keyHandler);
		this.canvas.addEventListener("click", this.clickHandler);
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyHandler);
		this.canvas.removeEventListener("click", this.clickHandler);
	}

	private handleKey(e: KeyboardEvent): void {
		const s = this.state;

		if (e.key === "Escape") {
			this.onExit();

			return;
		}

		if (e.key === "p" || e.key === "P") {
			if (s.phase === "playing") s.paused = !s.paused;

			return;
		}

		if (e.key === " " || e.key === "Enter") {
			if (s.phase === "ready") {
				s.phase = "playing";

				return;
			}

			if (s.phase === "gameover") {
				this.onReset();

				return;
			}
		}
	}

	private handleClick(e: MouseEvent): void {
		const s = this.state;
		const rect = this.canvas.getBoundingClientRect();
		const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
		const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
		const W = this.canvas.width;
		const H = this.canvas.height;

		// Exit button (top-left)
		if (mx < 80 && my < 40) {
			this.onExit();

			return;
		}

		if (s.phase === "ready") {
			s.phase = "playing";

			return;
		}

		if (s.phase === "gameover") {
			this.onReset();

			return;
		}

		if (s.paused) return;

		// Place hammer effect
		s.hammerEffect = { x: mx, y: my, timer: 150 };

		// Determine which hole was clicked
		const gridSize = Math.min(W * 0.8, H * 0.65);
		const cellW = gridSize / GRID_COLS;
		const cellH = gridSize / GRID_ROWS;
		const gridX = (W - gridSize) / 2;
		const gridY = (H - gridSize) / 2 + 40;

		const col = Math.floor((mx - gridX) / cellW);
		const row = Math.floor((my - gridY) / cellH);

		if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

		const idx = row * GRID_COLS + col;
		const hole = s.holes[idx];

		if ((hole.state === "rising" || hole.state === "up") && !hole.hit) {
			hole.hit = true;
			hole.state = "sinking";
			hole.timer = 0;

			// Spawn particles at hole center
			const px = gridX + col * cellW + cellW / 2;
			const py = gridY + row * cellH + cellH / 2;

			if (hole.isBomb) {
				// Bomb hit
				s.score = Math.max(0, s.score - BOMB_PENALTY);
				s.combo = 0;
				this.spawnParticles(px, py, "#ff4444", 12);
			} else {
				// Mole hit
				s.combo += 1;

				if (s.combo > s.maxCombo) s.maxCombo = s.combo;

				const multiplier = Math.min(s.combo, 5);

				s.score += MOLE_POINTS * multiplier;

				if (s.score > s.highScore) {
					s.highScore = s.score;

					try {
						localStorage.setItem(HS_KEY, String(s.highScore));
					} catch {
						/* noop */
					}
				}

				this.spawnParticles(px, py, "#4ade80", 8);
			}
		} else {
			// Missed — break combo
			s.combo = 0;
		}
	}

	private spawnParticles(
		x: number,
		y: number,
		color: string,
		count: number,
	): void {
		for (let i = 0; i < count; i++) {
			const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
			const speed = 80 + Math.random() * 120;

			this.state.particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				life: 400 + Math.random() * 200,
				color,
				size: 3 + Math.random() * 4,
			});
		}
	}
}
