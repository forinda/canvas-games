import type { InputHandler } from '@shared/InputHandler';
import type { AsteroidsState } from '../types';
import { SHOOT_COOLDOWN, MAX_BULLETS, BULLET_SPEED } from '../types';

export interface InputKeys {
  left: boolean;
  right: boolean;
  up: boolean;
  space: boolean;
}

export class InputSystem implements InputHandler {
  private state: AsteroidsState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onReset: () => void;
  readonly keys: InputKeys = { left: false, right: false, up: false, space: false };

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    state: AsteroidsState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onReset: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onReset = onReset;
    this.keyDownHandler = (e) => this.handleKeyDown(e);
    this.keyUpHandler = (e) => this.handleKeyUp(e);
    this.clickHandler = (e) => this.handleClick(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  /** Call once per frame to fire bullets based on held keys */
  processShooting(): void {
    const s = this.state;
    if (!s.started || s.paused || s.gameOver) return;
    if (!this.keys.space) return;

    const now = performance.now();
    if (now - s.lastShot < SHOOT_COOLDOWN) return;
    if (s.bullets.length >= MAX_BULLETS) return;

    s.lastShot = now;
    const angle = s.ship.angle;
    s.bullets.push({
      pos: { x: s.ship.pos.x, y: s.ship.pos.y },
      vel: {
        x: Math.sin(angle) * BULLET_SPEED,
        y: -Math.cos(angle) * BULLET_SPEED,
      },
      life: 60,
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const s = this.state;
    if (e.key === 'Escape') { this.onExit(); return; }
    if (e.key === 'p' || e.key === 'P') {
      if (s.started && !s.gameOver) s.paused = !s.paused;
      return;
    }

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (s.gameOver) { this.onReset(); return; }
      if (!s.started) { s.started = true; return; }
    }

    this.setKey(e.key, true);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.setKey(e.key, false);
  }

  private setKey(key: string, down: boolean): void {
    switch (key) {
      case 'ArrowLeft': case 'a': case 'A': this.keys.left = down; break;
      case 'ArrowRight': case 'd': case 'D': this.keys.right = down; break;
      case 'ArrowUp': case 'w': case 'W': this.keys.up = down; break;
      case ' ': this.keys.space = down; break;
    }
  }

  private handleClick(e: MouseEvent): void {
    const s = this.state;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    // Exit button top-left
    if (x < 80 && y < 40) { this.onExit(); return; }

    if (s.gameOver) { this.onReset(); return; }
    if (!s.started) { s.started = true; }
  }
}
