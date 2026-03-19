import type { ReactionState } from "./types";
import { MIN_DELAY_MS, MAX_DELAY_MS, LS_BEST_KEY } from "./types";
import { InputSystem } from "./systems/InputSystem";
import { TimerSystem } from "./systems/TimerSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { HelpOverlay } from "@shared/HelpOverlay";
import type { GameHelp } from "@shared/GameInterface";

const HELP: GameHelp = {
	goal: "React as fast as you can when the screen turns green.",
	controls: [
		{ key: "Click / Space", action: "React (click when green)" },
		{ key: "H", action: "Toggle help overlay" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Wait for the red screen to turn green before clicking",
		'Clicking while red counts as "too early"',
		"Your best time is saved to localStorage",
	],
};

export class ReactionEngine {
	private ctx: CanvasRenderingContext2D;
	private state: ReactionState;
	private running: boolean;
	private rafId: number;

	private inputSystem: InputSystem;
	private timerSystem: TimerSystem;
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

		let bestAllTime = 0;

		try {
			bestAllTime = parseInt(localStorage.getItem(LS_BEST_KEY) ?? "0", 10) || 0;
		} catch {
			/* noop */
		}

		const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);

		this.state = {
			phase: "waiting",
			greenAt: 0,
			scheduledDelay: delay,
			waitStartedAt: performance.now(),
			reactionMs: 0,
			attempts: [],
			round: 1,
			finished: false,
			bestAllTime: bestAllTime,
			helpVisible: false,
		};

		this.inputSystem = new InputSystem(this.state, canvas, onExit);
		this.timerSystem = new TimerSystem();
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
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

		this.timerSystem.update(this.state, 0);

		// Sync help overlay visibility
		if (this.helpOverlay.visible !== this.state.helpVisible) {
			if (this.state.helpVisible) {
				this.helpOverlay.show();
			} else {
				this.helpOverlay.hide();
			}
		}

		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
		this.helpOverlay.render(this.ctx, HELP, "Reaction Timer", "#ff5722");

		this.rafId = requestAnimationFrame(() => this.loop());
	}
}
