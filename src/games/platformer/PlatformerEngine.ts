import type { Updatable } from '@shared/Updatable';
import type { Renderable } from '@shared/Renderable';
import type { PlatState } from './types';
import { buildLevel } from './data/levels';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { EnemySystem } from './systems/EnemySystem';
import { CoinSystem } from './systems/CoinSystem';
import { CameraSystem } from './systems/CameraSystem';
import { GoalSystem } from './systems/GoalSystem';
import { WorldRenderer } from './renderers/WorldRenderer';
import { EntityRenderer } from './renderers/EntityRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class PlatformerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: PlatState;
  private onExit: () => void;
  private rafId = 0;
  private running = false;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private systems: Updatable<PlatState>[];
  private renderers: Renderable<PlatState>[];

  private clickHandler: (e: MouseEvent) => void;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.onExit = onExit;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = buildLevel(1);

    this.inputSystem = new InputSystem(onExit);

    this.systems = [
      this.inputSystem,
      new PhysicsSystem(),
      new CollisionSystem(),
      new EnemySystem(),
      new CoinSystem(),
      new GoalSystem(),
      new CameraSystem(canvas),
    ];

    this.renderers = [
      new WorldRenderer(canvas),
      new EntityRenderer(),
      new HUDRenderer(canvas),
    ];

    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
  }

  attach(): void {
    this.inputSystem.attach();
    this.canvas.addEventListener('click', this.clickHandler);
    window.addEventListener('resize', this.resizeHandler);
  }

  detach(): void {
    this.inputSystem.detach();
    this.canvas.removeEventListener('click', this.clickHandler);
    window.removeEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.attach();
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.detach();
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    if (x < 80 && y < 40) {
      this.onExit();
      return;
    }
    const s = this.state;
    if (!s.started) {
      s.started = true;
      return;
    }
    if (s.gameOver || s.won) {
      this.state = buildLevel(s.won ? s.level + 1 : 1);
      this.state.started = true;
    }
  }

  private loop(timestamp: number): void {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.state.started && !this.state.gameOver && !this.state.won) {
      this.update(dt);
    }
    this.render();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    for (const system of this.systems) {
      system.update(this.state, dt);
      if (this.state.gameOver) return;
    }
  }

  private render(): void {
    for (const renderer of this.renderers) {
      renderer.render(this.ctx, this.state);
    }
  }
}
