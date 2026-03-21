import type { Updatable } from "@core/Updatable";
import type { GameState, Zombie } from "../types.ts";
import {
	DAY_DURATION,
	NIGHT_DURATION,
	SCAVENGE_RATE_AMMO,
	SCAVENGE_RATE_RESOURCES,
	ARENA_W,
	ARENA_H,
} from "../types.ts";
import { getWaveSpawns, waveHpMultiplier } from "../data/waves.ts";
import { ZOMBIE_DEFS } from "../data/zombies.ts";

export class WaveSystem implements Updatable<GameState> {
	update(state: GameState, dt: number): void {
		state.cycleTimer -= dt;

		if (state.timeOfDay === "day") {
			this.updateDay(state, dt);
		} else {
			this.updateNight(state, dt);
		}
	}

	private updateDay(state: GameState, dt: number): void {
		// Auto-scavenge resources during day
		state.player.ammo = Math.min(
			state.player.maxAmmo,
			state.player.ammo + SCAVENGE_RATE_AMMO * dt,
		);
		state.player.resources += SCAVENGE_RATE_RESOURCES * dt;

		// Small HP regen during day
		state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2 * dt);

		if (state.cycleTimer <= 0) {
			// Transition to night
			state.timeOfDay = "night";
			state.cycleTimer = NIGHT_DURATION;
			state.wave++;
			this.startWave(state);
		}
	}

	private updateNight(state: GameState, dt: number): void {
		// Spawn queued zombies
		this.processSpawnQueue(state, dt);

		// Check if wave is complete
		const allSpawned = state.spawnQueue.length === 0;
		const allDead =
			state.zombies.every((z) => z.dead) || state.zombies.length === 0;

		if (allSpawned && allDead && state.cycleTimer < NIGHT_DURATION - 2) {
			// Wave cleared early - go to day
			state.timeOfDay = "day";
			state.cycleTimer = DAY_DURATION;

			return;
		}

		if (state.cycleTimer <= 0) {
			// Night is over regardless
			state.timeOfDay = "day";
			state.cycleTimer = DAY_DURATION;
		}
	}

	private startWave(state: GameState): void {
		const spawns = getWaveSpawns(state.wave);

		state.spawnQueue = [...spawns];
		let totalZombies = 0;

		for (const s of spawns) totalZombies += s.count;

		state.zombiesRemainingInWave = totalZombies;
		state.spawnTimer = 0.5; // initial delay before first spawn
	}

	private processSpawnQueue(state: GameState, dt: number): void {
		if (state.spawnQueue.length === 0) return;

		state.spawnTimer -= dt;

		if (state.spawnTimer > 0) return;

		// Spawn next zombie
		const group = state.spawnQueue[0];

		this.spawnZombie(state, group.type);
		group.count--;

		if (group.count <= 0) {
			state.spawnQueue.shift();
		}

		// Interval between spawns gets shorter in later waves
		const baseInterval = 1.2;
		const minInterval = 0.3;

		state.spawnTimer = Math.max(minInterval, baseInterval - state.wave * 0.08);
	}

	private spawnZombie(state: GameState, type: Zombie["type"]): void {
		const def = ZOMBIE_DEFS[type];
		const hpMult = waveHpMultiplier(state.wave);

		// Spawn from random edge
		const edge = Math.floor(Math.random() * 4);
		let x: number;
		let y: number;

		switch (edge) {
			case 0:
				x = Math.random() * ARENA_W;
				y = -20;
				break; // top
			case 1:
				x = ARENA_W + 20;
				y = Math.random() * ARENA_H;
				break; // right
			case 2:
				x = Math.random() * ARENA_W;
				y = ARENA_H + 20;
				break; // bottom
			default:
				x = -20;
				y = Math.random() * ARENA_H;
				break; // left
		}

		const zombie: Zombie = {
			id: state.nextId++,
			type,
			x,
			y,
			hp: Math.round(def.hp * hpMult),
			maxHp: Math.round(def.hp * hpMult),
			speed: def.speed + Math.random() * 10 - 5, // slight variance
			damage: def.damage,
			attackCooldown: 0,
			attackInterval: def.attackInterval,
			state: "chasing",
			targetBarricadeId: null,
			radius: def.radius,
			dead: false,
		};

		state.zombies.push(zombie);
	}
}
