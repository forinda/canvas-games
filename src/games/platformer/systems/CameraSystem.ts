import type { Updatable } from '../../../shared/Updatable';
import type { PlatState } from '../types';

export class CameraSystem implements Updatable<PlatState> {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  update(state: PlatState, _dt: number): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    state.camX += (state.px - W / 3 - state.camX) * 0.08;
    state.camY += (state.py - H / 2 - state.camY) * 0.05;
    state.camX = Math.max(0, state.camX);
  }
}
