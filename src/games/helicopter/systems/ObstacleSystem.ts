import type { Updatable } from '@shared/Updatable';
import type { HelicopterState, Obstacle } from '../types';
import {
  BASE_SCROLL_SPEED,
  SPEED_INCREMENT,
  MAX_SCROLL_SPEED,
  CAVE_SEGMENT_WIDTH,
  INITIAL_GAP,
  MIN_GAP,
  GAP_SHRINK_RATE,
  CAVE_ROUGHNESS,
  OBSTACLE_WIDTH,
  OBSTACLE_MIN_HEIGHT,
  OBSTACLE_MAX_HEIGHT,
  OBSTACLE_SPAWN_INTERVAL,
} from '../types';

export class ObstacleSystem implements Updatable<HelicopterState> {
  private obstacleTimer = 0;

  update(state: HelicopterState, dt: number): void {
    if (state.phase !== 'playing') return;

    state.elapsedTime += dt;

    // Increase speed over time
    state.scrollSpeed = Math.min(
      BASE_SCROLL_SPEED + state.elapsedTime * SPEED_INCREMENT,
      MAX_SCROLL_SPEED,
    );

    const speed = state.scrollSpeed;

    // Scroll background
    state.backgroundOffset += speed * dt * 0.3;

    // Update distance (score)
    state.distance += speed * dt * 0.05;

    // Scroll cave segments left
    for (const seg of state.cave) {
      seg.x -= speed * dt;
    }

    // Remove off-screen segments
    state.cave = state.cave.filter((s) => s.x + CAVE_SEGMENT_WIDTH > -CAVE_SEGMENT_WIDTH);

    // Generate new cave segments at the right edge
    while (this.needsMoreCave(state)) {
      this.spawnCaveSegment(state);
    }

    // Scroll obstacles left
    for (const obs of state.obstacles) {
      obs.x -= speed * dt;
    }

    // Remove off-screen obstacles
    state.obstacles = state.obstacles.filter((o) => o.x + o.width > -10);

    // Spawn obstacles periodically
    this.obstacleTimer += dt;
    if (this.obstacleTimer >= OBSTACLE_SPAWN_INTERVAL) {
      this.obstacleTimer = 0;
      this.spawnObstacle(state);
    }
  }

  private needsMoreCave(state: HelicopterState): boolean {
    if (state.cave.length === 0) return true;
    const last = state.cave[state.cave.length - 1];
    return last.x + CAVE_SEGMENT_WIDTH < state.canvasW + CAVE_SEGMENT_WIDTH * 2;
  }

  private spawnCaveSegment(state: HelicopterState): void {
    const cave = state.cave;
    const currentGap = Math.max(
      MIN_GAP,
      INITIAL_GAP - state.elapsedTime * GAP_SHRINK_RATE,
    );
    const halfGap = currentGap / 2;
    const centerY = state.canvasH / 2;

    let x: number;
    let prevTop: number;
    let prevBottom: number;

    if (cave.length === 0) {
      x = 0;
      prevTop = centerY - halfGap;
      prevBottom = centerY + halfGap;
    } else {
      const last = cave[cave.length - 1];
      x = last.x + CAVE_SEGMENT_WIDTH;
      prevTop = last.top;
      prevBottom = last.bottom;
    }

    // Random walk for cave walls with jaggedness
    const topDelta = (Math.random() - 0.5) * CAVE_ROUGHNESS;
    const bottomDelta = (Math.random() - 0.5) * CAVE_ROUGHNESS;

    let newTop = prevTop + topDelta;
    let newBottom = prevBottom + bottomDelta;

    // Ensure minimum gap
    if (newBottom - newTop < currentGap) {
      const mid = (newTop + newBottom) / 2;
      newTop = mid - halfGap;
      newBottom = mid + halfGap;
    }

    // Keep within canvas bounds with margin
    const margin = 10;
    if (newTop < margin) {
      newTop = margin;
      newBottom = Math.max(newBottom, newTop + currentGap);
    }
    if (newBottom > state.canvasH - margin) {
      newBottom = state.canvasH - margin;
      newTop = Math.min(newTop, newBottom - currentGap);
    }

    cave.push({ x, top: newTop, bottom: newBottom });
  }

  private spawnObstacle(state: HelicopterState): void {
    // Find the cave boundaries at the right edge of the screen
    const rightEdgeSeg = state.cave.find(
      (s) => s.x <= state.canvasW && s.x + CAVE_SEGMENT_WIDTH >= state.canvasW,
    );

    if (!rightEdgeSeg) return;

    const caveTop = rightEdgeSeg.top;
    const caveBottom = rightEdgeSeg.bottom;
    const availableHeight = caveBottom - caveTop;

    // Don't spawn if gap is too small
    if (availableHeight < OBSTACLE_MAX_HEIGHT * 2) return;

    const obsHeight =
      OBSTACLE_MIN_HEIGHT +
      Math.random() * (OBSTACLE_MAX_HEIGHT - OBSTACLE_MIN_HEIGHT);

    // Place obstacle randomly within the cave passage
    // Can spawn from top wall or bottom wall
    const fromTop = Math.random() < 0.5;
    let obsY: number;

    if (fromTop) {
      obsY = caveTop;
    } else {
      obsY = caveBottom - obsHeight;
    }

    const obstacle: Obstacle = {
      x: state.canvasW + 10,
      y: obsY,
      width: OBSTACLE_WIDTH,
      height: obsHeight,
    };

    state.obstacles.push(obstacle);
  }

  /** Fill the screen with initial cave segments */
  initCave(state: HelicopterState): void {
    state.cave = [];
    this.obstacleTimer = 0;
    const numSegments = Math.ceil(state.canvasW / CAVE_SEGMENT_WIDTH) + 4;
    for (let i = 0; i < numSegments; i++) {
      this.spawnCaveSegment(state);
    }
  }
}
