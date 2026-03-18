import type { BreakoutState } from './types';
import {
  PADDLE_BASE_W,
  PADDLE_H,
  BALL_BASE_SPEED,
  MAX_LIVES,
  HS_KEY,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { PowerupSystem } from './systems/PowerupSystem';
import { LevelSystem } from './systems/LevelSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class BreakoutEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BreakoutState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private collisionSystem: CollisionSystem;
  private powerupSystem: PowerupSystem;
  private levelSystem: LevelSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    const paddleY = canvas.height - 50;

    this.state = {
      phase: 'start',
      balls: [],
      paddle: {
        x: canvas.width / 2 - PADDLE_BASE_W / 2,
        y: paddleY,
        w: PADDLE_BASE_W,
        h: PADDLE_H,
        baseW: PADDLE_BASE_W,
      },
      bricks: [],
      powerups: [],
      effects: [],
      score: 0,
      highScore: hs,
      lives: MAX_LIVES,
      level: 1,
      canvasW: canvas.width,
      canvasH: canvas.height,
      baseBallSpeed: BALL_BASE_SPEED,
      mouseX: canvas.width / 2,
    };

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem();
    this.powerupSystem = new PowerupSystem();
    this.levelSystem = new LevelSystem();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );

    // Renderers
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

    // Load first level
    this.levelSystem.loadLevel(this.state);

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
      this.state.paddle.y = canvas.height - 50;
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
    const rawDt = (now - this.lastTime) / 1000;
    // Clamp dt to prevent physics explosion on tab-switch
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = now;

    if (this.state.phase === 'playing') {
      this.physicsSystem.update(this.state, dt);
      this.collisionSystem.update(this.state, dt);
      this.powerupSystem.update(this.state, dt);
      this.levelSystem.update(this.state, dt);

      // Update high score
      if (this.state.score > this.state.highScore) {
        this.state.highScore = this.state.score;
        try {
          localStorage.setItem(HS_KEY, String(this.state.highScore));
        } catch {
          /* noop */
        }
      }
    }

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const s = this.state;
    s.score = 0;
    s.lives = MAX_LIVES;
    s.level = 1;
    s.effects = [];
    s.powerups = [];
    s.paddle.w = PADDLE_BASE_W;
    s.paddle.x = s.canvasW / 2 - PADDLE_BASE_W / 2;
    s.phase = 'playing';
    this.levelSystem.loadLevel(s);
  }
}
