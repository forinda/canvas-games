import type { Upgrade } from "./types.ts";

/** Format a number with K/M/B/T suffixes */
export function formatNumber(n: number): string {
	if (n < 0) return "-" + formatNumber(-n);

	if (n < 1000) {
		// Show one decimal for small fractional numbers
		if (n < 10 && n !== Math.floor(n)) return n.toFixed(1);

		return Math.floor(n).toString();
	}

	const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi"];
	let tier = 0;
	let scaled = n;

	while (scaled >= 1000 && tier < suffixes.length - 1) {
		scaled /= 1000;
		tier++;
	}

	return scaled < 10
		? scaled.toFixed(2) + suffixes[tier]
		: scaled < 100
			? scaled.toFixed(1) + suffixes[tier]
			: Math.floor(scaled) + suffixes[tier];
}

/** Calculate the current cost of an upgrade based on owned count */
export function getUpgradeCost(upgrade: Upgrade): number {
	return Math.floor(
		upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.owned),
	);
}
