# Layered Rendering

## What Is It?

The canvas is a single flat surface -- there are no built-in layers, z-indices, or depth buffers. Whatever you draw last appears on top. This is the **painter's algorithm**: just as a painter covers earlier brushstrokes with later ones, each canvas draw call paints over whatever was there before. The order in which you draw determines the visual stacking.

This means your rendering code must be deliberately organized into layers. A typical game draws in this order: background first, then terrain or grid, then game objects (sorted by depth if needed), then effects (particles, explosions), then the HUD (score, health), and finally any overlay (pause menu, dialog). If you draw the HUD before the game objects, the objects paint over the score text.

For complex games like Tower Defense, the rendering pipeline is the difference between a polished game and a visual mess. Enemies must appear on top of the path, but under the range indicators. Towers must appear on top of the grid but under their own projectiles. Health bars float above enemies. The HUD sits on top of everything. Getting this ordering right is purely about calling draw functions in the correct sequence.

## How It Works

```
Rendering order (bottom to top):
  ┌─────────────────────────┐
  │      Overlays           │  ← Pause screen, dialogs, fade effects
  ├─────────────────────────┤
  │      HUD                │  ← Score, health bar, minimap
  ├─────────────────────────┤
  │      Effects            │  ← Particles, explosions, projectiles
  ├─────────────────────────┤
  │      Game Objects       │  ← Players, enemies, items
  │      (sorted by depth)  │
  ├─────────────────────────┤
  │      Terrain / Grid     │  ← Ground tiles, paths, walls
  ├─────────────────────────┤
  │      Background         │  ← Sky, gradient, starfield
  └─────────────────────────┘

  Draw order in code:
  drawBackground()    // first (lowest layer)
  drawTerrain()
  drawGameObjects()   // sorted: objects at higher Y drawn later (closer)
  drawEffects()
  drawHUD()
  drawOverlays()      // last (highest layer)

Depth sorting for objects:
  Objects with higher Y values (lower on screen) should be drawn later
  so they appear in front of objects higher on screen.

  enemies.sort((a, b) => a.y - b.y)  // sort by Y ascending
  enemies.forEach(e => drawEnemy(e))   // draw from back to front
```

## Code Example

```typescript
// layered-rendering.ts — Tower Defense rendering pipeline

interface Enemy {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  radius: number;
}

interface Tower {
  x: number;
  y: number;
  range: number;
  angle: number;
  isSelected: boolean;
}

interface Projectile {
  x: number;
  y: number;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  alpha: number;
  size: number;
  color: string;
}

interface TDState {
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  particles: Particle[];
  score: number;
  lives: number;
  wave: number;
  isPaused: boolean;
}

function renderTowerDefense(
  ctx: CanvasRenderingContext2D,
  state: TDState,
  width: number,
  height: number
): void {
  // === LAYER 1: Background ===
  ctx.fillStyle = "#1a2a1a";
  ctx.fillRect(0, 0, width, height);

  // === LAYER 2: Grid / Terrain ===
  drawGrid(ctx, width, height);
  drawPath(ctx);

  // === LAYER 3: Tower range indicators (below towers) ===
  for (const tower of state.towers) {
    if (tower.isSelected) {
      ctx.save();
      ctx.strokeStyle = "rgba(0, 200, 255, 0.3)";
      ctx.fillStyle = "rgba(0, 200, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // === LAYER 4: Enemies (sorted by Y for depth) ===
  const sortedEnemies = [...state.enemies].sort((a, b) => a.y - b.y);
  for (const enemy of sortedEnemies) {
    // Enemy body
    ctx.fillStyle = "#cc3333";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    // Health bar (above enemy)
    const barWidth = enemy.radius * 2.5;
    const barHeight = 4;
    const barX = enemy.x - barWidth / 2;
    const barY = enemy.y - enemy.radius - 10;
    const healthPercent = enemy.health / enemy.maxHealth;

    ctx.fillStyle = "#333333";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = healthPercent > 0.5 ? "#33cc33" : healthPercent > 0.25 ? "#cccc33" : "#cc3333";
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  }

  // === LAYER 5: Towers (on top of enemies) ===
  for (const tower of state.towers) {
    // Tower base
    ctx.fillStyle = "#445566";
    ctx.fillRect(tower.x - 16, tower.y - 16, 32, 32);

    // Tower turret
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.rotate(tower.angle);
    ctx.fillStyle = "#667788";
    ctx.fillRect(-4, -4, 24, 8);
    ctx.restore();

    // Tower center
    ctx.fillStyle = "#889aaa";
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // === LAYER 6: Projectiles (on top of towers) ===
  for (const proj of state.projectiles) {
    ctx.save();
    ctx.shadowColor = "#ffaa00";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // === LAYER 7: Particles / Effects ===
  for (const particle of state.particles) {
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
  }
  ctx.globalAlpha = 1;

  // === LAYER 8: HUD (always on top of gameplay) ===
  drawHUD(ctx, state, width);

  // === LAYER 9: Overlay (pause screen) ===
  if (state.isPaused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSED", width / 2, height / 2);
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText("Press ESC to resume", width / 2, height / 2 + 40);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawPath(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#2a3a2a";
  ctx.fillRect(0, 200, 800, 40);
}

function drawHUD(ctx: CanvasRenderingContext2D, state: TDState, width: number): void {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, width, 36);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Score: ${state.score}`, 12, 18);
  ctx.fillText(`Lives: ${state.lives}`, 180, 18);
  ctx.textAlign = "right";
  ctx.fillText(`Wave: ${state.wave}`, width - 12, 18);
}
```

## Visual Result

The Tower Defense scene renders as a layered composition. At the bottom, a dark green background with a faint grid overlay. On top of that, a slightly lighter path strip where enemies walk. Range indicators appear as translucent blue circles behind their towers. Red circular enemies march along the path, sorted so enemies further down the screen overlap those above, with colored health bars floating above each one. Gray tower structures sit on their grid cells with rotating barrel turrets. Bright glowing yellow projectiles fly above the towers toward enemies. Fading particle squares mark hit locations. A semi-transparent black HUD bar at the top displays the score, lives, and wave number. When paused, a dark overlay covers everything with white "PAUSED" text centered on screen.

## Used In These Games

- **Tower Defense**: The most complex layering example with 8+ layers: background, grid, path, range rings, enemies (depth-sorted), towers, projectiles, particles, HUD, and pause overlay.
- **Platformer**: Parallax background layers (far sky, mid mountains, near trees), platforms, enemies, player, foreground decorations, HUD, and dialog overlays.
- **Racing**: Track background, road surface, road markings, opponent cars (depth-sorted by distance), player car, particle dust, speed HUD, and lap counter overlay.
- **Pac-Man**: Background maze walls, pellets and power pellets, ghosts (sorted by position), Pac-Man, score text, "READY!" overlay, and level transition screens.
- **Space Invaders**: Starfield background, destructible shields, alien grid (row by row), player ship, bullets (both player and alien), explosion particles, score HUD, and wave intro text.
- **Breakout**: Gradient background, brick grid, paddle, ball with glow, falling power-ups, hit particles, score HUD, and game-over overlay.
- **Zombie Survival**: Terrain, obstacles, zombies (depth-sorted by Y), player, bullets, blood particles, darkness overlay, and ammo/health HUD.
- **City Builder**: Terrain grid, roads, buildings (sorted by Y for depth), vehicles, citizen sprites, resource income particles, and the building-selection UI panel.
- **Fishing**: Sky background, far water, fish at depth (sorted), fishing line, bobber, near water surface, splash particles, and catch notification HUD.
- **Frogger**: Water background, logs and turtles, road surface, cars and trucks, the frog character, splash effects, lives display, and score HUD.
- **Doodle Jump**: Scrolling background, platforms, springs and power-ups, monsters, the player character, projectiles, and the altitude score display.
- **Top-Down Shooter**: Floor tiles, obstacles, enemies (depth-sorted), player, bullet trails, muzzle flash particles, and ammo/health HUD.

## Common Pitfalls

- **Drawing the HUD before game objects**: The HUD gets covered by game elements. Fix: always draw the HUD after all gameplay elements.
- **Not sorting objects by depth**: In top-down or isometric games, objects at the bottom of the screen should overlap objects above them. Without sorting, object overlap looks random. Fix: sort entities by their Y position before drawing.
- **Z-fighting between layers**: Two objects at the same depth with different draw orders flicker between frames. Fix: define a clear priority system and use secondary sort keys (e.g., entity ID) for consistent ordering.
- **Drawing debug visuals in the wrong layer**: If you draw collision boxes or path nodes in the middle of the rendering pipeline, they get covered by later layers. Fix: draw debug overlays last, after the HUD.
- **Performance from too many layers**: Each layer potentially covers the full canvas. Drawing 10+ full-screen layers per frame is expensive. Fix: only draw layers that have visible content, and skip static layers that have not changed.

## API Reference

- `ctx.fillRect(x, y, w, h)` — Draws a filled rectangle (used for backgrounds, panels, and simple shapes at each layer).
- `ctx.clearRect(x, y, w, h)` — Clears to transparent (used at the start of each frame before layered drawing begins).
- `ctx.globalAlpha` — Controls transparency for individual layers (e.g., semi-transparent overlays).
- `ctx.save()` / `ctx.restore()` — Isolates style and transform changes within a single layer.
- `Array.sort()` — Used to sort game objects by depth before drawing them in order.
