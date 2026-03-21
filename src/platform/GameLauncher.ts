import type { GameDefinition, GameInstance } from "@shared/GameInterface";
import { GAME_REGISTRY, getAllGames } from "./GameRegistry";
import { PlatformMenu } from "./PlatformMenu";

const EXIT_BTN_SIZE = 44;
const EXIT_BTN_MARGIN = 8;

export class GameLauncher {
	private canvas: HTMLCanvasElement;
	private currentGame: GameInstance | null = null;
	private menu: PlatformMenu;
	private resizeHandler: () => void;

	// Mobile exit button
	private isTouchDevice: boolean;
	private exitTouchHandler: ((e: TouchEvent) => void) | null = null;
	private exitRafId = 0;
	private showExitButton = false;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.menu = new PlatformMenu(canvas, (game) => this.launchGame(game));
		this.resizeHandler = () => this.handleResize();
		this.isTouchDevice =
			"ontouchstart" in window || navigator.maxTouchPoints > 0;
		window.addEventListener("resize", this.resizeHandler);
		this.handleResize();
	}

	private handleResize(): void {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
	}

	start(): void {
		this.showMenu();
	}

	private showMenu(): void {
		this.detachExitButton();

		if (this.currentGame) {
			this.currentGame.destroy();
			this.currentGame = null;
		}

		this.handleResize();
		this.canvas.style.cursor = "default";
		this.menu.show(GAME_REGISTRY, getAllGames());
	}

	private launchGame(game: GameDefinition): void {
		this.menu.hide();
		this.handleResize();
		this.canvas.style.cursor = "crosshair";

		// Show loading indicator
		const ctx = this.canvas.getContext("2d");

		if (ctx) {
			ctx.fillStyle = "#0a0a1a";
			ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
			ctx.font = "bold 24px monospace";
			ctx.fillStyle = game.color;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(
				`${game.icon} Loading ${game.name}...`,
				this.canvas.width / 2,
				this.canvas.height / 2,
			);
		}

		const result = game.create(this.canvas, () => this.showMenu());

		if (result instanceof Promise) {
			result.then((instance) => {
				this.currentGame = instance;
				this.attachExitButton();
			});
		} else {
			this.currentGame = result;
			this.attachExitButton();
		}
	}

	// ── Mobile exit button ───────────────────────────────────────────────

	private attachExitButton(): void {
		if (!this.isTouchDevice) return;

		this.showExitButton = true;

		this.exitTouchHandler = (e: TouchEvent) => {
			if (e.touches.length !== 1) return;

			const touch = e.touches[0];
			const rect = this.canvas.getBoundingClientRect();
			const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
			const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);

			if (
				x >= EXIT_BTN_MARGIN &&
				x <= EXIT_BTN_MARGIN + EXIT_BTN_SIZE &&
				y >= EXIT_BTN_MARGIN &&
				y <= EXIT_BTN_MARGIN + EXIT_BTN_SIZE
			) {
				e.preventDefault();
				e.stopPropagation();
				this.showMenu();
			}
		};

		// Use capture phase so it fires before game touch handlers
		this.canvas.addEventListener("touchstart", this.exitTouchHandler, {
			capture: true,
		});

		this.renderExitButton();
	}

	private detachExitButton(): void {
		this.showExitButton = false;
		cancelAnimationFrame(this.exitRafId);

		if (this.exitTouchHandler) {
			this.canvas.removeEventListener("touchstart", this.exitTouchHandler, {
				capture: true,
			});
			this.exitTouchHandler = null;
		}
	}

	private renderExitButton(): void {
		if (!this.showExitButton || !this.currentGame) return;

		const ctx = this.canvas.getContext("2d");

		if (ctx) {
			const x = EXIT_BTN_MARGIN;
			const y = EXIT_BTN_MARGIN;
			const size = EXIT_BTN_SIZE;

			// Button background
			ctx.save();
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = "#000";
			ctx.beginPath();
			ctx.roundRect(x, y, size, size, 8);
			ctx.fill();

			// Border
			ctx.globalAlpha = 0.4;
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.roundRect(x, y, size, size, 8);
			ctx.stroke();

			// "X" icon
			ctx.globalAlpha = 0.7;
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 2.5;
			ctx.lineCap = "round";
			const pad = 14;

			ctx.beginPath();
			ctx.moveTo(x + pad, y + pad);
			ctx.lineTo(x + size - pad, y + size - pad);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(x + size - pad, y + pad);
			ctx.lineTo(x + pad, y + size - pad);
			ctx.stroke();

			ctx.restore();
		}

		this.exitRafId = requestAnimationFrame(() => this.renderExitButton());
	}
}
