import type { InputHandler } from '@shared/InputHandler';
import type { PongState } from '../types';
import { PADDLE_SPEED } from '../types';

export class InputSystem implements InputHandler {
  private keys = new Set<string>();
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private state: PongState;
  private onExit: () => void;
  private onRestart: () => void;
  private onModeSelect: () => void;

  constructor(
    state: PongState,
    onExit: () => void,
    onRestart: () => void,
    onModeSelect: () => void,
  ) {
    this.state = state;
    this.onExit = onExit;
    this.onRestart = onRestart;
    this.onModeSelect = onModeSelect;
    this.keyDownHandler = (e: KeyboardEvent) => this.onKeyDown(e);
    this.keyUpHandler = (e: KeyboardEvent) => this.onKeyUp(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.keys.clear();
  }

  /** Call each frame to apply held-key input to paddle velocities */
  applyInput(): void {
    const s = this.state;

    // Left paddle: W / S
    if (this.keys.has('w') || this.keys.has('W')) {
      s.leftPaddle.dy = -PADDLE_SPEED;
    } else if (this.keys.has('s') || this.keys.has('S')) {
      s.leftPaddle.dy = PADDLE_SPEED;
    } else {
      s.leftPaddle.dy = 0;
    }

    // Right paddle: Arrow keys (only in 2p mode; AI overrides in AISystem)
    if (s.mode === '2p') {
      if (this.keys.has('ArrowUp')) {
        s.rightPaddle.dy = -PADDLE_SPEED;
      } else if (this.keys.has('ArrowDown')) {
        s.rightPaddle.dy = PADDLE_SPEED;
      } else {
        s.rightPaddle.dy = 0;
      }
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key);

    if (e.key === 'Escape') {
      e.preventDefault();
      this.onExit();
      return;
    }

    if (e.key === 'h' || e.key === 'H') {
      this.state.showHelp = !this.state.showHelp;
      return;
    }

    const { phase } = this.state;

    if (phase === 'mode-select') {
      if (e.key === '1') {
        this.state.mode = 'ai';
        this.state.phase = 'start';
      } else if (e.key === '2') {
        this.state.mode = '2p';
        this.state.phase = 'start';
      }
      return;
    }

    if (phase === 'start' && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      this.state.phase = 'playing';
      return;
    }

    if (phase === 'win') {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.onRestart();
      } else if (e.key === 'm' || e.key === 'M') {
        this.onModeSelect();
      }
      return;
    }

    if (phase === 'playing' && e.key === 'p') {
      this.state.phase = 'paused';
      return;
    }
    if (phase === 'paused' && e.key === 'p') {
      this.state.phase = 'playing';
      return;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key);
  }
}
