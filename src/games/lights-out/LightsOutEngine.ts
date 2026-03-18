import type { LightsOutState } from './types';
import { GRID_SIZE } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class LightsOutEngine {
  private ctx: CanvasRenderingContext2D;
  private state: LightsOutState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      board: [],
      level: 0,
      moves: 0,
      status: 'playing',
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
      ripples: [],
      levelCompleteTime: 0,
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
      onExit,
      () => this.reset(),
    );

    this.boardSystem.loadLevel(this.state, 0);
    this.computeLayout();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.computeLayout();
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
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
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.boardSystem.update(this.state, dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    this.boardSystem.loadLevel(this.state, this.state.level);
    this.computeLayout();
  }

  /** Calculate cell size and offsets so the board is centered */
  private computeLayout(): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;
    const hudHeight = 50;
    const padding = 20;

    const availW = W - padding * 2;
    const availH = H - hudHeight - padding * 2;

    const cellW = Math.floor(availW / GRID_SIZE);
    const cellH = Math.floor(availH / GRID_SIZE);
    this.state.cellSize = Math.max(40, Math.min(cellW, cellH, 100));

    const boardW = GRID_SIZE * this.state.cellSize;
    const boardH = GRID_SIZE * this.state.cellSize;

    this.state.offsetX = Math.floor((W - boardW) / 2);
    this.state.offsetY = Math.floor(hudHeight + (H - hudHeight - boardH) / 2);
  }
}
