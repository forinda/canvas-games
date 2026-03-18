import type { MazeState } from './types.ts';
import {
  BASE_MAZE_W,
  BASE_MAZE_H,
  MAZE_GROW,
  REVEAL_RADIUS,
  BASE_TIME,
  TIME_PER_EXTRA_CELL,
  COMPLETION_BONUS,
} from './types.ts';
import { MazeGenerator } from './systems/MazeGenerator.ts';
import { InputSystem } from './systems/InputSystem.ts';
import { PlayerSystem } from './systems/PlayerSystem.ts';
import { TimerSystem } from './systems/TimerSystem.ts';
import { MazeRenderer } from './renderers/MazeRenderer.ts';
import { HUDRenderer } from './renderers/HUDRenderer.ts';
import { HelpOverlay } from '@shared/HelpOverlay.ts';
import type { GameHelp } from '@shared/GameInterface.ts';

const HELP: GameHelp = {
  goal: 'Navigate through the maze to the EXIT before time runs out.',
  controls: [
    { key: 'Arrow Keys / WASD', action: 'Move through the maze' },
    { key: 'P', action: 'Pause / resume' },
    { key: 'H', action: 'Toggle help overlay' },
    { key: 'Space', action: 'Start / next level / restart' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'You can only see cells within 3 squares of your position',
    'Maze size grows every level — plan your route quickly',
    'Completing a level gives +15 bonus seconds on the next',
    'Hug one wall to eventually find the exit (wall-following)',
  ],
};

export class MazeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: MazeState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private generator: MazeGenerator;
  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private timerSystem: TimerSystem;
  private mazeRenderer: MazeRenderer;
  private hudRenderer: HUDRenderer;
  private helpOverlay: HelpOverlay;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initial blank state
    this.state = this.createState(1, 0);

    // Systems
    this.generator = new MazeGenerator();
    this.inputSystem = new InputSystem(
      this.state,
      onExit,
      () => this.handleReset(),
      () => this.helpOverlay.toggle(),
    );
    this.playerSystem = new PlayerSystem(this.inputSystem);
    this.timerSystem = new TimerSystem();

    // Renderers
    this.mazeRenderer = new MazeRenderer();
    this.hudRenderer = new HUDRenderer();
    this.helpOverlay = new HelpOverlay();

    // Resize
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

    this.playerSystem.update(this.state, dt);
    this.timerSystem.update(this.state, dt);

    this.mazeRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
    this.helpOverlay.render(this.ctx, HELP, 'Maze Runner', '#607d8b');

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private handleReset(): void {
    if (!this.state.started) {
      // First start
      this.initLevel(1, 0);
    } else if (this.state.won) {
      // Next level — carry bonus time
      const bonus = COMPLETION_BONUS;
      const nextLevel = this.state.level + 1;
      const score = this.state.totalScore + this.state.level * 100 + Math.floor(this.state.timeLeft) * 10;
      this.initLevel(nextLevel, score, bonus);
    } else if (this.state.lost) {
      // Full restart
      this.initLevel(1, 0);
    }
  }

  private initLevel(level: number, totalScore: number, bonusTime = 0): void {
    const newState = this.createState(level, totalScore, bonusTime);

    // Copy reference so InputSystem keeps working (it holds a ref to state)
    Object.assign(this.state, newState);

    // Generate maze
    this.generator.generate(this.state);

    // Reveal around starting position
    this.playerSystem.revealAround(this.state);
  }

  private createState(level: number, totalScore: number, bonusTime = 0): MazeState {
    const mazeW = BASE_MAZE_W + (level - 1) * MAZE_GROW;
    const mazeH = BASE_MAZE_H + (level - 1) * MAZE_GROW;
    const extraCells = (mazeW * mazeH) - (BASE_MAZE_W * BASE_MAZE_H);
    const timeForLevel = BASE_TIME + extraCells * TIME_PER_EXTRA_CELL + bonusTime;

    return {
      grid: [],
      mazeW,
      mazeH,
      player: { x: 0, y: 0 },
      exit: { x: mazeW - 1, y: mazeH - 1 },
      revealRadius: REVEAL_RADIUS,
      revealed: new Set<string>(),
      level,
      timeLeft: timeForLevel,
      won: false,
      lost: false,
      paused: false,
      started: true,
      totalScore,
    };
  }
}
