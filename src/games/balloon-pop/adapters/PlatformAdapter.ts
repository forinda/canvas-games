import type { GameInstance } from '@shared/GameInterface';
import { BalloonEngine } from '../BalloonEngine';

export class PlatformAdapter implements GameInstance {
  private engine: BalloonEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new BalloonEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
