import { defineConfig } from "vite";
import { fileURLToPath, URL } from "url";

export default defineConfig({
	build: {
		sourcemap: false,
		minify: "oxc",
		chunkSizeWarningLimit: 800,
		license: {
			fileName: "LICENSE",
		},
	},
	server: {
		port: 3000,
	},
	resolve: {
		alias: {
			"@core": fileURLToPath(new URL("./src/core", import.meta.url)),
			"@platform": fileURLToPath(
				new URL("./src/platform", import.meta.url),
			),
			"@canvas2d": fileURLToPath(
				new URL("./src/contexts/canvas2d", import.meta.url),
			),
			"@webgl": fileURLToPath(
				new URL("./src/contexts/webgl", import.meta.url),
			),
			"@shared": fileURLToPath(
				new URL("./src/contexts/canvas2d/shared", import.meta.url),
			),
			"@games": fileURLToPath(
				new URL("./src/contexts/canvas2d/games", import.meta.url),
			),
		},
	},
});
