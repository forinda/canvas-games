# Vite

## What Is It?

Vite is a modern build tool and development server for web projects. Think of it as a super-fast workshop for your code: during development, it serves files on-demand without bundling everything first (using native ES modules), so changes appear in the browser almost instantly. For production, it bundles and optimizes your code into small, fast files using Rollup under the hood.

Compared to older tools like Webpack, Vite's dev server starts in milliseconds instead of seconds, and Hot Module Replacement (HMR) updates only the changed file rather than rebuilding the entire bundle.

## How It Works

```
Development mode (vite dev):
  Browser requests a file → Vite transforms it on-the-fly
  (TypeScript → JavaScript, resolves imports, injects HMR client)
  No full bundle step. Startup is near-instant.

  File changes → Vite sends HMR update to browser
  Only the changed module reloads. Game state can survive.

Production mode (vite build):
  All files → Rollup bundler → optimized output in dist/
  - Tree-shaking: removes unused code
  - Minification: compresses JavaScript
  - Code splitting: separate chunks for lazy loading
  - Asset hashing: cache-busting filenames

Project structure:
  project/
  ├── index.html          ← entry point (Vite reads <script> tags)
  ├── src/
  │   └── main.ts         ← app entry
  ├── public/             ← static assets (copied as-is)
  ├── vite.config.ts      ← configuration
  └── dist/               ← production output (after build)

Commands:
  pnpm dev    → start dev server (localhost:5173)
  pnpm build  → production build to dist/
  pnpm preview→ preview production build locally
```

## Code Example

```typescript
// ── vite.config.ts ──
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  // Dev server options
  server: {
    port: 3000,
    open: true, // auto-open browser
  },

  // Path aliases (see e04-path-aliases.md)
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@games": path.resolve(__dirname, "src/games"),
    },
  },

  // Build options
  build: {
    outDir: "dist",
    sourcemap: true,     // debug production issues
    target: "es2020",    // modern browsers
  },
});

// ── index.html ──
// <!DOCTYPE html>
// <html>
// <body>
//   <canvas id="game"></canvas>
//   <script type="module" src="/src/main.ts"></script>
// </body>
// </html>
//
// Note: Vite handles TypeScript natively.
// The <script> tag points directly to .ts files.

// ── src/main.ts ──
const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
canvas.width = 800;
canvas.height = 600;

// Start game loop...
// Vite will transform this TypeScript to JavaScript on the fly
// and serve it to the browser with HMR support.
```

## Used In These Games

- **All games**: This entire project uses Vite as its dev server and build tool. The `vite.config.ts` at the project root configures path aliases and build settings for all games.
- **Tower Defense**: During development, changing a tower's stats in `src/contexts/canvas2d/games/tower-defense/data/towers.ts` triggers HMR, and the change is visible in the browser without a full reload.
- **Platformer**: Level data edits in `src/contexts/canvas2d/games/platformer/data/levels.ts` are reflected instantly thanks to Vite's fast HMR.

## Common Pitfalls

- **Editing `public/` files and expecting HMR**: Files in `public/` are served as-is and do not go through Vite's transform pipeline. Changes to public assets require a manual browser refresh.
- **Importing non-standard file types without plugins**: Vite handles JS, TS, CSS, JSON, and common image formats out of the box. For other file types (e.g., GLSL shaders, YAML), you need a Vite plugin.
- **Assuming dev and prod behave identically**: Dev mode uses native ES modules; production uses Rollup bundling. Code that works in dev can break in prod if it relies on dev-only behavior (e.g., dynamic imports with variables). Always test with `pnpm build && pnpm preview`.
- **Large assets in `src/`**: Images and audio in `src/` are processed by Vite (hashed, inlined if small). Large binary files should go in `public/` to avoid unnecessary processing and to keep build times fast.
