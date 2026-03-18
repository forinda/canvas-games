export type GamePhase = 'playing' | 'won' | 'lost';

export interface HangmanState {
  word: string;
  category: string;
  guessedLetters: Set<string>;
  wrongGuesses: string[];
  phase: GamePhase;
  wins: number;
  losses: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const MAX_WRONG = 6;
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const HS_KEY_WINS = 'hangman_wins';
export const HS_KEY_LOSSES = 'hangman_losses';
