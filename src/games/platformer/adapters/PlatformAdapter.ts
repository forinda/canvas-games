import type { GameInstance } from '../../../shared/GameInterface';
import { PlatformerEngine } from '../PlatformerEngine';

export class PlatformAdapter implements GameInstance {
  private engine: PlatformerEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new PlatformerEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.stop();
  }
}
