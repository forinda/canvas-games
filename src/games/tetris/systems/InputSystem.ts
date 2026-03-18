import type { InputHandler } from '@shared/InputHandler';
import type { TetrisState } from '../types';
import { PieceSystem } from './PieceSystem';

export class InputSystem implements InputHandler {
  private state: TetrisState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onReset: () => void;
  private pieceSystem: PieceSystem;

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  // DAS tracking
  private heldKeys = new Set<string>();

  constructor(
    state: TetrisState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onReset: () => void,
    pieceSystem: PieceSystem,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onReset = onReset;
    this.pieceSystem = pieceSystem;

    this.keyDownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.keyUpHandler = (e: KeyboardEvent) => this.handleKeyUp(e);
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
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
    this.heldKeys.clear();
  }

  /** Called each frame to handle DAS repeat */
  handleDAS(dt: number): void {
    const s = this.state;
    if (!s.dasKey || !this.heldKeys.has(s.dasKey)) {
      s.dasKey = null;
      s.dasTimer = 0;
      s.dasReady = false;
      return;
    }

    s.dasTimer += dt;

    if (!s.dasReady) {
      if (s.dasTimer >= s.dasDelay) {
        s.dasReady = true;
        s.dasTimer -= s.dasDelay;
        this.executeDASAction(s.dasKey);
      }
    } else {
      while (s.dasTimer >= s.dasInterval) {
        s.dasTimer -= s.dasInterval;
        this.executeDASAction(s.dasKey);
      }
    }
  }

  private executeDASAction(key: string): void {
    const s = this.state;
    if (!s.started || s.paused || s.gameOver || s.clearingLines.length > 0) return;

    if (key === 'ArrowLeft' || key === 'a') {
      this.pieceSystem.move(s, -1);
    } else if (key === 'ArrowRight' || key === 'd') {
      this.pieceSystem.move(s, 1);
    } else if (key === 'ArrowDown' || key === 's') {
      this.pieceSystem.softDrop(s);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === 'Escape') {
      this.onExit();
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      if (s.started && !s.gameOver) {
        s.paused = !s.paused;
      }
      return;
    }

    // Start or restart
    if (e.key === 'Enter' || e.key === ' ') {
      if (s.gameOver) {
        this.onReset();
        return;
      }
      if (!s.started) {
        s.started = true;
        return;
      }
    }

    if (!s.started || s.paused || s.gameOver || s.clearingLines.length > 0) return;

    if (e.repeat) return; // we handle repeat via DAS

    const key = e.key;

    // Movement keys with DAS
    if (key === 'ArrowLeft' || key === 'a') {
      this.pieceSystem.move(s, -1);
      this.startDAS(key);
      return;
    }
    if (key === 'ArrowRight' || key === 'd') {
      this.pieceSystem.move(s, 1);
      this.startDAS(key);
      return;
    }
    if (key === 'ArrowDown' || key === 's') {
      this.pieceSystem.softDrop(s);
      this.startDAS(key);
      return;
    }

    // Rotate
    if (key === 'ArrowUp' || key === 'w' || key === 'x') {
      this.pieceSystem.rotate(s, 1);
      return;
    }
    if (key === 'z' || key === 'Control') {
      this.pieceSystem.rotate(s, -1);
      return;
    }

    // Hard drop
    if (key === ' ') {
      e.preventDefault();
      this.pieceSystem.hardDrop(s);
      return;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.heldKeys.delete(e.key);
    if (this.state.dasKey === e.key) {
      this.state.dasKey = null;
      this.state.dasTimer = 0;
      this.state.dasReady = false;
    }
  }

  private startDAS(key: string): void {
    this.heldKeys.add(key);
    this.state.dasKey = key;
    this.state.dasTimer = 0;
    this.state.dasReady = false;
  }

  private handleClick(e: MouseEvent): void {
    const s = this.state;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    // Exit button (top-left)
    if (x < 80 && y < 40) {
      this.onExit();
      return;
    }

    if (s.gameOver) {
      const W = this.canvas.width;
      const H = this.canvas.height;
      if (x > W * 0.35 && x < W * 0.65 && y > H * 0.45 && y < H * 0.6) {
        this.onReset();
      }
      return;
    }

    if (!s.started) {
      s.started = true;
    }
  }
}
