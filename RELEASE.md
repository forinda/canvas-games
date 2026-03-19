# Release Guide

How to version, release, and publish the Canvas Game Arcade.

## Version Scheme

We follow [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

| Bump | When | Example |
|------|------|---------|
| **Patch** (`1.0.x`) | Bug fixes, typo corrections, balance tweaks | Fix chess castling bug |
| **Minor** (`1.x.0`) | New games, new features, new tutorials | Add 5 new games |
| **Major** (`x.0.0`) | Breaking platform changes, major rewrites | Restructure GameInterface |

## Quick Commands

```bash
# Preview release notes (no changes made)
pnpm release:notes

# Cut a release (pick one)
pnpm release:patch     # bug fixes only
pnpm release:minor     # new games or features
pnpm release:major     # breaking changes

# Push release to remote
git push origin main --tags
```

## Release Process

### 1. Pre-release checklist

Before releasing, verify:

```bash
# Clean working tree (no uncommitted changes)
git status

# TypeScript compiles with zero errors
pnpm typecheck

# Production build succeeds
pnpm build

# Dev server runs and games are playable
pnpm dev
```

### 2. Choose the version bump

Ask yourself:

- **Did I only fix bugs or improve existing games?** → `pnpm release:patch`
- **Did I add new games, features, or tutorials?** → `pnpm release:minor`
- **Did I change the GameInterface, platform contract, or shared types?** → `pnpm release:major`

### 3. Run the release command

```bash
pnpm release:minor
```

This automatically:

1. Validates clean working tree
2. Runs typecheck (`tsc --noEmit`)
3. Runs production build (`vite build`)
4. Bumps version in `package.json` (e.g., `1.0.0` → `1.1.0`)
5. Generates a `CHANGELOG.md` entry from commit messages since the last tag
6. Commits as `release: v1.1.0`
7. Creates an annotated git tag `v1.1.0`

### 4. Push to remote

```bash
git push origin main --tags
```

### 5. Create a GitHub Release (optional)

```bash
# Using GitHub CLI
gh release create v1.1.0 \
  --title "v1.1.0 — 5 New Games" \
  --notes-file <(pnpm release:notes) \
  --latest
```

Or create manually on GitHub:
1. Go to **Releases → Draft a new release**
2. Select the tag `v1.1.0`
3. Paste the changelog entry as the description
4. Publish

## Commit Message Convention

The release script categorizes changes by commit prefix:

| Prefix | Category | Example |
|--------|----------|---------|
| `feat:` | New Games & Features | `feat: add Chess game (#51)` |
| `fix:` | Bug Fixes | `fix: first-row cards not clickable` |
| `docs:` | Documentation | `docs: write Sudoku tutorial (6 steps)` |
| `refactor:` | Refactoring | `refactor: use Record for registry` |
| `chore:` | Other Changes | `chore: add path aliases` |

### Writing good commit messages

```
feat: add Snake game (#2) — classic arcade with WASD controls

Short description on the first line (under 72 chars).
Optional body explaining the "why" after a blank line.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

## Changelog Format

The `CHANGELOG.md` is auto-generated. Each release entry looks like:

```markdown
## v1.1.0 (2026-03-19)

**52 games** | 555 modules

### New Games & Features
- feat: add Chess game (#51) — full rules, minimax AI
- feat: add Checkers game (#52) — forced captures, multi-jump

### Bug Fixes
- fix: improve Chess castling validation

### Documentation
- docs: write Sudoku tutorial (6 steps)

### Other Changes
- chore: register all games in registry
```

## Release History

| Version | Date | Highlights |
|---------|------|------------|
| v1.0.0 | 2026-03-19 | Initial release: 52 games, SOLID architecture, tutorials, concept reference |

## Hotfix Process

For urgent fixes on a released version:

```bash
# 1. Fix the bug on main
git commit -m "fix: critical bug description"

# 2. Release a patch
pnpm release:patch

# 3. Push
git push origin main --tags
```

## Pre-release Versions (optional)

For testing before a full release:

```bash
# Manual version for pre-release
npm version 1.1.0-beta.1 --no-git-tag-version
git add package.json
git commit -m "pre-release: v1.1.0-beta.1"
git tag v1.1.0-beta.1
```

## Deployment

After releasing, deploy the production build:

```bash
pnpm build
# dist/ folder contains the deployable static site
# Upload dist/ to any static host (Netlify, Vercel, GitHub Pages, etc.)
```

### GitHub Pages

```bash
# Build and deploy to gh-pages branch
pnpm build
npx gh-pages -d dist
```

### Netlify / Vercel

Connect the repo and set:
- **Build command:** `pnpm build`
- **Output directory:** `dist`
- **Node version:** 18+

## Rollback

If a release has issues:

```bash
# Revert the release commit (keeps tag for reference)
git revert HEAD
git push origin main

# Or reset to previous tag (destructive — only if not pushed)
git reset --hard v1.0.0
git tag -d v1.1.0
```

## Files Modified by Release

Each release touches exactly these files:

| File | Change |
|------|--------|
| `package.json` | Version number bumped |
| `CHANGELOG.md` | New entry prepended |
| Git tag | `v{version}` annotated tag created |
