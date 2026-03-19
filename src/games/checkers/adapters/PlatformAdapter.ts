import type { GameInstance } from '@shared/GameInterface';
import { CheckersEngine } from '../CheckersEngine';

export class PlatformAdapter implements GameInstance {
  private engine: CheckersEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new CheckersEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
