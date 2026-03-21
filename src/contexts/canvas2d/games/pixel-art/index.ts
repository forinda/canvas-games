import type { GameDefinition } from "@core/GameInterface";
import { PlatformAdapter } from "./adapters/PlatformAdapter";

export const PixelArtGame: GameDefinition = {
	id: "pixel-art",
	name: "Pixel Art",
	description: "Create pixel art on a customizable grid with multiple tools",
	icon: "🎨",
	color: "#9c27b0",
	category: "chill" as const,
	help: {
		goal: "Draw pixel art using a palette of 16 colors and 4 creative tools.",
		controls: [
			{ key: "Left Click", action: "Use current tool (draw/fill/eyedropper)" },
			{ key: "Right Click", action: "Erase pixel" },
			{ key: "Click + Drag", action: "Draw or erase continuously" },
			{ key: "D", action: "Switch to Draw tool" },
			{ key: "E", action: "Switch to Erase tool" },
			{ key: "F", action: "Switch to Fill tool (flood fill)" },
			{ key: "I", action: "Switch to Eyedropper tool (pick color)" },
			{ key: "C", action: "Clear the entire canvas" },
			{ key: "H", action: "Toggle help overlay" },
			{ key: "ESC", action: "Exit to menu" },
		],
		tips: [
			"Use the eyedropper (I) to pick colors directly from your artwork",
			"Flood fill (F) fills all connected pixels of the same color",
			"Switch grid sizes (16x16, 32x32, 64x64) from the HUD — this clears the canvas",
			"Right-click always erases regardless of the selected tool",
			"Click colors in the palette at the top of the HUD to change your drawing color",
		],
	},
	create(canvas, onExit) {
		const instance = new PlatformAdapter(canvas, onExit, this.help!);

		instance.start();

		return instance;
	},
};
