import type { GameInstance } from '@shared/GameInterface';
import { LavaEngine } from '../LavaEngine';

export class PlatformAdapter implements GameInstance {
  private engine: LavaEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new LavaEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
