#!/bin/bash
# Release script: bump version, generate changelog, tag, and commit
# Usage: ./scripts/release.sh [patch|minor|major]
#
# Examples:
#   pnpm release:patch   # 1.0.0 → 1.0.1 (bug fixes)
#   pnpm release:minor   # 1.0.0 → 1.1.0 (new games/features)
#   pnpm release:major   # 1.0.0 → 2.0.0 (breaking changes)

set -e

BUMP_TYPE=${1:-patch}
PACKAGE_JSON="package.json"

# Validate bump type
if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Ensure clean working tree
if [[ -n $(git status --porcelain) ]]; then
  echo "Error: Working tree is not clean. Commit or stash changes first."
  exit 1
fi

# Ensure typecheck passes
echo "Running typecheck..."
npx tsc --noEmit
echo "Typecheck passed."

# Ensure build succeeds
echo "Running build..."
npx vite build > /dev/null 2>&1
echo "Build passed."

# Get current version
CURRENT_VERSION=$(node -p "require('./$PACKAGE_JSON').version")
echo "Current version: $CURRENT_VERSION"

# Bump version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
case "$BUMP_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac
NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "New version: $NEW_VERSION"

# Find the last tag for changelog range
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$LAST_TAG" ]; then
  RANGE="$LAST_TAG..HEAD"
  echo "Changelog range: $LAST_TAG → v$NEW_VERSION"
else
  RANGE="HEAD"
  echo "Changelog range: initial → v$NEW_VERSION"
fi

# Generate changelog entry
CHANGELOG_FILE="CHANGELOG.md"
TEMP_ENTRY=$(mktemp)

{
  echo "## v$NEW_VERSION ($(date +%Y-%m-%d))"
  echo ""

  # Count games
  GAME_COUNT=$(ls -d src/games/*/ 2>/dev/null | wc -l)
  echo "**$GAME_COUNT games** | $(find src -name '*.ts' | wc -l) modules"
  echo ""

  # Features
  FEATURES=$(git log --oneline $RANGE --grep="^feat" 2>/dev/null)
  if [ -n "$FEATURES" ]; then
    echo "### New Games & Features"
    echo ""
    echo "$FEATURES" | while read -r line; do
      msg=$(echo "$line" | cut -d' ' -f2-)
      echo "- $msg"
    done
    echo ""
  fi

  # Fixes
  FIXES=$(git log --oneline $RANGE --grep="^fix" 2>/dev/null)
  if [ -n "$FIXES" ]; then
    echo "### Bug Fixes"
    echo ""
    echo "$FIXES" | while read -r line; do
      msg=$(echo "$line" | cut -d' ' -f2-)
      echo "- $msg"
    done
    echo ""
  fi

  # Docs
  DOCS=$(git log --oneline $RANGE --grep="^docs" 2>/dev/null)
  if [ -n "$DOCS" ]; then
    echo "### Documentation"
    echo ""
    echo "$DOCS" | while read -r line; do
      msg=$(echo "$line" | cut -d' ' -f2-)
      echo "- $msg"
    done
    echo ""
  fi

  # Refactors + Chores
  OTHER=$(git log --oneline $RANGE --grep="^refactor\|^chore" 2>/dev/null)
  if [ -n "$OTHER" ]; then
    echo "### Other Changes"
    echo ""
    echo "$OTHER" | while read -r line; do
      msg=$(echo "$line" | cut -d' ' -f2-)
      echo "- $msg"
    done
    echo ""
  fi

  echo "---"
  echo ""
} > "$TEMP_ENTRY"

# Prepend to CHANGELOG.md (or create it)
if [ -f "$CHANGELOG_FILE" ]; then
  # Insert after the title line
  {
    head -2 "$CHANGELOG_FILE"
    echo ""
    cat "$TEMP_ENTRY"
    tail -n +3 "$CHANGELOG_FILE"
  } > "${CHANGELOG_FILE}.tmp"
  mv "${CHANGELOG_FILE}.tmp" "$CHANGELOG_FILE"
else
  {
    echo "# Changelog"
    echo ""
    cat "$TEMP_ENTRY"
  } > "$CHANGELOG_FILE"
fi
rm "$TEMP_ENTRY"

echo "Changelog updated."

# Update version in package.json
sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
echo "package.json updated to v$NEW_VERSION."

# Commit and tag
git add "$PACKAGE_JSON" "$CHANGELOG_FILE"
git commit -m "release: v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo ""
echo "========================================"
echo "  Released v$NEW_VERSION"
echo "========================================"
echo ""
echo "Next steps:"
echo "  git push origin main --tags"
echo ""
