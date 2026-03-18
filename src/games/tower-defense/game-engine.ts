import type { GameStateData, GameMode } from './types';
import { createInitialState, createMenuState } from './GameState';

// Systems
import { GridSystem } from './systems/GridSystem';
import { EnemySystem } from './systems/EnemySystem';
import { TowerSystem } from './systems/TowerSystem';
import { CombatSystem } from './systems/CombatSystem';
import { WaveSystem } from './systems/WaveSystem';
import { InputSystem } from './systems/InputSystem';

// Renderers
import { GridRenderer } from './renderers/GridRenderer';
import { TowerRenderer } from './renderers/TowerRenderer';
import { EnemyRenderer } from './renderers/EnemyRenderer';
import { ProjectileRenderer } from './renderers/ProjectileRenderer';
import { ParticleRenderer } from './renderers/ParticleRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { UIRenderer } from './renderers/UIRenderer';
import { MenuRenderer } from './renderers/MenuRenderer';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameStateData;
  // Systems
  private grid: GridSystem;
  private input: InputSystem;

  // Renderers
  private gridRenderer: GridRenderer;
  private towerRenderer: TowerRenderer;
  private enemyRenderer: EnemyRenderer;
  private projectileRenderer: ProjectileRenderer;
  private particleRenderer: ParticleRenderer;
  private hudRenderer: HUDRenderer;
  private uiRenderer: UIRenderer;
  private menuRenderer: MenuRenderer;

  // Timing
  private lastTime = 0;
  private rafId = 0;
  private running = false;

  // Bound handlers for cleanup
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    // Init state
    this.state = createMenuState();

    // Init systems
    this.grid = new GridSystem();
    this.input = new InputSystem(
      canvas,
      this.grid,
      () => this.state,
      () => {},
      onExit,
    );

    // Init renderers
    this.gridRenderer = new GridRenderer();
    this.towerRenderer = new TowerRenderer();
    this.enemyRenderer = new EnemyRenderer();
    this.projectileRenderer = new ProjectileRenderer();
    this.particleRenderer = new ParticleRenderer();
    this.hudRenderer = new HUDRenderer();
    this.uiRenderer = new UIRenderer();
    this.menuRenderer = new MenuRenderer();

    // Initial layout
    this.resizeHandler = () => this.handleResize();
    this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.grid.updateLayout(
      this.canvas.width,
      this.canvas.height,
      this.hudRenderer.height,
      this.uiRenderer.panelHeight,
    );
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    // Check for new game request from input system
    const newMode = (this.canvas as any).__requestNewGame as GameMode | undefined;
    if (newMode) {
      (this.canvas as any).__requestNewGame = undefined;
      this.state = createInitialState(newMode);
    }

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    const state = this.state;

    if (state.screen !== 'playing') return;

    WaveSystem.update(state);
    EnemySystem.update(state, dt, this.grid);
    TowerSystem.update(state, this.grid);
    CombatSystem.update(state, dt);
    this.particleRenderer.update(state, dt);

    // Update damage numbers
    const MAX_DAMAGE_NUMBERS = 40;
    for (const dn of state.damageNumbers) {
      dn.age += dt;
      dn.y -= 40 * dt;
      dn.alpha = Math.max(0, 1 - dn.age / 0.8);
    }
    state.damageNumbers = state.damageNumbers.filter(dn => dn.alpha > 0);
    if (state.damageNumbers.length > MAX_DAMAGE_NUMBERS) {
      state.damageNumbers.splice(0, state.damageNumbers.length - MAX_DAMAGE_NUMBERS);
    }

    // Update placement fail timer
    if (state.placementFail) {
      state.placementFail.timer -= dt;
      if (state.placementFail.timer <= 0) {
        state.placementFail = null;
      }
    }
  }

  private render(): void {
    const { ctx, canvas, state } = this;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a140a';
    ctx.fillRect(0, 0, W, H);

    if (state.screen === 'menu') {
      this.menuRenderer.render(ctx, state, W, H, this.input);
      return;
    }

    // Game board
    this.gridRenderer.render(ctx, state, this.grid);
    this.towerRenderer.render(ctx, state, this.grid);
    this.enemyRenderer.render(ctx, state, this.grid.cellSize);
    this.projectileRenderer.render(ctx, state);
    this.particleRenderer.render(ctx, state);

    // HUD
    this.hudRenderer.render(ctx, state, W);

    // Tower selection / upgrade panel
    this.uiRenderer.render(ctx, state, W, H, this.grid, this.input);

    // Overlay screens
    if (state.screen === 'paused' || state.screen === 'gameover' || state.screen === 'win') {
      this.menuRenderer.render(ctx, state, W, H, this.input);
    }

    // Wave announce flash
    if (state.waveInProgress && state.spawnQueue.length > 0) {
      const pct = Math.abs(Math.sin(performance.now() * 0.003));
      if (pct > 0.7) {
        ctx.fillStyle = `rgba(46,204,113,${(pct - 0.7) * 0.3})`;
        ctx.fillRect(0, 0, W, H);

        ctx.font = `bold ${Math.min(32, W * 0.04)}px monospace`;
        ctx.fillStyle = `rgba(46,204,113,${(pct - 0.7) * 2})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`WAVE ${state.currentWave}`, W / 2, this.hudRenderer.height + 12);
      }
    }

    // Boss wave announcement
    const now = performance.now();
    if (state.bossAnnounceUntil > now) {
      const remaining = state.bossAnnounceUntil - now;
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
      const alpha = Math.min(1, remaining / 500);
      ctx.fillStyle = `rgba(192,57,43,${0.15 * pulse * alpha})`;
      ctx.fillRect(0, 0, W, H);

      ctx.font = `bold ${Math.min(48, W * 0.06)}px monospace`;
      ctx.fillStyle = `rgba(231,76,60,${(0.7 + 0.3 * pulse) * alpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#e74c3c';
      ctx.shadowBlur = 20 * pulse;
      ctx.fillText('BOSS INCOMING!', W / 2, H * 0.35);
      ctx.shadowBlur = 0;
    }

    // Floating damage numbers
    for (const dn of state.damageNumbers) {
      ctx.globalAlpha = dn.alpha;
      ctx.font = `bold ${Math.min(14, W * 0.018)}px monospace`;
      ctx.fillStyle = dn.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dn.text, dn.x, dn.y);
    }
    ctx.globalAlpha = 1;

    // Placement fail flash
    if (state.placementFail) {
      const { col, row, timer } = state.placementFail;
      const cs = this.grid.cellSize;
      const fx = col * cs;
      const fy = this.grid.gridOffsetY + row * cs;
      const flashAlpha = Math.min(1, timer * 3);
      ctx.fillStyle = `rgba(255,60,60,${0.35 * flashAlpha})`;
      ctx.fillRect(fx, fy, cs, cs);
      ctx.strokeStyle = `rgba(255,60,60,${0.8 * flashAlpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(fx + 1, fy + 1, cs - 2, cs - 2);
    }
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
    this.input.destroy();
  }
}
