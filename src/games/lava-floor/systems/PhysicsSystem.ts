import type { Updatable } from "@shared/Updatable";
import type { LavaState } from "../types";
import { GRAVITY, JUMP_FORCE, MOVE_SPEED, MAX_FALL_SPEED } from "../types";

export class PhysicsSystem implements Updatable<LavaState> {
	update(state: LavaState, dt: number): void {
		if (state.phase !== "playing") {
			if (state.phase === "idle") {
				state.player.y =
					state.canvasH * 0.5 + Math.sin(performance.now() * 0.003) * 6;
			}

			return;
		}

		const player = state.player;

		// Horizontal movement
		player.vx = 0;

		if (state.leftHeld) {
			player.vx = -MOVE_SPEED;
			player.facingRight = false;
		}

		if (state.rightHeld) {
			player.vx = MOVE_SPEED;
			player.facingRight = true;
		}

		// Jump
		if (state.jumpPressed && player.onGround) {
			player.vy = JUMP_FORCE;
			player.onGround = false;
		}

		// Gravity
		player.vy += GRAVITY * dt;

		if (player.vy > MAX_FALL_SPEED) {
			player.vy = MAX_FALL_SPEED;
		}

		// Update position
		player.x += player.vx * dt;
		player.y += player.vy * dt;

		// Screen wrap horizontally
		if (player.x < -player.width) {
			player.x = state.canvasW + player.width;
		} else if (player.x > state.canvasW + player.width) {
			player.x = -player.width;
		}

		// Update survival time
		state.survivalTime += dt;
	}
}
