import type { Updatable } from "@core/Updatable";
import type { ColorSwitchState, Gate, ColorSwitcher, GateType } from "../types";
import {
	GAME_COLORS,
	GATE_SPACING,
	GATE_ROTATION_SPEED,
	SWITCHER_RADIUS,
	SWITCHER_ROTATION_SPEED,
} from "../types";

export class GateSystem implements Updatable<ColorSwitchState> {
	private nextGateY: number = 0;
	private gateCount: number = 0;

	/** Reset internal counters (called on game restart) */
	reset(startY: number): void {
		this.nextGateY = startY;
		this.gateCount = 0;
	}

	update(state: ColorSwitchState, dt: number): void {
		if (state.phase !== "playing") return;

		// Rotate existing gates
		for (const gate of state.gates) {
			gate.rotation += GATE_ROTATION_SPEED * dt;
		}

		// Rotate existing switchers
		for (const sw of state.switchers) {
			sw.rotation += SWITCHER_ROTATION_SPEED * dt;
		}

		// Generate gates ahead of the ball
		const generateAheadDistance = state.canvasH * 1.5;

		while (this.nextGateY > state.ball.y - generateAheadDistance) {
			this.spawnGate(state);
		}

		// Cleanup: remove gates and switchers that are far below the screen
		const removeBelow = state.ball.y + state.canvasH;

		state.gates = state.gates.filter((g) => g.y < removeBelow);
		state.switchers = state.switchers.filter((s) => s.y < removeBelow);
	}

	private spawnGate(state: ColorSwitchState): void {
		const gateTypes: GateType[] = ["ring", "bar", "square"];
		const type = gateTypes[this.gateCount % gateTypes.length];

		// Shuffle colors for variety
		const colors = this.shuffleColors();

		const gate: Gate = {
			type: type,
			y: this.nextGateY,
			rotation: Math.random() * Math.PI * 2,
			colors: colors,
			scored: false,
		};

		state.gates.push(gate);

		// Spawn a color switcher between this gate and the next one
		const switcher: ColorSwitcher = {
			x: state.canvasW / 2,
			y: this.nextGateY - GATE_SPACING / 2,
			radius: SWITCHER_RADIUS,
			rotation: 0,
			consumed: false,
		};

		state.switchers.push(switcher);

		this.nextGateY -= GATE_SPACING;
		this.gateCount++;
	}

	private shuffleColors(): string[] {
		const colors = [...GAME_COLORS];

		// Fisher-Yates shuffle
		for (let i = colors.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const temp = colors[i];

			colors[i] = colors[j];
			colors[j] = temp;
		}

		return colors;
	}
}
