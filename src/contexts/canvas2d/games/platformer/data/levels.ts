import type { Platform, Coin, Enemy, PlatState } from "../types";
import { PLAYER_W, PLAYER_H } from "../types";

export function buildLevel(level: number): PlatState {
	const platforms: Platform[] = [];
	const coins: Coin[] = [];
	const enemies: Enemy[] = [];

	// Ground
	platforms.push({
		x: 0,
		y: 500,
		w: 2400,
		h: 40,
		color: "#4a6741",
		type: "solid",
	});

	// Platforms - procedural based on level
	const count = 8 + level * 3;

	for (let i = 0; i < count; i++) {
		const px = 200 + i * 250 + Math.random() * 100;
		const py = 300 + Math.sin(i * 0.7) * 150 - level * 10;
		const w = 80 + Math.random() * 100;
		const type: Platform["type"] =
			i % 5 === 0 ? "moving" : i % 7 === 0 ? "crumble" : "solid";
		const p: Platform = {
			x: px,
			y: py,
			w,
			h: 16,
			color:
				type === "crumble"
					? "#8b5e3c"
					: type === "moving"
						? "#4a7ab5"
						: "#5a7a5a",
			type,
		};

		if (type === "moving") {
			p.origX = px;
			p.moveRange = 80;
			p.moveSpeed = 60 + Math.random() * 40;
		}

		platforms.push(p);

		// Coins on platforms
		if (Math.random() > 0.3) {
			coins.push({ x: px + w / 2, y: py - 25, collected: false });
		}
	}

	// Enemies
	for (let i = 0; i < 3 + level; i++) {
		const ex = 400 + i * 500;

		enemies.push({
			x: ex,
			y: 474,
			w: 24,
			h: 24,
			speed: 50 + level * 10,
			dir: 1,
			minX: ex - 100,
			maxX: ex + 100,
		});
	}

	const goalX = 200 + count * 250;

	return {
		px: 60,
		py: 460,
		vx: 0,
		vy: 0,
		pw: PLAYER_W,
		ph: PLAYER_H,
		onGround: false,
		jumping: false,
		facing: 1,
		platforms,
		coins,
		enemies,
		camX: 0,
		camY: 0,
		score: 0,
		lives: 3,
		level,
		gameOver: false,
		won: false,
		started: false,
		goalX,
		goalY: 460,
	};
}
