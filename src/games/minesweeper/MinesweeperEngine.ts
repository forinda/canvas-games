import type { MinesweeperState, Difficulty } from './types';
import { DIFFICULTY_PRESETS } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class MinesweeperEngine {
  private ctx: CanvasRenderingContext2D;
  private state: MinesweeperState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const defaultDifficulty: Difficulty = 'easy';
    const preset = DIFFICULTY_PRESETS[defaultDifficulty];

    this.state = {
      board: [],
      cols: preset.cols,
      rows: preset.rows,
      difficulty: defaultDifficulty,
      totalMines: preset.mines,
      flagCount: 0,
      status: 'idle',
      timer: 0,
      firstClick: false,
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
      onExit,
      (diff?: Difficulty) => this.reset(diff),
    );

    this.boardSystem.initBoard(this.state);
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

  private reset(difficulty?: Difficulty): void {
    if (difficulty && difficulty !== this.state.difficulty) {
      this.state.difficulty = difficulty;
    }
    this.boardSystem.initBoard(this.state);
    this.boardSystem.resetTimer();
    this.computeLayout();
  }

  /** Calculate cell size and offsets so the board is centered, with space for the HUD */
  private computeLayout(): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;
    const hudHeight = 50;
    const padding = 20;

    const availW = W - padding * 2;
    const availH = H - hudHeight - padding * 2;

    const cellW = Math.floor(availW / this.state.cols);
    const cellH = Math.floor(availH / this.state.rows);
    this.state.cellSize = Math.max(12, Math.min(cellW, cellH, 40));

    const boardW = this.state.cols * this.state.cellSize;
    const boardH = this.state.rows * this.state.cellSize;

    this.state.offsetX = Math.floor((W - boardW) / 2);
    this.state.offsetY = Math.floor(hudHeight + (H - hudHeight - boardH) / 2);
  }
}
