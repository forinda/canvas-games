import type { InputHandler } from "@core/InputHandler";
import type { AntColonyState, Vec2 } from "../types";
import { COLONY_RADIUS } from "../types";

export class InputSystem implements InputHandler {
	private state: AntColonyState;
	private canvas: HTMLCanvasElement;
	private onExit: () => void;

	private handleClick: (e: MouseEvent) => void;
	private handleContext: (e: MouseEvent) => void;
	private handleKey: (e: KeyboardEvent) => void;

	constructor(
		state: AntColonyState,
		canvas: HTMLCanvasElement,
		onExit: () => void,
	) {
		this.state = state;
		this.canvas = canvas;
		this.onExit = onExit;

		this.handleClick = this._onClick.bind(this);
		this.handleContext = this._onContextMenu.bind(this);
		this.handleKey = this._onKeyDown.bind(this);
	}

	attach(): void {
		this.canvas.addEventListener("click", this.handleClick);
		this.canvas.addEventListener("contextmenu", this.handleContext);
		window.addEventListener("keydown", this.handleKey);
	}

	detach(): void {
		this.canvas.removeEventListener("click", this.handleClick);
		this.canvas.removeEventListener("contextmenu", this.handleContext);
		window.removeEventListener("keydown", this.handleKey);
	}

	/** Left click: place food source */
	private _onClick(e: MouseEvent): void {
		if (this.state.gameOver || this.state.showHelp) return;

		if (!this.state.started) {
			this.state.started = true;

			return;
		}

		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		// Don't place food on top of colony
		const dx = x - this.state.colony.x;
		const dy = y - this.state.colony.y;

		if (Math.sqrt(dx * dx + dy * dy) < COLONY_RADIUS * 2) return;

		this.state.foodSources.push({
			x,
			y,
			amount: 50,
			maxAmount: 50,
			radius: 14,
		});
	}

	/** Right click: place tunnel waypoint */
	private _onContextMenu(e: MouseEvent): void {
		e.preventDefault();

		if (this.state.gameOver || !this.state.started || this.state.showHelp)
			return;

		const rect = this.canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const wp: Vec2 = { x, y };
		const waypoints = this.state.tunnelWaypoints;

		// Build tunnel segment from last waypoint (or colony)
		const prev =
			waypoints.length > 0
				? waypoints[waypoints.length - 1]
				: { x: this.state.colony.x, y: this.state.colony.y };

		this.state.tunnels.push({
			x1: prev.x,
			y1: prev.y,
			x2: wp.x,
			y2: wp.y,
			progress: 0,
			complete: false,
		});

		waypoints.push(wp);
	}

	private _onKeyDown(e: KeyboardEvent): void {
		const s = this.state;

		if (e.key === "Escape") {
			this.onExit();

			return;
		}

		if (e.key === "h" || e.key === "H") {
			s.showHelp = !s.showHelp;

			return;
		}

		if (e.key === "p" || e.key === "P") {
			if (s.started && !s.gameOver) s.paused = !s.paused;

			return;
		}

		if (e.key === " " && s.gameOver) {
			// Restart handled by engine
			(this as any)._restartCb?.();

			return;
		}

		// Number keys 1-3 adjust task ratios
		if (e.key === "1") {
			// More foragers
			s.taskRatio.forage = Math.min(1, s.taskRatio.forage + 0.1);
			this._normalizeRatios("forage");
		} else if (e.key === "2") {
			// More builders
			s.taskRatio.build = Math.min(1, s.taskRatio.build + 0.1);
			this._normalizeRatios("build");
		} else if (e.key === "3") {
			// More idle
			s.taskRatio.idle = Math.min(1, s.taskRatio.idle + 0.1);
			this._normalizeRatios("idle");
		}
	}

	/** After bumping one ratio, normalize so they sum to 1 */
	private _normalizeRatios(bumped: "forage" | "build" | "idle"): void {
		const r = this.state.taskRatio;
		const total = r.forage + r.build + r.idle;

		if (total <= 0) {
			r.forage = 0.5;
			r.build = 0.3;
			r.idle = 0.2;

			return;
		}

		r.forage /= total;
		r.build /= total;
		r.idle /= total;
		// Clamp minimum
		const keys: ("forage" | "build" | "idle")[] = ["forage", "build", "idle"];

		for (const k of keys) {
			if (r[k] < 0.05 && k !== bumped) r[k] = 0.05;
		}

		const t2 = r.forage + r.build + r.idle;

		r.forage /= t2;
		r.build /= t2;
		r.idle /= t2;
	}

	setRestartCallback(cb: () => void): void {
		(this as any)._restartCb = cb;
	}
}
