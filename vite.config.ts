import { defineConfig } from "vite";
import { fileURLToPath, URL } from "url";

export default defineConfig({
	build: {},
	server: {
		port: 3000,
	},
	resolve: {
		alias: {
			"@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
			"@platform": fileURLToPath(new URL("./src/platform", import.meta.url)),
			"@games": fileURLToPath(new URL("./src/games", import.meta.url)),
		},
	},
});
