import type { TowerDef, TowerType } from "../types";

export const TOWER_DEFS: Record<TowerType, TowerDef> = {
	archer: {
		type: "archer",
		name: "Archer",
		cost: 50,
		damage: 10,
		range: 150,
		fireInterval: 600,
		projectileType: "arrow",
		projectileSpeed: 400,
		splashRadius: 0,
		slowFactor: 0,
		color: "#6d9e3f",
		icon: "🏹",
		upgradeCostMultiplier: 1.5,
	},
	cannon: {
		type: "cannon",
		name: "Cannon",
		cost: 100,
		damage: 30,
		range: 120,
		fireInterval: 1800,
		projectileType: "cannonball",
		projectileSpeed: 300,
		splashRadius: 40,
		slowFactor: 0,
		color: "#555",
		icon: "💣",
		upgradeCostMultiplier: 1.5,
	},
	frost: {
		type: "frost",
		name: "Frost",
		cost: 70,
		damage: 12,
		range: 140,
		fireInterval: 900,
		projectileType: "frostbolt",
		projectileSpeed: 350,
		splashRadius: 0,
		slowFactor: 0.5,
		color: "#4fc3f7",
		icon: "❄️",
		upgradeCostMultiplier: 1.5,
	},
	sniper: {
		type: "sniper",
		name: "Sniper",
		cost: 120,
		damage: 55,
		range: 280,
		fireInterval: 2200,
		projectileType: "bullet",
		projectileSpeed: 600,
		splashRadius: 0,
		slowFactor: 0,
		color: "#c0a060",
		icon: "🎯",
		upgradeCostMultiplier: 1.5,
	},
};

/** Stat multipliers per upgrade level (level 1 = base, level 2, level 3) */
export const UPGRADE_MULTIPLIERS: Record<
	number,
	{ damage: number; range: number; fireInterval: number }
> = {
	1: { damage: 1.0, range: 1.0, fireInterval: 1.0 },
	2: { damage: 1.6, range: 1.2, fireInterval: 0.8 },
	3: { damage: 2.5, range: 1.4, fireInterval: 0.6 },
};

/** Cost to upgrade to a given level (total paid on top of base cost) */
export function upgradeCost(def: TowerDef, currentLevel: number): number {
	return Math.round(def.cost * def.upgradeCostMultiplier * currentLevel);
}

/** Sell refund = 60% of total invested */
export function sellRefund(totalInvested: number): number {
	return Math.round(totalInvested * 0.6);
}

/** Get effective stats for a placed tower at a given level */
export function getTowerStats(type: TowerType, level: number) {
	const def = TOWER_DEFS[type];
	const mul = UPGRADE_MULTIPLIERS[level] ?? UPGRADE_MULTIPLIERS[3];

	return {
		damage: Math.round(def.damage * mul.damage),
		range: Math.round(def.range * mul.range),
		fireInterval: Math.round(def.fireInterval * mul.fireInterval),
		splashRadius: def.splashRadius,
		slowFactor: def.slowFactor,
		projectileType: def.projectileType,
		projectileSpeed: def.projectileSpeed,
	};
}
