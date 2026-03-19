# Cellular Automata

## What Is It?

A cellular automaton is a grid where each cell has a state, and every cell updates simultaneously based on simple rules that look at its neighbors. Despite the simplicity of each rule, the emergent behavior can be surprisingly complex and lifelike. Conway's Game of Life is the most famous example, but in game development, cellular automata are used for simulating physics-like behavior: sand falling, water flowing, fire spreading, and terrain eroding.

The key idea is that the rules are local and uniform. Every cell follows the same rules, and each cell only looks at its immediate neighbors. There is no central controller. A grain of sand does not "know" about the ground 100 cells below -- it only checks the cell directly beneath it. If that cell is empty, the sand falls. If not, it checks the cells to the lower-left and lower-right. These three simple rules create convincing sand physics in games like Noita and Terraria.

Think of it like a crowd doing "the wave" at a stadium. Nobody has a master plan. Each person just watches their neighbor: if the person next to you stands up, you stand up next. Simple local rules, global emergent pattern.

## The Algorithm

```
1. Initialize the grid with starting cell states.
2. Each tick (frame):
   a. Create a new empty grid (or use double-buffering).
   b. For each cell (r, c):
      - Read the current state and neighbor states from the OLD grid.
      - Apply the rules to determine the new state.
      - Write the new state to the NEW grid.
   c. Swap the old grid with the new grid.
```

### Rules for Falling Sand

```
For each cell, check its type and apply rules:

SAND:
  if cell below is EMPTY:     move down
  elif cell below-left is EMPTY:  move down-left
  elif cell below-right is EMPTY: move down-right
  else: stay

WATER:
  if cell below is EMPTY:     move down
  elif cell below-left is EMPTY:  move down-left
  elif cell below-right is EMPTY: move down-right
  elif cell left is EMPTY:    move left
  elif cell right is EMPTY:   move right
  else: stay

STONE:
  never moves
```

### Step-by-Step Example

```
  . = empty, s = sand, w = water, # = stone

  Tick 0:          Tick 1:          Tick 2:          Tick 3:
  . s . . .        . . . . .        . . . . .        . . . . .
  . . . . .        . s . . .        . . . . .        . . . . .
  . . # . .        . . # . .        . s # . .        . . # . .
  . . . . .        . . . . .        . . . . .        s . . . .
  # # # # #        # # # # #        # # # # #        # # # # #

  The sand falls straight down, then slides left around the stone.


  Water spreading:

  Tick 0:          Tick 1:          Tick 2:
  . . w . .        . . . . .        . . . . .
  . . . . .        . . w . .        . . . . .
  . # . # .        . # . # .        . # w # .
  . # . # .        . # . # .        . # . # .
  # # # # #        # # # # #        # # # # #

  Tick 3:          Tick 4:
  . . . . .        . . . . .
  . . . . .        . . . . .
  . # . # .        . # . # .
  . # w # .        . # w # .
  # # # # #        # # # # #

  Water falls, then pools between walls.
```

## Code Example

```typescript
const EMPTY = 0;
const SAND = 1;
const WATER = 2;
const STONE = 3;

type Grid = number[][];

function createGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(EMPTY));
}

function simulate(current: Grid): Grid {
  const rows = current.length;
  const cols = current[0].length;
  const next = createGrid(rows, cols);

  // Copy immovable elements first
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (current[r][c] === STONE) next[r][c] = STONE;
    }
  }

  // Process from bottom to top so falling works correctly
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = 0; c < cols; c++) {
      const cell = current[r][c];
      if (cell === EMPTY || cell === STONE) continue;

      if (cell === SAND) {
        if (r + 1 < rows && next[r + 1][c] === EMPTY) {
          next[r + 1][c] = SAND;              // fall down
        } else if (r + 1 < rows && c - 1 >= 0 && next[r + 1][c - 1] === EMPTY) {
          next[r + 1][c - 1] = SAND;          // slide down-left
        } else if (r + 1 < rows && c + 1 < cols && next[r + 1][c + 1] === EMPTY) {
          next[r + 1][c + 1] = SAND;          // slide down-right
        } else {
          next[r][c] = SAND;                  // stay
        }
      }

      if (cell === WATER) {
        if (r + 1 < rows && next[r + 1][c] === EMPTY) {
          next[r + 1][c] = WATER;
        } else if (r + 1 < rows && c - 1 >= 0 && next[r + 1][c - 1] === EMPTY) {
          next[r + 1][c - 1] = WATER;
        } else if (r + 1 < rows && c + 1 < cols && next[r + 1][c + 1] === EMPTY) {
          next[r + 1][c + 1] = WATER;
        } else if (c - 1 >= 0 && next[r][c - 1] === EMPTY) {
          next[r][c - 1] = WATER;             // flow left
        } else if (c + 1 < cols && next[r][c + 1] === EMPTY) {
          next[r][c + 1] = WATER;             // flow right
        } else {
          next[r][c] = WATER;
        }
      }
    }
  }

  return next;
}
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(R x C) per tick -- every cell is checked once. |
| Space  | O(R x C) for the double buffer (two grids). |

## Used In These Games

- **Noita**: The entire game world is a cellular automaton. Every pixel is a material (sand, water, oil, fire, acid) with its own rules.
- **Terraria**: Sand and silt blocks fall when unsupported, using falling-sand automaton rules.
- **The Powder Toy**: A sandbox simulation entirely built on cellular automata for dozens of material types.
- **Conway's Game of Life**: The classic zero-player game. Cells are alive or dead based on neighbor counts.
- **Dwarf Fortress**: Water and magma flow using grid-based simulation rules.

## Common Pitfalls

- **Reading from the grid you are writing to**: If you update cells in-place, earlier updates affect later cells in the same tick. A sand grain might fall multiple cells in one tick. Always use double-buffering (read from old grid, write to new grid).
- **Processing order bias**: If you always scan left-to-right, sand and water preferentially flow left. Randomize the horizontal scan direction each tick, or alternate left-to-right and right-to-left.
- **Two particles claiming the same cell**: If two sand grains both try to fall into the same empty cell, one overwrites the other and a particle disappears. Check `next[r][c] === EMPTY` before writing.
- **Performance on large grids**: For a 1920x1080 pixel-scale simulation, iterating every cell every frame is expensive. Use dirty rectangles or chunk-based updates to skip regions that have not changed.

## Further Reading

- [Wikipedia: Cellular automaton](https://en.wikipedia.org/wiki/Cellular_automaton)
- [Noita GDC talk: "Exploring the Tech and Design of Noita"](https://www.youtube.com/watch?v=prXuyMCgbTc)
- [The Powder Toy (open source)](https://powdertoy.co.uk/)
