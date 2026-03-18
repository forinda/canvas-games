import type { SnakeState } from './types';
import { CELL, HS_KEY } from './types';
import { MovementSystem } from './systems/MovementSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { FoodSystem } from './systems/FoodSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class SnakeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SnakeState;
  private running = false;
  private rafId = 0;
  private lastTick = 0;

  private movementSystem: MovementSystem;
  private collisionSystem: CollisionSystem;
  private foodSystem: FoodSystem;
  private scoreSystem: ScoreSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gridW = Math.floor(canvas.width / CELL);
    const gridH = Math.floor(canvas.height / CELL);

    let hs = 0;
    try { hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0; } catch { /* noop */ }

    this.state = {
      snake: [{ x: Math.floor(gridW / 2), y: Math.floor(gridH / 2) }],
      food: { x: 0, y: 0 },
      dir: 'right',
      nextDir: 'right',
      score: 0,
      highScore: hs,
      speed: 120,
      gameOver: false,
      paused: false,
      started: false,
      gridW,
      gridH,
    };

    // Systems
    this.movementSystem = new MovementSystem();
    this.collisionSystem = new CollisionSystem();
    this.foodSystem = new FoodSystem();
    this.scoreSystem = new ScoreSystem();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

    // Spawn initial food
    this.foodSystem.spawnFood(this.state);

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.gridW = Math.floor(canvas.width / CELL);
      this.state.gridH = Math.floor(canvas.height / CELL);
    };

    // Attach listeners
    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.lastTick = performance.now();
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

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      if (now - this.lastTick >= this.state.speed) {
        this.lastTick = now;
        this.tick();
      }
    }

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private tick(): void {
    const dt = this.state.speed;
    this.movementSystem.update(this.state, dt);
    this.collisionSystem.update(this.state, dt);
    if (!this.state.gameOver) {
      this.foodSystem.update(this.state, dt);
      this.scoreSystem.update(this.state, dt);
    }
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const s = this.state;
    const cx = Math.floor(s.gridW / 2);
    const cy = Math.floor(s.gridH / 2);
    s.snake = [{ x: cx, y: cy }];
    s.dir = 'right';
    s.nextDir = 'right';
    s.score = 0;
    s.speed = 120;
    s.gameOver = false;
    s.started = true;
    this.scoreSystem.reset();
    this.foodSystem.spawnFood(s);
  }
}
