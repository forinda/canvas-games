import type { CityState } from './types';
import { CELL_SIZE, HUD_HEIGHT } from './types';
import { GridSystem } from './systems/GridSystem';
import { EconomySystem } from './systems/EconomySystem';
import { StatsSystem } from './systems/StatsSystem';
import { InputSystem } from './systems/InputSystem';
import { GridRenderer } from './renderers/GridRenderer';
import { PanelRenderer } from './renderers/PanelRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class CityEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: CityState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  // Systems
  private gridSystem: GridSystem;
  private economySystem: EconomySystem;
  private statsSystem: StatsSystem;
  private inputSystem: InputSystem;

  // Renderers
  private gridRenderer: GridRenderer;
  private panelRenderer: PanelRenderer;
  private hudRenderer: HUDRenderer;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cols = Math.floor(canvas.width / CELL_SIZE);
    const rows = Math.floor((canvas.height - HUD_HEIGHT - 100) / CELL_SIZE);

    this.gridSystem = new GridSystem();
    this.statsSystem = new StatsSystem();

    const showMessage = (msg: string) => {
      this.state.message = msg;
      this.state.messageTimer = 2;
    };

    this.economySystem = new EconomySystem(showMessage);

    this.state = {
      grid: this.gridSystem.createEmptyGrid(cols, rows),
      cols, rows,
      population: 0, money: 1000, happiness: 50, power: 10, food: 20,
      selectedType: null, hoveredCell: null,
      tick: 0, started: false, speed: 1,
      message: '', messageTimer: 0,
    };

    this.inputSystem = new InputSystem(canvas, this.state, this.gridSystem, this.statsSystem, onExit, showMessage);

    this.gridRenderer = new GridRenderer();
    this.panelRenderer = new PanelRenderer(canvas);
    this.hudRenderer = new HUDRenderer(canvas);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.economySystem.resetTick(this.lastTime);
    this.inputSystem.attach();
    this.loop(this.lastTime);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop(timestamp: number): void {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.state.started) this.update(dt, timestamp);
    this.render();
    this.rafId = requestAnimationFrame(t => this.loop(t));
  }

  private update(dt: number, now: number): void {
    this.state.messageTimer = Math.max(0, this.state.messageTimer - dt);
    this.economySystem.update(this.state, dt, now);
  }

  private render(): void {
    const { ctx, canvas, state } = this;
    const W = canvas.width, H = canvas.height;

    // Background
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, W, H);

    this.gridRenderer.render(ctx, state);
    this.panelRenderer.render(ctx, state);
    this.hudRenderer.render(ctx, state);
  }
}
