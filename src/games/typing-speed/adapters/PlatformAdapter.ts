import type { GameInstance } from '@shared/GameInterface';
import { TypingEngine } from '../TypingEngine';

export class PlatformAdapter implements GameInstance {
  private engine: TypingEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new TypingEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
