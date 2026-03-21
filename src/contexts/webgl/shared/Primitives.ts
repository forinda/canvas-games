/**
 * Primitives.ts — Geometry builders for common 3D shapes.
 *
 * Each builder returns an object with typed arrays that can be uploaded
 * directly to WebGL buffers:
 *
 *   - `positions`  — vertex positions    (3 floats per vertex)
 *   - `normals`    — surface normals     (3 floats per vertex)
 *   - `uvs`        — texture coordinates (2 floats per vertex)
 *   - `indices`    — triangle index list  (3 per triangle)
 *
 * No WebGL calls are made here — the output is plain data.
 */

/** Shape returned by all primitive builders. */
export interface PrimitiveData {
	positions: Float32Array;
	normals: Float32Array;
	uvs: Float32Array;
	indices: Uint16Array;
}

// ---------------------------------------------------------------------------
// Cube
// ---------------------------------------------------------------------------

/**
 * Create an axis-aligned cube centered at the origin.
 *
 * The cube has 24 vertices (4 per face, to allow correct per-face normals
 * and UV mapping) and 36 indices (2 triangles per face, 6 faces).
 *
 * @param size - Full side length of the cube (default 1).
 * @returns PrimitiveData for the cube.
 */
export function createCube(size = 1): PrimitiveData {
	const s = size / 2;

	// Each face is defined by its 4 corners.  Winding order is CCW when
	// viewed from outside the cube (standard front-face convention).
	//
	// prettier-ignore
	const positions = new Float32Array([
    // Front face  (+Z)
    -s, -s,  s,    s, -s,  s,    s,  s,  s,   -s,  s,  s,
    // Back face   (-Z)
     s, -s, -s,   -s, -s, -s,   -s,  s, -s,    s,  s, -s,
    // Top face    (+Y)
    -s,  s,  s,    s,  s,  s,    s,  s, -s,   -s,  s, -s,
    // Bottom face (-Y)
    -s, -s, -s,    s, -s, -s,    s, -s,  s,   -s, -s,  s,
    // Right face  (+X)
     s, -s,  s,    s, -s, -s,    s,  s, -s,    s,  s,  s,
    // Left face   (-X)
    -s, -s, -s,   -s, -s,  s,   -s,  s,  s,   -s,  s, -s,
  ]);

	// prettier-ignore
	const normals = new Float32Array([
    // Front
     0,  0,  1,    0,  0,  1,    0,  0,  1,    0,  0,  1,
    // Back
     0,  0, -1,    0,  0, -1,    0,  0, -1,    0,  0, -1,
    // Top
     0,  1,  0,    0,  1,  0,    0,  1,  0,    0,  1,  0,
    // Bottom
     0, -1,  0,    0, -1,  0,    0, -1,  0,    0, -1,  0,
    // Right
     1,  0,  0,    1,  0,  0,    1,  0,  0,    1,  0,  0,
    // Left
    -1,  0,  0,   -1,  0,  0,   -1,  0,  0,   -1,  0,  0,
  ]);

	// Each face gets the full 0..1 UV range.
	// prettier-ignore
	const uvs = new Float32Array([
    0, 0,  1, 0,  1, 1,  0, 1,  // Front
    0, 0,  1, 0,  1, 1,  0, 1,  // Back
    0, 0,  1, 0,  1, 1,  0, 1,  // Top
    0, 0,  1, 0,  1, 1,  0, 1,  // Bottom
    0, 0,  1, 0,  1, 1,  0, 1,  // Right
    0, 0,  1, 0,  1, 1,  0, 1,  // Left
  ]);

	// Two CCW triangles per face (0-1-2, 0-2-3).
	const indices = new Uint16Array(36);

	for (let face = 0; face < 6; face++) {
		const base = face * 4;
		const idx = face * 6;

		indices[idx] = base;
		indices[idx + 1] = base + 1;
		indices[idx + 2] = base + 2;
		indices[idx + 3] = base;
		indices[idx + 4] = base + 2;
		indices[idx + 5] = base + 3;
	}

	return { positions, normals, uvs, indices };
}

// ---------------------------------------------------------------------------
// Sphere (UV sphere)
// ---------------------------------------------------------------------------

/**
 * Create a UV sphere centered at the origin.
 *
 * The sphere is tessellated with `segments` longitudinal slices and
 * `segments` latitudinal rings (including the poles).  Higher values
 * produce smoother geometry at the cost of more vertices.
 *
 * @param radius   - Sphere radius (default 1).
 * @param segments - Number of both horizontal and vertical subdivisions
 *                   (default 32).  Minimum is 3.
 * @returns PrimitiveData for the sphere.
 */
export function createSphere(radius = 1, segments = 32): PrimitiveData {
	const rings = Math.max(segments, 3);
	const slices = Math.max(segments, 3);

	const vertexCount = (rings + 1) * (slices + 1);
	const positions = new Float32Array(vertexCount * 3);
	const normals = new Float32Array(vertexCount * 3);
	const uvs = new Float32Array(vertexCount * 2);

	let vIdx = 0;
	let uvIdx = 0;

	for (let ring = 0; ring <= rings; ring++) {
		// phi goes from 0 (north pole) to PI (south pole).
		const phi = (ring / rings) * Math.PI;
		const sinPhi = Math.sin(phi);
		const cosPhi = Math.cos(phi);

		for (let slice = 0; slice <= slices; slice++) {
			// theta goes from 0 to 2*PI around the equator.
			const theta = (slice / slices) * Math.PI * 2;
			const sinTheta = Math.sin(theta);
			const cosTheta = Math.cos(theta);

			// Unit normal — same direction as the position on a unit sphere.
			const nx = cosTheta * sinPhi;
			const ny = cosPhi;
			const nz = sinTheta * sinPhi;

			positions[vIdx] = nx * radius;
			positions[vIdx + 1] = ny * radius;
			positions[vIdx + 2] = nz * radius;

			normals[vIdx] = nx;
			normals[vIdx + 1] = ny;
			normals[vIdx + 2] = nz;

			uvs[uvIdx] = slice / slices;
			uvs[uvIdx + 1] = ring / rings;

			vIdx += 3;
			uvIdx += 2;
		}
	}

	// Build triangle indices.  Each quad between two adjacent rings/slices
	// is split into two triangles.
	const indexCount = rings * slices * 6;
	const indices = new Uint16Array(indexCount);
	let iIdx = 0;

	for (let ring = 0; ring < rings; ring++) {
		for (let slice = 0; slice < slices; slice++) {
			const curr = ring * (slices + 1) + slice;
			const next = curr + slices + 1;

			// Triangle 1
			indices[iIdx++] = curr;
			indices[iIdx++] = next;
			indices[iIdx++] = curr + 1;

			// Triangle 2
			indices[iIdx++] = curr + 1;
			indices[iIdx++] = next;
			indices[iIdx++] = next + 1;
		}
	}

	return { positions, normals, uvs, indices };
}

// ---------------------------------------------------------------------------
// Plane
// ---------------------------------------------------------------------------

/**
 * Create a flat plane lying in the XZ plane, centered at the origin, with
 * the normal pointing up (+Y).
 *
 * The plane consists of 4 vertices and 2 triangles — the simplest possible
 * quad.
 *
 * @param width  - Extent along the X axis (default 1).
 * @param height - Extent along the Z axis (default 1).
 * @returns PrimitiveData for the plane.
 */
export function createPlane(width = 1, height = 1): PrimitiveData {
	const hw = width / 2;
	const hh = height / 2;

	// prettier-ignore
	const positions = new Float32Array([
    -hw, 0, -hh,
     hw, 0, -hh,
     hw, 0,  hh,
    -hw, 0,  hh,
  ]);

	// prettier-ignore
	const normals = new Float32Array([
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
  ]);

	// prettier-ignore
	const uvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ]);

	// Two CCW triangles.
	// prettier-ignore
	const indices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
  ]);

	return { positions, normals, uvs, indices };
}
