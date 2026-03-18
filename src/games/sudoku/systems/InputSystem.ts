import type { InputHandler } from '@shared/InputHandler';
import { GRID, type SudokuState, type Difficulty, DIFFICULTY_PRESETS } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem implements InputHandler {
  private state: SudokuState;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;
  private onExit: () => void;
  private onReset: (diff?: Difficulty) => void;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    state: SudokuState,
    canvas: HTMLCanvasElement,
    boardSystem: BoardSystem,
    onExit: () => void,
    onReset: (diff?: Difficulty) => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.boardSystem = boardSystem;
    this.onExit = onExit;
    this.onReset = onReset;

    this.keyHandler = this.handleKey.bind(this);
    this.clickHandler = this.handleClick.bind(this);
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
    const key = e.key;

    // ESC to exit
    if (key === 'Escape') {
      this.onExit();
      return;
    }

    // R to restart
    if (key === 'r' || key === 'R') {
      this.onReset();
      return;
    }

    // N to toggle notes mode
    if (key === 'n' || key === 'N') {
      this.state.notesMode = !this.state.notesMode;
      return;
    }

    // Z for undo
    if ((key === 'z' || key === 'Z') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.boardSystem.undo(this.state);
      return;
    }
    if (key === 'u' || key === 'U') {
      this.boardSystem.undo(this.state);
      return;
    }

    // Number keys 1-9
    if (key >= '1' && key <= '9') {
      this.boardSystem.placeNumber(this.state, parseInt(key));
      return;
    }

    // 0, Delete, Backspace to clear
    if (key === '0' || key === 'Delete' || key === 'Backspace') {
      this.boardSystem.clearCell(this.state);
      return;
    }

    // Arrow keys for cell navigation
    if (key === 'ArrowUp' && this.state.selectedRow > 0) {
      this.state.selectedRow--;
    } else if (key === 'ArrowDown' && this.state.selectedRow < GRID - 1) {
      this.state.selectedRow++;
    } else if (key === 'ArrowLeft' && this.state.selectedCol > 0) {
      this.state.selectedCol--;
    } else if (key === 'ArrowRight' && this.state.selectedCol < GRID - 1) {
      this.state.selectedCol++;
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const s = this.state;

    // Check HUD buttons
    if (this.handleHUDClick(mx, my)) return;

    // Check board click
    const col = Math.floor((mx - s.offsetX) / s.cellSize);
    const row = Math.floor((my - s.offsetY) / s.cellSize);

    if (row >= 0 && row < GRID && col >= 0 && col < GRID) {
      s.selectedRow = row;
      s.selectedCol = col;
    }
  }

  private handleHUDClick(mx: number, my: number): boolean {
    const s = this.state;
    const W = this.canvas.width;

    // Number pad: row of 1-9 buttons below the board
    const padY = s.offsetY + GRID * s.cellSize + 15;
    const padBtnSize = Math.min(s.cellSize, 40);
    const padTotalW = 9 * padBtnSize + 8 * 4;
    const padStartX = (W - padTotalW) / 2;

    if (my >= padY && my <= padY + padBtnSize) {
      for (let i = 0; i < 9; i++) {
        const bx = padStartX + i * (padBtnSize + 4);
        if (mx >= bx && mx <= bx + padBtnSize) {
          this.boardSystem.placeNumber(s, i + 1);
          return true;
        }
      }
    }

    // Notes toggle button (to the right of number pad)
    const notesX = padStartX + padTotalW + 12;
    const notesW = 60;
    if (mx >= notesX && mx <= notesX + notesW && my >= padY && my <= padY + padBtnSize) {
      s.notesMode = !s.notesMode;
      return true;
    }

    // New game / difficulty buttons at top
    const btnY = 8;
    const btnH = 28;
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    let btnX = 10;
    for (const diff of difficulties) {
      const label = DIFFICULTY_PRESETS[diff].label;
      const btnW = label.length * 9 + 16;
      if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
        this.onReset(diff);
        return true;
      }
      btnX += btnW + 8;
    }

    return false;
  }
}
