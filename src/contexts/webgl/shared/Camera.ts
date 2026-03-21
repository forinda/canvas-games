/**
 * Camera.ts — Reusable camera controllers for WebGL demos.
 *
 * Two camera styles are provided:
 *
 *   - **OrbitalCamera** — Click-drag to orbit around a target point, scroll
 *     to zoom in/out.  Great for inspecting 3D objects.
 *
 *   - **FPSCamera** — WASD movement + mouse-look (pointer-lock).  Classic
 *     first-person controls.
 *
 * Both cameras produce a view matrix (via `getViewMatrix()`) that can be
 * uploaded to a WebGL uniform.  They use the Mat4 and Vec3 utilities from
 * this same shared directory, keeping the project dependency-free.
 */

import * as Mat4Module from "./Mat4";
import * as Vec3Module from "./Vec3";

// ═══════════════════════════════════════════════════════════════════════════
// OrbitalCamera
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for the OrbitalCamera.
 */
export interface OrbitalCameraOptions {
	/** Initial distance from the target (default 5). */
	distance?: number;
	/** Minimum zoom distance (default 0.5). */
	minDistance?: number;
	/** Maximum zoom distance (default 100). */
	maxDistance?: number;
	/** Initial azimuth angle in radians — rotation around Y (default 0). */
	azimuth?: number;
	/** Initial elevation angle in radians — rotation up from XZ plane
	 *  (default 0.5).  Clamped to avoid gimbal lock at the poles. */
	elevation?: number;
	/** Point the camera orbits around (default [0, 0, 0]). */
	target?: [number, number, number];
	/** Mouse drag sensitivity (default 0.005). */
	rotateSensitivity?: number;
	/** Scroll zoom sensitivity (default 0.1). */
	zoomSensitivity?: number;
}

/**
 * A camera that orbits around a fixed target point.
 *
 * **Usage:**
 * ```ts
 * const cam = new OrbitalCamera(canvas);
 * // In render loop:
 * const view = cam.getViewMatrix();
 * gl.uniformMatrix4fv(uView, false, view);
 * ```
 *
 * Call `dispose()` when done to remove event listeners.
 */
export class OrbitalCamera {
	/** Current distance from the target. */
	private distance: number;
	private minDistance: number;
	private maxDistance: number;

	/** Spherical coordinates (radians). */
	private azimuth: number;
	private elevation: number;

	/** The point the camera orbits around. */
	private target: Vec3Module.Vec3;

	/** Sensitivity settings. */
	private rotateSensitivity: number;
	private zoomSensitivity: number;

	/** Internal state for drag tracking. */
	private isDragging = false;

	/** Pre-allocated output matrices/vectors. */
	private viewMatrix = Mat4Module.create();
	private eye = Vec3Module.create();

	/** Bound listeners (stored so we can remove them in `dispose`). */
	private onMouseDown: (e: MouseEvent) => void;
	private onMouseMove: (e: MouseEvent) => void;
	private onMouseUp: (e: MouseEvent) => void;
	private onWheel: (e: WheelEvent) => void;

	/** The canvas element this camera is attached to. */
	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement, options: OrbitalCameraOptions = {}) {
		this.canvas = canvas;

		this.distance = options.distance ?? 5;
		this.minDistance = options.minDistance ?? 0.5;
		this.maxDistance = options.maxDistance ?? 100;
		this.azimuth = options.azimuth ?? 0;
		this.elevation = options.elevation ?? 0.5;
		this.target = Vec3Module.create(
			...((options.target ?? [0, 0, 0]) as [number, number, number]),
		);
		this.rotateSensitivity = options.rotateSensitivity ?? 0.005;
		this.zoomSensitivity = options.zoomSensitivity ?? 0.1;

		// --- Event handlers ---------------------------------------------------

		this.onMouseDown = (e: MouseEvent) => {
			// Only respond to left-button drags.
			if (e.button === 0) {
				this.isDragging = true;
			}
		};

		this.onMouseMove = (e: MouseEvent) => {
			if (!this.isDragging) return;

			this.azimuth -= e.movementX * this.rotateSensitivity;
			this.elevation += e.movementY * this.rotateSensitivity;
			// Clamp elevation to avoid flipping at the poles.
			this.elevation = Math.max(
				-Math.PI / 2 + 0.01,
				Math.min(Math.PI / 2 - 0.01, this.elevation),
			);
		};

		this.onMouseUp = () => {
			this.isDragging = false;
		};

		this.onWheel = (e: WheelEvent) => {
			e.preventDefault();
			this.distance *= 1 + Math.sign(e.deltaY) * this.zoomSensitivity;
			this.distance = Math.max(
				this.minDistance,
				Math.min(this.maxDistance, this.distance),
			);
		};

		canvas.addEventListener("mousedown", this.onMouseDown);
		window.addEventListener("mousemove", this.onMouseMove);
		window.addEventListener("mouseup", this.onMouseUp);
		canvas.addEventListener("wheel", this.onWheel, { passive: false });
	}

	/**
	 * Compute the current view matrix from spherical coordinates.
	 *
	 * @returns A Float32Array (4x4, column-major) suitable for
	 *          `gl.uniformMatrix4fv`.
	 */
	getViewMatrix(): Mat4Module.Mat4 {
		// Convert spherical → Cartesian for the eye position.
		const cosEl = Math.cos(this.elevation);

		this.eye[0] =
			this.target[0] + this.distance * cosEl * Math.sin(this.azimuth);
		this.eye[1] = this.target[1] + this.distance * Math.sin(this.elevation);
		this.eye[2] =
			this.target[2] + this.distance * cosEl * Math.cos(this.azimuth);

		Mat4Module.lookAt(this.viewMatrix, this.eye, this.target, [0, 1, 0]);

		return this.viewMatrix;
	}

	/**
	 * Get the current eye (camera) position.
	 */
	getPosition(): Vec3Module.Vec3 {
		// Ensure eye is up to date.
		this.getViewMatrix();

		return this.eye;
	}

	/**
	 * Remove all event listeners.  Call this when the camera is no longer
	 * needed to prevent memory leaks.
	 */
	dispose(): void {
		this.canvas.removeEventListener("mousedown", this.onMouseDown);
		window.removeEventListener("mousemove", this.onMouseMove);
		window.removeEventListener("mouseup", this.onMouseUp);
		this.canvas.removeEventListener("wheel", this.onWheel);
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// FPSCamera
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for the FPSCamera.
 */
export interface FPSCameraOptions {
	/** Initial position [x, y, z] (default [0, 1.6, 5]). */
	position?: [number, number, number];
	/** Yaw angle in radians — rotation around Y (default 0 = looking toward -Z). */
	yaw?: number;
	/** Pitch angle in radians — rotation around X (default 0 = level). */
	pitch?: number;
	/** Movement speed in units per second (default 5). */
	moveSpeed?: number;
	/** Mouse look sensitivity (default 0.002). */
	lookSensitivity?: number;
}

/**
 * A first-person camera controlled with WASD + mouse look.
 *
 * **Usage:**
 * ```ts
 * const cam = new FPSCamera(canvas);
 * // In render loop, pass deltaTime in seconds:
 * cam.update(dt);
 * const view = cam.getViewMatrix();
 * gl.uniformMatrix4fv(uView, false, view);
 * ```
 *
 * Mouse look activates when the user clicks on the canvas (via Pointer Lock
 * API).  Press Escape to release.
 *
 * Call `dispose()` when done to remove event listeners.
 */
export class FPSCamera {
	/** Camera world-space position. */
	private position: Vec3Module.Vec3;

	/** Euler angles (radians). */
	private yaw: number;
	private pitch: number;

	/** Movement and look parameters. */
	private moveSpeed: number;
	private lookSensitivity: number;

	/** Track which movement keys are currently held. */
	private keys: Record<string, boolean> = {};

	/** Pre-allocated view matrix and helper vectors. */
	private viewMatrix = Mat4Module.create();
	private front = Vec3Module.create();
	private tempVec = Vec3Module.create();

	/** Bound listeners. */
	private onKeyDown: (e: KeyboardEvent) => void;
	private onKeyUp: (e: KeyboardEvent) => void;
	private onMouseMove: (e: MouseEvent) => void;
	private onClick: () => void;

	/** The canvas element this camera is attached to. */
	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement, options: FPSCameraOptions = {}) {
		this.canvas = canvas;

		const pos = options.position ?? [0, 1.6, 5];

		this.position = Vec3Module.create(pos[0], pos[1], pos[2]);

		this.yaw = options.yaw ?? 0;
		this.pitch = options.pitch ?? 0;
		this.moveSpeed = options.moveSpeed ?? 5;
		this.lookSensitivity = options.lookSensitivity ?? 0.002;

		// --- Event handlers ---------------------------------------------------

		this.onKeyDown = (e: KeyboardEvent) => {
			this.keys[e.code] = true;
		};

		this.onKeyUp = (e: KeyboardEvent) => {
			this.keys[e.code] = false;
		};

		this.onMouseMove = (e: MouseEvent) => {
			// Only process mouse movement when pointer is locked to the canvas.
			if (document.pointerLockElement !== canvas) return;

			this.yaw -= e.movementX * this.lookSensitivity;
			this.pitch -= e.movementY * this.lookSensitivity;
			// Clamp pitch to prevent camera flip.
			this.pitch = Math.max(
				-Math.PI / 2 + 0.01,
				Math.min(Math.PI / 2 - 0.01, this.pitch),
			);
		};

		this.onClick = () => {
			// Request pointer lock on click so the mouse cursor is captured.
			canvas.requestPointerLock();
		};

		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
		window.addEventListener("mousemove", this.onMouseMove);
		canvas.addEventListener("click", this.onClick);
	}

	/**
	 * Advance the camera's position based on currently held keys.
	 *
	 * @param dt - Delta time in **seconds** since the last frame.
	 */
	update(dt: number): void {
		// Compute the forward direction from yaw (ignore pitch for WASD
		// movement so the player stays on the XZ plane).
		const forwardX = Math.sin(this.yaw);
		const forwardZ = -Math.cos(this.yaw);

		// Right vector is perpendicular to forward on the XZ plane.
		const rightX = Math.cos(this.yaw);
		const rightZ = Math.sin(this.yaw);

		const speed = this.moveSpeed * dt;

		// WASD movement.
		if (this.keys["KeyW"]) {
			this.position[0] += forwardX * speed;
			this.position[2] += forwardZ * speed;
		}

		if (this.keys["KeyS"]) {
			this.position[0] -= forwardX * speed;
			this.position[2] -= forwardZ * speed;
		}

		if (this.keys["KeyA"]) {
			this.position[0] -= rightX * speed;
			this.position[2] -= rightZ * speed;
		}

		if (this.keys["KeyD"]) {
			this.position[0] += rightX * speed;
			this.position[2] += rightZ * speed;
		}

		// Vertical movement (Space = up, ShiftLeft = down).
		if (this.keys["Space"]) {
			this.position[1] += speed;
		}

		if (this.keys["ShiftLeft"]) {
			this.position[1] -= speed;
		}
	}

	/**
	 * Compute the current view matrix.
	 *
	 * @returns A Float32Array (4x4, column-major) suitable for
	 *          `gl.uniformMatrix4fv`.
	 */
	getViewMatrix(): Mat4Module.Mat4 {
		// Build a look-at target from the camera's position + forward direction
		// (including pitch so the camera can look up/down).
		const cosPitch = Math.cos(this.pitch);

		this.front[0] = Math.sin(this.yaw) * cosPitch;
		this.front[1] = Math.sin(this.pitch);
		this.front[2] = -Math.cos(this.yaw) * cosPitch;

		// target = position + front
		Vec3Module.add(this.tempVec, this.position, this.front);

		Mat4Module.lookAt(this.viewMatrix, this.position, this.tempVec, [0, 1, 0]);

		return this.viewMatrix;
	}

	/**
	 * Get the current camera position.
	 */
	getPosition(): Vec3Module.Vec3 {
		return this.position;
	}

	/**
	 * Remove all event listeners and release pointer lock.
	 */
	dispose(): void {
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		window.removeEventListener("mousemove", this.onMouseMove);
		this.canvas.removeEventListener("click", this.onClick);

		if (document.pointerLockElement === this.canvas) {
			document.exitPointerLock();
		}
	}
}
