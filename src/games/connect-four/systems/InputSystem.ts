import type { InputHandler } from '@shared/InputHandler.ts';
import type { ConnectFourState } from '../types.ts';

export class InputSystem implements InputHandler {
  private canvas: HTMLCanvasElement;
  private state: ConnectFourState;
  private onExit: () => void;
  private onColumnClick: (col: number) => void;
  private onModeSelect: (mode: 'ai' | '2player') => void;
  private onRestart: () => void;
  private onToggleHelp: () => void;

  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private leaveHandler: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: ConnectFourState,
    onExit: () => void,
    onColumnClick: (col: number) => void,
    onModeSelect: (mode: 'ai' | '2player') => void,
    onRestart: () => void,
    onToggleHelp: () => void,
  ) {
    this.canvas = canvas;
    this.state = state;
    this.onExit = onExit;
    this.onColumnClick = onColumnClick;
    this.onModeSelect = onModeSelect;
    this.onRestart = onRestart;
    this.onToggleHelp = onToggleHelp;

    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.moveHandler = (e: MouseEvent) => this.handleMove(e);
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
    this.leaveHandler = () => { this.state.hoverCol = -1; };
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('mousemove', this.moveHandler);
    this.canvas.addEventListener('mouseleave', this.leaveHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
    this.canvas.removeEventListener('mouseleave', this.leaveHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const s = this.state;

    if (s.showModeSelect) {
      this.handleModeSelectClick(mx, my, s.canvasWidth, s.canvasHeight);
      return;
    }

    if (s.gameOver) {
      this.onRestart();
      return;
    }

    const col = this.getColumnAtPosition(mx);
    if (col >= 0) {
      this.onColumnClick(col);
    }
  }

  private handleMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    this.state.hoverCol = this.getColumnAtPosition(mx);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.onExit();
    } else if (e.key === 'r' || e.key === 'R') {
      this.onRestart();
    } else if (e.key === 'h' || e.key === 'H') {
      this.onToggleHelp();
    } else if (e.key === 'm' || e.key === 'M') {
      this.state.showModeSelect = true;
      this.state.gameOver = false;
    }
  }

  private handleModeSelectClick(mx: number, my: number, W: number, H: number): void {
    const btnW = 200;
    const btnH = 50;
    const centerX = W / 2;
    const centerY = H / 2;

    // AI button
    const aiX = centerX - btnW / 2;
    const aiY = centerY - 10 - btnH;
    if (mx >= aiX && mx <= aiX + btnW && my >= aiY && my <= aiY + btnH) {
      this.onModeSelect('ai');
      return;
    }

    // 2-player button
    const twoX = centerX - btnW / 2;
    const twoY = centerY + 10;
    if (mx >= twoX && mx <= twoX + btnW && my >= twoY && my <= twoY + btnH) {
      this.onModeSelect('2player');
      return;
    }
  }

  private getColumnAtPosition(mx: number): number {
    const s = this.state;
    const boardMetrics = this.getBoardMetrics(s.canvasWidth, s.canvasHeight);
    const col = Math.floor((mx - boardMetrics.boardX) / boardMetrics.cellSize);
    if (col >= 0 && col < 7) {
      return col;
    }
    return -1;
  }

  private getBoardMetrics(W: number, H: number): { boardX: number; cellSize: number } {
    const cellSize = Math.min((W - 40) / 7, (H - 140) / 7);
    const boardW = cellSize * 7;
    const boardX = (W - boardW) / 2;
    return { boardX, cellSize };
  }
}
