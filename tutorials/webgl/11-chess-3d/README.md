# Chess 3D — Tutorial

Build an interactive **3D Chess** game from scratch using TypeScript and raw WebGL2.

**Difficulty:** Intermediate–Advanced (WebGL)
**Episodes:** 4
**Time:** ~1h total
**Prerequisites:** Spinning Cube tutorial (01), familiarity with orbital camera and scene composition

## What You'll Build

A fully playable chess game rendered in 3D with pieces built from cube and sphere primitives. Click to select and move pieces, with legal move highlighting, check/checkmate detection, and a simple AI opponent that plays black.

## Concepts You'll Learn

- Chessboard rendering with alternating cell colors and selection highlighting
- Building recognizable piece silhouettes from cube + sphere primitives
- Chess move generation (pawn, knight, bishop, rook, queen, king)
- Legal move filtering to prevent moving into check
- Ray-plane intersection for click-to-cell mapping (3D picking)
- Simple AI (capture-preferring random move selection)
- Check, checkmate, and stalemate detection

## Episodes

| # | Title | Time | What You'll Build |
|---|-------|------|-------------------|
| 1 | [Board Rendering](./step-1.md) | ~15min | 8x8 board with alternating colors, border, orbital camera |
| 2 | [Piece Models from Primitives](./step-2.md) | ~15min | Pawn, rook, knight, bishop, queen, king from cubes + spheres |
| 3 | [Move Logic & Highlights](./step-3.md) | ~15min | Move generation, legal move filtering, check detection, cell highlighting |
| 4 | [Ray Picking & AI](./step-4.md) | ~15min | Click-to-cell via ray-plane intersection, AI opponent, checkmate/stalemate |

## Final Code

The complete source code is at [`src/contexts/webgl/games/chess-3d/`](../../../src/contexts/webgl/games/chess-3d/).

## Shared Utilities Used

- `@webgl/shared/WebGLUtils` — `createProgram`, `createBuffer`, `createVAO`
- `@webgl/shared/Mat4` — perspective, lookAt, identity, translate, scale, multiply, invert
- `@webgl/shared/Camera` — `OrbitalCamera`
- `@webgl/shared/Primitives` — `createCube`, `createSphere`

## Next Game

Continue to Flight Sim — where you'll learn terrain heightmap generation and flight controls.
