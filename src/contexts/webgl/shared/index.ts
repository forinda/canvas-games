/**
 * index.ts — Re-exports all shared WebGL2 utilities.
 *
 * Consumers can import individual modules:
 *
 *   import { createProgram } from './shared/WebGLUtils';
 *   import * as Mat4 from './shared/Mat4';
 *
 * Or pull everything from the barrel:
 *
 *   import { createProgram, Mat4, Vec3, OrbitalCamera } from './shared';
 */

// Core WebGL helpers — compile shaders, create buffers, textures, VAOs.
export {
	compileShader,
	createProgram,
	createBuffer,
	createTexture,
	createVAO,
} from "./WebGLUtils";

// 4x4 matrix math (column-major Float32Array).
// Re-exported as a namespace so callers can write `Mat4.perspective(...)`.
export * as Mat4 from "./Mat4";

// 3-component vector math.
export * as Vec3 from "./Vec3";

// Geometry builders (cube, sphere, plane).
export { createCube, createSphere, createPlane } from "./Primitives";
export type { PrimitiveData } from "./Primitives";

// Camera controllers.
export { OrbitalCamera, FPSCamera } from "./Camera";
export type { OrbitalCameraOptions, FPSCameraOptions } from "./Camera";
