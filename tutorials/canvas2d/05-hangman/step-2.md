# Step 2: Letter Guessing & Reveal Logic

**Goal:** Add keyboard and click input to guess letters and reveal correct matches.

**Time:** ~15 minutes

---

## What You'll Build

Interactive letter guessing: press keys or click buttons to guess letters. Correct letters appear in the word, incorrect letters dim out.

```
Before guess:    After pressing 'E':    After pressing 'X':
_ _ _ _ _ _ _ _  E _ E _ _ _ _ E        E _ E _ _ _ _ E

[A-Z keyboard]   [E grayed out]         [E, X grayed out]
                 ✓ Revealed!            ✗ Wrong guess!
```

---

## Concepts

- **Input Handling**: Keyboard events (A-Z keys)
- **Click Detection**: Mouse clicks on letter buttons
- **Guess Processing**: Check if letter is in word
- **State Updates**: Add to guessed set, track wrong guesses

---

## Code

### 1. Create Game System

**File:** `src/contexts/canvas2d/games/hangman/systems/GameSystem.ts`

```typescript
import type { Updatable } from '@core/Updatable';
import type { HangmanState } from '../types';
import { MAX_WRONG } from '../types';

export class GameSystem implements Updatable<HangmanState> {
  /** Process a letter guess */
  processGuess(state: HangmanState, letter: string): void {
    // Validate guess
    if (state.phase !== 'playing') return;
    if (state.guessedLetters.has(letter)) return; // Already guessed

    // Add to guessed letters
    state.guessedLetters.add(letter);

    // Check if wrong
    if (!state.word.includes(letter)) {
      state.wrongGuesses.push(letter);
    }

    // Check lose condition (handled in next step)
    // Check win condition (handled in next step)
  }

  update(_state: HangmanState, _dt: number): void {
    // No per-frame logic needed
  }
}
```

**Why:**
- Check `guessedLetters` to prevent duplicate guesses
- Add to `wrongGuesses` only if letter not in word

---

### 2. Create Input System

**File:** `src/contexts/canvas2d/games/hangman/systems/InputSystem.ts`

```typescript
import type { HangmanState } from '../types';
import { ALPHABET } from '../types';
import { GameSystem } from './GameSystem';

export class InputSystem {
  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    private state: HangmanState,
    private canvas: HTMLCanvasElement,
    private gameSystem: GameSystem,
  ) {
    this.keyHandler = (e: KeyboardEvent) => this.onKey(e);
    this.clickHandler = (e: MouseEvent) => this.onClick(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  private onKey(e: KeyboardEvent): void {
    const letter = e.key.toUpperCase();

    // Check if it's a valid letter (A-Z)
    if (ALPHABET.includes(letter)) {
      this.gameSystem.processGuess(this.state, letter);
    }
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const letter = this.getLetterAtPosition(x, y);
    if (letter) {
      this.gameSystem.processGuess(this.state, letter);
    }
  }

  private getLetterAtPosition(x: number, y: number): string | null {
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;
    const buttonSize = 40;
    const spacing = 8;
    const lettersPerRow = 13;
    const startY = H - 150;

    for (let i = 0; i < ALPHABET.length; i++) {
      const letter = ALPHABET[i];
      const row = Math.floor(i / lettersPerRow);
      const col = i % lettersPerRow;

      const rowWidth = Math.min(lettersPerRow, ALPHABET.length - row * lettersPerRow);
      const rowStartX = (W - rowWidth * (buttonSize + spacing)) / 2;

      const buttonX = rowStartX + col * (buttonSize + spacing);
      const buttonY = startY + row * (buttonSize + spacing);

      // Check if click is within this button
      if (
        x >= buttonX &&
        x <= buttonX + buttonSize &&
        y >= buttonY &&
        y <= buttonY + buttonSize
      ) {
        return letter;
      }
    }

    return null;
  }
}
```

**Key Points:**
- **Keyboard**: Convert `e.key` to uppercase, check if valid letter
- **Click**: Calculate which button was clicked based on grid layout
- **Validation**: Both inputs call `processGuess()` which handles duplicates

---

### 3. Wire Systems in Engine

**File:** `src/contexts/canvas2d/games/hangman/HangmanEngine.ts`

```typescript
import { GameSystem } from './systems/GameSystem';
import { InputSystem } from './systems/InputSystem';

export class HangmanEngine {
  // ... existing properties ...
  private gameSystem: GameSystem;
  private inputSystem: InputSystem;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing setup ...

    this.gameSystem = new GameSystem();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.gameSystem,
    );

    this.inputSystem.attach();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach(); // ← Clean up event listeners
  }

  // ... existing render methods unchanged ...
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Press 'E' key**: Letter E appears in word "ELEPHANT" (positions 0, 2, 7)
3. **Click letter 'L'**: L appears in positions 1, 6
4. **Press 'X' key**: X grays out (not in word)
5. **Try pressing 'E' again**: Nothing happens (already guessed)

---

## Expected Behavior

| Action | Result |
|--------|--------|
| Press correct letter | Reveals all instances in word |
| Press incorrect letter | Button grays out, added to wrong guesses |
| Click already-guessed letter | No effect |
| Press non-letter key | Ignored |

---

## What You Learned

✅ Handle keyboard input with validation  
✅ Detect clicks on grid button layouts  
✅ Process guesses with duplicate checking  
✅ Update visual state based on input

---

## Next Step

→ [Step 3: Hangman Figure Drawing](./step-3.md) — Draw the progressive hangman figure for wrong guesses
