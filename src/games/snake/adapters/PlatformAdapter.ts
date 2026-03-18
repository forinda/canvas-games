import type { GameInstance } from '../../../shared/GameInterface';
import { SnakeEngine } from '../SnakeEngine';

export class PlatformAdapter implements GameInstance {
  private engine: SnakeEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new SnakeEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
