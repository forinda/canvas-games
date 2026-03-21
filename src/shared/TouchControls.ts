/**
 * Shared virtual touch controls for mobile gameplay.
 * Games declare which layout they need via GameDefinition.touchLayout.
 * Controls auto-show on touch devices, auto-hide on desktop.
 */

export type TouchLayout =
	| "none"
	| "dpad"
	| "dpad-jump"
	| "dpad-action"
	| "tap-only"
	| "dual-stick"
	| "flap";

export interface TouchState {
	left: boolean;
	right: boolean;
	up: boolean;
	down: boolean;
	action: boolean; // jump, shoot, rotate, flap
	action2: boolean; // secondary (e.g., place barricade)
	// Dual-stick
	aimX: number;
	aimY: number;
	aimActive: boolean;
}

interface TouchZone {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	label: string;
	icon: string;
	active: boolean;
	touchId: number | null;
	pressTime: number;
}

export type ControlSize = "small" | "medium" | "large";

const SIZE_PRESETS: Record<
	ControlSize,
	{ dpad: number; btn: number; margin: number }
> = {
	small: { dpad: 110, btn: 50, margin: 15 },
	medium: { dpad: 140, btn: 60, margin: 20 },
	large: { dpad: 170, btn: 70, margin: 25 },
};
const OPACITY_IDLE = 0.35;
const OPACITY_ACTIVE = 0.65;

export class TouchControls {
	private canvas: HTMLCanvasElement;
	private layout: TouchLayout;
	private zones: TouchZone[] = [];
	private isTouchDevice: boolean;
	private state: TouchState;
	private dpadSize: number;
	private btnSize: number;
	private margin: number;

	// Bound handlers
	private touchStartHandler: (e: TouchEvent) => void;
	private touchMoveHandler: (e: TouchEvent) => void;
	private touchEndHandler: (e: TouchEvent) => void;

	constructor(
		canvas: HTMLCanvasElement,
		layout: TouchLayout,
		size: ControlSize = "medium",
	) {
		this.canvas = canvas;
		this.layout = layout;

		const preset = SIZE_PRESETS[size];

		this.dpadSize = preset.dpad;
		this.btnSize = preset.btn;
		this.margin = preset.margin;
		this.isTouchDevice =
			"ontouchstart" in window || navigator.maxTouchPoints > 0;

		this.state = {
			left: false,
			right: false,
			up: false,
			down: false,
			action: false,
			action2: false,
			aimX: 0,
			aimY: 0,
			aimActive: false,
		};

		this.touchStartHandler = (e: TouchEvent) => this.handleTouchStart(e);
		this.touchMoveHandler = (e: TouchEvent) => this.handleTouchMove(e);
		this.touchEndHandler = (e: TouchEvent) => this.handleTouchEnd(e);

		this.buildZones();
	}

	get visible(): boolean {
		return this.isTouchDevice && this.layout !== "none";
	}

	getState(): TouchState {
		return this.state;
	}

	attach(): void {
		if (!this.visible) return;

		this.canvas.addEventListener("touchstart", this.touchStartHandler, {
			passive: false,
		});
		this.canvas.addEventListener("touchmove", this.touchMoveHandler, {
			passive: false,
		});
		this.canvas.addEventListener("touchend", this.touchEndHandler);
		this.canvas.addEventListener("touchcancel", this.touchEndHandler);
	}

	detach(): void {
		this.canvas.removeEventListener("touchstart", this.touchStartHandler);
		this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
		this.canvas.removeEventListener("touchend", this.touchEndHandler);
		this.canvas.removeEventListener("touchcancel", this.touchEndHandler);
	}

	updateLayout(): void {
		this.buildZones();
	}

	private buildZones(): void {
		const W = this.canvas.width;
		const H = this.canvas.height;

		this.zones = [];

		if (this.layout === "none" || this.layout === "tap-only") return;

		const dpadX = this.margin;
		const dpadY = H - this.dpadSize - this.margin;
		const third = this.dpadSize / 3;

		if (
			this.layout === "dpad" ||
			this.layout === "dpad-jump" ||
			this.layout === "dpad-action"
		) {
			// D-pad: 3x3 grid, use top/left/right/bottom cells
			this.zones.push({
				id: "up",
				x: dpadX + third,
				y: dpadY,
				w: third,
				h: third,
				label: "Up",
				icon: "▲",
				active: false,
				touchId: null,
				pressTime: 0,
			});

			this.zones.push({
				id: "down",
				x: dpadX + third,
				y: dpadY + third * 2,
				w: third,
				h: third,
				label: "Down",
				icon: "▼",
				active: false,
				touchId: null,
				pressTime: 0,
			});

			this.zones.push({
				id: "left",
				x: dpadX,
				y: dpadY + third,
				w: third,
				h: third,
				label: "Left",
				icon: "◄",
				active: false,
				touchId: null,
				pressTime: 0,
			});

			this.zones.push({
				id: "right",
				x: dpadX + third * 2,
				y: dpadY + third,
				w: third,
				h: third,
				label: "Right",
				icon: "►",
				active: false,
				touchId: null,
				pressTime: 0,
			});
		}

		if (this.layout === "dpad-jump") {
			// Jump button on right side
			this.zones.push({
				id: "action",
				x: W - this.btnSize * 2 - this.margin,
				y: H - this.btnSize * 2 - this.margin,
				w: this.btnSize * 1.5,
				h: this.btnSize * 1.5,
				label: "Jump",
				icon: "⬆",
				active: false,
				touchId: null,
				pressTime: 0,
			});
		}

		if (this.layout === "dpad-action") {
			// Action button (shoot/rotate) on right
			this.zones.push({
				id: "action",
				x: W - this.btnSize * 2 - this.margin,
				y: H - this.btnSize * 2 - this.margin,
				w: this.btnSize * 1.5,
				h: this.btnSize * 1.5,
				label: "Action",
				icon: "●",
				active: false,
				touchId: null,
				pressTime: 0,
			});

			// Secondary action
			this.zones.push({
				id: "action2",
				x: W - this.btnSize * 2 - this.margin,
				y: H - this.btnSize * 3.5 - this.margin,
				w: this.btnSize * 1.5,
				h: this.btnSize * 1.5,
				label: "Alt",
				icon: "◆",
				active: false,
				touchId: null,
				pressTime: 0,
			});
		}

		if (this.layout === "flap") {
			// Full screen tap zone (invisible, handled by tap detection)
			// No visible zones needed — any touch = flap
		}

		if (this.layout === "dual-stick") {
			// Left stick = movement (same as dpad)
			this.zones.push({
				id: "up",
				x: dpadX + third,
				y: dpadY,
				w: third,
				h: third,
				label: "",
				icon: "▲",
				active: false,
				touchId: null,
				pressTime: 0,
			});

			this.zones.push({
				id: "down",
				x: dpadX + third,
				y: dpadY + third * 2,
				w: third,
				h: third,
				label: "",
				icon: "▼",
				active: false,
				touchId: null,
				pressTime: 0,
			});

			this.zones.push({
				id: "left",
				x: dpadX,
				y: dpadY + third,
				w: third,
				h: third,
				label: "",
				icon: "◄",
				active: false,
				touchId: null,
				pressTime: 0,
			});

			this.zones.push({
				id: "right",
				x: dpadX + third * 2,
				y: dpadY + third,
				w: third,
				h: third,
				label: "",
				icon: "►",
				active: false,
				touchId: null,
				pressTime: 0,
			});

			// Right side: fire button
			this.zones.push({
				id: "action",
				x: W - this.btnSize * 2 - this.margin,
				y: H - this.btnSize * 2 - this.margin,
				w: this.btnSize * 1.5,
				h: this.btnSize * 1.5,
				label: "Fire",
				icon: "●",
				active: false,
				touchId: null,
				pressTime: 0,
			});
		}
	}

	private vibrate(ms: number): void {
		if ("vibrate" in navigator) {
			navigator.vibrate(ms);
		}
	}

	private handleTouchStart(e: TouchEvent): void {
		e.preventDefault();

		if (this.layout === "flap") {
			this.state.action = true;
			this.vibrate(10);

			return;
		}

		for (let i = 0; i < e.changedTouches.length; i++) {
			const touch = e.changedTouches[i];
			const { x, y } = this.getTouchPos(touch);

			for (const zone of this.zones) {
				if (this.hitTest(x, y, zone) && zone.touchId === null) {
					zone.touchId = touch.identifier;
					zone.active = true;
					zone.pressTime = performance.now();
					this.vibrate(10);
					this.updateState();

					break;
				}
			}
		}
	}

	private handleTouchMove(e: TouchEvent): void {
		e.preventDefault();

		if (this.layout === "flap") return;

		// For d-pad: allow sliding between buttons
		for (let i = 0; i < e.changedTouches.length; i++) {
			const touch = e.changedTouches[i];
			const { x, y } = this.getTouchPos(touch);

			// Check if this touch was on a d-pad zone
			const dpadIds = new Set(["up", "down", "left", "right"]);
			const currentZone = this.zones.find(
				(z) => z.touchId === touch.identifier,
			);

			if (currentZone && dpadIds.has(currentZone.id)) {
				// Sliding on d-pad — update which direction is active
				currentZone.active = false;
				currentZone.touchId = null;

				for (const zone of this.zones) {
					if (
						dpadIds.has(zone.id) &&
						this.hitTest(x, y, zone) &&
						zone.touchId === null
					) {
						zone.touchId = touch.identifier;
						zone.active = true;
						zone.pressTime = performance.now();

						break;
					}
				}

				this.updateState();
			}
		}
	}

	private handleTouchEnd(e: TouchEvent): void {
		if (this.layout === "flap") {
			this.state.action = false;

			return;
		}

		for (let i = 0; i < e.changedTouches.length; i++) {
			const touch = e.changedTouches[i];

			for (const zone of this.zones) {
				if (zone.touchId === touch.identifier) {
					zone.touchId = null;
					zone.active = false;
				}
			}
		}

		this.updateState();
	}

	private updateState(): void {
		const find = (id: string) =>
			this.zones.find((z) => z.id === id)?.active ?? false;

		this.state.left = find("left");
		this.state.right = find("right");
		this.state.up = find("up");
		this.state.down = find("down");
		this.state.action = find("action");
		this.state.action2 = find("action2");
	}

	private hitTest(x: number, y: number, zone: TouchZone): boolean {
		return (
			x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h
		);
	}

	private getTouchPos(touch: Touch): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect();

		return {
			x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
			y: (touch.clientY - rect.top) * (this.canvas.height / rect.height),
		};
	}

	render(ctx: CanvasRenderingContext2D): void {
		if (!this.visible || this.zones.length === 0) return;

		ctx.save();

		for (const zone of this.zones) {
			ctx.save();

			const alpha = zone.active ? OPACITY_ACTIVE : OPACITY_IDLE;

			// Press scale animation
			if (zone.active && zone.pressTime > 0) {
				const elapsed = performance.now() - zone.pressTime;
				const scale = 1 - Math.max(0, 0.1 - elapsed / 1000) * 1;
				const cx = zone.x + zone.w / 2;
				const cy = zone.y + zone.h / 2;

				ctx.translate(cx, cy);
				ctx.scale(scale, scale);
				ctx.translate(-cx, -cy);
			}

			// Button background
			ctx.globalAlpha = alpha;
			ctx.fillStyle = zone.active ? "#fff" : "#888";
			ctx.beginPath();
			ctx.roundRect(zone.x, zone.y, zone.w, zone.h, 10);
			ctx.fill();

			// Border
			ctx.strokeStyle = "#fff";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.roundRect(zone.x, zone.y, zone.w, zone.h, 10);
			ctx.stroke();

			// Icon
			ctx.globalAlpha = zone.active ? 0.9 : 0.5;
			ctx.fillStyle = zone.active ? "#000" : "#fff";
			ctx.font = `bold ${Math.min(zone.w, zone.h) * 0.4}px sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(zone.icon, zone.x + zone.w / 2, zone.y + zone.h / 2);

			// Label (small text below icon)
			if (zone.label) {
				ctx.font = `${Math.min(zone.w, zone.h) * 0.2}px monospace`;
				ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y + zone.h * 0.8);
			}

			ctx.restore();
		}

		ctx.restore();
	}
}
