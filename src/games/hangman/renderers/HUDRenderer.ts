import type { Renderable } from '@shared/Renderable';
import type { HangmanState } from '../types';
import { MAX_WRONG } from '../types';

export class HUDRenderer implements Renderable<HangmanState> {
  render(ctx: CanvasRenderingContext2D, state: HangmanState): void {
    this.drawStats(ctx, state);

    if (state.phase === 'won') {
      this.drawOverlay(ctx, state, 'You Won!', '#4caf50');
    } else if (state.phase === 'lost') {
      this.drawOverlay(ctx, state, 'Game Over', '#ff4444');
    }
  }

  private drawStats(ctx: CanvasRenderingContext2D, state: HangmanState): void {
    const W = state.canvasWidth;
    const wrongLeft = MAX_WRONG - state.wrongGuesses.length;

    // Wins / Losses
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#4caf50';
    ctx.fillText(`Wins: ${state.wins}`, 16, 16);
    ctx.fillStyle = '#ff4444';
    ctx.fillText(`Losses: ${state.losses}`, 16, 36);

    // Wrong guesses remaining
    ctx.textAlign = 'right';
    ctx.fillStyle = wrongLeft <= 2 ? '#ff4444' : '#aaa';
    ctx.fillText(`Guesses left: ${wrongLeft}`, W - 16, 16);

    // ESC hint
    ctx.font = '12px monospace';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'right';
    ctx.fillText('[ESC] Menu  [H] Help', W - 16, 40);
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    state: HangmanState,
    title: string,
    color: string
  ): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Dim
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, W / 2, H / 2 - 30);

    // Show the word if lost
    if (state.phase === 'lost') {
      ctx.font = '20px monospace';
      ctx.fillStyle = '#ccc';
      ctx.fillText(`The word was: ${state.word}`, W / 2, H / 2 + 10);
    }

    // Restart button
    const btnW = 200;
    const btnH = 44;
    const btnX = (W - btnW) / 2;
    const btnY = H / 2 + 40;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Play Again', W / 2, btnY + btnH / 2);

    ctx.font = '13px monospace';
    ctx.fillStyle = '#999';
    ctx.fillText('[Space / Enter]', W / 2, btnY + btnH + 20);
  }
}
