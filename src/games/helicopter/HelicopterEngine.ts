import type { HelicopterState } from './types';
import {
  BASE_SCROLL_SPEED,
  HELI_WIDTH,
  HELI_HEIGHT,
  HELI_X_RATIO,
  HS_KEY,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { ObstacleSystem } from './systems/ObstacleSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class HelicopterEngine {
  private ctx: CanvasRenderingContext2D;
  private state: HelicopterState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private obstacleSystem: ObstacleSystem;
  private collisionSystem: CollisionSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let best = 0;
    try {
      best = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    this.state = this.createInitialState(canvas.width, canvas.height, best);

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.obstacleSystem = new ObstacleSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Initialize cave
    this.obstacleSystem.initCave(this.state);

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
      this.state.helicopter.x = canvas.width * HELI_X_RATIO;
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
    const dt = Math.min(now - this.lastTime, 32);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.physicsSystem.update(this.state, dt);
    this.obstacleSystem.update(this.state, dt);
    this.collisionSystem.update(this.state, dt);

    // Flash timer countdown
    if (this.state.flashTimer > 0) {
      this.state.flashTimer = Math.max(0, this.state.flashTimer - dt);
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const best = this.state.bestScore;
    const w = this.state.canvasW;
    const h = this.state.canvasH;
    const newState = this.createInitialState(w, h, best);
    newState.phase = 'idle';

    // Copy into existing state object so InputSystem's reference stays valid
    Object.assign(this.state, newState);

    // Re-initialize cave
    this.obstacleSystem.initCave(this.state);
  }

  private createInitialState(
    canvasW: number,
    canvasH: number,
    bestScore: number,
  ): HelicopterState {
    return {
      helicopter: {
        x: canvasW * HELI_X_RATIO,
        y: canvasH * 0.45,
        velocity: 0,
        width: HELI_WIDTH,
        height: HELI_HEIGHT,
        rotorAngle: 0,
      },
      cave: [],
      obstacles: [],
      phase: 'idle',
      distance: 0,
      bestScore,
      canvasW,
      canvasH,
      scrollSpeed: BASE_SCROLL_SPEED,
      holding: false,
      flashTimer: 0,
      backgroundOffset: 0,
      elapsedTime: 0,
    };
  }
}
