import type { GameInstance } from '@shared/GameInterface';
import { DoodleEngine } from '../DoodleEngine';

export class PlatformAdapter implements GameInstance {
  private engine: DoodleEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new DoodleEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
