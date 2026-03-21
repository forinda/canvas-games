import type { InputHandler } from "@core/InputHandler";
import type { IdleState, Upgrade } from "../types.ts";
import { SHOP_WIDTH_RATIO, SHOP_MIN_WIDTH, SHOP_MAX_WIDTH } from "../types.ts";

export type ClickCallback = (x: number, y: number) => void;
export type BuyCallback = (upgrade: Upgrade) => void;

/**
 * Handles mouse/touch input for the idle clicker.
 * - Clicking the big coin earns coins
 * - Clicking upgrades in the shop buys them
 */
export class InputSystem implements InputHandler {
	private canvas: HTMLCanvasElement;
	private state: IdleState;
	private onCoinClick: ClickCallback;
	private onBuyUpgrade: BuyCallback;
	private onExit: () => void;
	private onToggleHelp: () => void;

	private handleClick: (e: MouseEvent) => void;
	private handleKey: (e: KeyboardEvent) => void;
	private handleWheel: (e: WheelEvent) => void;

	constructor(
		canvas: HTMLCanvasElement,
		state: IdleState,
		onCoinClick: ClickCallback,
		onBuyUpgrade: BuyCallback,
		onExit: () => void,
		onToggleHelp: () => void,
	) {
		this.canvas = canvas;
		this.state = state;
		this.onCoinClick = onCoinClick;
		this.onBuyUpgrade = onBuyUpgrade;
		this.onExit = onExit;
		this.onToggleHelp = onToggleHelp;

		this.handleClick = this.onClick.bind(this);
		this.handleKey = this.onKey.bind(this);
		this.handleWheel = this.onWheel.bind(this);
	}

	attach(): void {
		this.canvas.addEventListener("click", this.handleClick);
		window.addEventListener("keydown", this.handleKey);
		this.canvas.addEventListener("wheel", this.handleWheel, { passive: true });
	}

	detach(): void {
		this.canvas.removeEventListener("click", this.handleClick);
		window.removeEventListener("keydown", this.handleKey);
		this.canvas.removeEventListener("wheel", this.handleWheel);
	}

	private getShopRect(): { x: number; y: number; w: number; h: number } {
		const w = Math.max(
			SHOP_MIN_WIDTH,
			Math.min(SHOP_MAX_WIDTH, this.state.width * SHOP_WIDTH_RATIO),
		);

		return { x: this.state.width - w, y: 0, w, h: this.state.height };
	}

	private onClick(e: MouseEvent): void {
		const rect = this.canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		// Check if click is in shop area
		const shop = this.getShopRect();

		if (mx >= shop.x) {
			// Determine which upgrade was clicked
			const itemH = 72;
			const headerH = 60;
			const scrolledY = my - headerH + this.state.shopScroll;
			const idx = Math.floor(scrolledY / itemH);

			if (idx >= 0 && idx < this.state.upgrades.length) {
				this.onBuyUpgrade(this.state.upgrades[idx]);
			}

			return;
		}

		// Check if click is on the coin button
		const btn = this.state.coinButton;
		const dx = mx - btn.x;
		const dy = my - btn.y;

		if (dx * dx + dy * dy <= btn.radius * btn.radius) {
			this.onCoinClick(mx, my);
		}
	}

	private onKey(e: KeyboardEvent): void {
		if (e.key === "Escape") {
			this.onExit();
		} else if (e.key === "h" || e.key === "H") {
			this.onToggleHelp();
		}
	}

	private onWheel(e: WheelEvent): void {
		const rect = this.canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const shop = this.getShopRect();

		if (mx >= shop.x) {
			const maxScroll = Math.max(
				0,
				this.state.upgrades.length * 72 - this.state.height + 60,
			);

			this.state.shopScroll = Math.max(
				0,
				Math.min(maxScroll, this.state.shopScroll + e.deltaY),
			);
		}
	}
}
