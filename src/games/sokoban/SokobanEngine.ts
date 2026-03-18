import type { SokobanState } from './types';
import { InputSystem } from './systems/InputSystem';
import { MoveSystem } from './systems/MoveSystem';
import { LevelSystem } from './systems/LevelSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { HelpOverlay } from '@shared/HelpOverlay';
import { GAME_NAME, GAME_COLOR } from './types';
import type { GameHelp } from '@shared/GameInterface';

const HELP: GameHelp = {
  goal: 'Push all boxes onto the red target markers.',
  controls: [
    { key: 'Arrow Keys / WASD', action: 'Move player' },
    { key: 'Z', action: 'Undo last move' },
    { key: 'R', action: 'Restart current level' },
    { key: 'Space / Enter', action: 'Next level (when complete)' },
    { key: 'H', action: 'Toggle help overlay' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'You can only push boxes, never pull them.',
    'Use undo freely — there is no penalty.',
    'Boxes in corners (not on targets) are stuck forever.',
    'Plan your moves before pushing — think ahead!',
  ],
};

export class SokobanEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SokobanState;
  private running = false;
  private rafId = 0;

  private inputSystem: InputSystem;
  private moveSystem: MoveSystem;
  private levelSystem: LevelSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private helpOverlay: HelpOverlay;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize empty state — will be filled by loadLevel
    this.state = {
      grid: [],
      width: 0,
      height: 0,
      player: { x: 0, y: 0 },
      boxes: [],
      level: 0,
      moves: 0,
      undoStack: [],
      levelComplete: false,
      gameWon: false,
      paused: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      queuedDir: null,
      undoRequested: false,
      restartRequested: false,
      advanceRequested: false,
    };

    // Systems
    this.moveSystem = new MoveSystem();
    this.levelSystem = new LevelSystem();
    this.helpOverlay = new HelpOverlay();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.helpOverlay.toggle(),
    );

    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

    // Load first level
    this.levelSystem.loadLevel(this.state, 0);

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
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

    this.tick();
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private tick(): void {
    // Process move first, then level system checks win / undo / restart / advance
    this.moveSystem.update(this.state, 0);
    this.levelSystem.update(this.state, 0);
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
    this.helpOverlay.render(this.ctx, HELP, GAME_NAME, GAME_COLOR);
  }
}
