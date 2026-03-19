import type { GameInstance } from '@shared/GameInterface.ts';
import { ChessEngine } from '../ChessEngine.ts';

export class PlatformAdapter implements GameInstance {
  private engine: ChessEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new ChessEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
