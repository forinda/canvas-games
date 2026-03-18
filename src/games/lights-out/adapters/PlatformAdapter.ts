import type { GameInstance } from '@shared/GameInterface';
import { LightsOutEngine } from '../LightsOutEngine';

export class PlatformAdapter implements GameInstance {
  private engine: LightsOutEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new LightsOutEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
