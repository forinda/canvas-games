# Tutorial Template

Use this template when writing a new game tutorial.

## Game Tutorial README (tutorials/NN-game-name/README.md)

```markdown
# Game Name — Tutorial

Build a complete **Game Name** from scratch using TypeScript and HTML5 Canvas.

**Difficulty:** Beginner / Intermediate / Advanced
**Episodes:** N
**Time:** ~Xh total
**Prerequisites:** [Link to previous game tutorial]

## What You'll Build

[Screenshot or description of the finished game]

## Concepts You'll Learn

- Concept 1
- Concept 2
- Concept 3

## Episodes

| # | Title | Duration | What You'll Build |
|---|-------|----------|-------------------|
| 1 | [Title](./step-1.md) | ~Xmin | Description |
| 2 | [Title](./step-2.md) | ~Xmin | Description |
| ... | ... | ... | ... |

## Final Code

The complete source code is at `src/contexts/canvas2d/games/game-name/`.

## Next Game

Continue to [Next Game Name](../NN-next-game/README.md) →
```

## Step File (tutorials/NN-game-name/step-N.md)

```markdown
# Step N: Title

> **Game:** Game Name | **Step N of M** | **Time:** ~X minutes
> **Previous:** [Step N-1](./step-N-1.md) | **Next:** [Step N+1](./step-N+1.md)

## What You'll Learn

- Learning objective 1
- Learning objective 2

## Prerequisites

- Completed Step N-1
- [Optional: concept from earlier game]

## Let's Code

### N.1 — First sub-section

Explanation of what we're about to do and why.

\```typescript
// Complete, runnable code for this section
// Include the FULL file content so readers can copy-paste
\```

**What's happening:**
- Line X: explanation
- Line Y: explanation

### N.2 — Next sub-section

...continue pattern...

## Try It

\```bash
pnpm dev
\```

Open http://localhost:3000 and [describe what you should see].

## What We Built

Summary of what this step accomplished.

## Challenge

Try these extensions on your own:
1. Challenge 1
2. Challenge 2

## Next Step

In [Step N+1: Title](./step-N+1.md), we'll add...

---
[← Previous Step](./step-N-1.md) | [Back to Game README](./README.md) | [Next Step →](./step-N+1.md)
```
