/**
 * Vec3.ts — 3-component vector math.
 *
 * Vectors are represented as `Float32Array` (3 elements) for efficient
 * interop with WebGL uniform calls, but all read operations also accept
 * plain `number[]` or any `ArrayLike<number>` with at least 3 entries.
 *
 * Like Mat4, every mutating function takes an `out` parameter, writes into
 * it, and returns it.
 */

/** A 3-component vector stored as a Float32Array. */
export type Vec3 = Float32Array;

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Create a new Vec3.  Defaults to the zero vector if no arguments are given.
 *
 * @param x - X component (default 0).
 * @param y - Y component (default 0).
 * @param z - Z component (default 0).
 * @returns A new 3-element Float32Array.
 */
export function create(x = 0, y = 0, z = 0): Vec3 {
	const out = new Float32Array(3);

	out[0] = x;
	out[1] = y;
	out[2] = z;

	return out;
}

/**
 * Create a new Vec3 from explicit x, y, z values.
 * Functionally identical to `create(x, y, z)` but signals intent more
 * clearly when all three components are known at the call site.
 */
export function fromValues(x: number, y: number, z: number): Vec3 {
	return create(x, y, z);
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

/**
 * Component-wise addition: `out = a + b`.
 */
export function add(
	out: Vec3,
	a: ArrayLike<number>,
	b: ArrayLike<number>,
): Vec3 {
	out[0] = a[0] + b[0];
	out[1] = a[1] + b[1];
	out[2] = a[2] + b[2];

	return out;
}

/**
 * Component-wise subtraction: `out = a - b`.
 */
export function sub(
	out: Vec3,
	a: ArrayLike<number>,
	b: ArrayLike<number>,
): Vec3 {
	out[0] = a[0] - b[0];
	out[1] = a[1] - b[1];
	out[2] = a[2] - b[2];

	return out;
}

/**
 * Uniform scale: `out = a * s`.
 */
export function scale(out: Vec3, a: ArrayLike<number>, s: number): Vec3 {
	out[0] = a[0] * s;
	out[1] = a[1] * s;
	out[2] = a[2] * s;

	return out;
}

// ---------------------------------------------------------------------------
// Length & normalization
// ---------------------------------------------------------------------------

/**
 * Compute the Euclidean length (magnitude) of vector `a`.
 */
export function length(a: ArrayLike<number>): number {
	return Math.hypot(a[0], a[1], a[2]);
}

/**
 * Normalize `a` to unit length.  If the vector is zero-length the result
 * will be [0, 0, 0] to avoid NaN.
 */
export function normalize(out: Vec3, a: ArrayLike<number>): Vec3 {
	const len = Math.hypot(a[0], a[1], a[2]);

	if (len > 0) {
		const inv = 1.0 / len;

		out[0] = a[0] * inv;
		out[1] = a[1] * inv;
		out[2] = a[2] * inv;
	} else {
		out[0] = 0;
		out[1] = 0;
		out[2] = 0;
	}

	return out;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * Dot product of `a` and `b`.
 */
export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Cross product: `out = a x b`.
 *
 * It is safe to pass the same array as both an input and `out` — local
 * copies of the source components are read before writing.
 */
export function cross(
	out: Vec3,
	a: ArrayLike<number>,
	b: ArrayLike<number>,
): Vec3 {
	const ax = a[0],
		ay = a[1],
		az = a[2];
	const bx = b[0],
		by = b[1],
		bz = b[2];

	out[0] = ay * bz - az * by;
	out[1] = az * bx - ax * bz;
	out[2] = ax * by - ay * bx;

	return out;
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

/**
 * Linear interpolation between `a` and `b` by factor `t`.
 *
 *   - t = 0 → `out = a`
 *   - t = 1 → `out = b`
 *
 * @param out - Destination vector.
 * @param a   - Start vector.
 * @param b   - End vector.
 * @param t   - Interpolation factor (typically 0..1).
 * @returns `out`.
 */
export function lerp(
	out: Vec3,
	a: ArrayLike<number>,
	b: ArrayLike<number>,
	t: number,
): Vec3 {
	out[0] = a[0] + t * (b[0] - a[0]);
	out[1] = a[1] + t * (b[1] - a[1]);
	out[2] = a[2] + t * (b[2] - a[2]);

	return out;
}
