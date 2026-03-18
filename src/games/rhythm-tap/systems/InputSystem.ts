import type { InputHandler } from '@shared/InputHandler';
import type { RhythmState } from '../types';

export class InputSystem implements InputHandler {
  private state: RhythmState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onRestart: () => void;
  private onToggleHelp: () => void;

  private boundMouseDown: (e: MouseEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(
    state: RhythmState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onRestart: () => void,
    onToggleHelp: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onRestart = onRestart;
    this.onToggleHelp = onToggleHelp;

    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    window.addEventListener('keydown', this.boundKeyDown);
  }

  detach(): void {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  private handleClick(x: number, y: number): void {
    if (!this.state.started) {
      this.state.started = true;
      return;
    }

    if (this.state.gameOver || this.state.paused) return;

    this.state.pendingClick = { x, y };
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handleClick(pos.x, pos.y);
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.handleClick(pos.x, pos.y);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.onExit();
      return;
    }
    if (e.key === ' ' && this.state.gameOver) {
      e.preventDefault();
      this.onRestart();
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      if (!this.state.gameOver && this.state.started) {
        this.state.paused = !this.state.paused;
      }
    }
    if (e.key === 'h' || e.key === 'H') {
      this.onToggleHelp();
    }
  }
}
