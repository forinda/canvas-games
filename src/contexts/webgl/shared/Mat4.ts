/**
 * Mat4.ts — 4x4 matrix math using Float32Array storage.
 *
 * Matrices are stored in **column-major** order, which is the layout WebGL
 * expects for `uniformMatrix4fv`.  The 16 elements map to columns like so:
 *
 *   | m[0] m[4] m[ 8] m[12] |
 *   | m[1] m[5] m[ 9] m[13] |
 *   | m[2] m[6] m[10] m[14] |
 *   | m[3] m[7] m[11] m[15] |
 *
 * Every mutating function writes its result into the `out` parameter and
 * returns it, allowing callers to chain operations or reuse pre-allocated
 * arrays to avoid garbage-collection pressure.
 */

/** Convenience type alias for a 4x4 matrix stored as a Float32Array. */
export type Mat4 = Float32Array;

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Create a new 4x4 identity matrix.
 *
 * @returns A 16-element Float32Array representing the identity matrix.
 */
export function create(): Mat4 {
	const out = new Float32Array(16);

	out[0] = 1;
	out[5] = 1;
	out[10] = 1;
	out[15] = 1;

	return out;
}

/**
 * Set `out` to the identity matrix.
 */
export function identity(out: Mat4): Mat4 {
	out.fill(0);
	out[0] = 1;
	out[5] = 1;
	out[10] = 1;
	out[15] = 1;

	return out;
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

/**
 * Build a perspective projection matrix.
 *
 * This matches the standard OpenGL convention where the camera looks down
 * the negative-Z axis and the near/far values are positive distances from
 * the camera.
 *
 * @param out    - Destination matrix.
 * @param fov    - Vertical field of view in **radians**.
 * @param aspect - Viewport width / height.
 * @param near   - Distance to the near clipping plane (> 0).
 * @param far    - Distance to the far clipping plane (> near).
 * @returns `out`.
 */
export function perspective(
	out: Mat4,
	fov: number,
	aspect: number,
	near: number,
	far: number,
): Mat4 {
	const f = 1.0 / Math.tan(fov / 2);
	const rangeInv = 1.0 / (near - far);

	out.fill(0);
	out[0] = f / aspect;
	out[5] = f;
	out[10] = (near + far) * rangeInv;
	out[11] = -1;
	out[14] = 2 * near * far * rangeInv;

	return out;
}

// ---------------------------------------------------------------------------
// View matrix
// ---------------------------------------------------------------------------

/**
 * Build a view matrix that looks from `eye` toward `target` with the given
 * `up` direction.  This is the classic "lookAt" camera transform.
 *
 * @param out    - Destination matrix.
 * @param eye    - Camera position [x, y, z].
 * @param target - Point the camera is looking at [x, y, z].
 * @param up     - World up direction [x, y, z].
 * @returns `out`.
 */
export function lookAt(
	out: Mat4,
	eye: ArrayLike<number>,
	target: ArrayLike<number>,
	up: ArrayLike<number>,
): Mat4 {
	// Compute the three basis vectors of the camera's coordinate frame.
	// zAxis = normalize(eye - target)   (camera looks down -Z)
	let zx = eye[0] - target[0];
	let zy = eye[1] - target[1];
	let zz = eye[2] - target[2];
	let len = Math.hypot(zx, zy, zz);

	if (len > 0) {
		zx /= len;
		zy /= len;
		zz /= len;
	}

	// xAxis = normalize(cross(up, zAxis))
	let xx = up[1] * zz - up[2] * zy;
	let xy = up[2] * zx - up[0] * zz;
	let xz = up[0] * zy - up[1] * zx;

	len = Math.hypot(xx, xy, xz);

	if (len > 0) {
		xx /= len;
		xy /= len;
		xz /= len;
	}

	// yAxis = cross(zAxis, xAxis)   (already unit length)
	const yx = zy * xz - zz * xy;
	const yy = zz * xx - zx * xz;
	const yz = zx * xy - zy * xx;

	out[0] = xx;
	out[1] = yx;
	out[2] = zx;
	out[3] = 0;
	out[4] = xy;
	out[5] = yy;
	out[6] = zy;
	out[7] = 0;
	out[8] = xz;
	out[9] = yz;
	out[10] = zz;
	out[11] = 0;
	out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
	out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
	out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
	out[15] = 1;

	return out;
}

// ---------------------------------------------------------------------------
// Translation / Rotation / Scale
// ---------------------------------------------------------------------------

/**
 * Multiply `m` by a translation and write the result to `out`.
 *
 * @param out - Destination matrix.
 * @param m   - Source matrix to translate.
 * @param v   - Translation vector [x, y, z].
 * @returns `out`.
 */
export function translate(out: Mat4, m: Mat4, v: ArrayLike<number>): Mat4 {
	const x = v[0],
		y = v[1],
		z = v[2];

	if (out !== m) {
		// Copy the upper 3x4 block unchanged.
		for (let i = 0; i < 12; i++) {
			out[i] = m[i];
		}
	}

	// The last column is the only part that changes.
	out[12] = m[0] * x + m[4] * y + m[8] * z + m[12];
	out[13] = m[1] * x + m[5] * y + m[9] * z + m[13];
	out[14] = m[2] * x + m[6] * y + m[10] * z + m[14];
	out[15] = m[3] * x + m[7] * y + m[11] * z + m[15];

	return out;
}

/**
 * Multiply `m` by a rotation around the X axis and write the result to `out`.
 *
 * @param out - Destination matrix.
 * @param m   - Source matrix.
 * @param rad - Rotation angle in radians.
 * @returns `out`.
 */
export function rotateX(out: Mat4, m: Mat4, rad: number): Mat4 {
	const s = Math.sin(rad);
	const c = Math.cos(rad);

	// Only columns 1 and 2 are affected.
	const a10 = m[4],
		a11 = m[5],
		a12 = m[6],
		a13 = m[7];
	const a20 = m[8],
		a21 = m[9],
		a22 = m[10],
		a23 = m[11];

	if (out !== m) {
		out[0] = m[0];
		out[1] = m[1];
		out[2] = m[2];
		out[3] = m[3];
		out[12] = m[12];
		out[13] = m[13];
		out[14] = m[14];
		out[15] = m[15];
	}

	out[4] = a10 * c + a20 * s;
	out[5] = a11 * c + a21 * s;
	out[6] = a12 * c + a22 * s;
	out[7] = a13 * c + a23 * s;
	out[8] = a20 * c - a10 * s;
	out[9] = a21 * c - a11 * s;
	out[10] = a22 * c - a12 * s;
	out[11] = a23 * c - a13 * s;

	return out;
}

/**
 * Multiply `m` by a rotation around the Y axis and write the result to `out`.
 *
 * @param out - Destination matrix.
 * @param m   - Source matrix.
 * @param rad - Rotation angle in radians.
 * @returns `out`.
 */
export function rotateY(out: Mat4, m: Mat4, rad: number): Mat4 {
	const s = Math.sin(rad);
	const c = Math.cos(rad);

	const a00 = m[0],
		a01 = m[1],
		a02 = m[2],
		a03 = m[3];
	const a20 = m[8],
		a21 = m[9],
		a22 = m[10],
		a23 = m[11];

	if (out !== m) {
		out[4] = m[4];
		out[5] = m[5];
		out[6] = m[6];
		out[7] = m[7];
		out[12] = m[12];
		out[13] = m[13];
		out[14] = m[14];
		out[15] = m[15];
	}

	out[0] = a00 * c - a20 * s;
	out[1] = a01 * c - a21 * s;
	out[2] = a02 * c - a22 * s;
	out[3] = a03 * c - a23 * s;
	out[8] = a00 * s + a20 * c;
	out[9] = a01 * s + a21 * c;
	out[10] = a02 * s + a22 * c;
	out[11] = a03 * s + a23 * c;

	return out;
}

/**
 * Multiply `m` by a rotation around the Z axis and write the result to `out`.
 *
 * @param out - Destination matrix.
 * @param m   - Source matrix.
 * @param rad - Rotation angle in radians.
 * @returns `out`.
 */
export function rotateZ(out: Mat4, m: Mat4, rad: number): Mat4 {
	const s = Math.sin(rad);
	const c = Math.cos(rad);

	const a00 = m[0],
		a01 = m[1],
		a02 = m[2],
		a03 = m[3];
	const a10 = m[4],
		a11 = m[5],
		a12 = m[6],
		a13 = m[7];

	if (out !== m) {
		out[8] = m[8];
		out[9] = m[9];
		out[10] = m[10];
		out[11] = m[11];
		out[12] = m[12];
		out[13] = m[13];
		out[14] = m[14];
		out[15] = m[15];
	}

	out[0] = a00 * c + a10 * s;
	out[1] = a01 * c + a11 * s;
	out[2] = a02 * c + a12 * s;
	out[3] = a03 * c + a13 * s;
	out[4] = a10 * c - a00 * s;
	out[5] = a11 * c - a01 * s;
	out[6] = a12 * c - a02 * s;
	out[7] = a13 * c - a03 * s;

	return out;
}

/**
 * Multiply `m` by a non-uniform scale and write the result to `out`.
 *
 * @param out - Destination matrix.
 * @param m   - Source matrix.
 * @param v   - Scale factors [sx, sy, sz].
 * @returns `out`.
 */
export function scale(out: Mat4, m: Mat4, v: ArrayLike<number>): Mat4 {
	const x = v[0],
		y = v[1],
		z = v[2];

	out[0] = m[0] * x;
	out[1] = m[1] * x;
	out[2] = m[2] * x;
	out[3] = m[3] * x;
	out[4] = m[4] * y;
	out[5] = m[5] * y;
	out[6] = m[6] * y;
	out[7] = m[7] * y;
	out[8] = m[8] * z;
	out[9] = m[9] * z;
	out[10] = m[10] * z;
	out[11] = m[11] * z;

	if (out !== m) {
		out[12] = m[12];
		out[13] = m[13];
		out[14] = m[14];
		out[15] = m[15];
	}

	return out;
}

// ---------------------------------------------------------------------------
// Multiplication
// ---------------------------------------------------------------------------

/**
 * Multiply two 4x4 matrices: `out = a * b`.
 *
 * It is safe to pass the same array as both an input and `out` — a temporary
 * copy is used internally when aliasing is detected.
 *
 * @param out - Destination matrix.
 * @param a   - Left-hand matrix.
 * @param b   - Right-hand matrix.
 * @returns `out`.
 */
export function multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
	// Read all elements up-front so that `out` can alias `a` or `b`.
	const a00 = a[0],
		a01 = a[1],
		a02 = a[2],
		a03 = a[3];
	const a10 = a[4],
		a11 = a[5],
		a12 = a[6],
		a13 = a[7];
	const a20 = a[8],
		a21 = a[9],
		a22 = a[10],
		a23 = a[11];
	const a30 = a[12],
		a31 = a[13],
		a32 = a[14],
		a33 = a[15];

	for (let col = 0; col < 4; col++) {
		const bi = col * 4;
		const b0 = b[bi],
			b1 = b[bi + 1],
			b2 = b[bi + 2],
			b3 = b[bi + 3];

		out[bi] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
		out[bi + 1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
		out[bi + 2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
		out[bi + 3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
	}

	return out;
}

// ---------------------------------------------------------------------------
// Inversion
// ---------------------------------------------------------------------------

/**
 * Invert a 4x4 matrix.  If the matrix is singular (determinant ~ 0) the
 * result will contain NaN/Infinity — callers should ensure the source matrix
 * is invertible.
 *
 * @param out - Destination matrix.
 * @param m   - Source matrix to invert.
 * @returns `out`.
 */
export function invert(out: Mat4, m: Mat4): Mat4 {
	const m00 = m[0],
		m01 = m[1],
		m02 = m[2],
		m03 = m[3];
	const m10 = m[4],
		m11 = m[5],
		m12 = m[6],
		m13 = m[7];
	const m20 = m[8],
		m21 = m[9],
		m22 = m[10],
		m23 = m[11];
	const m30 = m[12],
		m31 = m[13],
		m32 = m[14],
		m33 = m[15];

	// Compute 2x2 cofactors.
	const b00 = m00 * m11 - m01 * m10;
	const b01 = m00 * m12 - m02 * m10;
	const b02 = m00 * m13 - m03 * m10;
	const b03 = m01 * m12 - m02 * m11;
	const b04 = m01 * m13 - m03 * m11;
	const b05 = m02 * m13 - m03 * m12;
	const b06 = m20 * m31 - m21 * m30;
	const b07 = m20 * m32 - m22 * m30;
	const b08 = m20 * m33 - m23 * m30;
	const b09 = m21 * m32 - m22 * m31;
	const b10 = m21 * m33 - m23 * m31;
	const b11 = m22 * m33 - m23 * m32;

	let det =
		b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

	det = 1.0 / det;

	out[0] = (m11 * b11 - m12 * b10 + m13 * b09) * det;
	out[1] = (m02 * b10 - m01 * b11 - m03 * b09) * det;
	out[2] = (m31 * b05 - m32 * b04 + m33 * b03) * det;
	out[3] = (m22 * b04 - m21 * b05 - m23 * b03) * det;
	out[4] = (m12 * b08 - m10 * b11 - m13 * b07) * det;
	out[5] = (m00 * b11 - m02 * b08 + m03 * b07) * det;
	out[6] = (m32 * b02 - m30 * b05 - m33 * b01) * det;
	out[7] = (m20 * b05 - m22 * b02 + m23 * b01) * det;
	out[8] = (m10 * b10 - m11 * b08 + m13 * b06) * det;
	out[9] = (m01 * b08 - m00 * b10 - m03 * b06) * det;
	out[10] = (m30 * b04 - m31 * b02 + m33 * b00) * det;
	out[11] = (m21 * b02 - m20 * b04 - m23 * b00) * det;
	out[12] = (m11 * b07 - m10 * b09 - m12 * b06) * det;
	out[13] = (m00 * b09 - m01 * b07 + m02 * b06) * det;
	out[14] = (m31 * b01 - m30 * b03 - m32 * b00) * det;
	out[15] = (m20 * b03 - m21 * b01 + m22 * b00) * det;

	return out;
}
