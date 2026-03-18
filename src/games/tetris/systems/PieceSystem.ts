import type { Updatable } from '@shared/Updatable';
import type { TetrisState } from '../types';
import { COLS, getDropInterval } from '../types';
import { PIECES, WALL_KICKS, I_WALL_KICKS } from '../data/pieces';
import { BoardSystem } from './BoardSystem';
import { ScoreSystem } from './ScoreSystem';

export class PieceSystem implements Updatable<TetrisState> {
  private boardSystem: BoardSystem;
  private scoreSystem: ScoreSystem;
  private bag: number[] = [];

  constructor(boardSystem: BoardSystem, scoreSystem: ScoreSystem) {
    this.boardSystem = boardSystem;
    this.scoreSystem = scoreSystem;
  }

  /** 7-bag randomizer: each set of 7 pieces appears once before repeating */
  private refillBag(): void {
    const indices = [0, 1, 2, 3, 4, 5, 6];
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    this.bag.push(...indices);
  }

  private nextFromBag(): number {
    if (this.bag.length < 2) this.refillBag();
    return this.bag.shift()!;
  }

  /** Spawn a new piece at the top of the board */
  spawnPiece(state: TetrisState): void {
    const defIndex = state.nextPieceIndex;
    state.nextPieceIndex = this.nextFromBag();

    const def = PIECES[defIndex];
    const cells = def.rotations[0];
    // Center piece horizontally
    const maxCol = Math.max(...cells.map(([, c]) => c));
    const spawnX = Math.floor((COLS - maxCol - 1) / 2);

    state.currentPiece = {
      defIndex,
      rotation: 0,
      x: spawnX,
      y: -1, // start slightly above board
    };

    state.dropTimer = 0;
    state.lockTimer = 0;
    state.isLocking = false;

    // Check if new piece immediately collides = game over
    if (this.boardSystem.isColliding(state.board, defIndex, 0, spawnX, 0)) {
      state.gameOver = true;
    }
  }

  /** Initialize first pieces */
  init(state: TetrisState): void {
    this.bag = [];
    this.refillBag();
    state.nextPieceIndex = this.nextFromBag();
    this.spawnPiece(state);
  }

  /** Move piece left or right, returns true if moved */
  move(state: TetrisState, dx: number): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;
    if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x + dx, piece.y)) {
      piece.x += dx;
      // Reset lock timer if piece was locking
      if (state.isLocking) {
        state.lockTimer = 0;
      }
      return true;
    }
    return false;
  }

  /** Rotate piece with wall kicks, returns true if rotated */
  rotate(state: TetrisState, direction: 1 | -1 = 1): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;

    const numRotations = PIECES[piece.defIndex].rotations.length;
    const newRotation = ((piece.rotation + direction) % numRotations + numRotations) % numRotations;
    const kicks = PIECES[piece.defIndex].id === 'I' ? I_WALL_KICKS : WALL_KICKS;

    for (const [dx, dy] of kicks) {
      if (!this.boardSystem.isColliding(state.board, piece.defIndex, newRotation, piece.x + dx, piece.y + dy)) {
        piece.rotation = newRotation;
        piece.x += dx;
        piece.y += dy;
        // Reset lock timer on successful rotation
        if (state.isLocking) {
          state.lockTimer = 0;
        }
        return true;
      }
    }
    return false;
  }

  /** Soft drop one row, returns true if dropped */
  softDrop(state: TetrisState): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;
    if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, piece.y + 1)) {
      piece.y++;
      state.dropTimer = 0;
      this.scoreSystem.awardSoftDrop(state, 1);
      return true;
    }
    return false;
  }

  /** Hard drop: instantly drop piece to lowest valid position */
  hardDrop(state: TetrisState): void {
    const piece = state.currentPiece;
    if (!piece) return;
    const ghostY = this.boardSystem.getGhostY(state);
    const distance = ghostY - piece.y;
    piece.y = ghostY;
    this.scoreSystem.awardHardDrop(state, distance);
    this.lockCurrentPiece(state);
  }

  /** Lock the current piece and handle line clears + next spawn */
  lockCurrentPiece(state: TetrisState): void {
    this.boardSystem.lockPiece(state);
    const linesCleared = this.boardSystem.detectAndClearLines(state);
    if (linesCleared > 0) {
      this.scoreSystem.awardLines(state, linesCleared);
      // Piece will spawn after clear animation finishes
      state.currentPiece = null;
    } else {
      this.spawnPiece(state);
    }
    state.isLocking = false;
    state.lockTimer = 0;
  }

  update(state: TetrisState, dt: number): void {
    if (!state.started || state.paused || state.gameOver || !state.currentPiece) return;

    // Handle line clear animation
    if (state.clearingLines.length > 0) {
      state.clearTimer += dt;
      if (state.clearTimer >= state.clearDuration) {
        this.boardSystem.removeClearedLines(state);
        this.spawnPiece(state);
      }
      return;
    }

    const piece = state.currentPiece;
    const interval = getDropInterval(state.level);

    // Gravity
    state.dropTimer += dt;
    if (state.dropTimer >= interval) {
      state.dropTimer -= interval;
      if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, piece.y + 1)) {
        piece.y++;
        state.isLocking = false;
        state.lockTimer = 0;
      } else {
        // Start lock timer
        state.isLocking = true;
      }
    }

    // Lock delay
    if (state.isLocking) {
      state.lockTimer += dt;
      if (state.lockTimer >= state.lockDelay) {
        this.lockCurrentPiece(state);
      }
    }
  }
}
