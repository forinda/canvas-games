# 2D Rotation with Offset Arrays

## What Is It?

In tile-based games, rotating a piece means rearranging which cells it occupies. While full matrix multiplication exists for arbitrary rotations, puzzle games like Tetris use a simpler approach: store each rotation state as an array of `(x, y)` offsets relative to a pivot point. Rotating clockwise 90 degrees transforms each offset `(x, y)` into `(y, -x)`.

Think of it like turning a piece of graph paper. If a block is at position (2, 0) relative to the center, and you rotate the paper 90 degrees clockwise, that block ends up at (0, -2). The rule is simple: the old x becomes the new y, and the old y becomes the negative new x.

This discrete rotation approach is preferred in grid-based games because it keeps coordinates on integer grid positions. Continuous rotation with sin/cos would produce fractional coordinates that do not align with the grid. Games like Tetris also add "wall kicks" -- small adjustments when a rotated piece would overlap a wall or other blocks.

## The Math

**90-degree clockwise rotation of offset (x, y):**

```
(x, y)  -->  (y, -x)
```

**90-degree counterclockwise rotation:**

```
(x, y)  -->  (-y, x)
```

**180-degree rotation:**

```
(x, y)  -->  (-x, -y)
```

Example: rotating a T-piece through 4 states:

```
State 0:       State 1:       State 2:       State 3:
  . X .          . X .          . . .          . X .
  X X X          . X X          X X X          X X .
  . . .          . X .          . X .          . X .

Offsets (relative to center block):
State 0: (-1,0) (0,-1) (0,0) (1,0)
State 1: (0,-1) (0,0) (1,0) (0,1)
State 2: (-1,0) (0,0) (1,0) (0,1)
State 3: (0,-1) (-1,0) (0,0) (0,1)
```

**Wall kick** -- when rotation puts a piece outside the boundary, try shifting it:

```
     |  X X  |          |X X   |
     |  X X  |   -->    |X X   |
     +-------+          +------+
     Overlaps!          Kicked left by 1
```

The game tries a sequence of offsets (e.g., shift left 1, right 1, up 1) until the piece fits, or rejects the rotation.

## Code Example

```typescript
interface Vec2 { x: number; y: number }

// Rotate a set of offsets 90 degrees clockwise
function rotateCW(offsets: Vec2[]): Vec2[] {
  return offsets.map(({ x, y }) => ({ x: y, y: -x }));
}

// Rotate counterclockwise
function rotateCCW(offsets: Vec2[]): Vec2[] {
  return offsets.map(({ x, y }) => ({ x: -y, y: x }));
}

// Check if a piece fits on the board at a given position
function pieceFits(
  board: boolean[][],
  offsets: Vec2[],
  pos: Vec2
): boolean {
  const rows = board.length;
  const cols = board[0].length;
  return offsets.every(({ x, y }) => {
    const bx = pos.x + x;
    const by = pos.y + y;
    return bx >= 0 && bx < cols && by >= 0 && by < rows && !board[by][bx];
  });
}

// Try to rotate with wall kicks
const KICK_OFFSETS: Vec2[] = [
  { x: 0, y: 0 },   // try in place first
  { x: -1, y: 0 },  // shift left
  { x: 1, y: 0 },   // shift right
  { x: 0, y: -1 },  // shift up
];

function tryRotate(
  board: boolean[][],
  offsets: Vec2[],
  pos: Vec2
): { newOffsets: Vec2[]; newPos: Vec2 } | null {
  const rotated = rotateCW(offsets);
  for (const kick of KICK_OFFSETS) {
    const testPos = { x: pos.x + kick.x, y: pos.y + kick.y };
    if (pieceFits(board, rotated, testPos)) {
      return { newOffsets: rotated, newPos: testPos };
    }
  }
  return null; // rotation not possible
}
```

## Used In These Games

- **Tetris**: Pieces rotate through 4 states using offset rotation. Wall kicks prevent frustrating rotations near boundaries and are part of the official Tetris guideline (SRS rotation system).
- **Puzzle games (Puyo Puyo, Dr. Mario)**: Pairs or groups of blocks rotate around a pivot using the same discrete rotation math.
- **Tile-based strategy games**: Units or buildings that occupy multiple grid cells may rotate to fit different map layouts.

## Common Pitfalls

- **Getting CW and CCW mixed up**: `(x,y) -> (y,-x)` is clockwise and `(x,y) -> (-y,x)` is counterclockwise. Swapping them makes the piece rotate the wrong way. Test visually!
- **Forgetting the pivot**: Offsets are relative to a center point. If the pivot is wrong, the piece appears to jump or orbit around the wrong cell when rotating.
- **Skipping wall kicks**: Without wall kicks, players cannot rotate pieces near walls, which feels broken. Always implement at least basic wall kick offsets for a polished experience.

## Further Reading

- Tetris Wiki: SRS Rotation System -- https://tetris.wiki/Super_Rotation_System (definitive reference for Tetris rotation and wall kicks)
- "Mathematics for 3D Game Programming and Computer Graphics" by Eric Lengyel -- covers full matrix rotation for when you need continuous angles
