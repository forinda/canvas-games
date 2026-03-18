import type { Renderable } from '@shared/Renderable.ts';
import type { MazeState } from '../types.ts';

/**
 * Renders the maze grid: floor tiles, walls, fog of war, exit marker, and player.
 */
export class MazeRenderer implements Renderable<MazeState> {
  render(ctx: CanvasRenderingContext2D, state: MazeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    const { grid, mazeW, mazeH, player, exit, revealRadius, revealed } = state;

    // Compute cell size so maze fits on screen with some padding
    const padding = 60;
    const availW = W - padding * 2;
    const availH = H - padding * 2 - 40; // extra room for HUD at top
    const cellSize = Math.floor(Math.min(availW / mazeW, availH / mazeH));

    const offsetX = Math.floor((W - cellSize * mazeW) / 2);
    const offsetY = Math.floor((H - cellSize * mazeH) / 2) + 20;

    // Draw cells
    for (let y = 0; y < mazeH; y++) {
      for (let x = 0; x < mazeW; x++) {
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;
        const key = `${x},${y}`;
        const isRevealed = revealed.has(key);

        // Distance from player (for live glow)
        const dx = x - player.x;
        const dy = y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inActiveRadius = dist <= revealRadius;

        if (!isRevealed) {
          // Fog — dark cell
          ctx.fillStyle = '#0d0d1a';
          ctx.fillRect(px, py, cellSize, cellSize);
          continue;
        }

        // Floor
        const brightness = inActiveRadius
          ? Math.max(0.25, 1 - dist / (revealRadius + 1))
          : 0.15;
        const floorR = Math.floor(30 * brightness);
        const floorG = Math.floor(40 * brightness);
        const floorB = Math.floor(60 * brightness);
        ctx.fillStyle = `rgb(${floorR},${floorG},${floorB})`;
        ctx.fillRect(px, py, cellSize, cellSize);

        // Exit marker
        if (x === exit.x && y === exit.y) {
          ctx.fillStyle = inActiveRadius ? '#4ade80' : '#2a7a4a';
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.floor(cellSize * 0.5)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('EXIT', px + cellSize / 2, py + cellSize / 2);
        }

        // Walls
        const cell = grid[y][x];
        ctx.strokeStyle = inActiveRadius ? '#607d8b' : '#3a4a54';
        ctx.lineWidth = 2;

        if (cell.walls.top) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
          ctx.stroke();
        }
        if (cell.walls.right) {
          ctx.beginPath();
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }
        if (cell.walls.bottom) {
          ctx.beginPath();
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }
        if (cell.walls.left) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cellSize);
          ctx.stroke();
        }
      }
    }

    // Player
    const ppx = offsetX + player.x * cellSize + cellSize / 2;
    const ppy = offsetY + player.y * cellSize + cellSize / 2;
    const pr = cellSize * 0.35;

    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(ppx, ppy, pr, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ppx, ppy, pr * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Outer maze border
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, cellSize * mazeW, cellSize * mazeH);
  }
}
