import type { Updatable } from "@core/Updatable";
import type { FruitNinjaState, FruitHalf, JuiceParticle } from "../types";
import { COMBO_WINDOW, PARTICLE_COUNT } from "../types";

export class SliceSystem implements Updatable<FruitNinjaState> {
	update(state: FruitNinjaState, dt: number): void {
		const dtSec = dt / 1000;

		// Decay combo timer
		if (state.comboTimer > 0) {
			state.comboTimer -= dt;

			if (state.comboTimer <= 0) {
				state.combo = 0;
			}
		}

		// Update particles
		for (const p of state.particles) {
			p.x += p.vx * dtSec;
			p.vy += 400 * dtSec; // particle gravity
			p.y += p.vy * dtSec;
			p.life -= dtSec;
			p.alpha = Math.max(0, p.life / p.maxLife);
		}

		state.particles = state.particles.filter((p) => p.life > 0);

		// Check slicing only when mouse is down and we have trail points
		if (!state.mouseDown) return;

		const trail = state.trail.points;

		if (trail.length < 2) return;

		// Use last two trail points as the slice segment
		const p1 = trail[trail.length - 2];
		const p2 = trail[trail.length - 1];

		for (const fruit of state.fruits) {
			if (fruit.sliced) continue;

			const r = fruit.type.radius;

			if (
				this.segmentIntersectsCircle(
					p1.x,
					p1.y,
					p2.x,
					p2.y,
					fruit.x,
					fruit.y,
					r,
				)
			) {
				fruit.sliced = true;

				if (fruit.isBomb) {
					// Bomb handling is done by BombSystem
					continue;
				}

				// Score
				state.swipeSliceCount++;
				state.combo++;
				state.comboTimer = COMBO_WINDOW;

				const comboMultiplier =
					state.swipeSliceCount >= 3 ? state.swipeSliceCount : 1;

				state.score += fruit.type.points * comboMultiplier;

				// Spawn halves
				const sliceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
				const perpX = Math.cos(sliceAngle + Math.PI / 2) * 60;
				const perpY = Math.sin(sliceAngle + Math.PI / 2) * 60;

				const halfBase = {
					type: fruit.type,
					x: fruit.x,
					y: fruit.y,
					rotation: fruit.rotation,
					rotationSpeed: fruit.rotationSpeed,
					isBomb: false,
					alpha: 1,
				};

				const leftHalf: FruitHalf = {
					...halfBase,
					vx: fruit.vx - perpX,
					vy: fruit.vy - Math.abs(perpY),
					rotationSpeed: -4 - Math.random() * 3,
					side: -1,
				};
				const rightHalf: FruitHalf = {
					...halfBase,
					vx: fruit.vx + perpX,
					vy: fruit.vy - Math.abs(perpY),
					rotationSpeed: 4 + Math.random() * 3,
					side: 1,
				};

				state.halves.push(leftHalf, rightHalf);

				// Spawn juice particles
				this.spawnParticles(state, fruit.x, fruit.y, fruit.type.innerColor);
			}
		}
	}

	private spawnParticles(
		state: FruitNinjaState,
		x: number,
		y: number,
		color: string,
	): void {
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 80 + Math.random() * 250;
			const life = 0.5 + Math.random() * 0.8;
			const particle: JuiceParticle = {
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 100,
				radius: 2 + Math.random() * 5,
				color,
				alpha: 1,
				life,
				maxLife: life,
			};

			state.particles.push(particle);
		}
	}

	private segmentIntersectsCircle(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		cx: number,
		cy: number,
		r: number,
	): boolean {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const fx = x1 - cx;
		const fy = y1 - cy;

		const a = dx * dx + dy * dy;
		const b = 2 * (fx * dx + fy * dy);
		const c = fx * fx + fy * fy - r * r;

		let discriminant = b * b - 4 * a * c;

		if (discriminant < 0) return false;

		discriminant = Math.sqrt(discriminant);
		const t1 = (-b - discriminant) / (2 * a);
		const t2 = (-b + discriminant) / (2 * a);

		return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
	}
}
