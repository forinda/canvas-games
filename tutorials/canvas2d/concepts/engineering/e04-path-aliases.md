# Path Aliases

## What Is It?

Path aliases replace long, fragile relative import paths with short, absolute-looking names. Instead of writing `import { InputHandler } from "../../../shared/InputHandler"`, you write `import { InputHandler } from "@core/InputHandler"`. The `@shared` prefix is an alias that maps to a specific directory in your project.

Think of it like a contact name in your phone: instead of dialing a 10-digit number every time, you tap "Mom." If the number changes, you update it once in your contacts, not in every text thread.

Aliases make imports readable, reduce breakage when files move, and eliminate the guesswork of counting `../` levels.

## How It Works

```
Two places need to know about aliases:

1. TypeScript (for type checking + editor autocomplete):
   tsconfig.json → compilerOptions.paths

2. Vite (for actual module resolution at build time):
   vite.config.ts → resolve.alias

Both must agree on the same mapping, or TypeScript will accept
the import but Vite will fail to resolve it at runtime.

Example mapping:
  @core/*  →  src/core/* (context-agnostic interfaces)
@shared/*  →  src/contexts/canvas2d/shared/* (2D-specific utilities)
  @games/*   →  src/contexts/canvas2d/games/*

Import resolution:
  import { X } from "@core/InputHandler"
  ↓
  TypeScript resolves: src/core/InputHandler.ts  (for types)
  Vite resolves:       src/core/InputHandler.ts  (for bundling)
```

Directory structure:

```
  project/
  ├── src/
  │   ├── shared/
  │   │   ├── InputHandler.ts
  │   │   └── Renderable.ts
  │   └── games/
  │       ├── snake/
  │       └── platformer/
  ├── tsconfig.json
  └── vite.config.ts
```

## Code Example

```typescript
// ── tsconfig.json ──
// {
//   "compilerOptions": {
//     "baseUrl": ".",
//     "paths": {
//       "@core/*": ["src/core/*"], "@shared/*": ["src/contexts/canvas2d/shared/*"],
//       "@games/*": ["src/contexts/canvas2d/games/*"]
//     }
//   }
// }

// ── vite.config.ts ──
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@games": path.resolve(__dirname, "src/games"),
    },
  },
});

// ── src/contexts/canvas2d/games/snake/SnakeEngine.ts ──
// Before (fragile relative path):
// import { InputHandler } from "../../shared/InputHandler";

// After (clean alias):
// import { InputHandler } from "@core/InputHandler";
// import { SnakeTypes } from "@games/snake/types";

// The path is short, readable, and does not break if
// SnakeEngine.ts moves to a different directory depth.
```

## Used In These Games

- **All games**: Shared interfaces like `Renderable`, `Updatable`, and `InputHandler` in `src/core/` are imported by every game engine. Aliases like `@shared/` eliminate deep `../../..` chains.
- **Tower Defense**: Imports from `@games/tower-defense/types` and `@core/InputHandler` keep the import section clean across its many system and renderer files.
- **Platformer**: The `PlatformerEngine` imports shared types and game-specific modules using consistent alias prefixes.

## Common Pitfalls

- **Configuring only tsconfig but not vite**: TypeScript will show no errors in the editor, but `vite dev` or `vite build` will fail with "Cannot resolve module @shared/..." because Vite uses its own resolver. Always configure both.
- **Forgetting `baseUrl`**: TypeScript's `paths` option requires `baseUrl` to be set. Without it, paths are ignored silently. Set `"baseUrl": "."` in tsconfig.
- **Trailing slashes and wildcards**: In tsconfig, `"@core/*": ["src/core/*"], "@shared/*": ["src/contexts/canvas2d/shared/*"]` uses wildcards. In vite, the alias is just `"@shared": path.resolve(...)` without wildcards. Mixing these up causes resolution failures.
- **IDE not picking up aliases**: Some editors need a restart after changing tsconfig paths. If autocomplete does not work, restart the TypeScript language server (VS Code: Cmd+Shift+P, "TypeScript: Restart TS Server").
