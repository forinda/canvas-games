import type { Renderable } from '@shared/Renderable';
import type { PixelArtState, Tool } from '../types';
import { HUD_HEIGHT, COLOR_PALETTE, GRID_SIZES } from '../types';

export class HUDRenderer implements Renderable<PixelArtState> {
  render(ctx: CanvasRenderingContext2D, state: PixelArtState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;
    const hudY = H - HUD_HEIGHT;

    // HUD background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, hudY, W, HUD_HEIGHT);

    // Top border
    ctx.strokeStyle = '#9c27b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hudY);
    ctx.lineTo(W, hudY);
    ctx.stroke();

    // Color palette row
    const swatchSize = 24;
    const swatchGap = 4;
    const paletteStartX = 10;
    const paletteY = hudY + 8;

    for (let i = 0; i < COLOR_PALETTE.length; i++) {
      const sx = paletteStartX + i * (swatchSize + swatchGap);

      ctx.fillStyle = COLOR_PALETTE[i];
      ctx.fillRect(sx, paletteY, swatchSize, swatchSize);

      // Selected indicator
      if (state.currentColor === COLOR_PALETTE[i]) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 1, paletteY - 1, swatchSize + 2, swatchSize + 2);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, paletteY, swatchSize, swatchSize);
      }
    }

    // Tool buttons row
    const tools: Tool[] = ['draw', 'erase', 'fill', 'eyedropper'];
    const toolLabels: Record<Tool, string> = {
      draw: 'Draw [D]',
      erase: 'Erase [E]',
      fill: 'Fill [F]',
      eyedropper: 'Pick [I]',
    };
    const toolBtnW = 80;
    const toolBtnH = 24;
    const toolGap = 8;
    const toolY = hudY + 42;

    ctx.font = '12px monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < tools.length; i++) {
      const tx = 10 + i * (toolBtnW + toolGap);
      const isActive = state.currentTool === tools[i];

      ctx.fillStyle = isActive ? '#9c27b0' : '#2a2a3e';
      ctx.beginPath();
      ctx.roundRect(tx, toolY, toolBtnW, toolBtnH, 4);
      ctx.fill();

      ctx.strokeStyle = isActive ? '#ce93d8' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, toolY, toolBtnW, toolBtnH, 4);
      ctx.stroke();

      ctx.fillStyle = isActive ? '#ffffff' : '#aaaaaa';
      ctx.textAlign = 'center';
      ctx.fillText(toolLabels[tools[i]], tx + toolBtnW / 2, toolY + toolBtnH / 2);
    }

    // Grid size buttons
    const gridBtnStartX = 10 + tools.length * (toolBtnW + toolGap) + 20;
    const gridBtnW = 54;

    // Label
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';
    ctx.fillText('Grid:', gridBtnStartX, toolY - 4);

    ctx.font = '12px monospace';
    for (let i = 0; i < GRID_SIZES.length; i++) {
      const gx = gridBtnStartX + i * (gridBtnW + toolGap);
      const isActive = state.gridSize === GRID_SIZES[i];

      ctx.fillStyle = isActive ? '#4a148c' : '#2a2a3e';
      ctx.beginPath();
      ctx.roundRect(gx, toolY, gridBtnW, toolBtnH, 4);
      ctx.fill();

      ctx.strokeStyle = isActive ? '#9c27b0' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(gx, toolY, gridBtnW, toolBtnH, 4);
      ctx.stroke();

      ctx.fillStyle = isActive ? '#ffffff' : '#aaaaaa';
      ctx.textAlign = 'center';
      ctx.fillText(`${GRID_SIZES[i]}x${GRID_SIZES[i]}`, gx + gridBtnW / 2, toolY + toolBtnH / 2);
    }

    // Clear button
    const clearBtnX = gridBtnStartX + GRID_SIZES.length * (gridBtnW + toolGap) + 20;
    const clearBtnW = 60;

    ctx.fillStyle = '#5c1010';
    ctx.beginPath();
    ctx.roundRect(clearBtnX, toolY, clearBtnW, toolBtnH, 4);
    ctx.fill();

    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(clearBtnX, toolY, clearBtnW, toolBtnH, 4);
    ctx.stroke();

    ctx.fillStyle = '#ff6666';
    ctx.textAlign = 'center';
    ctx.fillText('Clear [C]', clearBtnX + clearBtnW / 2, toolY + toolBtnH / 2);

    // Current color indicator
    const indicatorX = clearBtnX + clearBtnW + 30;
    const indicatorSize = 20;

    ctx.fillStyle = '#666666';
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';
    ctx.fillText('Color:', indicatorX, toolY - 4);

    ctx.fillStyle = state.currentColor;
    ctx.fillRect(indicatorX, toolY + 2, indicatorSize, indicatorSize);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(indicatorX, toolY + 2, indicatorSize, indicatorSize);

    // Export hint
    ctx.fillStyle = '#555555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('ESC to exit | H for help', W - 10, hudY + HUD_HEIGHT - 8);
  }
}
