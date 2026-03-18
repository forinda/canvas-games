import type { GameStateData } from '../types';
import type { GridSystem } from '../systems/GridSystem';
import { GRID_COLS, GRID_ROWS } from '../systems/PathSystem';
import { TOWER_DEFS } from '../data/towers';
import { getTowerStats } from '../data/towers';

const COLORS = {
  empty: '#1a2a1a',
  emptyAlt: '#182418',
  path: '#c8a96e',
  pathEdge: '#b8924a',
  start: '#2ecc71',
  end: '#e74c3c',
  hover: 'rgba(255,255,255,0.18)',
  hoverInvalid: 'rgba(255,60,60,0.22)',
  hoverValid: 'rgba(60,255,120,0.22)',
  grid: 'rgba(255,255,255,0.04)',
};

export class GridRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameStateData, grid: GridSystem): void {
    const cs = grid.cellSize;
    const oy = grid.gridOffsetY;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = state.grid[row][col];
        const x = col * cs;
        const y = oy + row * cs;

        // Base cell color
        let fillColor: string;
        switch (cell.type) {
          case 'path':
            fillColor = COLORS.path;
            break;
          case 'start':
            fillColor = COLORS.start;
            break;
          case 'end':
            fillColor = COLORS.end;
            break;
          case 'tower':
            fillColor = (col + row) % 2 === 0 ? COLORS.empty : COLORS.emptyAlt;
            break;
          default:
            fillColor = (col + row) % 2 === 0 ? COLORS.empty : COLORS.emptyAlt;
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, cs, cs);

        // Path border highlights
        if (cell.type === 'path' || cell.type === 'start' || cell.type === 'end') {
          ctx.strokeStyle = COLORS.pathEdge;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        } else {
          // Subtle grid lines on empty cells
          ctx.strokeStyle = COLORS.grid;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        }
      }
    }

    // Draw start/end labels
    this.drawLabel(ctx, grid, 0, 1, 'START', '#fff');
    this.drawLabel(ctx, grid, 15, 8, 'END', '#fff');

    // Hover highlight
    if (state.hoveredCell) {
      const { col, row } = state.hoveredCell;
      const cell = state.grid[row]?.[col];
      if (cell) {
        const x = col * cs;
        const y = oy + row * cs;

        let hoverColor = COLORS.hover;
        if (state.selectedTowerType) {
          hoverColor = cell.type === 'empty' ? COLORS.hoverValid : COLORS.hoverInvalid;
        }
        ctx.fillStyle = hoverColor;
        ctx.fillRect(x, y, cs, cs);
      }
    }

    // Draw range preview for selected tower type
    if (state.selectedTowerType && state.hoveredCell) {
      const { col, row } = state.hoveredCell;
      const cell = state.grid[row]?.[col];
      if (cell && cell.type === 'empty') {
        const center = grid.cellCenter(col, row);
        const stats = getTowerStats(state.selectedTowerType, 1);
        ctx.beginPath();
        ctx.arc(center.x, center.y, stats.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fill();
      }
    }

    // Draw selected placed tower range ring
    if (state.selectedPlacedTowerId) {
      const tower = state.towers.find(t => t.id === state.selectedPlacedTowerId);
      if (tower) {
        const center = grid.cellCenter(tower.col, tower.row);
        const stats = getTowerStats(tower.type, tower.level);
        ctx.beginPath();
        ctx.arc(center.x, center.y, stats.range, 0, Math.PI * 2);
        ctx.strokeStyle = `${TOWER_DEFS[tower.type].color}99`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `${TOWER_DEFS[tower.type].color}15`;
        ctx.fill();
      }
    }
  }

  private drawLabel(
    ctx: CanvasRenderingContext2D,
    grid: GridSystem,
    col: number,
    row: number,
    text: string,
    color: string,
  ) {
    const center = grid.cellCenter(col, row);
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(8, grid.cellSize * 0.28)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, center.x, center.y);
  }
}
