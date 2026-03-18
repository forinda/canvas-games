import type { DoodleState } from './types';
import { PLAYER_WIDTH, PLAYER_HEIGHT, HS_KEY } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { PlatformSystem } from './systems/PlatformSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class DoodleEngine {
  private ctx: CanvasRenderingContext2D;
  private state: DoodleState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private platformSystem: PlatformSystem;
  private collisionSystem: CollisionSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    this.platformSystem = new PlatformSystem();
    this.state = this.createInitialState(canvas.width, canvas.height, hs);

    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      onExit,
      () => this.reset(),
    );

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
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
    // Apply continuous input
    this.inputSystem.applyMovement();

    // Update systems
    this.physicsSystem.update(this.state, dt);
    this.platformSystem.update(this.state, dt);
    this.collisionSystem.update(this.state, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const hs = this.state.highScore;
    const w = this.state.canvasW;
    const h = this.state.canvasH;
    const newState = this.createInitialState(w, h, hs);
    newState.phase = 'idle';

    // Copy into existing state object so InputSystem's reference stays valid
    Object.assign(this.state, newState);
  }

  private createInitialState(
    canvasW: number,
    canvasH: number,
    highScore: number,
  ): DoodleState {
    return {
      player: {
        x: canvasW / 2 - PLAYER_WIDTH / 2,
        y: canvasH - 120,
        vx: 0,
        vy: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        facingRight: true,
      },
      platforms: this.platformSystem.generateInitial(canvasW, canvasH),
      phase: 'idle',
      score: 0,
      highScore,
      canvasW,
      canvasH,
      cameraY: 0,
      maxHeight: 0,
    };
  }
}
