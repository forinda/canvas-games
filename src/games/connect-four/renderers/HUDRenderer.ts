import type { Renderable } from '@shared/Renderable.ts';
import type { ConnectFourState } from '../types.ts';

const COLOR_RED = '#f44336';
const COLOR_YELLOW = '#ffeb3b';
const COLOR_ACCENT = '#e53935';

export class HUDRenderer implements Renderable<ConnectFourState> {
  render(ctx: CanvasRenderingContext2D, state: ConnectFourState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    if (state.showModeSelect) {
      this.renderModeSelect(ctx, W, H);
      return;
    }

    this.renderScoreboard(ctx, state, W);
    this.renderTurnIndicator(ctx, state, W, H);

    if (state.gameOver) {
      this.renderGameOverOverlay(ctx, state, W, H);
    }
  }

  private renderModeSelect(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = COLOR_ACCENT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Connect Four', W / 2, H / 2 - 120);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Choose a game mode', W / 2, H / 2 - 75);

    const btnW = 200;
    const btnH = 50;
    const centerX = W / 2;
    const centerY = H / 2;

    this.drawButton(ctx, centerX - btnW / 2, centerY - 10 - btnH, btnW, btnH, 'vs AI', COLOR_RED);
    this.drawButton(ctx, centerX - btnW / 2, centerY + 10, btnW, btnH, '2 Players', COLOR_YELLOW);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText('Press [ESC] to exit  |  Press [H] for help', W / 2, H / 2 + 100);
  }

  private drawButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color: string,
  ): void {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.stroke();

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  private renderScoreboard(ctx: CanvasRenderingContext2D, state: ConnectFourState, W: number): void {
    const y = 24;

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    // Red score
    ctx.fillStyle = COLOR_RED;
    ctx.fillText(`Red: ${state.scoreRed}`, W / 2 - 100, y);

    // Draws
    ctx.fillStyle = '#888';
    ctx.fillText(`Draw: ${state.draws}`, W / 2, y);

    // Yellow score
    ctx.fillStyle = COLOR_YELLOW;
    ctx.fillText(`Yellow: ${state.scoreYellow}`, W / 2 + 110, y);

    // Mode indicator
    ctx.font = '11px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText(
      state.mode === 'ai' ? 'Mode: vs AI' : 'Mode: 2 Players',
      W / 2,
      y + 20,
    );
  }

  private renderTurnIndicator(
    ctx: CanvasRenderingContext2D,
    state: ConnectFourState,
    W: number,
    H: number,
  ): void {
    if (state.gameOver) return;

    const y = H - 40;

    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (state.aiThinking) {
      ctx.fillStyle = COLOR_YELLOW;
      ctx.fillText('AI is thinking...', W / 2, y);
    } else {
      const color = state.currentPlayer === 'red' ? COLOR_RED : COLOR_YELLOW;
      const name = state.currentPlayer === 'red' ? 'Red' : 'Yellow';
      ctx.fillStyle = color;
      ctx.fillText(`${name}'s turn`, W / 2, y);
    }

    // Controls hint
    ctx.font = '11px monospace';
    ctx.fillStyle = '#444';
    ctx.fillText('[R] Restart  [M] Mode  [H] Help  [ESC] Exit', W / 2, y + 22);
  }

  private renderGameOverOverlay(
    ctx: CanvasRenderingContext2D,
    state: ConnectFourState,
    W: number,
    H: number,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    const panelW = 320;
    const panelH = 140;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();

    const borderColor = state.isDraw ? '#888' : (state.winner === 'red' ? COLOR_RED : COLOR_YELLOW);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.stroke();

    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state.isDraw) {
      ctx.fillStyle = '#ccc';
      ctx.fillText("It's a Draw!", W / 2, py + 50);
    } else {
      const name = state.winner === 'red' ? 'Red' : 'Yellow';
      const color = state.winner === 'red' ? COLOR_RED : COLOR_YELLOW;
      ctx.fillStyle = color;
      ctx.fillText(`${name} Wins!`, W / 2, py + 50);
    }

    ctx.font = '13px monospace';
    ctx.fillStyle = '#777';
    ctx.fillText('Click or press [R] to play again', W / 2, py + 100);
  }
}
