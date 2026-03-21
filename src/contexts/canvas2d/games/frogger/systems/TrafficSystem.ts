import type { Updatable } from "@core/Updatable";
import type { FroggerState, Vehicle } from "../types";
import { VEHICLE_COLORS } from "../data/levels";

export class TrafficSystem implements Updatable<FroggerState> {
	/** Populate vehicles for all road lanes on level start / reset */
	populate(state: FroggerState): void {
		state.vehicles = [];

		for (let row = 0; row < state.lanes.length; row++) {
			const lane = state.lanes[row];

			if (lane.kind !== "road") continue;

			for (const tmpl of lane.objects) {
				const widthPx = tmpl.width * state.cellW;
				const gapPx = (tmpl.gap + tmpl.width) * state.cellW;
				const count = Math.ceil(state.canvasW / gapPx) + 1;
				const signedSpeed = lane.speed * lane.direction;

				for (let i = 0; i < count; i++) {
					const vehicle: Vehicle = {
						x: i * gapPx,
						row,
						width: widthPx,
						speed: signedSpeed,
						color: VEHICLE_COLORS[(row + i) % VEHICLE_COLORS.length],
					};

					state.vehicles.push(vehicle);
				}
			}
		}
	}

	update(state: FroggerState, dt: number): void {
		const w = state.canvasW;

		for (const v of state.vehicles) {
			v.x += v.speed * dt;

			// Wrap around
			if (v.speed > 0 && v.x > w) {
				v.x = -v.width;
			} else if (v.speed < 0 && v.x + v.width < 0) {
				v.x = w;
			}
		}
	}
}
