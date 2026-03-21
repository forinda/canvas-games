import type { Updatable } from "@core/Updatable";
import type { AsteroidsState } from "../types";
import { SHIP_THRUST, SHIP_DRAG, SHIP_ROTATION_SPEED } from "../types";
import type { InputKeys } from "./InputSystem";

export class PhysicsSystem implements Updatable<AsteroidsState> {
	private keys: InputKeys;

	constructor(keys: InputKeys) {
		this.keys = keys;
	}

	update(state: AsteroidsState, _dt: number): void {
		if (!state.started || state.paused || state.gameOver) return;

		this.updateShip(state);
		this.updateBullets(state);
		this.updateAsteroids(state);
		this.updateParticles(state);
	}

	private updateShip(state: AsteroidsState): void {
		const ship = state.ship;
		const { width, height } = state;

		// Rotation
		if (this.keys.left) ship.angle -= SHIP_ROTATION_SPEED;

		if (this.keys.right) ship.angle += SHIP_ROTATION_SPEED;

		// Thrust
		ship.thrusting = this.keys.up;

		if (ship.thrusting) {
			ship.vel.x += Math.sin(ship.angle) * SHIP_THRUST;
			ship.vel.y -= Math.cos(ship.angle) * SHIP_THRUST;
		}

		// Drag
		ship.vel.x *= SHIP_DRAG;
		ship.vel.y *= SHIP_DRAG;

		// Move
		ship.pos.x += ship.vel.x;
		ship.pos.y += ship.vel.y;

		// Wrap
		ship.pos.x = this.wrap(ship.pos.x, width);
		ship.pos.y = this.wrap(ship.pos.y, height);
	}

	private updateBullets(state: AsteroidsState): void {
		const { width, height } = state;

		for (let i = state.bullets.length - 1; i >= 0; i--) {
			const b = state.bullets[i];

			b.pos.x += b.vel.x;
			b.pos.y += b.vel.y;
			b.pos.x = this.wrap(b.pos.x, width);
			b.pos.y = this.wrap(b.pos.y, height);
			b.life--;

			if (b.life <= 0) {
				state.bullets.splice(i, 1);
			}
		}
	}

	private updateAsteroids(state: AsteroidsState): void {
		const { width, height } = state;

		for (const a of state.asteroids) {
			a.pos.x += a.vel.x;
			a.pos.y += a.vel.y;
			a.pos.x = this.wrap(a.pos.x, width);
			a.pos.y = this.wrap(a.pos.y, height);
		}
	}

	private updateParticles(state: AsteroidsState): void {
		for (let i = state.particles.length - 1; i >= 0; i--) {
			const p = state.particles[i];

			p.pos.x += p.vel.x;
			p.pos.y += p.vel.y;
			p.life--;

			if (p.life <= 0) {
				state.particles.splice(i, 1);
			}
		}
	}

	private wrap(val: number, max: number): number {
		if (val < 0) return val + max;

		if (val > max) return val - max;

		return val;
	}
}
