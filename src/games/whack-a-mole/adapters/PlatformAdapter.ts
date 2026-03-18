import type { GameInstance } from '@shared/GameInterface';
import { WhackEngine } from '../WhackEngine';

export class PlatformAdapter implements GameInstance {
  private engine: WhackEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new WhackEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
