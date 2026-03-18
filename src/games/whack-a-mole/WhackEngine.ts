import type { WhackState } from './types';
import { HOLE_COUNT, ROUND_DURATION, SPAWN_INTERVAL_BASE, HS_KEY } from './types';
import { MoleSystem } from './systems/MoleSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { InputSystem } from './systems/InputSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class WhackEngine {
  private ctx: CanvasRenderingContext2D;
  private state: WhackState;
  private running = false;
  private rafId = 0;
  private lastFrame = 0;

  private moleSystem: MoleSystem;
  private scoreSystem: ScoreSystem;
  private inputSystem: InputSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let hs = 0;
    try { hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0; } catch { /* noop */ }

    this.state = this.createInitialState(hs);

    // Systems
    this.moleSystem = new MoleSystem();
    this.scoreSystem = new ScoreSystem();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.lastFrame = performance.now();
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
    const dt = Math.min(now - this.lastFrame, 100); // cap delta to avoid spiral
    this.lastFrame = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    if (this.state.phase !== 'playing' || this.state.paused) {
      // Still update particles/hammer even when not playing
      this.scoreSystem.update(this.state, dt);
      return;
    }
    this.moleSystem.update(this.state, dt);
    this.scoreSystem.update(this.state, dt);
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const hs = this.state.highScore;
    const round = this.state.phase === 'gameover' ? this.state.round + 1 : 1;
    Object.assign(this.state, this.createInitialState(hs));
    this.state.round = round;
    this.state.phase = 'playing';
  }

  private createInitialState(highScore: number): WhackState {
    const holes = [];
    for (let i = 0; i < HOLE_COUNT; i++) {
      holes.push({ state: 'empty' as const, timer: 0, isBomb: false, hit: false });
    }
    return {
      holes,
      score: 0,
      highScore,
      combo: 0,
      maxCombo: 0,
      timeRemaining: ROUND_DURATION,
      round: 1,
      phase: 'ready',
      paused: false,
      particles: [],
      hammerEffect: null,
      spawnInterval: SPAWN_INTERVAL_BASE,
      spawnTimer: 0,
    };
  }
}
