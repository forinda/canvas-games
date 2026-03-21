import type { IdleState, Upgrade } from "./types.ts";
import { createDefaultUpgrades } from "./data/upgrades.ts";
import { InputSystem } from "./systems/InputSystem.ts";
import { ClickSystem } from "./systems/ClickSystem.ts";
import { IdleSystem } from "./systems/IdleSystem.ts";
import { GameRenderer } from "./renderers/GameRenderer.ts";
import { ShopRenderer } from "./renderers/ShopRenderer.ts";
import { HUDRenderer } from "./renderers/HUDRenderer.ts";
import { HelpOverlay } from "@shared/HelpOverlay.ts";
import { getUpgradeCost } from "./utils.ts";
import { IDLE_CLICKER_HELP } from "./data/help.ts";

/**
 * Main game loop orchestrator for the Idle Clicker game.
 * Coordinates systems (input, click, idle) and renderers (game, shop, hud).
 */
export class IdleClickerEngine {
	private ctx: CanvasRenderingContext2D;
	private state: IdleState;
	private running = false;
	private rafId = 0;
	private lastTime = 0;

	// Systems
	private inputSystem: InputSystem;
	private clickSystem: ClickSystem;
	private idleSystem: IdleSystem;

	// Renderers
	private gameRenderer: GameRenderer;
	private shopRenderer: ShopRenderer;
	private hudRenderer: HUDRenderer;
	private helpOverlay: HelpOverlay;

	private resizeHandler: () => void;

	constructor(canvas: HTMLCanvasElement, onExit: () => void) {
		this.ctx = canvas.getContext("2d")!;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		// Initialize state
		this.state = {
			coins: 0,
			totalCoinsEarned: 0,
			totalClicks: 0,
			clickPower: 1,
			cps: 0,
			upgrades: createDefaultUpgrades(),
			particles: [],
			coinButton: { x: 0, y: 0, radius: 80 },
			coinPulse: 0,
			shopScroll: 0,
			width: canvas.width,
			height: canvas.height,
			saveTimer: 0,
			helpVisible: false,
		};

		// Systems
		this.clickSystem = new ClickSystem();
		this.idleSystem = new IdleSystem();
		this.helpOverlay = new HelpOverlay();

		this.inputSystem = new InputSystem(
			canvas,
			this.state,
			(x, y) => this.clickSystem.registerClick(x, y),
			(u) => this.buyUpgrade(u),
			onExit,
			() => {
				this.helpOverlay.toggle();
				this.state.helpVisible = this.helpOverlay.visible;
			},
		);

		// Renderers
		this.gameRenderer = new GameRenderer();
		this.shopRenderer = new ShopRenderer();
		this.hudRenderer = new HUDRenderer();

		// Load saved progress
		this.idleSystem.load(this.state);

		// Resize handler
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
		// Final save on exit
		this.idleSystem.save(this.state);
	}

	private loop(): void {
		if (!this.running) return;

		const now = performance.now();
		const dt = Math.min(now - this.lastTime, 200); // Cap dt at 200ms

		this.lastTime = now;

		this.update(dt);
		this.render();

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private update(dt: number): void {
		this.clickSystem.update(this.state, dt);
		this.idleSystem.update(this.state, dt);
	}

	private render(): void {
		const ctx = this.ctx;

		ctx.clearRect(0, 0, this.state.width, this.state.height);

		this.gameRenderer.render(ctx, this.state);
		this.shopRenderer.render(ctx, this.state);
		this.hudRenderer.render(ctx, this.state);

		// Help overlay on top
		if (this.helpOverlay.visible) {
			this.helpOverlay.render(
				ctx,
				IDLE_CLICKER_HELP,
				"Idle Clicker",
				"#ffc107",
			);
		}
	}

	private buyUpgrade(upgrade: Upgrade): void {
		const cost = getUpgradeCost(upgrade);

		if (this.state.coins >= cost) {
			this.state.coins -= cost;
			upgrade.owned++;
		}
	}
}
