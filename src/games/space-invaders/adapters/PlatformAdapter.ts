import type { GameInstance } from '@shared/GameInterface';
import { InvadersEngine } from '../InvadersEngine';

export class PlatformAdapter implements GameInstance {
  private engine: InvadersEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new InvadersEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
