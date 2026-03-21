import type { GameState } from "./types.ts";
import { ARENA_W, ARENA_H, MAX_AMMO, DAY_DURATION } from "./types.ts";

import { InputSystem } from "./systems/InputSystem.ts";
import { PlayerSystem } from "./systems/PlayerSystem.ts";
import { ZombieSystem } from "./systems/ZombieSystem.ts";
import { CombatSystem } from "./systems/CombatSystem.ts";
import { WaveSystem } from "./systems/WaveSystem.ts";
import { GameRenderer } from "./renderers/GameRenderer.ts";
import { HUDRenderer } from "./renderers/HUDRenderer.ts";
import { HelpOverlay } from "@shared/HelpOverlay.ts";
import type { GameHelp } from "@core/GameInterface";

const GAME_HELP: GameHelp = {
	goal: "Survive as many zombie waves as possible. Day = scavenge, Night = fight!",
	controls: [
		{ key: "W/A/S/D", action: "Move player" },
		{ key: "Mouse", action: "Aim flashlight / weapon" },
		{ key: "Click", action: "Shoot" },
		{ key: "E", action: "Place barricade (costs resources)" },
		{ key: "P / ESC", action: "Pause" },
		{ key: "H", action: "Toggle help" },
		{ key: "R", action: "Restart (game over only)" },
	],
	tips: [
		"During the day you auto-scavenge ammo and resources",
		"Place barricades to slow zombies before nightfall",
		"Runners are fast but fragile. Tanks are slow but tough",
		"Your flashlight cone is the only visibility at night",
		"Conserve ammo - headcount increases each wave",
	],
};

export class ZombieEngine {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private state: GameState;

	private inputSystem: InputSystem;
	private playerSystem: PlayerSystem;
	private zombieSystem: ZombieSystem;
	private combatSystem: CombatSystem;
	private waveSystem: WaveSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;

	private lastTime = 0;
	private rafId = 0;
	private running = false;
	private onExit: () => void;

	private resizeHandler: () => void;
	private restartHandler: (e: KeyboardEvent) => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.canvas = canvas;
		this.onExit = onExit;

		const ctx = canvas.getContext("2d");

		if (!ctx) throw new Error("Failed to get 2D context");

		this.ctx = ctx;

		this.state = this.createInitialState();

		this.inputSystem = new InputSystem(canvas, () => this.state);
		this.playerSystem = new PlayerSystem();
		this.zombieSystem = new ZombieSystem();
		this.combatSystem = new CombatSystem();
		this.waveSystem = new WaveSystem();
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();
		this.helpOverlay = new HelpOverlay();

		this.resizeHandler = () => this.handleResize();
		this.restartHandler = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === "r" && this.state.screen === "gameover") {
				this.state = this.createInitialState();
			}

			if (e.key === "Escape" && this.state.screen === "gameover") {
				this.onExit();
			}
		};
	}

	private createInitialState(): GameState {
		return {
			screen: "playing",
			player: {
				x: ARENA_W / 2,
				y: ARENA_H / 2,
				angle: 0,
				hp: 100,
				maxHp: 100,
				ammo: MAX_AMMO,
				maxAmmo: MAX_AMMO,
				resources: 40,
				shootCooldown: 0,
				invincibleTimer: 0,
			},
			zombies: [],
			bullets: [],
			barricades: [],
			particles: [],
			wave: 0,
			timeOfDay: "day",
			cycleTimer: DAY_DURATION,
			zombiesRemainingInWave: 0,
			spawnTimer: 0,
			spawnQueue: [],
			score: 0,
			nextId: 1,
			totalKills: 0,
		};
	}

	private handleResize(): void {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
	}

	start(): void {
		this.running = true;
		this.handleResize();
		window.addEventListener("resize", this.resizeHandler);
		window.addEventListener("keydown", this.restartHandler);
		this.inputSystem.attach();
		this.lastTime = performance.now();
		this.loop(this.lastTime);
	}

	private loop(timestamp: number): void {
		if (!this.running) return;

		const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);

		this.lastTime = timestamp;

		this.update(dt);
		this.render();

		this.rafId = requestAnimationFrame((t) => this.loop(t));
	}

	private update(dt: number): void {
		const input = this.inputSystem.snapshot();

		// Handle pause toggle
		if (input.pause) {
			if (this.state.screen === "playing") {
				this.state.screen = "paused";

				return;
			} else if (this.state.screen === "paused") {
				this.state.screen = "playing";

				return;
			}
		}

		// Handle help toggle
		if (input.help) {
			this.helpOverlay.toggle();
		}

		if (this.state.screen !== "playing") return;

		if (this.helpOverlay.visible) return;

		this.playerSystem.setInput(input);
		this.playerSystem.update(this.state, dt);
		this.waveSystem.update(this.state, dt);
		this.zombieSystem.update(this.state, dt);
		this.combatSystem.update(this.state, dt);
	}

	private render(): void {
		const { ctx, canvas } = this;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Dark background
		ctx.fillStyle = "#080a08";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		this.gameRenderer.render(ctx, this.state);
		this.hudRenderer.render(ctx, this.state);
		this.helpOverlay.render(ctx, GAME_HELP, "Zombie Survival", "#27ae60");
	}

	stop(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		window.removeEventListener("resize", this.resizeHandler);
		window.removeEventListener("keydown", this.restartHandler);
		this.inputSystem.detach();
	}
}
