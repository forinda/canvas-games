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
		this.currentGame = game.create(this.canvas, () => this.showMenu());
	}
}
