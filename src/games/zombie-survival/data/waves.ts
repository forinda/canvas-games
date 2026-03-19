import type { WaveSpawn } from "../types.ts";

/** Returns the spawn list for a given wave number. Scales infinitely. */
export function getWaveSpawns(wave: number): WaveSpawn[] {
	const spawns: WaveSpawn[] = [];

	// Base walkers scale with wave
	const walkerCount = 3 + wave * 2;

	spawns.push({ type: "walker", count: walkerCount });

	// Runners appear from wave 2
	if (wave >= 2) {
		const runnerCount = Math.floor(wave * 1.2);

		spawns.push({ type: "runner", count: runnerCount });
	}

	// Tanks appear from wave 4
	if (wave >= 4) {
		const tankCount = Math.max(1, Math.floor((wave - 3) * 0.6));

		spawns.push({ type: "tank", count: tankCount });
	}

	return spawns;
}

/** HP multiplier that makes later waves tougher */
export function waveHpMultiplier(wave: number): number {
	return 1 + (wave - 1) * 0.15;
}
