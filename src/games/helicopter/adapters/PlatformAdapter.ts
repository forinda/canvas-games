import type { GameInstance } from '@shared/GameInterface';
import { HelicopterEngine } from '../HelicopterEngine';

export class PlatformAdapter implements GameInstance {
  private engine: HelicopterEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new HelicopterEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
