import type { TicTacToeState, GameMode } from './types.ts';
import type { GameHelp } from '@shared/GameInterface.ts';
import { HelpOverlay } from '@shared/HelpOverlay.ts';
import { InputSystem } from './systems/InputSystem.ts';
import { BoardSystem } from './systems/BoardSystem.ts';
import { AISystem } from './systems/AISystem.ts';
import { BoardRenderer } from './renderers/BoardRenderer.ts';
import { HUDRenderer } from './renderers/HUDRenderer.ts';

const HELP: GameHelp = {
  goal: 'Get three in a row (horizontally, vertically, or diagonally) to win.',
  controls: [
    { key: 'Click', action: 'Place your mark on an empty cell' },
    { key: 'R', action: 'Restart current game' },
    { key: 'M', action: 'Change game mode' },
    { key: 'H', action: 'Toggle help overlay' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'In AI mode, the computer plays as O and is unbeatable',
    'Try to control the center and corners for an advantage',
    'A perfect game against the AI always ends in a draw',
  ],
};

export class TicTacToeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: TicTacToeState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private boardSystem: BoardSystem;
  private aiSystem: AISystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private helpOverlay: HelpOverlay;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.boardSystem = new BoardSystem();
    this.aiSystem = new AISystem();
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();
    this.helpOverlay = new HelpOverlay();

    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      onExit,
      (index: number) => this.onCellClick(index),
      (mode: GameMode) => this.onModeSelect(mode),
      () => this.resetBoard(),
      () => this.helpOverlay.toggle(),
    );

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    if (this.state.showModeSelect) return;

    this.boardSystem.update(this.state, dt);
    this.aiSystem.update(this.state, dt);

    // Process AI move
    if (this.state.lastClickCell !== null && !this.state.gameOver) {
      const cell = this.state.lastClickCell;
      this.state.lastClickCell = null;
      this.boardSystem.placeMark(this.state, cell);
    }
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
    this.helpOverlay.render(this.ctx, HELP, 'Tic-Tac-Toe', '#ef5350');
  }

  private onCellClick(index: number): void {
    if (this.state.showModeSelect) return;
    if (this.state.gameOver) return;
    if (this.state.aiThinking) return;
    if (this.state.mode === 'ai' && this.state.currentPlayer === 'O') return;

    this.boardSystem.placeMark(this.state, index);
  }

  private onModeSelect(mode: GameMode): void {
    this.state.mode = mode;
    this.state.showModeSelect = false;
    this.state.scoreX = 0;
    this.state.scoreO = 0;
    this.state.draws = 0;
    this.resetBoard();
  }

  private resetBoard(): void {
    this.state.board = [null, null, null, null, null, null, null, null, null];
    this.state.currentPlayer = 'X';
    this.state.winner = null;
    this.state.winLine = null;
    this.state.isDraw = false;
    this.state.gameOver = false;
    this.state.cellAnimations = [];
    this.state.aiThinking = false;
    this.state.lastClickCell = null;
    this.aiSystem.reset();
  }

  private createInitialState(w: number, h: number): TicTacToeState {
    return {
      board: [null, null, null, null, null, null, null, null, null],
      currentPlayer: 'X',
      mode: 'ai',
      winner: null,
      winLine: null,
      isDraw: false,
      gameOver: false,
      paused: false,
      scoreX: 0,
      scoreO: 0,
      draws: 0,
      canvasWidth: w,
      canvasHeight: h,
      cellAnimations: [],
      aiThinking: false,
      showModeSelect: true,
      lastClickCell: null,
      animationTime: 0,
    };
  }
}
