import type { PuzzleState } from "../types";
import { makeBody } from "../types";

export class InventorySystem {
	placeSelected(state: PuzzleState, x: number, y: number): void {
		if (state.selectedInventory < state.inventory.length) {
			const item = state.inventory[state.selectedInventory];
			const body = makeBody(
				item.type,
				x - item.w / 2,
				y - item.h / 2,
				item.w,
				item.h,
				true,
				item.color,
			);

			state.bodies.push(body);
			state.placed++;
			state.selectedInventory++;
		}
	}
}
