import type { Updatable } from '@shared/Updatable';
import type { PixelArtState } from '../types';

export class DrawSystem implements Updatable<PixelArtState> {
  private lastDrawX: number;
  private lastDrawY: number;
  private needsFloodFill: boolean;
  private needsEyedropper: boolean;

  constructor() {
    this.lastDrawX = -1;
    this.lastDrawY = -1;
    this.needsFloodFill = false;
    this.needsEyedropper = false;
  }

  update(state: PixelArtState, _dt: number): void {
    if (!state.isDrawing) {
      this.lastDrawX = -1;
      this.lastDrawY = -1;
      this.needsFloodFill = false;
      this.needsEyedropper = false;
      return;
    }

    const gx = state.hoverX;
    const gy = state.hoverY;

    if (gx < 0 || gx >= state.gridSize || gy < 0 || gy >= state.gridSize) {
      return;
    }

    switch (state.currentTool) {
      case 'draw':
        this.placePixel(state, gx, gy);
        break;
      case 'erase':
        this.erasePixel(state, gx, gy);
        break;
      case 'fill':
        if (!this.needsFloodFill || gx !== this.lastDrawX || gy !== this.lastDrawY) {
          this.floodFill(state, gx, gy);
          this.needsFloodFill = true;
          this.lastDrawX = gx;
          this.lastDrawY = gy;
        }
        break;
      case 'eyedropper':
        if (!this.needsEyedropper || gx !== this.lastDrawX || gy !== this.lastDrawY) {
          this.pickColor(state, gx, gy);
          this.needsEyedropper = true;
          this.lastDrawX = gx;
          this.lastDrawY = gy;
        }
        break;
    }

    if (state.currentTool === 'draw' || state.currentTool === 'erase') {
      this.lastDrawX = gx;
      this.lastDrawY = gy;
    }
  }

  private placePixel(state: PixelArtState, x: number, y: number): void {
    state.grid[y][x] = state.currentColor;
  }

  private erasePixel(state: PixelArtState, x: number, y: number): void {
    state.grid[y][x] = null;
  }

  private floodFill(state: PixelArtState, startX: number, startY: number): void {
    const targetColor = state.grid[startY][startX];
    const fillColor = state.currentColor;

    if (targetColor === fillColor) return;

    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const cx = current[0];
      const cy = current[1];

      if (state.grid[cy][cx] !== targetColor) continue;

      state.grid[cy][cx] = fillColor;

      const neighbors: [number, number][] = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ];

      for (const neighbor of neighbors) {
        const nx = neighbor[0];
        const ny = neighbor[1];
        const key = `${nx},${ny}`;

        if (
          nx >= 0 && nx < state.gridSize &&
          ny >= 0 && ny < state.gridSize &&
          !visited.has(key)
        ) {
          visited.add(key);
          queue.push([nx, ny]);
        }
      }
    }
  }

  private pickColor(state: PixelArtState, x: number, y: number): void {
    const color = state.grid[y][x];
    if (color !== null) {
      state.currentColor = color;
      state.currentTool = 'draw';
    }
  }
}
