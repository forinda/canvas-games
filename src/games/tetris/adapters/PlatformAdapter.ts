import type { GameInstance } from '@shared/GameInterface';
import { TetrisEngine } from '../TetrisEngine';

export class PlatformAdapter implements GameInstance {
  private engine: TetrisEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new TetrisEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
