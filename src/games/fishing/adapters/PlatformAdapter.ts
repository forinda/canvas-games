import type { GameInstance } from '@shared/GameInterface';
import { FishingEngine } from '../FishingEngine';

export class PlatformAdapter implements GameInstance {
  private engine: FishingEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new FishingEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
