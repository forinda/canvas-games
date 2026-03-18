import type { GameStateData } from '../types';
import { GridSystem, tryPlaceTower, trySellTower, tryUpgradeTower } from './GridSystem';
import { WaveSystem } from './WaveSystem';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private grid: GridSystem;
  private state!: GameStateData;
  private onStateChange!: () => void;
  private onExit: () => void;

  // UI button hit areas (set by UIRenderer)
  towerCardRects: { type: string; x: number; y: number; w: number; h: number }[] = [];
  startWaveRect: { x: number; y: number; w: number; h: number } | null = null;
  upgradeRect: { x: number; y: number; w: number; h: number } | null = null;
  sellRect: { x: number; y: number; w: number; h: number } | null = null;
  closePanelRect: { x: number; y: number; w: number; h: number } | null = null;

  // Menu button rects (set by MenuRenderer)
  menuButtonRects: { label: string; x: number; y: number; w: number; h: number }[] = [];

  // Bound handlers for cleanup
  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private contextHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    grid: GridSystem,
    getState: () => GameStateData,
    onStateChange: () => void,
    onExit: () => void,
  ) {
    this.canvas = canvas;
    this.grid = grid;
    this.onStateChange = onStateChange;
    this.onExit = onExit;

    this.clickHandler = (e: MouseEvent) => {
      this.state = getState();
      this.handleClick(e.clientX, e.clientY);
    };

    this.moveHandler = (e: MouseEvent) => {
      this.state = getState();
      this.handleMouseMove(e.clientX, e.clientY);
    };

    this.contextHandler = (e: MouseEvent) => {
      e.preventDefault();
      this.state = getState();
      this.state.selectedTowerType = null;
      this.state.selectedPlacedTowerId = null;
    };

    this.keyHandler = (e: KeyboardEvent) => {
      this.state = getState();
      if (e.key === 'Escape') {
        this.state.selectedTowerType = null;
        this.state.selectedPlacedTowerId = null;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (this.state.screen === 'playing') {
          WaveSystem.startNextWave(this.state);
        }
      }
      if (e.key === 'p' || e.key === 'P') {
        if (this.state.screen === 'playing') {
          this.state.screen = 'paused';
          this.state.pausedAt = performance.now();
        } else if (this.state.screen === 'paused') {
          const pauseDuration = performance.now() - this.state.pausedAt;
          for (const item of this.state.spawnQueue) {
            item.scheduledAt += pauseDuration;
          }
          this.state.pausedAt = 0;
          this.state.screen = 'playing';
        }
      }
    };

    canvas.addEventListener('click', this.clickHandler);
    canvas.addEventListener('mousemove', this.moveHandler);
    canvas.addEventListener('contextmenu', this.contextHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  destroy(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
    this.canvas.removeEventListener('contextmenu', this.contextHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private handleMouseMove(clientX: number, clientY: number): void {
    const { x, y } = this.getCanvasCoords(clientX, clientY);
    const cell = this.grid.pixelToCell(x, y);
    this.state.hoveredCell = cell;
  }

  private handleClick(clientX: number, clientY: number): void {
    const { x, y } = this.getCanvasCoords(clientX, clientY);
    const state = this.state;

    // Menu / Game Over screens
    if (state.screen === 'menu' || state.screen === 'gameover' || state.screen === 'win') {
      for (const btn of this.menuButtonRects) {
        if (this.hitTest(x, y, btn)) {
          this.handleMenuButton(btn.label);
          return;
        }
      }
      return;
    }

    if (state.screen === 'paused') {
      for (const btn of this.menuButtonRects) {
        if (this.hitTest(x, y, btn)) {
          this.handleMenuButton(btn.label);
          return;
        }
      }
      return;
    }

    if (state.screen !== 'playing') return;

    // Upgrade panel buttons
    if (state.selectedPlacedTowerId) {
      if (this.upgradeRect && this.hitTest(x, y, this.upgradeRect)) {
        tryUpgradeTower(state, state.selectedPlacedTowerId);
        return;
      }
      if (this.sellRect && this.hitTest(x, y, this.sellRect)) {
        if (state.pendingSellTowerId === state.selectedPlacedTowerId) {
          trySellTower(state, state.selectedPlacedTowerId);
          state.selectedPlacedTowerId = null;
          state.pendingSellTowerId = null;
        } else {
          state.pendingSellTowerId = state.selectedPlacedTowerId;
        }
        return;
      }
      if (this.closePanelRect && this.hitTest(x, y, this.closePanelRect)) {
        state.selectedPlacedTowerId = null;
        state.pendingSellTowerId = null;
        return;
      }
    }

    // Start Wave button
    if (this.startWaveRect && this.hitTest(x, y, this.startWaveRect)) {
      WaveSystem.startNextWave(state);
      return;
    }

    // Tower selection panel
    for (const card of this.towerCardRects) {
      if (this.hitTest(x, y, card)) {
        if (state.selectedTowerType === card.type) {
          state.selectedTowerType = null;
        } else {
          state.selectedTowerType = card.type as any;
          state.selectedPlacedTowerId = null;
        }
        return;
      }
    }

    // Grid click
    const cell = this.grid.pixelToCell(x, y);
    if (!cell) {
      state.selectedTowerType = null;
      state.selectedPlacedTowerId = null;
      return;
    }

    const gridCell = state.grid[cell.row]?.[cell.col];
    if (!gridCell) return;

    if (gridCell.type === 'tower' && gridCell.towerId) {
      state.selectedPlacedTowerId = gridCell.towerId;
      state.selectedTowerType = null;
      return;
    }

    if (state.selectedTowerType && gridCell.type === 'empty') {
      tryPlaceTower(state, cell.col, cell.row, state.selectedTowerType, this.grid);
      return;
    }

    state.selectedTowerType = null;
    state.selectedPlacedTowerId = null;
  }

  private handleMenuButton(label: string): void {
    const state = this.state;
    switch (label) {
      case 'classic':
        Object.assign(state, this.freshState('classic'));
        break;
      case 'endless':
        Object.assign(state, this.freshState('endless'));
        break;
      case 'challenge':
        Object.assign(state, this.freshState('challenge'));
        break;
      case 'restart':
        Object.assign(state, this.freshState(state.mode));
        break;
      case 'menu':
        state.screen = 'menu';
        break;
      case 'exit':
        this.onExit();
        break;
      case 'resume': {
        const pauseDuration = performance.now() - state.pausedAt;
        for (const item of state.spawnQueue) {
          item.scheduledAt += pauseDuration;
        }
        state.pausedAt = 0;
        state.screen = 'playing';
        break;
      }
    }
    this.onStateChange();
  }

  private freshState(mode: any): Partial<GameStateData> {
    (this.canvas as any).__requestNewGame = mode;
    return {};
  }

  private hitTest(
    x: number,
    y: number,
    rect: { x: number; y: number; w: number; h: number },
  ): boolean {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }
}
