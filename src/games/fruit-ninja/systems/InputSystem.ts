import type { InputHandler } from '@shared/InputHandler';
import type { FruitNinjaState, SlicePoint } from '../types';
import { TRAIL_LIFETIME } from '../types';

export class InputSystem implements InputHandler {
  private state: FruitNinjaState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onRestart: () => void;

  private boundMouseDown = this.handleMouseDown.bind(this);
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);
  private boundTouchStart = this.handleTouchStart.bind(this);
  private boundTouchMove = this.handleTouchMove.bind(this);
  private boundTouchEnd = this.handleTouchEnd.bind(this);
  private boundKeyDown = this.handleKeyDown.bind(this);

  constructor(
    state: FruitNinjaState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onRestart: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onRestart = onRestart;
  }

  attach(): void {
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseup', this.boundMouseUp);
    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.boundTouchEnd);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  detach(): void {
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
    this.canvas.removeEventListener('touchmove', this.boundTouchMove);
    this.canvas.removeEventListener('touchend', this.boundTouchEnd);
    window.removeEventListener('keydown', this.boundKeyDown);
  }

  /** Prune old trail points */
  pruneTrail(): void {
    const now = performance.now();
    this.state.trail.points = this.state.trail.points.filter(
      (p) => now - p.time < TRAIL_LIFETIME,
    );
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  private addTrailPoint(x: number, y: number): void {
    const point: SlicePoint = { x, y, time: performance.now() };
    this.state.trail.points.push(point);
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.state.mouseDown = true;
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    this.state.trail.points = [];
    this.state.swipeSliceCount = 0;
    this.addTrailPoint(pos.x, pos.y);

    if (!this.state.started) {
      this.state.started = true;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    if (this.state.mouseDown) {
      this.addTrailPoint(pos.x, pos.y);
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.state.mouseDown = false;
    this.state.swipeSliceCount = 0;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.state.mouseDown = true;
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    this.state.trail.points = [];
    this.state.swipeSliceCount = 0;
    this.addTrailPoint(pos.x, pos.y);

    if (!this.state.started) {
      this.state.started = true;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    if (this.state.mouseDown) {
      this.addTrailPoint(pos.x, pos.y);
    }
  }

  private handleTouchEnd(_e: TouchEvent): void {
    this.state.mouseDown = false;
    this.state.swipeSliceCount = 0;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.onExit();
      return;
    }
    if (e.key === ' ' && this.state.gameOver) {
      e.preventDefault();
      this.onRestart();
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      if (!this.state.gameOver && this.state.started) {
        this.state.paused = !this.state.paused;
      }
    }
  }
}
