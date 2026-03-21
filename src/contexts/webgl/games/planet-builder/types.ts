export const SPHERE_SEGMENTS = 40;
export const BASE_RADIUS = 1.0;
export const DEFORM_STRENGTH = 0.08;
export const DEFORM_RADIUS = 0.3; // angular radius of brush
export const SMOOTH_STRENGTH = 0.02;
export const ROTATE_SPEED = 0.3;

export type BrushMode = "raise" | "lower" | "smooth";

export interface PlanetState {
	/** Per-vertex deformation offsets (radial displacement) */
	deform: Float32Array;
	brushMode: BrushMode;
	autoRotate: boolean;
	rotationY: number;
}
