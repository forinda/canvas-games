import type { Game2048State } from './types';
import type { GameHelp } from '@shared/GameInterface';
import { createInitialState } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { HelpOverlay } from '@shared/HelpOverlay';

export class Game2048Engine {
  private ctx: CanvasRenderingContext2D;
  private state: Game2048State;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private scoreSystem: ScoreSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private helpOverlay: HelpOverlay;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void, help: GameHelp) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const highScore = ScoreSystem.loadHighScore();
    this.state = createInitialState(highScore);

    this.helpOverlay = new HelpOverlay();
    this.boardSystem = new BoardSystem();
    this.scoreSystem = new ScoreSystem(highScore);
    this.inputSystem = new InputSystem(
      this.state,
      onExit,
      () => {
        this.state.restartRequested = true;
      },
      () => this.helpOverlay.toggle(),
    );
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer(this.helpOverlay, help);

    // Initialize board with two tiles
    this.boardSystem.init(this.state);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    // Update systems
    this.boardSystem.update(this.state, dt);
    this.scoreSystem.update(this.state, dt);

    // Render
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
