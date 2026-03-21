# Stack and Queue

## What Is It?

A stack and a queue are the two most fundamental data structures for ordering work. A stack is Last-In, First-Out (LIFO): the most recently added item is the first one removed, like a stack of plates. A queue is First-In, First-Out (FIFO): the first item added is the first one removed, like a line of people waiting at a register.

In games, stacks are used for undo systems, back-navigation, and recursive algorithms (like depth-first search). When you press Ctrl+Z in a level editor, the last action is undone first -- that is a stack. Queues are used for spawn systems, event processing, and breadth-first algorithms. When enemies spawn in waves, they come in the order they were scheduled -- that is a queue.

The key distinction is about fairness vs recency. A queue is fair: first come, first served. A stack is about recency: the latest thing gets handled first. Choosing the wrong one leads to subtle bugs: an undo system built on a queue would undo the oldest action first (useless), and a spawn queue built on a stack would spawn the most recently scheduled enemy first (chaotic).

## The Algorithm

```
STACK (LIFO):
  push(item): add item to the top.
  pop():      remove and return the top item.
  peek():     view the top item without removing.

  +-----+
  | top  |  <-- push here, pop from here
  |  .   |
  |  .   |
  |  .   |
  |bottom|
  +-----+

QUEUE (FIFO):
  enqueue(item): add item to the back.
  dequeue():     remove and return the front item.
  peek():        view the front item without removing.

  front                         back
  +-----+-----+-----+-----+-----+
  |  1  |  2  |  3  |  4  |  5  |
  +-----+-----+-----+-----+-----+
    ^                         ^
    dequeue from here         enqueue here
```

### ASCII Diagram: Undo Stack

```
Action sequence: Place A, Place B, Place C

  Push "Place A":    Push "Place B":    Push "Place C":
  +----------+       +----------+       +----------+
  | Place A  |       | Place B  |       | Place C  |  <-- top
  +----------+       | Place A  |       | Place B  |
                     +----------+       | Place A  |
                                        +----------+

  Undo (pop): removes "Place C", reverses it.
  +----------+
  | Place B  |  <-- top
  | Place A  |
  +----------+

  Undo again (pop): removes "Place B", reverses it.
  +----------+
  | Place A  |  <-- top
  +----------+
```

### ASCII Diagram: Spawn Queue

```
Schedule: Goblin, Orc, Dragon (in that order)

  Enqueue Goblin:    Enqueue Orc:       Enqueue Dragon:
  +---------+        +---------+-----+  +---------+-----+--------+
  | Goblin  |        | Goblin | Orc |  | Goblin | Orc | Dragon |
  +---------+        +---------+-----+  +---------+-----+--------+
    front                                 front                back

  Spawn (dequeue): Goblin spawns first.
  +-----+--------+
  | Orc | Dragon |
  +-----+--------+
    front

  Spawn (dequeue): Orc spawns next.
  +--------+
  | Dragon |
  +--------+
```

## Code Example

```typescript
// --- Stack ---

class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }
}

// --- Queue (using ring buffer for O(1) dequeue) ---

class Queue<T> {
  private items: (T | undefined)[] = [];
  private head = 0;
  private tail = 0;
  private count = 0;

  constructor(capacity = 16) {
    this.items = new Array(capacity);
  }

  enqueue(item: T): void {
    if (this.count === this.items.length) this.grow();
    this.items[this.tail] = item;
    this.tail = (this.tail + 1) % this.items.length;
    this.count++;
  }

  dequeue(): T | undefined {
    if (this.count === 0) return undefined;
    const item = this.items[this.head];
    this.items[this.head] = undefined;
    this.head = (this.head + 1) % this.items.length;
    this.count--;
    return item;
  }

  peek(): T | undefined {
    return this.count === 0 ? undefined : this.items[this.head];
  }

  get size(): number { return this.count; }
  get isEmpty(): boolean { return this.count === 0; }

  private grow(): void {
    const newCap = this.items.length * 2;
    const newItems = new Array(newCap);
    for (let i = 0; i < this.count; i++) {
      newItems[i] = this.items[(this.head + i) % this.items.length];
    }
    this.items = newItems;
    this.head = 0;
    this.tail = this.count;
  }
}

// --- Undo system using a Stack ---

interface Action {
  description: string;
  execute: () => void;
  undo: () => void;
}

class UndoManager {
  private undoStack = new Stack<Action>();
  private redoStack = new Stack<Action>();

  perform(action: Action): void {
    action.execute();
    this.undoStack.push(action);
    this.redoStack = new Stack(); // clear redo on new action
  }

  undo(): void {
    const action = this.undoStack.pop();
    if (!action) return;
    action.undo();
    this.redoStack.push(action);
  }

  redo(): void {
    const action = this.redoStack.pop();
    if (!action) return;
    action.execute();
    this.undoStack.push(action);
  }
}
```

## Complexity

| Operation | Stack (array-backed) | Queue (ring buffer) |
|-----------|---------------------|---------------------|
| Push / Enqueue | O(1) amortized | O(1) amortized |
| Pop / Dequeue  | O(1) | O(1) |
| Peek           | O(1) | O(1) |
| Space          | O(n) | O(n) |

Note: A naive queue using `Array.shift()` is O(n) per dequeue because it shifts all elements. The ring buffer implementation above avoids this.

## Used In These Games

- **Level editors (undo/redo)**: Stack of actions. Undo pops the last action and reverses it. Redo pops from a second stack.
- **Enemy spawn systems**: Queue of enemies to spawn. Enqueue when scheduled, dequeue when the spawn timer fires.
- **Event / message systems**: Queue of game events (damage dealt, item picked up, dialog triggered). Processed in order each frame.
- **DFS / BFS**: Stack for depth-first search (maze generation, flood fill). Queue for breadth-first search (pathfinding, flood fill).
- **Card games**: Draw pile is a stack (draw from top). Discard pile is a stack. Some games use queues for turn order.
- **Dialog systems**: Queue of dialog lines to display one after another.

## Common Pitfalls

- **Using `Array.shift()` as a queue**: In JavaScript, `shift()` is O(n) because it re-indexes every element. For a hot loop processing hundreds of events per frame, this adds up. Use a ring buffer or index pointer.
- **Unbounded growth**: If you push faster than you pop (or enqueue faster than you dequeue), memory grows without limit. Set a maximum size and drop or reject items when full.
- **Mixing up stack and queue**: Using a stack where you need a queue (or vice versa) is a common logic bug. Ask: "Should the most recent item be processed first (stack), or the oldest (queue)?"
- **Forgetting to clear the redo stack**: In an undo system, performing a new action after undoing should clear the redo history. Otherwise, redo can restore states that no longer make sense.
- **Thread safety**: In multi-threaded or async contexts (e.g., Web Workers), concurrent push/pop without synchronization causes data corruption. Use locks or message passing.

## Further Reading

- [Wikipedia: Stack (abstract data type)](https://en.wikipedia.org/wiki/Stack_(abstract_data_type))
- [Wikipedia: Queue (abstract data type)](https://en.wikipedia.org/wiki/Queue_(abstract_data_type))
- [Game Programming Patterns: Command pattern (for undo)](https://gameprogrammingpatterns.com/command.html)
