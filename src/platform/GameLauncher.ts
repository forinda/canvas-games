import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { GAME_REGISTRY, getAllGames } from "@core/registry/GameRegistry";
import { PlatformMenu } from "./PlatformMenu";

export class GameLauncher {
	private canvas: HTMLCanvasElement;
	private app: HTMLElement;
	private currentGame: GameInstance | null = null;
	private menu: PlatformMenu;
	private resizeHandler: () => void;

	// DOM overlays (work with any canvas context)
	private exitBtn: HTMLButtonElement | null = null;
	private loadingOverlay: HTMLDivElement | null = null;
	private isTouchDevice: boolean;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.app = canvas.parentElement ?? document.body;
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
		this.removeExitButton();
		this.removeLoadingOverlay();

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

		// If switching rendering contexts, replace the canvas
		const needsWebGL = game.renderContext === "webgl";
		const currentIs2D =
			this.canvas.getContext("2d") !== null ||
			!this.canvas.getContext("webgl2");

		if (needsWebGL && currentIs2D) {
			this.replaceCanvas();
		} else if (!needsWebGL) {
			// Ensure we have a 2D-compatible canvas
			// If previous game was WebGL, we need a fresh canvas
			const gl = (this.canvas as HTMLCanvasElement & { __webgl?: boolean })
				.__webgl;

			if (gl) {
				this.replaceCanvas();
			}
		}

		this.handleResize();
		this.canvas.style.cursor = "crosshair";

		// Show DOM loading overlay (works with any context)
		this.showLoadingOverlay(game);

		const result = game.create(this.canvas, () => this.showMenu());

		if (result instanceof Promise) {
			result.then((instance) => {
				this.currentGame = instance;
				this.removeLoadingOverlay();
				this.addExitButton();
			});
		} else {
			this.currentGame = result;
			this.removeLoadingOverlay();
			this.addExitButton();
		}
	}

	// ── Canvas management ────────────────────────────────────────────────

	private replaceCanvas(): void {
		const newCanvas = document.createElement("canvas");

		newCanvas.id = "gameCanvas";
		newCanvas.style.display = "block";
		this.canvas.replaceWith(newCanvas);
		this.canvas = newCanvas;

		// Re-bind menu to new canvas
		this.menu = new PlatformMenu(newCanvas, (game) => this.launchGame(game));
	}

	// ── DOM loading overlay ──────────────────────────────────────────────

	private showLoadingOverlay(game: GameDefinition): void {
		this.removeLoadingOverlay();

		const overlay = document.createElement("div");

		overlay.style.cssText = `
			position: fixed; inset: 0; z-index: 100;
			display: flex; align-items: center; justify-content: center;
			background: #0a0a1a; color: ${game.color};
			font: bold 24px monospace;
		`;
		overlay.textContent = `${game.icon} Loading ${game.name}...`;
		this.app.appendChild(overlay);
		this.loadingOverlay = overlay;
	}

	private removeLoadingOverlay(): void {
		this.loadingOverlay?.remove();
		this.loadingOverlay = null;
	}

	// ── DOM exit button (works with any canvas context) ──────────────────

	private addExitButton(): void {
		if (!this.isTouchDevice) return;

		this.removeExitButton();

		const btn = document.createElement("button");

		btn.textContent = "\u2715"; // ✕
		btn.setAttribute("aria-label", "Exit game");
		btn.style.cssText = `
			position: fixed; top: 8px; left: 8px; z-index: 50;
			width: 44px; height: 44px;
			background: rgba(0, 0, 0, 0.5);
			border: 1.5px solid rgba(255, 255, 255, 0.4);
			border-radius: 8px;
			color: rgba(255, 255, 255, 0.7);
			font-size: 20px; font-weight: bold;
			cursor: pointer; touch-action: manipulation;
			-webkit-tap-highlight-color: transparent;
		`;
		btn.addEventListener("click", () => this.showMenu());
		this.app.appendChild(btn);
		this.exitBtn = btn;
	}

	private removeExitButton(): void {
		this.exitBtn?.remove();
		this.exitBtn = null;
	}
}
