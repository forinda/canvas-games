import type { InputHandler } from '@shared/InputHandler';
import type { HelicopterState } from '../types';

export class InputSystem implements InputHandler {
  private state: HelicopterState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onRestart: () => void;

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private mouseDownHandler: (e: MouseEvent | TouchEvent) => void;
  private mouseUpHandler: (e: MouseEvent | TouchEvent) => void;

  constructor(
    state: HelicopterState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onRestart: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onRestart = onRestart;

    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onExit();
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.handlePress();
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.handleRelease();
      }
    };

    this.mouseDownHandler = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.handlePress();
    };

    this.mouseUpHandler = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.handleRelease();
    };
  }

  private handlePress(): void {
    const s = this.state;

    if (s.phase === 'idle') {
      s.phase = 'playing';
      s.holding = true;
      return;
    }

    if (s.phase === 'playing') {
      s.holding = true;
      return;
    }

    if (s.phase === 'dead') {
      this.onRestart();
    }
  }

  private handleRelease(): void {
    if (this.state.phase === 'playing') {
      this.state.holding = false;
    }
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('mouseup', this.mouseUpHandler);
    this.canvas.addEventListener('touchstart', this.mouseDownHandler, { passive: false });
    this.canvas.addEventListener('touchend', this.mouseUpHandler, { passive: false });
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
    this.canvas.removeEventListener('touchstart', this.mouseDownHandler);
    this.canvas.removeEventListener('touchend', this.mouseUpHandler);
  }
}
