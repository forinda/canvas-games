import type { FruitNinjaState } from './types';
import { MAX_LIVES, HS_KEY, LAUNCH_INTERVAL_MAX } from './types';
import { InputSystem } from './systems/InputSystem';
import { FruitSystem } from './systems/FruitSystem';
import { SliceSystem } from './systems/SliceSystem';
import { BombSystem } from './systems/BombSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class FruitNinjaEngine {
  private ctx: CanvasRenderingContext2D;
  private state: FruitNinjaState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private fruitSystem: FruitSystem;
  private sliceSystem: SliceSystem;
  private bombSystem: BombSystem;
  private gameRenderer: GameRenderer;
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

    this.state = this.createInitialState(canvas.width, canvas.height, hs);

    // Systems
    this.fruitSystem = new FruitSystem();
    this.sliceSystem = new SliceSystem();
    this.bombSystem = new BombSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.restart(),
    );

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.width = canvas.width;
      this.state.height = canvas.height;
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
    const dt = Math.min(now - this.lastTime, 50); // cap to avoid spiral of death
    this.lastTime = now;

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.update(dt);
    }

    // Always prune trail and update particles for visual smoothness
    this.inputSystem.pruneTrail();

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.fruitSystem.update(this.state, dt);
    this.sliceSystem.update(this.state, dt);
    this.bombSystem.update(this.state, dt);

    // Save high score
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      try {
        localStorage.setItem(HS_KEY, String(this.state.highScore));
      } catch {
        /* noop */
      }
    }
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private restart(): void {
    const hs = this.state.highScore;
    const w = this.state.width;
    const h = this.state.height;
    Object.assign(this.state, this.createInitialState(w, h, hs));
    this.state.started = true;
  }

  private createInitialState(
    width: number,
    height: number,
    highScore: number,
  ): FruitNinjaState {
    return {
      fruits: [],
      halves: [],
      particles: [],
      trail: { points: [] },
      score: 0,
      highScore,
      combo: 0,
      comboTimer: 0,
      lives: MAX_LIVES,
      gameOver: false,
      started: false,
      paused: false,
      nextId: 0,
      launchTimer: LAUNCH_INTERVAL_MAX,
      wave: 0,
      width,
      height,
      mouseDown: false,
      mouseX: 0,
      mouseY: 0,
      swipeSliceCount: 0,
    };
  }
}
