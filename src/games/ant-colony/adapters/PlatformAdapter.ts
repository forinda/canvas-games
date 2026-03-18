import type { GameInstance } from '@shared/GameInterface';
import { AntColonyEngine } from '../AntColonyEngine';

export class PlatformAdapter implements GameInstance {
  private engine: AntColonyEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new AntColonyEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
