import type { InputHandler } from "@core/InputHandler";
import type { BalloonState, PopParticle } from "../types";
import {
	BASE_POINTS,
	SIZE_BONUS_FACTOR,
	BALLOON_RADIUS_MAX,
	COMBO_WINDOW,
	HS_KEY,
} from "../types";

export class InputSystem implements InputHandler {
	private state: BalloonState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;
	private onReset: () => void;
	private keyHandler: (e: KeyboardEvent) => void;
	private clickHandler: (e: MouseEvent) => void;
	private touchHandler: (e: TouchEvent) => void;

	constructor(
		state: BalloonState,
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
		this.touchHandler = (e: TouchEvent) => this.handleTouch(e);
	}

	attach(): void {
		window.addEventListener("keydown", this.keyHandler);
		this.canvas.addEventListener("click", this.clickHandler);
		this.canvas.addEventListener("touchstart", this.touchHandler, {
			passive: false,
		});
	}

	detach(): void {
		window.removeEventListener("keydown", this.keyHandler);
		this.canvas.removeEventListener("click", this.clickHandler);
		this.canvas.removeEventListener("touchstart", this.touchHandler);
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

	private handleTouch(e: TouchEvent): void {
		e.preventDefault();
		const touch = e.touches[0];

		if (!touch) return;

		this.processPointer(touch.clientX, touch.clientY);
	}

	private handleClick(e: MouseEvent): void {
		this.processPointer(e.clientX, e.clientY);
	}

	private processPointer(clientX: number, clientY: number): void {
		const s = this.state;
		const rect = this.canvas.getBoundingClientRect();
		const mx = (clientX - rect.left) * (this.canvas.width / rect.width);
		const my = (clientY - rect.top) * (this.canvas.height / rect.height);

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

		// Check balloons from front (last drawn) to back
		let hitAny = false;

		for (let i = s.balloons.length - 1; i >= 0; i--) {
			const b = s.balloons[i];

			if (b.popped) continue;

			const dx = mx - b.x;
			const dy = my - b.y;

			if (dx * dx + dy * dy <= b.radius * b.radius) {
				// Pop!
				b.popped = true;
				hitAny = true;

				// Score — smaller balloons = more points
				const sizeBonus = Math.round(
					SIZE_BONUS_FACTOR * (BALLOON_RADIUS_MAX - b.radius),
				);
				const comboMultiplier = Math.min(s.combo + 1, 10);
				const points = (BASE_POINTS + sizeBonus) * comboMultiplier;

				s.score += points;

				// Combo
				s.combo += 1;
				s.comboTimer = COMBO_WINDOW;

				if (s.combo > s.maxCombo) s.maxCombo = s.combo;

				// High score
				if (s.score > s.highScore) {
					s.highScore = s.score;

					try {
						localStorage.setItem(HS_KEY, String(s.highScore));
					} catch {
						/* noop */
					}
				}

				// Spawn pop particles
				this.spawnPopParticles(b.x, b.y, b.color, b.radius);

				break; // Only pop one balloon per click
			}
		}

		if (!hitAny) {
			// Miss resets combo
			s.combo = 0;
			s.comboTimer = 0;
		}
	}

	private spawnPopParticles(
		x: number,
		y: number,
		color: string,
		radius: number,
	): void {
		const count = Math.floor(8 + radius * 0.3);

		for (let i = 0; i < count; i++) {
			const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
			const speed = 100 + Math.random() * 180;
			const particle: PopParticle = {
				x: x,
				y: y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				life: 400 + Math.random() * 300,
				color: color,
				size: 3 + Math.random() * 5,
			};

			this.state.particles.push(particle);
		}
	}
}
