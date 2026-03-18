import type { Renderable } from '@shared/Renderable.ts';
import type { GameState } from '../types.ts';
import { DAY_DURATION, NIGHT_DURATION, BARRICADE_COST } from '../types.ts';

export class HUDRenderer implements Renderable<GameState> {
  render(ctx: CanvasRenderingContext2D, state: GameState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    if (state.screen === 'gameover') {
      this.drawGameOver(ctx, state, W, H);
      return;
    }

    this.drawTopBar(ctx, state, W);
    this.drawWaveInfo(ctx, state, W);
    this.drawCycleBar(ctx, state, W);
    this.drawBottomHints(ctx, state, W, H);

    if (state.screen === 'paused') {
      this.drawPauseOverlay(ctx, W, H);
    }
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, state: GameState, W: number): void {
    const barH = 36;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, barH);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const y = barH / 2;
    let x = 12;

    // HP
    const hpPct = state.player.hp / state.player.maxHp;
    const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f1c40f' : '#e74c3c';
    ctx.fillStyle = hpColor;
    ctx.fillText(`HP: ${Math.ceil(state.player.hp)}/${state.player.maxHp}`, x, y);
    x += 130;

    // HP bar
    const hpBarW = 80;
    const hpBarH = 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y - hpBarH / 2, hpBarW, hpBarH);
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y - hpBarH / 2, hpBarW * hpPct, hpBarH);
    x += hpBarW + 20;

    // Ammo
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Ammo: ${Math.floor(state.player.ammo)}/${state.player.maxAmmo}`, x, y);
    x += 140;

    // Resources
    ctx.fillStyle = '#e67e22';
    ctx.fillText(`Resources: ${Math.floor(state.player.resources)}`, x, y);
    x += 150;

    // Score
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(`Score: ${state.score}`, x, y);
    x += 120;

    // Kills
    ctx.fillStyle = '#95a5a6';
    ctx.fillText(`Kills: ${state.totalKills}`, x, y);
  }

  private drawWaveInfo(ctx: CanvasRenderingContext2D, state: GameState, W: number): void {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px monospace';

    const isNight = state.timeOfDay === 'night';
    ctx.fillStyle = isNight ? '#e74c3c' : '#f1c40f';
    const phaseLabel = isNight ? 'NIGHT' : 'DAY';
    const timeLeft = Math.ceil(state.cycleTimer);

    ctx.fillText(`${phaseLabel} - Wave ${state.wave} - ${timeLeft}s`, W - 12, 18);

    if (isNight && state.zombiesRemainingInWave > 0) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = '12px monospace';
      ctx.fillText(`Zombies remaining: ${state.zombiesRemainingInWave}`, W - 12, 34);
    }
  }

  private drawCycleBar(ctx: CanvasRenderingContext2D, state: GameState, W: number): void {
    const barY = 36;
    const barH = 4;
    const maxTime = state.timeOfDay === 'day' ? DAY_DURATION : NIGHT_DURATION;
    const pct = state.cycleTimer / maxTime;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, barY, W, barH);
    ctx.fillStyle = state.timeOfDay === 'day' ? '#f39c12' : '#8e44ad';
    ctx.fillRect(0, barY, W * pct, barH);
  }

  private drawBottomHints(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    W: number,
    H: number,
  ): void {
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const canPlace = state.player.resources >= BARRICADE_COST;
    ctx.fillStyle = canPlace ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)';

    ctx.fillText(
      `[WASD] Move  |  [Mouse] Aim  |  [Click] Shoot  |  [E] Place Barricade (${BARRICADE_COST} res)  |  [P] Pause  |  [H] Help`,
      W / 2,
      H - 8,
    );
  }

  private drawPauseOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', W / 2, H / 2 - 20);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#95a5a6';
    ctx.fillText('Press [P] or [ESC] to resume', W / 2, H / 2 + 20);
  }

  private drawGameOver(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 60);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(`Survived ${state.wave} waves`, W / 2, H / 2 - 10);

    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Score: ${state.score}  |  Kills: ${state.totalKills}`, W / 2, H / 2 + 25);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#95a5a6';
    ctx.fillText('Press [R] to restart  |  [ESC] to exit', W / 2, H / 2 + 70);
  }
}
