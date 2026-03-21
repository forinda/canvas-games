import type { InputHandler } from "@core/InputHandler";
import type { CityState } from "../types";
import { BUILDING_DEFS } from "../data/buildings";
import { BUILDING_TYPES } from "../data/buildings";
import type { GridSystem } from "./GridSystem";
import type { StatsSystem } from "./StatsSystem";

export class InputSystem implements InputHandler {
	private canvas: HTMLCanvasElement;
	private state: CityState;
	private gridSystem: GridSystem;
	private statsSystem: StatsSystem;
	private onExit: () => void;
	private showMessage: (msg: string) => void;
	private clickHandler: (e: MouseEvent) => void;
	private moveHandler: (e: MouseEvent) => void;
	private keyHandler: (e: KeyboardEvent) => void;
	private resizeHandler: () => void;

	constructor(
		canvas: HTMLCanvasElement,
		state: CityState,
		gridSystem: GridSystem,
		statsSystem: StatsSystem,
		onExit: () => void,
		showMessage: (msg: string) => void,
	) {
		this.canvas = canvas;
		this.state = state;
		this.gridSystem = gridSystem;
		this.statsSystem = statsSystem;
		this.onExit = onExit;
		this.showMessage = showMessage;

		this.clickHandler = (e) => this.handleClick(e);
		this.moveHandler = (e) => this.handleMove(e);
		this.keyHandler = (e) => {
			if (e.key === "Escape") {
				this.onExit();

				return;
			}

			const num = parseInt(e.key);

			if (num >= 1 && num <= 6)
				this.state.selectedType = BUILDING_TYPES[num - 1];

			if (e.key === "+" || e.key === "=")
				this.state.speed = Math.min(3, this.state.speed + 1);

			if (e.key === "-") this.state.speed = Math.max(1, this.state.speed - 1);
		};
		this.resizeHandler = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};
	}

	attach(): void {
		this.canvas.addEventListener("click", this.clickHandler);
		this.canvas.addEventListener("mousemove", this.moveHandler);
		window.addEventListener("keydown", this.keyHandler);
		window.addEventListener("resize", this.resizeHandler);
	}

	detach(): void {
		this.canvas.removeEventListener("click", this.clickHandler);
		this.canvas.removeEventListener("mousemove", this.moveHandler);
		window.removeEventListener("keydown", this.keyHandler);
		window.removeEventListener("resize", this.resizeHandler);
	}

	private getCoords(e: MouseEvent): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect();

		return {
			x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
			y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
		};
	}

	private handleClick(e: MouseEvent): void {
		const { x, y } = this.getCoords(e);

		if (x < 80 && y < 40) {
			this.onExit();

			return;
		}

		const s = this.state;

		if (!s.started) {
			s.started = true;

			return;
		}

		// Building panel click
		const panelY = this.canvas.height - 90;

		if (y >= panelY) {
			const cardW = 80;
			const pad = 10;

			for (let i = 0; i < BUILDING_TYPES.length; i++) {
				const cx = pad + i * (cardW + pad);

				if (
					x >= cx &&
					x <= cx + cardW &&
					y >= panelY + 10 &&
					y <= panelY + 70
				) {
					s.selectedType =
						s.selectedType === BUILDING_TYPES[i] ? null : BUILDING_TYPES[i];

					return;
				}
			}

			return;
		}

		// Grid click
		const cell = this.gridSystem.pixelToCell(s, x, y);

		if (!cell || !s.selectedType) return;

		const { col, row } = cell;

		if (!this.gridSystem.isCellEmpty(s, col, row)) {
			this.showMessage("Cell already occupied!");

			return;
		}

		const def = BUILDING_DEFS[s.selectedType];

		if (s.money < def.cost) {
			this.showMessage("Not enough money!");

			return;
		}

		s.money -= def.cost;
		this.gridSystem.placeBuilding(s, {
			type: s.selectedType,
			col,
			row,
			level: 1,
		});
		this.statsSystem.recalcStats(s);
	}

	private handleMove(e: MouseEvent): void {
		const { x, y } = this.getCoords(e);

		this.state.hoveredCell = this.gridSystem.pixelToCell(this.state, x, y);
	}
}
