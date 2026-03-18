import type { AsteroidsState } from './types';
import { STARTING_LIVES, HS_KEY } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { AsteroidSystem } from './systems/AsteroidSystem';
import { WaveSystem } from './systems/WaveSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class AsteroidsEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AsteroidsState;
  private running = false;
  private rafId = 0;

  // Systems
  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private collisionSystem: CollisionSystem;
  private asteroidSystem: AsteroidSystem;
  private waveSystem: WaveSystem;

  // Renderers
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;

  private resizeHandler: () => void;
  private wasStarted = false;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let hs = 0;
    try { hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0; } catch { /* noop */ }

    this.state = {
      ship: {
        pos: { x: canvas.width / 2, y: canvas.height / 2 },
        vel: { x: 0, y: 0 },
        angle: 0,
        thrusting: false,
      },
      asteroids: [],
      bullets: [],
      particles: [],
      score: 0,
      highScore: hs,
      lives: STARTING_LIVES,
      wave: 0,
      gameOver: false,
      paused: false,
      started: false,
      invulnUntil: 0,
      lastShot: 0,
      width: canvas.width,
      height: canvas.height,
    };

    // Systems
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );
    this.physicsSystem = new PhysicsSystem(this.inputSystem.keys);
    this.collisionSystem = new CollisionSystem();
    this.asteroidSystem = new AsteroidSystem();
    this.waveSystem = new WaveSystem(this.asteroidSystem);

    // Renderers
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

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

    // Detect when the game transitions to started for the first time
    if (this.state.started && !this.wasStarted) {
      this.wasStarted = true;
      this.waveSystem.startFirstWave(this.state);
    }

    // Process input-driven shooting
    this.inputSystem.processShooting();

    // Update systems
    this.physicsSystem.update(this.state, 1);
    this.collisionSystem.update(this.state, 1);
    this.waveSystem.update(this.state, 1);

    // Render
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private reset(): void {
    const s = this.state;
    s.ship.pos.x = s.width / 2;
    s.ship.pos.y = s.height / 2;
    s.ship.vel.x = 0;
    s.ship.vel.y = 0;
    s.ship.angle = 0;
    s.ship.thrusting = false;
    s.asteroids = [];
    s.bullets = [];
    s.particles = [];
    s.score = 0;
    s.lives = STARTING_LIVES;
    s.wave = 0;
    s.gameOver = false;
    s.paused = false;
    s.started = true;
    s.invulnUntil = performance.now() + 2000;
    s.lastShot = 0;
    this.wasStarted = false;
    // wasStarted=false + started=true will trigger first wave spawn on next frame
  }
}
