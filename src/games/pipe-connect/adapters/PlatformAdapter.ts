import type { GameInstance, GameHelp } from '@shared/GameInterface';
import { PipeEngine } from '../PipeEngine';

export class PlatformAdapter implements GameInstance {
  private engine: PipeEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void, help: GameHelp) {
    this.engine = new PipeEngine(canvas, onExit, help);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
