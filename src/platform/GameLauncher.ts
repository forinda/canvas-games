import type { GameDefinition, GameInstance } from "@shared/GameInterface";
import { GAME_REGISTRY, getAllGames } from "./GameRegistry";
import { PlatformMenu } from "./PlatformMenu";

export class GameLauncher {
	private canvas: HTMLCanvasElement;
	private currentGame: GameInstance | null = null;
	private menu: PlatformMenu;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.menu = new PlatformMenu(canvas, (game) => this.launchGame(game));
		this.resizeHandler = () => this.handleResize();
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
			});
		} else {
			this.currentGame = result;
		}
	}
}
