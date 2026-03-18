import type { GameInstance } from '@shared/GameInterface';
import { CardBattleEngine } from '../CardBattleEngine';

export class PlatformAdapter implements GameInstance {
  private engine: CardBattleEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new CardBattleEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
