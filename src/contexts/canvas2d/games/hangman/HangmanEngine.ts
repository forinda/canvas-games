import type { HangmanState } from "./types";
import type { GameHelp } from "@core/GameInterface";
import { HS_KEY_WINS, HS_KEY_LOSSES } from "./types";
import { getRandomWord } from "./data/words";
import { InputSystem } from "./systems/InputSystem";
import { GameSystem } from "./systems/GameSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";

const HELP: GameHelp = {
	goal: "Guess the hidden word one letter at a time before the hangman is complete.",
	controls: [
		{ key: "A-Z", action: "Guess a letter" },
		{ key: "Click keyboard", action: "Guess a letter" },
		{ key: "Space / Enter", action: "Play again after win/loss" },
		{ key: "H", action: "Toggle help" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Start with common vowels: E, A, I, O",
		"The category hint narrows down the possibilities",
		"You get 6 wrong guesses before the game is over",
	],
};

export class HangmanEngine {
	private ctx: CanvasRenderingContext2D;
	private state: HangmanState;
	private running: boolean;
	private rafId: number;

	private inputSystem: InputSystem;
	private gameSystem: GameSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		let wins = 0;
		let losses = 0;

		try {
			wins = parseInt(localStorage.getItem(HS_KEY_WINS) ?? "0", 10) || 0;
			losses = parseInt(localStorage.getItem(HS_KEY_LOSSES) ?? "0", 10) || 0;
		} catch {
			/* noop */
		}

		const entry = getRandomWord();

		this.state = {
			word: entry.word,
			category: entry.category,
			guessedLetters: new Set<string>(),
			wrongGuesses: [],
			phase: "playing",
			wins,
			losses,
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
		};

		this.gameSystem = new GameSystem();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			onExit,
			() => this.reset(),
			(letter: string) => this.handleGuess(letter),
			() => this.helpOverlay.toggle(),
		);

		this.gameRenderer = new GameRenderer(this.inputSystem);
		this.hudRenderer = new HUDRenderer();

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.canvasWidth = canvas.width;
			this.state.canvasHeight = canvas.height;
		};

		this.inputSystem.attach();
		window.addEventListener("resize", this.resizeHandler);
	}

	start(): void {
		this.running = true;
		this.loop();
	}

	destroy(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		this.inputSystem.detach();
		window.removeEventListener("resize", this.resizeHandler);
	}

	private loop(): void {
		if (!this.running) return;

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private render(): void {
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
		this.helpOverlay.render(this.ctx, HELP, "Hangman", "#8d6e63");
	}

	private handleGuess(letter: string): void {
		this.gameSystem.processGuess(this.state, letter);
		this.persistStats();
	}

	private reset(): void {
		const entry = getRandomWord();

		this.state.word = entry.word;
		this.state.category = entry.category;
		this.state.guessedLetters = new Set<string>();
		this.state.wrongGuesses = [];
		this.state.phase = "playing";
	}

	private persistStats(): void {
		try {
			localStorage.setItem(HS_KEY_WINS, String(this.state.wins));
			localStorage.setItem(HS_KEY_LOSSES, String(this.state.losses));
		} catch {
			/* noop */
		}
	}
}
