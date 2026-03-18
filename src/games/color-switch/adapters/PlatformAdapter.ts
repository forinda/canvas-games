import type { GameInstance } from '@shared/GameInterface';
import { ColorSwitchEngine } from '../ColorSwitchEngine';

export class PlatformAdapter implements GameInstance {
  private engine: ColorSwitchEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new ColorSwitchEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
