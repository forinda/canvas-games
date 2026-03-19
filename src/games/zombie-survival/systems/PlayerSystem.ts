import type { Updatable } from "@shared/Updatable.ts";
import type { GameState } from "../types.ts";
import type { InputSnapshot } from "./InputSystem.ts";
import {
	PLAYER_SPEED,
	PLAYER_RADIUS,
	BULLET_SPEED,
	BULLET_DAMAGE,
	BULLET_RADIUS,
	BARRICADE_SIZE,
	BARRICADE_HP,
	BARRICADE_COST,
	ARENA_W,
	ARENA_H,
} from "../types.ts";

export class PlayerSystem implements Updatable<GameState> {
	private input!: InputSnapshot;

	setInput(input: InputSnapshot): void {
		this.input = input;
	}

	update(state: GameState, dt: number): void {
		const inp = this.input;

		if (!inp) return;

		const player = state.player;

		// ─── Movement ──────────────────────────────────────
		let dx = inp.moveX;
		let dy = inp.moveY;
		const len = Math.sqrt(dx * dx + dy * dy);

		if (len > 0) {
			dx /= len;
			dy /= len;
		}

		player.x += dx * PLAYER_SPEED * dt;
		player.y += dy * PLAYER_SPEED * dt;

		// Clamp to arena
		player.x = Math.max(
			PLAYER_RADIUS,
			Math.min(ARENA_W - PLAYER_RADIUS, player.x),
		);
		player.y = Math.max(
			PLAYER_RADIUS,
			Math.min(ARENA_H - PLAYER_RADIUS, player.y),
		);

		// ─── Aim ───────────────────────────────────────────
		player.angle = Math.atan2(inp.aimY - player.y, inp.aimX - player.x);

		// ─── Shooting ──────────────────────────────────────
		player.shootCooldown = Math.max(0, player.shootCooldown - dt);

		if (inp.shooting && player.shootCooldown <= 0 && player.ammo > 0) {
			this.fireBullet(state);
			player.ammo--;
			player.shootCooldown = 0.18; // fire rate
		}

		// ─── Invincibility ─────────────────────────────────
		player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);

		// ─── Place Barricade ───────────────────────────────
		if (inp.placeBarricade && player.resources >= BARRICADE_COST) {
			this.placeBarricade(state);
		}
	}

	private fireBullet(state: GameState): void {
		const p = state.player;
		const vx = Math.cos(p.angle) * BULLET_SPEED;
		const vy = Math.sin(p.angle) * BULLET_SPEED;

		state.bullets.push({
			id: state.nextId++,
			x: p.x + Math.cos(p.angle) * (PLAYER_RADIUS + BULLET_RADIUS + 2),
			y: p.y + Math.sin(p.angle) * (PLAYER_RADIUS + BULLET_RADIUS + 2),
			vx,
			vy,
			damage: BULLET_DAMAGE,
			dead: false,
		});
	}

	private placeBarricade(state: GameState): void {
		const p = state.player;
		// Place barricade in front of player
		const dist = PLAYER_RADIUS + BARRICADE_SIZE * 0.8;
		const bx = p.x + Math.cos(p.angle) * dist;
		const by = p.y + Math.sin(p.angle) * dist;

		// Clamp within arena
		const halfB = BARRICADE_SIZE / 2;
		const cx = Math.max(halfB, Math.min(ARENA_W - halfB, bx));
		const cy = Math.max(halfB, Math.min(ARENA_H - halfB, by));

		// Don't place if overlapping another barricade
		for (const b of state.barricades) {
			if (b.dead) continue;

			const ddx = cx - b.x;
			const ddy = cy - b.y;

			if (Math.abs(ddx) < BARRICADE_SIZE && Math.abs(ddy) < BARRICADE_SIZE) {
				return; // too close
			}
		}

		state.player.resources -= BARRICADE_COST;
		state.barricades.push({
			id: state.nextId++,
			x: cx,
			y: cy,
			hp: BARRICADE_HP,
			maxHp: BARRICADE_HP,
			dead: false,
		});
	}
}
