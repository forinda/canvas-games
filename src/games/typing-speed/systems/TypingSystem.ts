import type { TypingState, FallingWord } from '../types';

export class TypingSystem {
  handleType(state: TypingState, char: string): void {
    state.totalTyped += 1;

    // If we have an active word, try to continue typing it
    if (state.activeWord) {
      const nextIndex = state.activeWord.typed.length;
      const expected = state.activeWord.text[nextIndex];

      if (expected === char) {
        state.activeWord.typed += char;
        state.currentInput += char;
        state.correctTyped += 1;

        // Check if word is completed
        if (state.activeWord.typed.length === state.activeWord.text.length) {
          this.completeWord(state, state.activeWord);
        }
      } else {
        // Wrong letter — try to find a new matching word
        const newTarget = this.findMatchingWord(state, char);
        if (newTarget) {
          // Reset old active word progress
          state.activeWord.typed = '';
          state.activeWord = newTarget;
          state.activeWord.typed = char;
          state.currentInput = char;
          state.correctTyped += 1;
        }
        // If no match found, it's a miss (totalTyped already incremented)
      }
    } else {
      // No active word — find one that starts with this character
      const target = this.findMatchingWord(state, char);
      if (target) {
        state.activeWord = target;
        state.activeWord.typed = char;
        state.currentInput = char;
        state.correctTyped += 1;

        // Check single-letter words
        if (state.activeWord.typed.length === state.activeWord.text.length) {
          this.completeWord(state, state.activeWord);
        }
      }
    }
  }

  handleBackspace(state: TypingState): void {
    if (state.activeWord && state.activeWord.typed.length > 0) {
      state.activeWord.typed = state.activeWord.typed.slice(0, -1);
      state.currentInput = state.currentInput.slice(0, -1);

      if (state.activeWord.typed.length === 0) {
        state.activeWord = null;
        state.currentInput = '';
      }
    }
  }

  private findMatchingWord(state: TypingState, char: string): FallingWord | null {
    // Find the closest word to the bottom that starts with the typed character
    let best: FallingWord | null = null;
    let bestY = -Infinity;

    for (const word of state.words) {
      if (word === state.activeWord) continue;
      if (word.text[0] === char && word.typed.length === 0) {
        if (word.y > bestY) {
          bestY = word.y;
          best = word;
        }
      }
    }

    return best;
  }

  private completeWord(state: TypingState, word: FallingWord): void {
    const lengthBonus = word.text.length;
    state.score += lengthBonus * 10;
    state.wordsCompleted += 1;

    // Remove the word from the active list
    const idx = state.words.indexOf(word);
    if (idx !== -1) {
      state.words.splice(idx, 1);
    }

    state.activeWord = null;
    state.currentInput = '';
  }
}
