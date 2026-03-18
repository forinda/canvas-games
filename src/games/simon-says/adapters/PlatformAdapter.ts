import type { GameInstance } from '@shared/GameInterface';
import { SimonEngine } from '../SimonEngine';

export class PlatformAdapter implements GameInstance {
  private engine: SimonEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new SimonEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
