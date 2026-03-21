import { TERRAIN_SIZE, TERRAIN_SCALE, TERRAIN_HEIGHT } from "./types";

/**
 * Simple value noise terrain generator.
 * Returns a height function: getHeight(worldX, worldZ) → y
 */
export function generateHeightmap(): Float32Array {
	const size = TERRAIN_SIZE + 1;
	const heights = new Float32Array(size * size);

	// Seed random grid at lower resolution
	const octaves = [
		{ freq: 0.02, amp: 1.0 },
		{ freq: 0.05, amp: 0.5 },
		{ freq: 0.12, amp: 0.2 },
	];

	// Pre-compute random values for interpolation
	const randSize = 128;
	const rand = new Float32Array(randSize * randSize);

	for (let i = 0; i < rand.length; i++) {
		rand[i] = Math.random();
	}

	const smoothNoise = (x: number, z: number): number => {
		const ix = Math.floor(x) & (randSize - 1);
		const iz = Math.floor(z) & (randSize - 1);
		const fx = x - Math.floor(x);
		const fz = z - Math.floor(z);
		const sx = fx * fx * (3 - 2 * fx);
		const sz = fz * fz * (3 - 2 * fz);

		const i00 = rand[iz * randSize + ix];
		const i10 = rand[iz * randSize + ((ix + 1) & (randSize - 1))];
		const i01 = rand[((iz + 1) & (randSize - 1)) * randSize + ix];
		const i11 =
			rand[
				((iz + 1) & (randSize - 1)) * randSize + ((ix + 1) & (randSize - 1))
			];

		const a = i00 + sx * (i10 - i00);
		const b = i01 + sx * (i11 - i01);

		return a + sz * (b - a);
	};

	for (let z = 0; z < size; z++) {
		for (let x = 0; x < size; x++) {
			let h = 0;

			for (const oct of octaves) {
				h += smoothNoise(x * oct.freq * 10, z * oct.freq * 10) * oct.amp;
			}

			heights[z * size + x] = h * TERRAIN_HEIGHT;
		}
	}

	return heights;
}

export function getHeight(
	heights: Float32Array,
	worldX: number,
	worldZ: number,
): number {
	const size = TERRAIN_SIZE + 1;
	const gx = worldX / TERRAIN_SCALE;
	const gz = worldZ / TERRAIN_SCALE;
	const ix = Math.max(0, Math.min(size - 2, Math.floor(gx)));
	const iz = Math.max(0, Math.min(size - 2, Math.floor(gz)));
	const fx = gx - ix;
	const fz = gz - iz;

	const h00 = heights[iz * size + ix];
	const h10 = heights[iz * size + ix + 1];
	const h01 = heights[(iz + 1) * size + ix];
	const h11 = heights[(iz + 1) * size + ix + 1];

	return (
		h00 +
		fx * (h10 - h00) +
		fz * (h01 - h00) +
		fx * fz * (h11 - h10 - h01 + h00)
	);
}

/**
 * Build terrain mesh geometry from heightmap.
 */
export function buildTerrainMesh(heights: Float32Array): {
	positions: Float32Array;
	normals: Float32Array;
	indices: Uint16Array;
} {
	const size = TERRAIN_SIZE + 1;
	const vertCount = size * size;
	const positions = new Float32Array(vertCount * 3);
	const normals = new Float32Array(vertCount * 3);

	for (let z = 0; z < size; z++) {
		for (let x = 0; x < size; x++) {
			const idx = z * size + x;
			const h = heights[idx];

			positions[idx * 3] = x * TERRAIN_SCALE;
			positions[idx * 3 + 1] = h;
			positions[idx * 3 + 2] = z * TERRAIN_SCALE;

			// Compute normal from neighbors
			const hL = x > 0 ? heights[z * size + x - 1] : h;
			const hR = x < size - 1 ? heights[z * size + x + 1] : h;
			const hD = z > 0 ? heights[(z - 1) * size + x] : h;
			const hU = z < size - 1 ? heights[(z + 1) * size + x] : h;

			const nx = (hL - hR) / (2 * TERRAIN_SCALE);
			const nz = (hD - hU) / (2 * TERRAIN_SCALE);
			const ny = 1;
			const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

			normals[idx * 3] = nx / len;
			normals[idx * 3 + 1] = ny / len;
			normals[idx * 3 + 2] = nz / len;
		}
	}

	const triCount = TERRAIN_SIZE * TERRAIN_SIZE * 2;
	const indices = new Uint16Array(triCount * 3);
	let ii = 0;

	for (let z = 0; z < TERRAIN_SIZE; z++) {
		for (let x = 0; x < TERRAIN_SIZE; x++) {
			const tl = z * size + x;
			const tr = tl + 1;
			const bl = (z + 1) * size + x;
			const br = bl + 1;

			indices[ii++] = tl;
			indices[ii++] = bl;
			indices[ii++] = tr;
			indices[ii++] = tr;
			indices[ii++] = bl;
			indices[ii++] = br;
		}
	}

	return { positions, normals, indices };
}
