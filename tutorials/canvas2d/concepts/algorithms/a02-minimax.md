# Minimax with Alpha-Beta Pruning

## What Is It?

Minimax is a decision-making algorithm for two-player, zero-sum games -- games where one player's gain is exactly the other player's loss. Think of it as two players taking turns, each playing perfectly: one tries to maximize the score, the other tries to minimize it. The algorithm builds a tree of every possible future game state and picks the move that leads to the best guaranteed outcome.

The catch is that this tree grows exponentially. A game of Tic-Tac-Toe has roughly 255,000 possible game states -- manageable. But chess has more positions than atoms in the observable universe. Alpha-beta pruning solves this by skipping branches that cannot possibly influence the final decision. If you already know that a move leads to a score of 5, and you discover a branch where the opponent can force a score of 3, you stop exploring that branch -- it will never be chosen.

The analogy: imagine negotiating with someone. You make an offer (maximizing your benefit), and they counter-offer (minimizing your benefit). Alpha-beta pruning is like realizing mid-negotiation, "Even if there are better sub-offers down this path, they would never accept them, so I can skip this entire line of reasoning."

## The Algorithm

```
function minimax(node, depth, isMaximizing, alpha, beta):
  if depth == 0 or node is terminal:
    return evaluate(node)

  if isMaximizing:
    maxEval = -Infinity
    for each child of node:
      eval = minimax(child, depth - 1, false, alpha, beta)
      maxEval = max(maxEval, eval)
      alpha = max(alpha, eval)
      if beta <= alpha:
        break          // beta cutoff -- prune
    return maxEval

  else:
    minEval = +Infinity
    for each child of node:
      eval = minimax(child, depth - 1, true, alpha, beta)
      minEval = min(minEval, eval)
      beta = min(beta, eval)
      if beta <= alpha:
        break          // alpha cutoff -- prune
    return minEval
```

### Game Tree Diagram (Tic-Tac-Toe)

```
                        [ ][ ][ ]
                        [ ][X][ ]      X moves first (maximizer)
                        [ ][ ][ ]
                       /    |    \
                      /     |     \
              [O][ ][ ]  [ ][O][ ]  [ ][ ][ ]
              [ ][X][ ]  [ ][X][ ]  [O][X][ ]   O responds (minimizer)
              [ ][ ][ ]  [ ][ ][ ]  [ ][ ][ ]
               /  |        |  \        \
              /   |        |   \        \
           ...   ...     ...   ...      ...

    Scores propagate upward:

            MAX picks highest
              /      \
         MIN picks   MIN picks
         lowest      lowest
        / | \        / | \
      +1  0 -1    +1 -1  0      (leaf evaluations: +1=X wins, -1=O wins, 0=draw)

    Alpha-Beta Pruning Example:

            MAX               alpha = -inf, beta = +inf
           /   \
         MIN    MIN
        / \      |
      +3  +5    +2

    1. Left MIN evaluates +3, then +5. MIN picks +3.
    2. MAX now knows it can get at least +3 (alpha = 3).
    3. Right MIN evaluates +2. Since +2 < alpha (3),
       MAX will never pick this branch. PRUNE remaining children.
```

## Code Example

```typescript
type Board = ("X" | "O" | "")[];

function evaluate(board: Board): number {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8], // rows
    [0,3,6], [1,4,7], [2,5,8], // cols
    [0,4,8], [2,4,6],          // diagonals
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a] === "X" ? +1 : -1;
    }
  }
  return 0;
}

function minimax(
  board: Board,
  isMaximizing: boolean,
  alpha: number,
  beta: number
): number {
  const score = evaluate(board);
  if (score !== 0) return score;
  if (board.every((c) => c !== "")) return 0; // draw

  let best = isMaximizing ? -Infinity : Infinity;
  const mark = isMaximizing ? "X" : "O";

  for (let i = 0; i < 9; i++) {
    if (board[i] !== "") continue;
    board[i] = mark;
    const val = minimax(board, !isMaximizing, alpha, beta);
    board[i] = "";

    if (isMaximizing) {
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
    } else {
      best = Math.min(best, val);
      beta = Math.min(beta, val);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function bestMove(board: Board): number {
  let best = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== "") continue;
    board[i] = "X";
    const val = minimax(board, false, -Infinity, Infinity);
    board[i] = "";
    if (val > best) { best = val; move = i; }
  }
  return move;
}
```

## Complexity

| Metric | Without Pruning | With Alpha-Beta Pruning |
|--------|-----------------|-------------------------|
| Time   | O(b^d) where b = branching factor, d = depth | O(b^(d/2)) in the best case -- effectively doubles search depth |
| Space  | O(d) -- recursion stack depth | O(d) -- same |

For Tic-Tac-Toe: b ~ 4 (average), d = 9 (max). Trivially fast even without pruning.

## Used In These Games

- **Tic-Tac-Toe**: Perfect play. The AI never loses. Minimax explores the full game tree.
- **Chess engines**: With depth limits, iterative deepening, and evaluation heuristics. Alpha-beta pruning is the backbone.
- **Checkers**: Chinook used minimax with alpha-beta to solve checkers in 2007.
- **Connect Four**: Solvable with minimax. First player wins with perfect play.

## Common Pitfalls

- **Forgetting to undo moves**: After recursing, you must restore the board state. Mutating without restoring gives wrong results for sibling branches.
- **Swapping alpha and beta roles**: Alpha is the maximizer's best guaranteed score; beta is the minimizer's. Mixing them up breaks pruning entirely.
- **No depth limit for complex games**: Without a depth limit and heuristic evaluation function, the algorithm will try to explore the entire tree -- infeasible for chess, Go, etc.
- **Move ordering matters for pruning**: Alpha-beta prunes most when the best move is evaluated first. Random ordering gives average-case O(b^(3d/4)); optimal ordering achieves O(b^(d/2)).

## Further Reading

- [Wikipedia: Minimax](https://en.wikipedia.org/wiki/Minimax)
- [Wikipedia: Alpha-Beta Pruning](https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning)
- Sebastian Lague's minimax video series for chess programming
