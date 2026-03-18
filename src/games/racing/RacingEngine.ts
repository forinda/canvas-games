import type { RacingState, Car } from './types';
import {
  TOTAL_LAPS, COUNTDOWN_SECONDS, PLAYER_COLOR,
  AI_COLORS, AI_NAMES,
} from './types';
import { defaultTrack } from './data/tracks';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { TrackSystem } from './systems/TrackSystem';
import { AISystem } from './systems/AISystem';
import { TrackRenderer } from './renderers/TrackRenderer';
import { CarRenderer } from './renderers/CarRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import type { GameHelp } from '@shared/GameInterface';
import { HelpOverlay } from '@shared/HelpOverlay';

export const racingHelp: GameHelp = {
  goal: 'Complete 3 laps around the track before your opponents!',
  controls: [
    { key: 'Up / W', action: 'Accelerate' },
    { key: 'Down / S', action: 'Brake / Reverse' },
    { key: 'Left / A', action: 'Steer left' },
    { key: 'Right / D', action: 'Steer right' },
    { key: 'P', action: 'Pause' },
    { key: 'H', action: 'Toggle help' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'Stay on the road — going off-track slows you down significantly',
    'Ease off the gas before sharp turns to avoid drifting wide',
    'Steering is less effective at high speed — brake into corners',
    'Watch the minimap positions to track your opponents',
  ],
};

export class RacingEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private state: RacingState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  // Systems
  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private trackSystem: TrackSystem;
  private aiSystem: AISystem;

  // Renderers
  private trackRenderer: TrackRenderer;
  private carRenderer: CarRenderer;
  private hudRenderer: HUDRenderer;
  private helpOverlay: HelpOverlay;

  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState();

    // Systems
    this.inputSystem = new InputSystem(
      this.state,
      onExit,
      () => this.reset(),
      () => this.helpOverlay.toggle(),
    );
    this.physicsSystem = new PhysicsSystem(this.inputSystem.keys);
    this.trackSystem = new TrackSystem();
    this.aiSystem = new AISystem();

    // Init AI data
    for (const car of this.state.aiCars) {
      this.aiSystem.initCar(car);
    }

    // Renderers
    this.trackRenderer = new TrackRenderer();
    this.carRenderer = new CarRenderer();
    this.hudRenderer = new HUDRenderer();
    this.helpOverlay = new HelpOverlay();

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
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
    const dt = Math.min(now - this.lastTime, 50); // cap at 50ms
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    if (this.helpOverlay.visible || this.state.paused) return;

    if (this.state.phase === 'countdown') {
      this.state.countdownTimer -= dt / 1000;
      if (this.state.countdownTimer <= 0) {
        this.state.phase = 'racing';
        this.state.countdownTimer = 0;
      }
      return;
    }

    if (this.state.phase === 'racing') {
      this.state.raceTime += dt / 1000;
      this.physicsSystem.update(this.state, dt);
      this.aiSystem.update(this.state, dt);
      this.trackSystem.update(this.state, dt);
      this.updateCamera();
    }
  }

  private updateCamera(): void {
    // Smooth camera follow on player
    const targetX = this.state.player.x;
    const targetY = this.state.player.y;
    const lerp = 0.1;
    this.state.cameraX += (targetX - this.state.cameraX) * lerp;
    this.state.cameraY += (targetY - this.state.cameraY) * lerp;
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);

    this.trackRenderer.render(ctx, this.state);
    this.carRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state);

    // Help overlay
    this.helpOverlay.render(ctx, racingHelp, 'Racing', '#ff5722');
  }

  private reset(): void {
    const newState = this.createInitialState();
    Object.assign(this.state, newState);

    // Reinitialize AI data
    for (const car of this.state.aiCars) {
      this.aiSystem.initCar(car);
    }
  }

  private createInitialState(): RacingState {
    const track = defaultTrack;
    const startWP = track.waypoints[0];
    const nextWP = track.waypoints[1];
    const startAngle = Math.atan2(nextWP.y - startWP.y, nextWP.x - startWP.x);

    // Player starts at first waypoint
    const player = this.createCar(
      startWP.x,
      startWP.y,
      startAngle,
      true,
      PLAYER_COLOR,
      'You',
      1,
    );

    // AI cars staggered behind player
    const dx = Math.cos(startAngle);
    const dy = Math.sin(startAngle);
    // Normal to track direction for side offset
    const nx = -dy;
    const ny = dx;

    const aiCars: Car[] = AI_COLORS.map((color, i) => {
      const backOffset = (i + 1) * 40;
      const sideOffset = ((i % 2 === 0) ? 1 : -1) * 20;
      return this.createCar(
        startWP.x - dx * backOffset + nx * sideOffset,
        startWP.y - dy * backOffset + ny * sideOffset,
        startAngle,
        false,
        color,
        AI_NAMES[i],
        1,
      );
    });

    return {
      player,
      aiCars,
      track,
      phase: 'countdown',
      countdownTimer: COUNTDOWN_SECONDS,
      raceTime: 0,
      totalLaps: TOTAL_LAPS,
      canvasW: this.canvas.width,
      canvasH: this.canvas.height,
      cameraX: startWP.x,
      cameraY: startWP.y,
      paused: false,
      positions: [player, ...aiCars],
    };
  }

  private createCar(
    x: number, y: number, angle: number,
    isPlayer: boolean, color: string, name: string,
    waypointIndex: number,
  ): Car {
    return {
      x, y, angle,
      speed: 0,
      acceleration: 0,
      isPlayer,
      color,
      name,
      waypointIndex,
      laps: 0,
      lastCheckpoint: 0,
      finished: false,
      finishTime: 0,
      skidMarks: [],
    };
  }
}
