import type { ChessState, GameMode, Position } from './types.ts';
import type { GameHelp } from '@shared/GameInterface.ts';
import { HelpOverlay } from '@shared/HelpOverlay.ts';
import { createInitialBoard } from './data/pieces.ts';
import { InputSystem } from './systems/InputSystem.ts';
import { MoveSystem } from './systems/MoveSystem.ts';
import { GameSystem } from './systems/GameSystem.ts';
import { AISystem } from './systems/AISystem.ts';
import { BoardRenderer } from './renderers/BoardRenderer.ts';
import { HUDRenderer } from './renderers/HUDRenderer.ts';

const HELP: GameHelp = {
  goal: 'Checkmate your opponent\'s king — trap it so it cannot escape capture.',
  controls: [
    { key: 'Click', action: 'Select a piece, then click destination' },
    { key: 'R', action: 'Restart game' },
    { key: 'M', action: 'Change game mode' },
    { key: 'U', action: 'Undo last move' },
    { key: 'H', action: 'Toggle help overlay' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'Control the center of the board early',
    'Develop knights and bishops before the queen',
    'Castle early to protect your king',
    'Avoid moving the same piece twice in the opening',
    'Look for forks, pins, and skewers',
  ],
};

export class ChessEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ChessState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private moveSystem: MoveSystem;
  private gameSystem: GameSystem;
  private aiSystem: AISystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private helpOverlay: HelpOverlay;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.moveSystem = new MoveSystem();
    this.gameSystem = new GameSystem(this.moveSystem);
    this.aiSystem = new AISystem(this.moveSystem);
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();
    this.helpOverlay = new HelpOverlay();

    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      onExit,
      (pos: Position) => this.onSquareClick(pos),
      (mode: GameMode) => this.onModeSelect(mode),
      () => this.resetGame(),
      () => this.helpOverlay.toggle(),
      () => this.undoMove(),
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
    if (this.state.gameOver) return;

    this.aiSystem.update(this.state, dt);

    // Check if AI has set a move target
    if (
      this.state.aiThinking &&
      this.state.selectedPosition &&
      this.state.legalMoves.length === 1 &&
      this.state.currentPlayer === 'black' &&
      this.state.mode === 'ai'
    ) {
      const from = this.state.selectedPosition;
      const to = this.state.legalMoves[0];
      this.makeMove(from, to);
      this.state.aiThinking = false;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;

    // Background
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(0, 0, W, H);

    this.boardRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state);
    this.helpOverlay.render(ctx, HELP, 'Chess', '#5d4037');
  }

  private onSquareClick(pos: Position): void {
    if (this.state.showModeSelect) return;
    if (this.state.gameOver) return;
    if (this.state.aiThinking) return;
    if (this.state.mode === 'ai' && this.state.currentPlayer === 'black') return;

    const clickedPiece = this.state.board[pos.row][pos.col];

    // If we have a piece selected and click on a legal move target
    if (this.state.selectedPosition) {
      const isLegal = this.state.legalMoves.some(
        (m) => m.row === pos.row && m.col === pos.col,
      );

      if (isLegal) {
        this.makeMove(this.state.selectedPosition, pos);
        return;
      }

      // Click on own piece -> reselect
      if (clickedPiece && clickedPiece.color === this.state.currentPlayer) {
        this.selectPiece(pos);
        return;
      }

      // Click elsewhere -> deselect
      this.state.selectedPosition = null;
      this.state.legalMoves = [];
      return;
    }

    // No piece selected -> select own piece
    if (clickedPiece && clickedPiece.color === this.state.currentPlayer) {
      this.selectPiece(pos);
    }
  }

  private selectPiece(pos: Position): void {
    this.state.selectedPosition = pos;
    this.state.legalMoves = this.moveSystem.getLegalMoves(this.state, pos);
  }

  private makeMove(from: Position, to: Position): void {
    const move = this.moveSystem.executeMove(this.state, from, to);
    this.state.moveHistory.push(move);
    this.state.lastMove = move;
    this.state.selectedPosition = null;
    this.state.legalMoves = [];

    this.gameSystem.updateGameStatus(this.state);
  }

  private undoMove(): void {
    if (this.state.moveHistory.length === 0) return;
    if (this.state.aiThinking) return;

    // In AI mode, undo two moves (player + AI)
    const undoCount = this.state.mode === 'ai' && this.state.moveHistory.length >= 2 ? 2 : 1;

    for (let i = 0; i < undoCount; i++) {
      if (this.state.moveHistory.length === 0) break;
      this.state.moveHistory.pop();
    }

    // Rebuild the state from scratch
    this.rebuildFromHistory();
  }

  private rebuildFromHistory(): void {
    const moves = [...this.state.moveHistory];
    const mode = this.state.mode;
    const w = this.state.canvasWidth;
    const h = this.state.canvasHeight;

    // Reset state
    const freshState = this.createInitialState(w, h);
    freshState.mode = mode;
    freshState.showModeSelect = false;

    // Copy relevant fields
    Object.assign(this.state, freshState);
    this.state.moveHistory = [];

    // Replay all moves
    for (const move of moves) {
      this.moveSystem.executeMove(this.state, move.from, move.to);
      this.state.moveHistory.push(move);
      // Switch turns
      this.state.currentPlayer =
        this.state.currentPlayer === 'white' ? 'black' : 'white';
    }

    // Re-evaluate game status
    this.state.isCheck = this.moveSystem.isInCheck(
      this.state.board,
      this.state.currentPlayer,
    );
    this.state.isCheckmate = false;
    this.state.isStalemate = false;
    this.state.gameOver = false;
    this.state.lastMove = moves.length > 0 ? moves[moves.length - 1] : null;
    this.state.selectedPosition = null;
    this.state.legalMoves = [];
    this.state.aiThinking = false;

    // Update king positions
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.state.board[r][c];
        if (p && p.type === 'king') {
          this.state.kingPositions[p.color] = { row: r, col: c };
        }
      }
    }
  }

  private onModeSelect(mode: GameMode): void {
    this.state.mode = mode;
    this.state.showModeSelect = false;
    this.resetGame();
  }

  private resetGame(): void {
    const mode = this.state.mode;
    const w = this.state.canvasWidth;
    const h = this.state.canvasHeight;

    const freshState = this.createInitialState(w, h);
    freshState.mode = mode;
    freshState.showModeSelect = false;

    Object.assign(this.state, freshState);
    this.aiSystem.reset();
  }

  private createInitialState(w: number, h: number): ChessState {
    return {
      board: createInitialBoard(),
      currentPlayer: 'white',
      mode: 'ai',
      selectedPosition: null,
      legalMoves: [],
      lastMove: null,
      moveHistory: [],
      capturedByWhite: [],
      capturedByBlack: [],
      castlingRights: {
        whiteKingside: true,
        whiteQueenside: true,
        blackKingside: true,
        blackQueenside: true,
      },
      enPassantTarget: null,
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      gameOver: false,
      showModeSelect: true,
      canvasWidth: w,
      canvasHeight: h,
      aiThinking: false,
      halfMoveClock: 0,
      fullMoveNumber: 1,
      animationTime: 0,
      kingPositions: {
        white: { row: 7, col: 4 },
        black: { row: 0, col: 4 },
      },
    };
  }
}
