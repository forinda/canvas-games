import type { Ant, AntColonyState } from "./types";
import { COLONY_RADIUS } from "./types";
import { InputSystem } from "./systems/InputSystem";
import { AntSystem } from "./systems/AntSystem";
import { ColonySystem } from "./systems/ColonySystem";
import { ResourceSystem } from "./systems/ResourceSystem";
import { GameRenderer } from "./renderers/GameRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";

export class AntColonyEngine {
	private ctx: CanvasRenderingContext2D;
	private state: AntColonyState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	private inputSystem: InputSystem;
	private antSystem: AntSystem;
	private colonySystem: ColonySystem;
	private resourceSystem: ResourceSystem;
	private gameRenderer: GameRenderer;
	private hudRenderer: HUDRenderer;
	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const cx = canvas.width / 2;
		const cy = canvas.height / 2;

		this.state = this._createInitialState(cx, cy, canvas.width, canvas.height);

		// Systems
		this.antSystem = new AntSystem();
		this.colonySystem = new ColonySystem();
		this.resourceSystem = new ResourceSystem();
		this.inputSystem = new InputSystem(this.state, canvas, onExit);
		this.inputSystem.setRestartCallback(() => this._restart());

		// Renderers
		this.gameRenderer = new GameRenderer();
		this.hudRenderer = new HUDRenderer();

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
		this._loop();
	}

	destroy(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		this.inputSystem.detach();
		window.removeEventListener("resize", this.resizeHandler);
	}

	private _loop(): void {
		if (!this.running) return;

		const now = performance.now();
		const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms

		this.lastTime = now;

		if (this.state.started && !this.state.paused && !this.state.gameOver) {
			this.state.elapsed += dt;
			this.antSystem.update(this.state, dt);
			this.colonySystem.update(this.state, dt);
			this.resourceSystem.update(this.state, dt);
		}

		this._render();
		this.rafId = requestAnimationFrame(() => this._loop());
	}

	private _render(): void {
		this.gameRenderer.render(this.ctx, this.state);
		this.hudRenderer.render(this.ctx, this.state);
	}

	private _restart(): void {
		const canvas = this.ctx.canvas;
		const cx = canvas.width / 2;
		const cy = canvas.height / 2;

		Object.assign(
			this.state,
			this._createInitialState(cx, cy, canvas.width, canvas.height),
		);
		this.state.started = true;
	}

	private _createInitialState(
		cx: number,
		cy: number,
		width: number,
		height: number,
	): AntColonyState {
		// Spawn initial ants
		const initialAnts: Ant[] = [];

		for (let i = 0; i < 10; i++) {
			const angle = Math.random() * Math.PI * 2;
			const r = COLONY_RADIUS * 0.5;

			initialAnts.push({
				x: cx + Math.cos(angle) * r,
				y: cy + Math.sin(angle) * r,
				angle: Math.random() * Math.PI * 2,
				carrying: false,
				task: "forage",
				targetX: 0,
				targetY: 0,
				returning: false,
				pheromoneTimer: Math.random(),
			});
		}

		return {
			colony: {
				x: cx,
				y: cy,
				food: 30,
				population: 10,
				maxPopulation: 30,
				birthThreshold: 20,
				birthProgress: 0,
			},
			ants: initialAnts,
			foodSources: [],
			tunnels: [],
			pheromones: [],
			taskRatio: { forage: 0.6, build: 0.2, idle: 0.2 },
			season: "spring",
			seasonTimer: 0,
			year: 1,
			elapsed: 0,
			paused: false,
			started: false,
			gameOver: false,
			tunnelWaypoints: [],
			width,
			height,
			showHelp: false,
		};
	}
}
