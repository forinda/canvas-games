import type { LavaState } from './types';
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  HS_KEY,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { PlatformSystem } from './systems/PlatformSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class LavaEngine {
  private ctx: CanvasRenderingContext2D;
  private state: LavaState;
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
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let best = 0;
    try {
      best = parseFloat(localStorage.getItem(HS_KEY) ?? '0') || 0;
    } catch {
      /* noop */
    }

    this.state = this.createInitialState(canvas.width, canvas.height, best);

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.platformSystem = new PlatformSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Initialize platforms
    this.platformSystem.initPlatforms(this.state);

    // Initialize lava bubbles
    this.initLavaBubbles();

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
      this.state.lavaY = canvas.height * 0.82;
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
    this.platformSystem.update(this.state, dt);
    this.collisionSystem.update(this.state, dt);

    // Update particles
    this.updateParticles(dt);

    // Update lava bubbles
    this.updateLavaBubbles(dt);

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

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0005 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  }

  private initLavaBubbles(): void {
    this.state.lavaBubbles = [];
    for (let i = 0; i < 12; i++) {
      this.state.lavaBubbles.push({
        x: Math.random() * this.state.canvasW,
        y: this.state.lavaY + Math.random() * 40,
        radius: 4 + Math.random() * 10,
        speed: 0.01 + Math.random() * 0.03,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private updateLavaBubbles(dt: number): void {
    for (const bubble of this.state.lavaBubbles) {
      bubble.phase += bubble.speed * dt;
      bubble.y = this.state.lavaY + Math.sin(bubble.phase) * 8 + 10;
      bubble.x += Math.sin(bubble.phase * 0.5) * 0.3;

      // Wrap bubbles
      if (bubble.x < -20) bubble.x = this.state.canvasW + 20;
      if (bubble.x > this.state.canvasW + 20) bubble.x = -20;
    }
  }

  private reset(): void {
    const best = this.state.bestTime;
    const w = this.state.canvasW;
    const h = this.state.canvasH;
    const newState = this.createInitialState(w, h, best);
    newState.phase = 'idle';

    // Copy into existing state object so InputSystem's reference stays valid
    Object.assign(this.state, newState);

    // Re-initialize platforms and bubbles
    this.platformSystem.initPlatforms(this.state);
    this.initLavaBubbles();
  }

  private createInitialState(
    canvasW: number,
    canvasH: number,
    bestTime: number,
  ): LavaState {
    return {
      player: {
        x: canvasW / 2,
        y: canvasH * 0.5,
        vx: 0,
        vy: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        onGround: false,
        facingRight: true,
      },
      platforms: [],
      particles: [],
      lavaBubbles: [],
      phase: 'idle',
      survivalTime: 0,
      bestTime,
      canvasW,
      canvasH,
      lavaY: canvasH * 0.82,
      scrollSpeed: 0.02,
      spawnTimer: 1000,
      flashTimer: 0,
      leftHeld: false,
      rightHeld: false,
      jumpPressed: false,
    };
  }
}
