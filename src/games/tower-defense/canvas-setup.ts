/**
 * CanvasSetup: Creates and configures the game canvas element.
 * The GameEngine owns sizing/resizing logic; this module just produces
 * a properly initialized HTMLCanvasElement.
 */
export function createCanvas(): HTMLCanvasElement {
	const canvas = document.createElement("canvas");

	canvas.id = "gameCanvas";
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	canvas.style.display = "block";
	canvas.style.cursor = "crosshair";

	return canvas;
}
