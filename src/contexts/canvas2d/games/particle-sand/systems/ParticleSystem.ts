import type { Updatable } from "@core/Updatable";
import type { SandState, Particle } from "../types";

export class ParticleSystem implements Updatable<SandState> {
	update(state: SandState, _dt: number): void {
		if (state.paused) return;

		// Place particles if mouse is down
		this.placeParticles(state);

		// Clear updated flags
		const len = state.grid.length;

		for (let i = 0; i < len; i++) {
			const p = state.grid[i];

			if (p) p.updated = false;
		}

		// Process particles bottom-to-top for falling, top-to-bottom for rising
		// Bottom-to-top pass: sand, water
		for (let y = state.gridH - 1; y >= 0; y--) {
			// Randomize left-right processing direction per row for natural behavior
			const leftToRight = Math.random() < 0.5;

			for (let i = 0; i < state.gridW; i++) {
				const x = leftToRight ? i : state.gridW - 1 - i;
				const idx = y * state.gridW + x;
				const p = state.grid[idx];

				if (!p || p.updated) continue;

				switch (p.type) {
					case "sand":
						this.updateSand(state, x, y, idx, p);
						break;
					case "water":
						this.updateWater(state, x, y, idx, p);
						break;
					default:
						break;
				}
			}
		}

		// Top-to-bottom pass: fire, steam
		for (let y = 0; y < state.gridH; y++) {
			for (let x = 0; x < state.gridW; x++) {
				const idx = y * state.gridW + x;
				const p = state.grid[idx];

				if (!p || p.updated) continue;

				switch (p.type) {
					case "fire":
						this.updateFire(state, x, y, idx, p);
						break;
					case "steam":
						this.updateSteam(state, x, y, idx, p);
						break;
					case "stone":
						// Stone never moves
						break;
					default:
						break;
				}
			}
		}

		// Recount particles
		let count = 0;

		for (let i = 0; i < len; i++) {
			if (state.grid[i]) count++;
		}

		state.particleCount = count;
	}

	private placeParticles(state: SandState): void {
		if (!state.mouseDown) return;

		const cx = state.mouseX;
		const cy = state.mouseY;
		const r = state.brushSize;

		for (let dy = -r; dy <= r; dy++) {
			for (let dx = -r; dx <= r; dx++) {
				if (dx * dx + dy * dy > r * r) continue;

				const px = cx + dx;
				const py = cy + dy;

				if (px < 0 || px >= state.gridW || py < 0 || py >= state.gridH)
					continue;

				const idx = py * state.gridW + px;

				if (state.grid[idx]) continue;

				// Add some randomness to placement to look natural
				if (Math.random() > 0.6) continue;

				const life =
					state.selectedType === "fire"
						? 60 + Math.floor(Math.random() * 80)
						: state.selectedType === "steam"
							? 80 + Math.floor(Math.random() * 60)
							: 0;

				state.grid[idx] = {
					type: state.selectedType,
					life: life,
					updated: true,
				};
			}
		}
	}

	private swap(
		state: SandState,
		fromIdx: number,
		toIdx: number,
		p: Particle,
	): void {
		const target = state.grid[toIdx];

		state.grid[toIdx] = p;
		state.grid[fromIdx] = target;
		p.updated = true;

		if (target) target.updated = true;
	}

	private isEmpty(state: SandState, x: number, y: number): boolean {
		if (x < 0 || x >= state.gridW || y < 0 || y >= state.gridH) return false;

		return state.grid[y * state.gridW + x] === null;
	}

	private isType(
		state: SandState,
		x: number,
		y: number,
		type: string,
	): boolean {
		if (x < 0 || x >= state.gridW || y < 0 || y >= state.gridH) return false;

		const p = state.grid[y * state.gridW + x];

		return p !== null && p.type === type;
	}

	private inBounds(state: SandState, x: number, y: number): boolean {
		return x >= 0 && x < state.gridW && y >= 0 && y < state.gridH;
	}

	private updateSand(
		state: SandState,
		x: number,
		y: number,
		idx: number,
		p: Particle,
	): void {
		// Fall straight down
		if (this.isEmpty(state, x, y + 1)) {
			this.swap(state, idx, (y + 1) * state.gridW + x, p);

			return;
		}

		// Fall into water below
		if (this.isType(state, x, y + 1, "water")) {
			this.swap(state, idx, (y + 1) * state.gridW + x, p);

			return;
		}

		// Slide diagonally
		const leftEmpty = this.isEmpty(state, x - 1, y + 1);
		const rightEmpty = this.isEmpty(state, x + 1, y + 1);
		const leftWater = this.isType(state, x - 1, y + 1, "water");
		const rightWater = this.isType(state, x + 1, y + 1, "water");

		if ((leftEmpty || leftWater) && (rightEmpty || rightWater)) {
			const dir = Math.random() < 0.5 ? -1 : 1;

			this.swap(state, idx, (y + 1) * state.gridW + (x + dir), p);
		} else if (leftEmpty || leftWater) {
			this.swap(state, idx, (y + 1) * state.gridW + (x - 1), p);
		} else if (rightEmpty || rightWater) {
			this.swap(state, idx, (y + 1) * state.gridW + (x + 1), p);
		}
	}

	private updateWater(
		state: SandState,
		x: number,
		y: number,
		idx: number,
		p: Particle,
	): void {
		// Check for adjacent fire -> convert both to steam
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) continue;

				const nx = x + dx;
				const ny = y + dy;

				if (this.isType(state, nx, ny, "fire")) {
					// Convert this water to steam
					p.type = "steam";
					p.life = 80 + Math.floor(Math.random() * 60);
					p.updated = true;
					// Convert the fire to steam too
					const fireIdx = ny * state.gridW + nx;
					const fire = state.grid[fireIdx]!;

					fire.type = "steam";
					fire.life = 80 + Math.floor(Math.random() * 60);
					fire.updated = true;

					return;
				}
			}
		}

		// Fall down
		if (this.isEmpty(state, x, y + 1)) {
			this.swap(state, idx, (y + 1) * state.gridW + x, p);

			return;
		}

		// Diagonal down
		const leftDown = this.isEmpty(state, x - 1, y + 1);
		const rightDown = this.isEmpty(state, x + 1, y + 1);

		if (leftDown && rightDown) {
			const dir = Math.random() < 0.5 ? -1 : 1;

			this.swap(state, idx, (y + 1) * state.gridW + (x + dir), p);

			return;
		} else if (leftDown) {
			this.swap(state, idx, (y + 1) * state.gridW + (x - 1), p);

			return;
		} else if (rightDown) {
			this.swap(state, idx, (y + 1) * state.gridW + (x + 1), p);

			return;
		}

		// Flow sideways
		const leftSide = this.isEmpty(state, x - 1, y);
		const rightSide = this.isEmpty(state, x + 1, y);

		if (leftSide && rightSide) {
			const dir = Math.random() < 0.5 ? -1 : 1;

			this.swap(state, idx, y * state.gridW + (x + dir), p);
		} else if (leftSide) {
			this.swap(state, idx, y * state.gridW + (x - 1), p);
		} else if (rightSide) {
			this.swap(state, idx, y * state.gridW + (x + 1), p);
		}
	}

	private updateFire(
		state: SandState,
		x: number,
		y: number,
		idx: number,
		p: Particle,
	): void {
		p.life--;

		if (p.life <= 0) {
			state.grid[idx] = null;

			return;
		}

		// Check for adjacent water -> both become steam
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0) continue;

				const nx = x + dx;
				const ny = y + dy;

				if (this.isType(state, nx, ny, "water")) {
					p.type = "steam";
					p.life = 80 + Math.floor(Math.random() * 60);
					p.updated = true;
					const waterIdx = ny * state.gridW + nx;
					const water = state.grid[waterIdx]!;

					water.type = "steam";
					water.life = 80 + Math.floor(Math.random() * 60);
					water.updated = true;

					return;
				}
			}
		}

		// Rise upward with random sway
		const sway = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
		const nx = x + sway;
		const ny = y - 1;

		if (this.inBounds(state, nx, ny) && this.isEmpty(state, nx, ny)) {
			this.swap(state, idx, ny * state.gridW + nx, p);

			return;
		}

		// Try straight up
		if (this.isEmpty(state, x, y - 1)) {
			this.swap(state, idx, (y - 1) * state.gridW + x, p);

			return;
		}

		// Try sideways
		if (Math.random() < 0.4) {
			const dir = Math.random() < 0.5 ? -1 : 1;

			if (this.isEmpty(state, x + dir, y)) {
				this.swap(state, idx, y * state.gridW + (x + dir), p);
			}
		}
	}

	private updateSteam(
		state: SandState,
		x: number,
		y: number,
		idx: number,
		p: Particle,
	): void {
		p.life--;

		if (p.life <= 0) {
			state.grid[idx] = null;

			return;
		}

		// Rise with random sway
		const sway = Math.random() < 0.5 ? (Math.random() < 0.5 ? -1 : 1) : 0;
		const nx = x + sway;
		const ny = y - 1;

		if (this.inBounds(state, nx, ny) && this.isEmpty(state, nx, ny)) {
			this.swap(state, idx, ny * state.gridW + nx, p);

			return;
		}

		if (this.isEmpty(state, x, y - 1)) {
			this.swap(state, idx, (y - 1) * state.gridW + x, p);

			return;
		}

		// Drift sideways
		const dir = Math.random() < 0.5 ? -1 : 1;

		if (this.isEmpty(state, x + dir, y)) {
			this.swap(state, idx, y * state.gridW + (x + dir), p);
		}
	}
}
