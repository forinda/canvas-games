import type { InputHandler } from '@shared/InputHandler';
import type { PacManState, Direction } from '../types';

export class InputSystem implements InputHandler {
  private state: PacManState;
  private onExit: () => void;
  private onReset: () => void;
  private onToggleHelp: () => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    state: PacManState,
    onExit: () => void,
    onReset: () => void,
    onToggleHelp: () => void,
  ) {
    this.state = state;
    this.onExit = onExit;
    this.onReset = onReset;
    this.onToggleHelp = onToggleHelp;

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

    // Direction mapping
    const dirMap: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      W: 'up',
      s: 'down',
      S: 'down',
      a: 'left',
      A: 'left',
      d: 'right',
      D: 'right',
    };

    if (dirMap[key]) {
      e.preventDefault();
      if (!this.state.started) {
        this.state.started = true;
      }
      this.state.pacman.nextDir = dirMap[key];
      return;
    }

    switch (key) {
      case 'Escape':
        this.onExit();
        break;
      case 'p':
      case 'P':
        if (this.state.started && !this.state.gameOver && !this.state.won) {
          this.state.paused = !this.state.paused;
        }
        break;
      case ' ':
        e.preventDefault();
        if (this.state.gameOver || this.state.won) {
          this.onReset();
        } else if (!this.state.started) {
          this.state.started = true;
        }
        break;
      case 'h':
      case 'H':
        this.onToggleHelp();
        break;
    }
  }
}
