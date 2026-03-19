import type { Updatable } from "@shared/Updatable";
import type { Renderable } from "@shared/Renderable";
import type { PuzzleState } from "./types";
import { PhysicsSystem } from "./systems/PhysicsSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { GoalSystem } from "./systems/GoalSystem";
import { WorldRenderer } from "./renderers/WorldRenderer";
import { InventoryRenderer } from "./renderers/InventoryRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { buildLevel } from "./data/levels";

export class PuzzleEngine {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private systems: Updatable<PuzzleState>[];
	private renderers: Renderable<PuzzleState>[];
	private goalSystem: GoalSystem;
	state: PuzzleState;
	private rafId = 0;
	private running = false;
	private lastTime = 0;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d")!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.goalSystem = new GoalSystem(canvas.height);
		this.systems = [
			new PhysicsSystem(),
			new CollisionSystem(),
			this.goalSystem,
		];
		this.renderers = [
			new WorldRenderer(),
			new InventoryRenderer(),
			new HUDRenderer(),
		];

		this.state = buildLevel(1, canvas.width, canvas.height);
	}

	start(): void {
		this.running = true;
		this.lastTime = performance.now();
		this.loop(this.lastTime);
	}

	stop(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
	}

	onResize(): void {
		this.goalSystem.setCanvasHeight(this.canvas.height);
	}

	private loop(timestamp: number): void {
		if (!this.running) return;

		const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);

		this.lastTime = timestamp;

		if (this.state.simulating && !this.state.solved) {
			for (const sys of this.systems) {
				sys.update(this.state, dt);
			}
		}

		for (const renderer of this.renderers) {
			renderer.render(this.ctx, this.state);
		}

		this.rafId = requestAnimationFrame((t) => this.loop(t));
	}
}
