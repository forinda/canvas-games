import type { GameInstance } from '@shared/GameInterface';
import { BreakoutEngine } from '../BreakoutEngine';

export class PlatformAdapter implements GameInstance {
  private engine: BreakoutEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new BreakoutEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
