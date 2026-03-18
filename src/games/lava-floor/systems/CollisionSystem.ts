import type { Updatable } from '@shared/Updatable';
import type { LavaState, Particle } from '../types';
import { PLATFORM_HEIGHT, HS_KEY } from '../types';

export class CollisionSystem implements Updatable<LavaState> {
  update(state: LavaState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const player = state.player;
    player.onGround = false;

    // Platform collision
    for (const plat of state.platforms) {
      if (plat.sunk) continue;

      const playerBottom = player.y + player.height / 2;
      const playerLeft = player.x - player.width / 2;
      const playerRight = player.x + player.width / 2;

      const platTop = plat.y;
      const platBottom = plat.y + PLATFORM_HEIGHT;
      const platLeft = plat.x;
      const platRight = plat.x + plat.w;

      // Check if player is landing on platform (falling down)
      if (
        player.vy >= 0 &&
        playerBottom >= platTop &&
        playerBottom <= platBottom + 4 &&
        playerRight > platLeft + 4 &&
        playerLeft < platRight - 4
      ) {
        player.y = platTop - player.height / 2;
        player.vy = 0;
        player.onGround = true;

        // Start sink timer when player lands
        if (!plat.sinking) {
          plat.sinking = true;
        }
      }
    }

    // Lava death — player falls below lava line
    if (player.y - player.height / 2 > state.lavaY) {
      this.die(state);
      return;
    }

    // Also die if player falls off bottom of screen
    if (player.y > state.canvasH + 50) {
      this.die(state);
    }
  }

  private die(state: LavaState): void {
    state.phase = 'dead';
    state.flashTimer = 200;
    state.leftHeld = false;
    state.rightHeld = false;
    state.jumpPressed = false;

    // Spawn death particles
    this.spawnDeathParticles(state);

    const time = Math.floor(state.survivalTime / 100) / 10;
    if (time > state.bestTime) {
      state.bestTime = time;
      try {
        localStorage.setItem(HS_KEY, String(state.bestTime));
      } catch {
        /* noop */
      }
    }
  }

  private spawnDeathParticles(state: LavaState): void {
    const colors = ['#ff5722', '#ff9800', '#ffeb3b', '#f44336', '#ff6f00'];
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 0.1 + Math.random() * 0.3;
      const particle: Particle = {
        x: state.player.x,
        y: state.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.15,
        life: 600 + Math.random() * 400,
        maxLife: 600 + Math.random() * 400,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5,
      };
      particle.maxLife = particle.life;
      state.particles.push(particle);
    }
  }
}
