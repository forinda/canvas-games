import type { Updatable } from "@core/Updatable";
import type { RhythmState, Circle, TimingGrade } from "../types";
import {
	CIRCLE_RADIUS,
	OUTER_RING_MULTIPLIER,
	SHRINK_DURATION,
	SPAWN_INTERVAL_MIN,
	SPAWN_INTERVAL_MAX,
	SPAWN_MARGIN,
	PERFECT_THRESHOLD,
	GOOD_THRESHOLD,
	OK_THRESHOLD,
	GRADE_POINTS,
	HIT_EFFECT_DURATION,
	MISS_EFFECT_DURATION,
	ROUND_DURATION,
} from "../types";
import type { ComboSystem } from "./ComboSystem";

export class CircleSystem implements Updatable<RhythmState> {
	private comboSystem: ComboSystem;

	constructor(comboSystem: ComboSystem) {
		this.comboSystem = comboSystem;
	}

	update(state: RhythmState, dt: number): void {
		const dtSec = dt / 1000;

		// Update round timer
		state.timeRemaining -= dtSec;

		if (state.timeRemaining <= 0) {
			state.timeRemaining = 0;
			state.gameOver = true;

			return;
		}

		// Spawn new circles
		this.handleSpawning(state, dtSec);

		// Shrink existing circles
		this.shrinkCircles(state, dtSec);

		// Process pending click
		if (state.pendingClick) {
			this.processClick(state, state.pendingClick.x, state.pendingClick.y);
			state.pendingClick = null;
		}

		// Remove expired circles (missed)
		this.removeExpired(state);

		// Decay effects
		this.updateEffects(state, dtSec);
	}

	private handleSpawning(state: RhythmState, dtSec: number): void {
		state.spawnTimer -= dtSec;

		if (state.spawnTimer <= 0) {
			this.spawnCircle(state);

			// Spawn interval decreases as time progresses
			const progress = 1 - state.timeRemaining / ROUND_DURATION;
			const interval =
				SPAWN_INTERVAL_MAX -
				(SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN) * progress;

			state.spawnTimer = interval;
		}
	}

	private spawnCircle(state: RhythmState): void {
		const margin = SPAWN_MARGIN;
		const x = margin + Math.random() * (state.width - margin * 2);
		const y = margin + Math.random() * (state.height - margin * 2);

		const circle: Circle = {
			x,
			y,
			radius: CIRCLE_RADIUS,
			outerRadius: CIRCLE_RADIUS * OUTER_RING_MULTIPLIER,
			shrinkRate:
				(CIRCLE_RADIUS * (OUTER_RING_MULTIPLIER - 1)) / SHRINK_DURATION,
			spawnTime: performance.now(),
			hit: false,
			missed: false,
			grade: null,
			id: state.nextId,
		};

		state.nextId += 1;
		state.circles.push(circle);
	}

	private shrinkCircles(state: RhythmState, dtSec: number): void {
		for (const circle of state.circles) {
			if (circle.hit || circle.missed) continue;

			circle.outerRadius -= circle.shrinkRate * dtSec;
		}
	}

	private processClick(state: RhythmState, cx: number, cy: number): void {
		// Find the closest circle within tap range (use outerRadius as the clickable area)
		let bestCircle: Circle | null = null;
		let bestDist = Infinity;

		for (const circle of state.circles) {
			if (circle.hit || circle.missed) continue;

			const dx = cx - circle.x;
			const dy = cy - circle.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			// Allow clicking within the outer ring area
			if (dist <= circle.outerRadius && dist < bestDist) {
				bestDist = dist;
				bestCircle = circle;
			}
		}

		if (!bestCircle) return;

		const gap = Math.abs(bestCircle.outerRadius - bestCircle.radius);
		const grade = this.getTimingGrade(gap);

		bestCircle.hit = true;
		bestCircle.grade = grade;

		if (grade === "Miss") {
			// Too early — outer ring is still far away
			this.comboSystem.registerMiss(state);
			state.totalMisses += 1;
			state.missEffects.push({
				x: bestCircle.x,
				y: bestCircle.y,
				alpha: 1,
				time: MISS_EFFECT_DURATION,
			});
		} else {
			this.comboSystem.registerHit(state, grade);
			const points = GRADE_POINTS[grade] * state.multiplier;

			state.score += points;
			state.totalHits += 1;

			if (grade === "Perfect") state.perfectHits += 1;
			else if (grade === "Good") state.goodHits += 1;
			else state.okHits += 1;

			state.hitEffects.push({
				x: bestCircle.x,
				y: bestCircle.y,
				radius: bestCircle.radius,
				grade,
				alpha: 1,
				scale: 1,
				time: HIT_EFFECT_DURATION,
			});
		}
	}

	private getTimingGrade(gap: number): TimingGrade {
		if (gap <= PERFECT_THRESHOLD) return "Perfect";

		if (gap <= GOOD_THRESHOLD) return "Good";

		if (gap <= OK_THRESHOLD) return "OK";

		return "Miss";
	}

	private removeExpired(state: RhythmState): void {
		const toRemove: number[] = [];

		for (let i = 0; i < state.circles.length; i++) {
			const circle = state.circles[i];

			// Already processed
			if (circle.hit) {
				toRemove.push(i);
				continue;
			}

			// Outer ring has shrunk past the inner circle — missed
			if (!circle.missed && circle.outerRadius <= circle.radius * 0.3) {
				circle.missed = true;
				state.totalMisses += 1;
				this.comboSystem.registerMiss(state);

				state.missEffects.push({
					x: circle.x,
					y: circle.y,
					alpha: 1,
					time: MISS_EFFECT_DURATION,
				});
				toRemove.push(i);
			}
		}

		// Remove in reverse order to preserve indices
		for (let i = toRemove.length - 1; i >= 0; i--) {
			state.circles.splice(toRemove[i], 1);
		}
	}

	private updateEffects(state: RhythmState, dtSec: number): void {
		// Hit effects
		for (let i = state.hitEffects.length - 1; i >= 0; i--) {
			const e = state.hitEffects[i];

			e.time -= dtSec;
			e.alpha = Math.max(0, e.time / HIT_EFFECT_DURATION);
			e.scale = 1 + (1 - e.alpha) * 0.8;

			if (e.time <= 0) {
				state.hitEffects.splice(i, 1);
			}
		}

		// Miss effects
		for (let i = state.missEffects.length - 1; i >= 0; i--) {
			const e = state.missEffects[i];

			e.time -= dtSec;
			e.alpha = Math.max(0, e.time / MISS_EFFECT_DURATION);

			if (e.time <= 0) {
				state.missEffects.splice(i, 1);
			}
		}
	}
}
