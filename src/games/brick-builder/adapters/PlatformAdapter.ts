import type { GameInstance, GameHelp } from '@shared/GameInterface';
import { BrickBuilderEngine } from '../BrickBuilderEngine';

export class PlatformAdapter implements GameInstance {
  private engine: BrickBuilderEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void, helpData: GameHelp) {
    this.engine = new BrickBuilderEngine(canvas, onExit, helpData);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
