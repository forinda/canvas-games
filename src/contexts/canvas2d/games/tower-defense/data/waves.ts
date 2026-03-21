import type { WaveDef } from "../types";

/** Classic mode: 10 waves, boss on wave 5 and 10 */
export const CLASSIC_WAVES: WaveDef[] = [
	{
		waveNumber: 1,
		groups: [{ enemyType: "goblin", count: 8, interval: 800 }],
	},
	{
		waveNumber: 2,
		groups: [
			{ enemyType: "goblin", count: 10, interval: 700 },
			{ enemyType: "orc", count: 2, interval: 1500 },
		],
	},
	{
		waveNumber: 3,
		groups: [
			{ enemyType: "goblin", count: 8, interval: 600 },
			{ enemyType: "orc", count: 4, interval: 1200 },
		],
	},
	{
		waveNumber: 4,
		groups: [
			{ enemyType: "orc", count: 6, interval: 1000 },
			{ enemyType: "ghost", count: 4, interval: 900 },
		],
	},
	{
		waveNumber: 5,
		groups: [
			{ enemyType: "goblin", count: 12, interval: 500 },
			{ enemyType: "orc", count: 5, interval: 900 },
			{ enemyType: "boss", count: 1, interval: 0 },
		],
		preBossAnnounce: true,
	},
	{
		waveNumber: 6,
		groups: [
			{ enemyType: "ghost", count: 10, interval: 600 },
			{ enemyType: "orc", count: 6, interval: 900 },
		],
	},
	{
		waveNumber: 7,
		groups: [
			{ enemyType: "goblin", count: 15, interval: 450 },
			{ enemyType: "ghost", count: 8, interval: 600 },
			{ enemyType: "orc", count: 5, interval: 900 },
		],
	},
	{
		waveNumber: 8,
		groups: [
			{ enemyType: "orc", count: 10, interval: 700 },
			{ enemyType: "ghost", count: 10, interval: 500 },
		],
	},
	{
		waveNumber: 9,
		groups: [
			{ enemyType: "goblin", count: 20, interval: 350 },
			{ enemyType: "orc", count: 8, interval: 700 },
			{ enemyType: "ghost", count: 8, interval: 500 },
		],
	},
	{
		waveNumber: 10,
		groups: [
			{ enemyType: "goblin", count: 15, interval: 350 },
			{ enemyType: "orc", count: 10, interval: 600 },
			{ enemyType: "ghost", count: 10, interval: 450 },
			{ enemyType: "boss", count: 2, interval: 3000 },
		],
		preBossAnnounce: true,
	},
];

/**
 * Generate an endless wave definition.
 * Scales HP and count exponentially with wave number.
 */
export function generateEndlessWave(waveNumber: number): WaveDef {
	const scale = Math.pow(1.12, waveNumber - 1);
	const hpMul = parseFloat(scale.toFixed(2));
	const speedMul = parseFloat((1 + (waveNumber - 1) * 0.02).toFixed(2));

	const isBossWave = waveNumber % 5 === 0;
	const groups = [];

	groups.push({
		enemyType: "goblin" as const,
		count: Math.min(5 + waveNumber * 2, 40),
		interval: Math.max(600 - waveNumber * 20, 200),
		hpMultiplier: hpMul,
		speedMultiplier: speedMul,
	});

	if (waveNumber >= 3) {
		groups.push({
			enemyType: "orc" as const,
			count: Math.min(2 + waveNumber, 20),
			interval: Math.max(900 - waveNumber * 15, 300),
			hpMultiplier: hpMul,
			speedMultiplier: speedMul,
		});
	}

	if (waveNumber >= 5) {
		groups.push({
			enemyType: "ghost" as const,
			count: Math.min(2 + waveNumber, 15),
			interval: Math.max(700 - waveNumber * 15, 250),
			hpMultiplier: hpMul,
			speedMultiplier: speedMul,
		});
	}

	if (isBossWave) {
		groups.push({
			enemyType: "boss" as const,
			count: Math.floor(waveNumber / 5),
			interval: 3000,
			hpMultiplier: hpMul * 1.2,
			speedMultiplier: speedMul,
		});
	}

	return { waveNumber, groups, preBossAnnounce: isBossWave };
}

/** Challenge mode = Classic waves but starting gold is half */
export const CHALLENGE_WAVES = CLASSIC_WAVES;
