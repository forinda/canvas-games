import type { PacManState, Cell, Ghost } from './types';
import {
  MAZE_COLS,
  MAZE_ROWS,
  INITIAL_LIVES,
  HS_KEY,
} from './types';
import { MAZE_DATA } from './data/maze';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { GhostSystem } from './systems/GhostSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import type { GameHelp } from '@shared/GameInterface';
import { HelpOverlay } from '@shared/HelpOverlay';

export class PacManEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PacManState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private ghostSystem: GhostSystem;
  private collisionSystem: CollisionSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private helpOverlay: HelpOverlay;
  private help: GameHelp;
  private onExit: () => void;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void, help: GameHelp) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.buildInitialState(canvas);
    this.helpOverlay = new HelpOverlay();
    this.help = help;
    this.onExit = onExit;

    // Systems
    this.playerSystem = new PlayerSystem();
    this.ghostSystem = new GhostSystem();
    this.collisionSystem = new CollisionSystem(() => this.handleDeath());
    this.inputSystem = new InputSystem(
      this.state,
      this.onExit,
      () => this.handleRestart(),
      () => this.helpOverlay.toggle(),
    );

    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.updateCellSize(canvas);
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
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = now;

    this.state.time = now / 1000;

    if (this.state.started && !this.state.paused && !this.state.gameOver && !this.state.won) {
      this.playerSystem.update(this.state, dt);
      this.ghostSystem.update(this.state, dt);
      this.collisionSystem.update(this.state, dt);
    }

    // Update high score
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      try { localStorage.setItem(HS_KEY, String(this.state.highScore)); } catch { /* noop */ }
    }

    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
    this.helpOverlay.render(this.ctx, this.help, 'Pac-Man', '#ffeb3b');

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private handleDeath(): void {
    this.state.lives--;
    if (this.state.lives <= 0) {
      this.state.gameOver = true;
    } else {
      // Reset positions, keep score and dots
      this.resetPositions();
    }
  }

  private handleRestart(): void {
    if (this.state.won) {
      // Next level
      const nextLevel = this.state.level + 1;
      const score = this.state.score;
      const lives = this.state.lives;
      const hs = this.state.highScore;
      const canvas = this.ctx.canvas;
      this.state = this.buildInitialState(canvas);
      this.state.level = nextLevel;
      this.state.score = score;
      this.state.lives = lives;
      this.state.highScore = hs;
      this.state.started = true;
      this.rebuildInputSystem();
    } else {
      // Full reset
      const hs = this.state.highScore;
      const canvas = this.ctx.canvas;
      this.state = this.buildInitialState(canvas);
      this.state.highScore = hs;
      this.state.started = true;
      this.rebuildInputSystem();
    }
    this.collisionSystem = new CollisionSystem(() => this.handleDeath());
  }

  private rebuildInputSystem(): void {
    this.inputSystem.detach();
    this.inputSystem = new InputSystem(
      this.state,
      this.onExit,
      () => this.handleRestart(),
      () => this.helpOverlay.toggle(),
    );
    this.inputSystem.attach();
  }

  private buildInitialState(canvas: HTMLCanvasElement): PacManState {
    const grid: Cell[][] = [];
    let totalDots = 0;
    let playerStart = { x: 13.5, y: 23 };
    const ghostStarts: { x: number; y: number }[] = [];

    for (let y = 0; y < MAZE_ROWS; y++) {
      const row: Cell[] = [];
      const line = MAZE_DATA[y] || '';
      for (let x = 0; x < MAZE_COLS; x++) {
        const ch = line[x] || ' ';
        let type: Cell['type'] = 'empty';
        switch (ch) {
          case '#': type = 'wall'; break;
          case '.': type = 'dot'; totalDots++; break;
          case 'o': type = 'power'; totalDots++; break;
          case '-': type = 'door'; break;
          case 'P':
            playerStart = { x, y };
            type = 'empty';
            break;
          case 'G':
            ghostStarts.push({ x, y });
            type = 'empty';
            break;
        }
        row.push({ type });
      }
      grid.push(row);
    }

    let hs = 0;
    try { hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0; } catch { /* noop */ }

    const ghosts: Ghost[] = [
      {
        name: 'blinky',
        pos: { x: 13.5, y: 11 },
        dir: 'left',
        mode: 'scatter',
        scatterTarget: { x: MAZE_COLS - 3, y: -3 },
        homePos: ghostStarts[0] ?? { x: 13, y: 14 },
        color: '#ff0000',
        active: true,
        releaseTimer: 0,
        eaten: false,
      },
      {
        name: 'pinky',
        pos: { ...(ghostStarts[1] ?? { x: 13, y: 14 }) },
        dir: 'up',
        mode: 'scatter',
        scatterTarget: { x: 2, y: -3 },
        homePos: ghostStarts[1] ?? { x: 13, y: 14 },
        color: '#ffb8ff',
        active: false,
        releaseTimer: 3,
        eaten: false,
      },
      {
        name: 'inky',
        pos: { ...(ghostStarts[2] ?? { x: 11, y: 14 }) },
        dir: 'up',
        mode: 'scatter',
        scatterTarget: { x: MAZE_COLS - 1, y: MAZE_ROWS + 1 },
        homePos: ghostStarts[2] ?? { x: 11, y: 14 },
        color: '#00ffff',
        active: false,
        releaseTimer: 7,
        eaten: false,
      },
      {
        name: 'clyde',
        pos: { ...(ghostStarts[3] ?? { x: 15, y: 14 }) },
        dir: 'up',
        mode: 'scatter',
        scatterTarget: { x: 0, y: MAZE_ROWS + 1 },
        homePos: ghostStarts[3] ?? { x: 15, y: 14 },
        color: '#ffb852',
        active: false,
        releaseTimer: 12,
        eaten: false,
      },
    ];

    const cs = this.computeCellSize(canvas.width, canvas.height);
    const offsetX = (canvas.width - MAZE_COLS * cs) / 2;
    const offsetY = (canvas.height - MAZE_ROWS * cs) / 2 + 10;

    return {
      grid,
      gridWidth: MAZE_COLS,
      gridHeight: MAZE_ROWS,
      pacman: {
        pos: { ...playerStart },
        dir: 'none',
        nextDir: 'none',
        mouthAngle: 0.4,
        mouthOpening: true,
      },
      ghosts,
      score: 0,
      highScore: hs,
      lives: INITIAL_LIVES,
      level: 1,
      totalDots,
      dotsEaten: 0,
      frightenedTimer: 0,
      frightenedGhostsEaten: 0,
      modeTimer: 0,
      modeIndex: 0,
      globalMode: 'scatter',
      gameOver: false,
      paused: false,
      started: false,
      won: false,
      time: 0,
      cellSize: cs,
      offsetX,
      offsetY,
    };
  }

  private resetPositions(): void {
    const s = this.state;
    // Find player start from maze data
    let px = 13.5;
    let py = 23;
    for (let y = 0; y < MAZE_ROWS; y++) {
      const line = MAZE_DATA[y] || '';
      for (let x = 0; x < MAZE_COLS; x++) {
        if (line[x] === 'P') { px = x; py = y; }
      }
    }

    s.pacman.pos = { x: px, y: py };
    s.pacman.dir = 'none';
    s.pacman.nextDir = 'none';

    // Reset ghost positions
    s.ghosts[0].pos = { x: 13.5, y: 11 };
    s.ghosts[0].dir = 'left';
    s.ghosts[0].active = true;
    s.ghosts[0].eaten = false;
    s.ghosts[0].mode = 'scatter';

    for (let i = 1; i < s.ghosts.length; i++) {
      const g = s.ghosts[i];
      g.pos = { ...g.homePos };
      g.dir = 'up';
      g.active = false;
      g.eaten = false;
      g.releaseTimer = 3 + i * 3;
      g.mode = 'scatter';
    }

    s.frightenedTimer = 0;
    s.modeTimer = 0;
    s.modeIndex = 0;
    s.globalMode = 'scatter';
  }

  private computeCellSize(w: number, h: number): number {
    const maxW = (w - 20) / MAZE_COLS;
    const maxH = (h - 60) / MAZE_ROWS;
    return Math.floor(Math.min(maxW, maxH));
  }

  private updateCellSize(canvas: HTMLCanvasElement): void {
    const cs = this.computeCellSize(canvas.width, canvas.height);
    this.state.cellSize = cs;
    this.state.offsetX = (canvas.width - MAZE_COLS * cs) / 2;
    this.state.offsetY = (canvas.height - MAZE_ROWS * cs) / 2 + 10;
  }
}
