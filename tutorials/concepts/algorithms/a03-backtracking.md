# Backtracking

## What Is It?

Backtracking is a systematic way to try every possibility without getting stuck. You make a choice, move forward, and if you hit a dead end, you undo your last choice and try something else. It is brute force made smarter: instead of generating all possible solutions and then checking them, you build solutions incrementally and abandon a path the moment you know it cannot lead to a valid answer.

Think of it like navigating a maze. At each fork, you pick a direction and keep going. If you hit a wall, you walk back to the last fork and try a different direction. You never waste time exploring a tunnel you already know leads nowhere. The key insight is early termination: by checking constraints at each step, you prune entire subtrees of possibilities.

In a Sudoku solver, backtracking means placing a number in an empty cell, checking if it violates any rules (same number in the same row, column, or 3x3 box), and if it does, erasing it and trying the next number. If no number works, you go back to the previous cell and change its number. This cascading undo is what gives the algorithm its name.

## The Algorithm

```
function backtrack(state):
  if state is a complete valid solution:
    return true  (or record the solution)

  for each candidate in possible choices:
    if candidate is valid for current state:
      apply candidate to state
      if backtrack(state) returns true:
        return true
      remove candidate from state   // BACKTRACK

  return false  // no valid candidate found -- trigger backtrack
```

### Step-by-Step: Sudoku Solver

Starting with a partially filled 4x4 Sudoku (for simplicity):

```
Initial grid (0 = empty):
  +---+---+
  | 1 | 0 | 0 | 2 |
  | 0 | 0 | 1 | 0 |
  +---+---+
  | 0 | 1 | 0 | 0 |
  | 2 | 0 | 0 | 1 |
  +---+---+

Step 1: Cell (0,1) -- try 3. Valid? Row OK, col OK, box OK. Place 3.
  | 1 | 3 | 0 | 2 |
  | 0 | 0 | 1 | 0 |
  | 0 | 1 | 0 | 0 |
  | 2 | 0 | 0 | 1 |

Step 2: Cell (0,2) -- try 1. Already in row. Try 2. Already in row.
  Try 3. Already in row. Try 4. Valid? Place 4.
  | 1 | 3 | 4 | 2 |
  | 0 | 0 | 1 | 0 |
  | 0 | 1 | 0 | 0 |
  | 2 | 0 | 0 | 1 |

Step 3: Cell (1,0) -- try 1. Already in col. Try 2. Already in col.
  Try 3. Already in box (top-left has 1,3). Try 4. Valid? Place 4.
  | 1 | 3 | 4 | 2 |
  | 4 | 0 | 1 | 0 |
  | 0 | 1 | 0 | 0 |
  | 2 | 0 | 0 | 1 |

Step 4: Cell (1,1) -- try 2. Valid? Place 2.
  | 1 | 3 | 4 | 2 |
  | 4 | 2 | 1 | 3 |
  | 0 | 1 | 0 | 0 |
  | 2 | 0 | 0 | 1 |

Step 5: Cell (2,0) -- try 3. Valid? Place 3.
  ...continue until complete or backtrack if stuck.

Final solved grid:
  +---+---+
  | 1 | 3 | 4 | 2 |
  | 4 | 2 | 1 | 3 |
  +---+---+
  | 3 | 1 | 2 | 4 |
  | 2 | 4 | 3 | 1 |
  +---+---+
```

## Code Example

```typescript
type SudokuBoard = number[][]; // 9x9, 0 = empty

function isValid(board: SudokuBoard, row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false; // row check
    if (board[i][col] === num) return false; // col check
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function solveSudoku(board: SudokuBoard): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== 0) continue;

      for (let num = 1; num <= 9; num++) {
        if (!isValid(board, row, col, num)) continue;

        board[row][col] = num;         // try
        if (solveSudoku(board)) return true;
        board[row][col] = 0;           // backtrack
      }
      return false; // no valid number -- backtrack
    }
  }
  return true; // all cells filled
}
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(k^n) where k = number of choices per step, n = number of decisions. For 9x9 Sudoku: worst case O(9^81), but constraint checking prunes this dramatically. |
| Space  | O(n) for the recursion stack, where n = number of empty cells. |

In practice, a well-constrained Sudoku is solved nearly instantly because most branches are pruned early.

## Used In These Games

- **Sudoku**: The classic backtracking application. Place numbers, validate constraints, backtrack on violations.
- **N-Queens puzzle**: Place queens on a chessboard so none attack each other.
- **Crossword generators**: Fill words into a grid, backtrack when a word placement makes future slots impossible.
- **Puzzle games (Sokoban, 15-puzzle)**: Search for a sequence of moves that reaches the goal state.

## Common Pitfalls

- **Not checking constraints early enough**: The whole point of backtracking is to prune early. If you only check validity at the end, you have plain brute force with extra overhead.
- **Forgetting to undo the choice**: If you do not reset the state after a failed attempt, subsequent branches operate on corrupted state.
- **Wrong ordering of choices**: Trying the most constrained cell first (Minimum Remaining Values heuristic) can reduce the search space by orders of magnitude.
- **Infinite loops**: If your "next state" does not actually make progress (e.g., you revisit the same cell), the recursion never terminates.

## Further Reading

- [Wikipedia: Backtracking](https://en.wikipedia.org/wiki/Backtracking)
- [Constraint propagation + backtracking (Peter Norvig's Sudoku solver)](https://norvig.com/sudoku.html)
- Knuth's "Dancing Links" (Algorithm X) for exact cover problems
