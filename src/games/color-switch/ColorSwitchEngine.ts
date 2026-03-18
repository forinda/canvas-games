import type { ColorSwitchState } from './types';
import {
  BALL_RADIUS,
  BALL_START_Y_RATIO,
  GAME_COLORS,
  GATE_SPACING,
  HS_KEY,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GateSystem } from './systems/GateSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class ColorSwitchEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ColorSwitchState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private gateSystem: GateSystem;
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

    let best = 0;
    try {
      best = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    this.state = this.createInitialState(canvas.width, canvas.height, best);

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.gateSystem = new GateSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );

    // Seed initial gates
    this.gateSystem.reset(this.state.ball.y - GATE_SPACING);

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
      this.state.ball.x = canvas.width / 2;
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
    const s = this.state;

    // Flash timer countdown
    if (s.flashTimer > 0) {
      s.flashTimer = Math.max(0, s.flashTimer - dt);
    }

    // Idle bobbing
    if (s.phase === 'idle') {
      s.ball.y = s.canvasH * BALL_START_Y_RATIO + Math.sin(performance.now() * 0.003) * 8;
      return;
    }

    this.physicsSystem.update(s, dt);
    this.gateSystem.update(s, dt);
    this.collisionSystem.update(s, dt);
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

    // Copy into existing state so InputSystem's reference stays valid
    Object.assign(this.state, newState);

    // Reset gate generation
    this.gateSystem.reset(this.state.ball.y - GATE_SPACING);
  }

  private createInitialState(
    canvasW: number,
    canvasH: number,
    bestScore: number,
  ): ColorSwitchState {
    const startColor = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)];
    return {
      ball: {
        x: canvasW / 2,
        y: canvasH * BALL_START_Y_RATIO,
        velocity: 0,
        radius: BALL_RADIUS,
        color: startColor,
      },
      gates: [],
      switchers: [],
      phase: 'idle',
      score: 0,
      bestScore: bestScore,
      canvasW: canvasW,
      canvasH: canvasH,
      flashTimer: 0,
      cameraY: 0,
    };
  }
}
