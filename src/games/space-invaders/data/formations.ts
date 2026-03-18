import type { Alien } from '../types';
import {
  AlienType,
  ALIEN_W,
  ALIEN_H,
  ALIEN_PADDING,
  HUD_HEIGHT,
} from '../types';

export interface FormationConfig {
  rows: number;
  cols: number;
  /** Map from row index (0 = top) to AlienType */
  rowTypes: AlienType[];
  /** Points per AlienType */
  pointsMap: Record<AlienType, number>;
}

const BASE_FORMATION: FormationConfig = {
  rows: 5,
  cols: 11,
  rowTypes: [
    AlienType.Small,   // row 0 – top
    AlienType.Medium,
    AlienType.Medium,
    AlienType.Large,
    AlienType.Large,   // row 4 – bottom
  ],
  pointsMap: {
    [AlienType.Small]: 30,
    [AlienType.Medium]: 20,
    [AlienType.Large]: 10,
  },
};

/**
 * Returns a fresh alien array for the given level.
 * Higher levels add an extra row every 3 levels (capped at 7 rows).
 */
export function buildFormation(level: number, canvasW: number): Alien[] {
  const extraRows = Math.min(Math.floor((level - 1) / 3), 2);
  const rows = BASE_FORMATION.rows + extraRows;
  const cols = BASE_FORMATION.cols;

  const totalW = cols * (ALIEN_W + ALIEN_PADDING) - ALIEN_PADDING;
  const startX = (canvasW - totalW) / 2;
  const startY = HUD_HEIGHT + 30;

  const aliens: Alien[] = [];

  for (let r = 0; r < rows; r++) {
    const typeIndex = Math.min(r, BASE_FORMATION.rowTypes.length - 1);
    const type = BASE_FORMATION.rowTypes[typeIndex];
    const points = BASE_FORMATION.pointsMap[type];

    for (let c = 0; c < cols; c++) {
      aliens.push({
        row: r,
        col: c,
        x: startX + c * (ALIEN_W + ALIEN_PADDING),
        y: startY + r * (ALIEN_H + ALIEN_PADDING),
        w: ALIEN_W,
        h: ALIEN_H,
        type,
        alive: true,
        points,
      });
    }
  }

  return aliens;
}
