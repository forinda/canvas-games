import type { GameInstance } from '../../../shared/GameInterface';
import { PuzzleEngine } from '../PuzzleEngine';
import { InventorySystem } from '../systems/InventorySystem';
import { InputSystem } from '../systems/InputSystem';

export class PlatformAdapter implements GameInstance {
  private engine: PuzzleEngine;
  private input: InputSystem;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new PuzzleEngine(canvas);
    const inventory = new InventorySystem();

    this.input = new InputSystem(
      canvas,
      onExit,
      () => this.engine.state,
      (s) => { this.engine.state = s; },
      inventory,
    );

    this.input.attach();
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.stop();
    this.input.detach();
  }
}
