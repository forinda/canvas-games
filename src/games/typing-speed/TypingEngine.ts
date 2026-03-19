import type { TypingState } from "./types";
import { MAX_LIVES, INITIAL_SPAWN_INTERVAL } from "./types";
import { InputSystem } from "./systems/InputSystem";
import { WordSystem } from "./systems/WordSystem";
import { TypingSystem } from "./systems/TypingSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@shared/GameInterface";

const GAME_HELP: GameHelp = {
	goal: "Type falling words before they reach the bottom. Survive as long as you can!",
	controls: [
		{ key: "A-Z", action: "Type letters to match words" },
		{ key: "Backspace", action: "Delete last typed letter" },
		{ key: "P", action: "Pause / Resume" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "ESC", action: "Exit to menu" },
		{ key: "Space / Enter", action: "Restart after game over" },
	],
	tips: [
		"Words auto-target — type the first letter to lock on",
		"Longer words give more points",
		"Speed and spawn rate increase over time",
		"Focus on words closest to the bottom first",
	],
};

export class TypingEngine {
	private ctx: CanvasRenderingContext2D;
	private state: TypingState;
	private running: boolean;
	private rafId: number;
	private lastTime: number;

	private inputSystem: InputSystem;
	private wordSystem: WordSystem;
	private typingSystem: TypingSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;
		this.lastTime = 0;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.state = this.createInitialState(canvas.width, canvas.height);

		// Systems
		this.wordSystem = new WordSystem();
		this.typingSystem = new TypingSystem();
		this.helpOverlay = new HelpOverlay();
		this.inputSystem = new InputSystem(
			this.state,
			onExit,
			() => this.reset(),
			(char: string) => this.handleType(char),
			() => this.handleBackspace(),
			() => this.helpOverlay.toggle(),
			() => this.helpOverlay.visible,
		);
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();

		// Resize handler
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.canvasWidth = canvas.width;
			this.state.canvasHeight = canvas.height;
		};

		this.inputSystem.attach();
		window.addEventListener("resize", this.resizeHandler);

		// Spawn a couple of initial words
		this.wordSystem.spawnWord(this.state);
		this.wordSystem.spawnWord(this.state);
	}

	start(): void {
		this.running = true;
		this.lastTime = performance.now();
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

		const now = performance.now();
		const dt = Math.min(now - this.lastTime, 100);

		this.lastTime = now;

		if (this.state.started && !this.state.paused && !this.state.gameOver) {
			this.state.elapsedTime = now - this.state.startTime;
			this.wordSystem.update(this.state, dt);
		}

		this.render();
		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private render(): void {
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
		this.helpOverlay.render(this.ctx, GAME_HELP, "Typing Speed", "#00897b");
	}

	private handleType(char: string): void {
		this.typingSystem.handleType(this.state, char);
	}

	private handleBackspace(): void {
		this.typingSystem.handleBackspace(this.state);
	}

	private reset(): void {
		const w = this.state.canvasWidth;
		const h = this.state.canvasHeight;
		const newState = this.createInitialState(w, h);

		newState.started = true;
		newState.startTime = performance.now();
		Object.assign(this.state, newState);

		// Spawn initial words
		this.wordSystem.spawnWord(this.state);
		this.wordSystem.spawnWord(this.state);
	}

	private createInitialState(width: number, height: number): TypingState {
		return {
			words: [],
			activeWord: null,
			currentInput: "",
			score: 0,
			lives: MAX_LIVES,
			gameOver: false,
			paused: false,
			started: false,
			totalTyped: 0,
			correctTyped: 0,
			wordsCompleted: 0,
			startTime: 0,
			elapsedTime: 0,
			spawnTimer: 0,
			spawnInterval: INITIAL_SPAWN_INTERVAL,
			baseSpeed: 40,
			canvasWidth: width,
			canvasHeight: height,
		};
	}
}
