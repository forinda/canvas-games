export interface Body {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  rotation: number;
  mass: number;
  isStatic: boolean;
  color: string;
  type: 'box' | 'plank' | 'ball' | 'goal' | 'ground';
  radius?: number;
  restitution: number;
}

export interface InventoryItem {
  type: Body['type'];
  color: string;
  w: number;
  h: number;
}

export interface PuzzleState {
  bodies: Body[];
  level: number;
  solved: boolean;
  started: boolean;
  gameOver: boolean;
  dragging: number | null; // body id
  dragOffX: number;
  dragOffY: number;
  placed: number; // pieces placed count
  maxPieces: number;
  inventory: InventoryItem[];
  selectedInventory: number;
  simulating: boolean;
  score: number;
  message: string;
}

export const GRAVITY = 400;
export const DAMPING = 0.98;

let _bodyId = 0;

export function resetBodyId(): void {
  _bodyId = 0;
}

export function makeBody(type: Body['type'], x: number, y: number, w: number, h: number, isStatic: boolean, color: string): Body {
  return {
    id: ++_bodyId, x, y, vx: 0, vy: 0, w, h, rotation: 0,
    mass: isStatic ? Infinity : w * h * 0.01,
    isStatic, color, type, restitution: 0.3,
  };
}
