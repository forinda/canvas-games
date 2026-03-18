import type { InputHandler } from '@shared/InputHandler';
import type { TypingState } from '../types';

export class InputSystem implements InputHandler {
  private state: TypingState;
  private onExit: () => void;
  private onReset: () => void;
  private onType: (char: string) => void;
  private onBackspace: () => void;
  private onHelpToggle: () => void;
  private isHelpVisible: () => boolean;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    state: TypingState,
    onExit: () => void,
    onReset: () => void,
    onType: (char: string) => void,
    onBackspace: () => void,
    onHelpToggle: () => void,
    isHelpVisible: () => boolean,
  ) {
    this.state = state;
    this.onExit = onExit;
    this.onReset = onReset;
    this.onType = onType;
    this.onBackspace = onBackspace;
    this.onHelpToggle = onHelpToggle;
    this.isHelpVisible = isHelpVisible;
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === 'Escape') {
      if (this.isHelpVisible()) {
        this.onHelpToggle();
        return;
      }
      this.onExit();
      return;
    }

    // H key for help — only when not actively typing
    if (e.key === 'h' || e.key === 'H') {
      if (this.isHelpVisible()) {
        this.onHelpToggle();
        return;
      }
      if (!s.started || s.gameOver || s.paused) {
        this.onHelpToggle();
        return;
      }
      // During gameplay, 'h' is treated as a typing key (fall through below)
    }

    // Swallow all input while help is visible
    if (this.isHelpVisible()) return;

    if (e.key === 'p' || e.key === 'P') {
      if (s.started && !s.gameOver) {
        s.paused = !s.paused;
      }
      return;
    }

    if (s.gameOver) {
      if (e.key === ' ' || e.key === 'Enter') {
        this.onReset();
      }
      return;
    }

    if (!s.started) {
      if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        s.started = true;
        s.startTime = performance.now();
        this.onType(e.key.toLowerCase());
      }
      return;
    }

    if (s.paused) return;

    if (e.key === 'Backspace') {
      this.onBackspace();
      return;
    }

    if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
      this.onType(e.key.toLowerCase());
    }
  }
}
