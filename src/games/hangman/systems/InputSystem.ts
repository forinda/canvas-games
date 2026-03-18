import type { InputHandler } from '@shared/InputHandler';
import type { HangmanState } from '../types';
import { ALPHABET } from '../types';

export class InputSystem implements InputHandler {
  private state: HangmanState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onRestart: () => void;
  private onGuess: (letter: string) => void;
  private onToggleHelp: () => void;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    state: HangmanState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onRestart: () => void,
    onGuess: (letter: string) => void,
    onToggleHelp: () => void
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onRestart = onRestart;
    this.onGuess = onGuess;
    this.onToggleHelp = onToggleHelp;

    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.onExit();
      return;
    }

    if (e.key === 'h' || e.key === 'H') {
      this.onToggleHelp();
      return;
    }

    if (this.state.phase !== 'playing') {
      if (e.key === ' ' || e.key === 'Enter') {
        this.onRestart();
      }
      return;
    }

    const letter = e.key.toUpperCase();
    if (ALPHABET.includes(letter)) {
      this.onGuess(letter);
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on-screen keyboard
    const keyLayout = this.getKeyboardLayout();
    for (const key of keyLayout) {
      if (x >= key.x && x <= key.x + key.w && y >= key.y && y <= key.y + key.h) {
        if (this.state.phase === 'playing') {
          this.onGuess(key.letter);
        }
        return;
      }
    }

    // Check restart button area when game is over
    if (this.state.phase !== 'playing') {
      const W = this.state.canvasWidth;
      const H = this.state.canvasHeight;
      const btnW = 200;
      const btnH = 44;
      const btnX = (W - btnW) / 2;
      const btnY = H / 2 + 40;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        this.onRestart();
      }
    }
  }

  getKeyboardLayout(): { letter: string; x: number; y: number; w: number; h: number }[] {
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    const keySize = Math.min(40, (W - 60) / 10);
    const keyGap = 4;
    const totalKeyH = rows.length * (keySize + keyGap);
    const startY = H - totalKeyH - 30;
    const keys: { letter: string; x: number; y: number; w: number; h: number }[] = [];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const rowW = row.length * (keySize + keyGap) - keyGap;
      const startX = (W - rowW) / 2;
      for (let c = 0; c < row.length; c++) {
        keys.push({
          letter: row[c],
          x: startX + c * (keySize + keyGap),
          y: startY + r * (keySize + keyGap),
          w: keySize,
          h: keySize,
        });
      }
    }

    return keys;
  }
}
