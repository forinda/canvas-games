import type { GameDefinition, GameInstance } from '@shared/GameInterface';
import { GameEngine } from './game-engine';

class TowerDefenseInstance implements GameInstance {
  private engine: GameEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new GameEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.stop();
  }
}

export const TowerDefenseGame: GameDefinition = {
  id: 'tower-defense',
  name: 'Tower Defense',
  description: 'Place towers, survive the waves!',
  icon: '🏰',
  color: '#2ecc71',
  create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
    const instance = new TowerDefenseInstance(canvas, onExit);
    instance.start();
    return instance;
  },
};
