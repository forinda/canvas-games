# Step 1: Table & Paddles

**Goal:** Set up emissive-capable shaders, render a 3D pong table with side walls, and draw the player and AI paddles.

**Time:** ~15 minutes

---

## What You'll Build

- **Emissive fragment shader** — a `uEmissive` uniform that bypasses lighting for self-lit objects
- **Table surface** — a dark flat box with a center line
- **Side walls** — thin boxes along the left and right edges
- **Two paddles** — blue (player, near side) and red (AI, far side)

---

## Concepts

- **Emissive Uniform**: Some objects (the ball, score indicators) should glow without being affected by light direction. The `uEmissive` uniform blends between fully lit (`0.0`) and fully self-lit (`1.0`): `color = mix(litColor, uColor, uEmissive)`. This avoids needing a separate shader program.

- **Table Dimensions**: The table uses `TABLE_W = 8` wide and `TABLE_H = 12` deep (Z axis). The player sits at `+Z`, the AI at `-Z`. This layout means the camera looks "down the table" from an orbital view.

- **drawBox Helper**: Since the entire game is made of scaled cubes and one sphere, a `drawBox(x, y, z, sx, sy, sz, r, g, b)` helper reduces boilerplate. It sets identity, translates, scales, uploads the model matrix, sets color, and draws the cube mesh.

---

## Code

### 1.1 — Emissive Fragment Shader

**File:** `src/contexts/webgl/games/pong-3d/shaders.ts`

```glsl
// Added to the fragment shader:
uniform float uEmissive; // 0.0 = normal lighting, 1.0 = fully self-lit

void main() {
    vec3 norm = normalize(vNormal);

    // Diffuse
    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.15;

    // Specular (Blinn-Phong)
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 halfDir = normalize(uLightDir + viewDir);
    float spec = pow(max(dot(norm, halfDir), 0.0), 48.0);

    vec3 lit = uColor * (ambient + diffuse * 0.75) + vec3(1.0) * spec * 0.25;
    vec3 color = mix(lit, uColor, uEmissive);

    fragColor = vec4(color, 1.0);
}
```

**What's happening:**
- `mix(lit, uColor, uEmissive)` linearly interpolates between the lit result and the raw color. At `uEmissive = 0.0`, you get full Blinn-Phong lighting. At `1.0`, you get the pure `uColor` with no shading — it appears to glow.
- Shininess is 48 here (tighter than marble roll's 32) for a more polished table surface.
- The ball uses `uEmissive = 0.6` — partially self-lit but still showing some light/shadow variation.

---

### 1.2 — Table Constants

**File:** `src/contexts/webgl/games/pong-3d/types.ts`

```typescript
export const TABLE_W = 8;       // table width (X axis)
export const TABLE_H = 12;      // table depth (Z axis)
export const PADDLE_W = 1.8;    // paddle width
export const PADDLE_H = 0.3;    // paddle height (thin slab)
export const PADDLE_D = 0.4;    // paddle depth
export const BALL_R = 0.25;     // ball radius
export const WALL_H = 0.4;     // side wall height
```

---

### 1.3 — Rendering the Table

```typescript
private render(): void {
    const { gl, canvas, state: s } = this;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    // ... projection, view, light, camera uniforms ...
    gl.uniform1f(this.uEmissive, 0.0);  // default: normal lighting

    // Table surface — dark blue-black
    this.drawBox(0, -0.1, 0, TABLE_W / 2, 0.1, TABLE_H / 2, 0.08, 0.12, 0.18);

    // Center line
    this.drawBox(0, 0.01, 0, TABLE_W / 2, 0.01, 0.03, 0.15, 0.2, 0.3);

    // Left wall
    this.drawBox(-(TABLE_W / 2 + 0.1), WALL_H / 2, 0,
                 0.1, WALL_H / 2, TABLE_H / 2, 0.15, 0.2, 0.3);

    // Right wall
    this.drawBox(TABLE_W / 2 + 0.1, WALL_H / 2, 0,
                 0.1, WALL_H / 2, TABLE_H / 2, 0.15, 0.2, 0.3);
}
```

**What's happening:**
- The table surface is at `y = -0.1` with `sy = 0.1` — a very thin box. It sits just below `y = 0` so paddles and the ball at `y = 0+` float slightly above.
- The center line is at `y = 0.01` — barely above the table surface — with `sz = 0.03` (very thin stripe).
- Side walls are placed at `x = ±(TABLE_W/2 + 0.1)` — just beyond the table edge. They're `WALL_H = 0.4` tall.

---

### 1.4 — Paddles

```typescript
// Player paddle (+Z side, near the camera)
const playerZ = TABLE_H / 2 - PADDLE_D / 2;
this.drawBox(s.playerX, PADDLE_H / 2, playerZ,
             PADDLE_W / 2, PADDLE_H / 2, PADDLE_D / 2,
             0.2, 0.6, 1.0);  // blue

// AI paddle (-Z side, far from camera)
const aiZ = -(TABLE_H / 2 - PADDLE_D / 2);
this.drawBox(s.aiX, PADDLE_H / 2, aiZ,
             PADDLE_W / 2, PADDLE_H / 2, PADDLE_D / 2,
             1.0, 0.3, 0.2);  // red
```

**What's happening:**
- Player paddle is at `+Z` (near side). AI at `-Z` (far side). This matches a "you're at the bottom" perspective.
- Paddles are positioned at `y = PADDLE_H / 2` so their bottom face sits on the table surface.
- `s.playerX` and `s.aiX` are updated each frame — player by keyboard, AI by tracking logic (next step).
- Colors are distinct: blue for player, red for AI. These same colors are used for score indicators later.

---

### 1.5 — The drawBox Helper

```typescript
private drawBox(x: number, y: number, z: number,
                sx: number, sy: number, sz: number,
                r: number, g: number, b: number): void {
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [sx, sy, sz]);
    this.gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    this.gl.uniform3f(this.uColor, r, g, b);
    this.drawMesh(this.cubeMesh);
}
```

**What's happening:**
- This 9-parameter helper handles 90% of the drawing in the game. Identity -> translate to position -> scale to size -> upload -> set color -> draw.
- The cube mesh is a unit cube (1x1x1), so `sx/sy/sz` directly define the half-extents of the final box.

---

## Test It

```bash
pnpm dev
```

1. Select "3D Pong" from the 3D category
2. You should see a **dark table** with a **center line** and **side walls**
3. A **blue paddle** at the near side and a **red paddle** at the far side
4. **Orbit the camera** — the Blinn-Phong specular highlights should shift on the table
5. No ball yet, and paddles don't move — that's next step

---

## Challenges

**Easy:**
- Change the table color from dark blue `(0.08, 0.12, 0.18)` to dark green for a billiards look.

**Medium:**
- Add corner posts: draw 4 small cubes at the table corners (at the intersection of side walls and table ends).

**Hard:**
- Make the center line dashed: instead of one long box, draw 8 short boxes with gaps between them.

---

## What You Learned

- `uEmissive` blends between lit and self-lit output, avoiding separate shader programs
- `drawBox` is a one-call pattern for scaled cubes — the workhorse of box-based 3D scenes
- Table, walls, and paddles are all the same cube mesh with different transforms and colors
- Paddle Z-positions are fixed; X-positions track game state

**Next:** We'll add ball physics with paddle collision and an AI opponent.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
