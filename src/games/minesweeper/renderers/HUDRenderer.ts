import type { Renderable } from '@shared/Renderable';
import type { MinesweeperState, Difficulty } from '../types';
import { GAME_COLOR } from '../types';

export class HUDRenderer implements Renderable<MinesweeperState> {
  render(ctx: CanvasRenderingContext2D, state: MinesweeperState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    this.drawTopBar(ctx, state, W);
    this.drawDifficultyButtons(ctx, state, W);

    if (state.status === 'idle') {
      this.drawOverlay(ctx, W, H, 'MINESWEEPER', 'Click any cell to start', GAME_COLOR);
    } else if (state.status === 'won') {
      this.drawOverlay(ctx, W, H, 'YOU WIN!', `Time: ${this.formatTime(state.timer)}  |  Click or [R] to restart`, '#4ade80');
    } else if (state.status === 'lost') {
      this.drawOverlay(ctx, W, H, 'GAME OVER', 'Click or [R] to restart', '#ef4444');
    }
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, state: MinesweeperState, W: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 40);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';

    // Exit button
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('< EXIT', 12, 20);

    // Mine counter
    const remaining = state.totalMines - state.flagCount;
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'left';
    ctx.fillText(`Mines: ${remaining}`, 100, 20);

    // Timer
    ctx.fillStyle = GAME_COLOR;
    ctx.textAlign = 'center';
    ctx.fillText(`Time: ${this.formatTime(state.timer)}`, W / 2, 20);

    // Difficulty label
    ctx.fillStyle = '#888';
    ctx.textAlign = 'left';
    ctx.fillText(state.difficulty.toUpperCase(), 220, 20);
  }

  private drawDifficultyButtons(ctx: CanvasRenderingContext2D, state: MinesweeperState, W: number): void {
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    const btnW = 70;
    const btnH = 24;
    const gap = 8;
    const btnY = 8;
    const totalW = difficulties.length * btnW + (difficulties.length - 1) * gap;
    let x = W - totalW - 12;

    for (const diff of difficulties) {
      const isActive = diff === state.difficulty;

      ctx.fillStyle = isActive ? GAME_COLOR : 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(x, btnY, btnW, btnH, 4);
      ctx.fill();

      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isActive ? '#1a1a2e' : '#888';
      ctx.fillText(diff.toUpperCase(), x + btnW / 2, btnY + btnH / 2);

      x += btnW + gap;
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    title: string,
    sub: string,
    color: string,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${Math.min(64, W * 0.08)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.38);
    ctx.shadowBlur = 0;

    ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
    ctx.fillStyle = '#aaa';
    ctx.fillText(sub, W / 2, H * 0.50);

    ctx.font = `${Math.min(14, W * 0.02)}px monospace`;
    ctx.fillStyle = '#666';
    ctx.fillText('[1] Easy  [2] Medium  [3] Hard  [R] Restart  [ESC] Exit', W / 2, H * 0.58);
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
