import type { InputHandler } from '@shared/InputHandler';
import type { GravityState, GravityDir } from '../types';

export class InputSystem implements InputHandler {
  private state: GravityState;
  private onExit: () => void;
  private onHelpToggle: () => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    state: GravityState,
    _canvas: HTMLCanvasElement,
    onExit: () => void,
    onHelpToggle: () => void
  ) {
    this.state = state;
    this.onExit = onExit;
    this.onHelpToggle = onHelpToggle;

    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    const key = e.key;

    // Exit
    if (key === 'Escape') {
      this.onExit();
      return;
    }

    // Help toggle
    if (key === 'h' || key === 'H') {
      this.onHelpToggle();
      return;
    }

    // Restart
    if (key === 'r' || key === 'R') {
      this.state.restartRequested = true;
      return;
    }

    // Advance on level complete or game won
    if (key === ' ' || key === 'Enter') {
      if (this.state.levelComplete || this.state.gameWon) {
        this.state.advanceRequested = true;
      }
      return;
    }

    // Gravity direction — only if not currently sliding
    if (this.state.sliding) return;

    let dir: GravityDir | null = null;

    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        dir = 'up';
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        dir = 'down';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        dir = 'left';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        dir = 'right';
        break;
    }

    if (dir !== null && dir !== this.state.gravity) {
      e.preventDefault();
      this.state.queuedGravity = dir;
    }
  }
}
