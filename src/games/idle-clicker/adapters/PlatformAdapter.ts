import type { GameInstance } from '@shared/GameInterface.ts';
import { IdleClickerEngine } from '../IdleClickerEngine.ts';

export class PlatformAdapter implements GameInstance {
  private engine: IdleClickerEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new IdleClickerEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
