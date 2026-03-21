import type { FishingState } from "./types";
import type { GameHelp } from "@core/GameInterface";
import { HelpOverlay } from "@shared/HelpOverlay";
import { InputSystem } from "./systems/InputSystem";
import { CastingSystem } from "./systems/CastingSystem";
import { FishingSystem } from "./systems/FishingSystem";
import { CatalogSystem } from "./systems/CatalogSystem";
import { SceneRenderer } from "./renderers/SceneRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export const FISHING_HELP: GameHelp = {
	goal: "Catch as many fish as possible and complete your catalog!",
	controls: [
		{ key: "SPACE (hold)", action: "Charge cast power" },
		{ key: "SPACE (release)", action: "Cast line" },
		{ key: "SPACE / Click", action: "Hook the fish when it bites" },
		{ key: "SPACE (hold)", action: "Reel in — manage tension!" },
		{ key: "C", action: "Toggle fish catalog" },
		{ key: "H", action: "Toggle help" },
		{ key: "ESC", action: "Exit to menu" },
	],
	tips: [
		"Longer casts reach deeper water with rarer fish",
		"Hook quickly when the bobber splashes — you only get 1.5s!",
		"Keep the tension bar in the green zone while reeling",
		"Legendary fish fight hard — tap SPACE in bursts to control tension",
		"Check your catalog with [C] to track your collection",
	],
};

export class FishingEngine {
	private ctx: CanvasRenderingContext2D;
	private state: FishingState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private inputSystem: InputSystem;
	private castingSystem: CastingSystem;
	private fishingSystem: FishingSystem;
	private catalogSystem: CatalogSystem;
	private sceneRenderer: SceneRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;
	private resizeHandler: () => void;

	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d")!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.state = this.createInitialState();

		// Systems
		this.castingSystem = new CastingSystem();
		this.fishingSystem = new FishingSystem();
		this.catalogSystem = new CatalogSystem();
		this.sceneRenderer = new SceneRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(
			this.state,
			canvas,
			onExit,
			() => {}, // reset (no-op for fishing)
			() => {
				this.state.showCatalog = !this.state.showCatalog;
			},
			() => {
				this.helpOverlay.toggle();
			},
		);

		// Load persisted catalog
		this.catalogSystem.load(this.state);

		// Resize
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.state.width = canvas.width;
			this.state.height = canvas.height;
		};

		this.inputSystem.attach();
		window.addEventListener("resize", this.resizeHandler);
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
		const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms

		this.lastTime = now;

		this.update(dt);
		this.render();

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private update(dt: number): void {
		const s = this.state;

		s.time += dt;
		s.waterOffset += dt * 40;

		if (s.paused || s.showCatalog || this.helpOverlay.visible) return;

		// Update catch popup timer
		if (s.catchPopupTimer > 0) {
			s.catchPopupTimer -= dt;
		}

		// Track previous phase to detect catch
		const prevCatch = s.lastCatch;
		const prevPhase = s.phase;

		this.castingSystem.update(s, dt);
		this.fishingSystem.update(s, dt);

		// Detect new catch (phase went to idle and lastCatch changed)
		if (
			s.lastCatch &&
			s.lastCatch !== prevCatch &&
			s.phase === "idle" &&
			prevPhase === "reeling"
		) {
			this.catalogSystem.recordCatch(s, s.lastCatch);
		}

		// Update bobber animation time during waiting/hooking
		if (s.phase === "waiting" || s.phase === "hooking") {
			s.bobberBobTime += dt;
		}
	}

	private render(): void {
		const ctx = this.ctx;

		ctx.clearRect(0, 0, this.state.width, this.state.height);

		this.sceneRenderer.render(ctx, this.state);
		this.hudRenderer.render(ctx, this.state);
		this.helpOverlay.render(ctx, FISHING_HELP, "Fishing", "#0288d1");
	}

	private createInitialState(): FishingState {
		return {
			phase: "idle",
			width: this.canvas.width,
			height: this.canvas.height,

			castPower: 0,
			castCharging: false,
			castDistance: 0,

			waitTimer: 0,
			waitElapsed: 0,
			bobberX: 0,
			bobberY: 0,
			bobberBobTime: 0,
			fishBiting: false,

			hookWindowTimer: 0,
			hookWindowDuration: 1.5,
			hookSuccess: false,

			reelTension: 0.5,
			reelProgress: 0,
			reelHolding: false,
			currentFish: null,
			currentFishSize: 0,
			fishFightTimer: 0,
			fishFightDir: 1,

			lastCatch: null,
			catchPopupTimer: 0,

			catalog: new Map(),
			totalScore: 0,
			totalCaught: 0,

			paused: false,
			showCatalog: false,
			time: 0,

			waterOffset: 0,
		};
	}
}
