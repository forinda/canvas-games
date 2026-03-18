import type { GameInstance, GameHelp } from '@shared/GameInterface';
import { BasketballEngine } from '../BasketballEngine';

export class PlatformAdapter implements GameInstance {
  private engine: BasketballEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void, helpData: GameHelp) {
    this.engine = new BasketballEngine(canvas, onExit, helpData);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
