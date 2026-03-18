import type { GameInstance } from '@shared/GameInterface';
import { FlappyEngine } from '../FlappyEngine';

export class PlatformAdapter implements GameInstance {
  private engine: FlappyEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new FlappyEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
