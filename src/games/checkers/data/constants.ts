/**
 * Board evaluation weights used by the AI system.
 * Extracted here for easy tuning.
 */

export const AI_DEPTH = 4;

export const PIECE_VALUE = 1.0;
export const KING_VALUE = 1.5;

export const CENTER_BONUS = 0.05;
export const ADVANCE_BONUS = 0.05;
export const BACK_ROW_BONUS = 0.1;

/** Colors used for rendering */
export const COLORS = {
  lightSquare: '#D2B48C',
  darkSquare: '#8B4513',
  boardBorder: '#8B4513',
  redPieceLight: '#ff4444',
  redPieceDark: '#aa0000',
  blackPieceLight: '#555555',
  blackPieceDark: '#111111',
  selectedHighlight: 'rgba(0, 200, 255, 0.35)',
  selectedBorder: '#00c8ff',
  legalMoveDot: 'rgba(0, 255, 100, 0.5)',
  jumpHighlight: 'rgba(255, 80, 80, 0.35)',
  lastMoveHighlight: 'rgba(255, 255, 0, 0.2)',
  crownGold: '#FFD700',
  crownBorder: '#B8860B',
  background: '#1a1a2e',
} as const;
