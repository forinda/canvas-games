#!/bin/bash
# Generate release notes from git commit history
# Usage: ./scripts/release-notes.sh [from-tag] [to-tag]
#   ./scripts/release-notes.sh                  # all commits
#   ./scripts/release-notes.sh v1.0.0           # since v1.0.0
#   ./scripts/release-notes.sh v1.0.0 v2.0.0   # between tags

FROM=${1:-""}
TO=${2:-"HEAD"}
DATE=$(date +%Y-%m-%d)

if [ -n "$FROM" ]; then
  RANGE="$FROM..$TO"
  TITLE="Release Notes ($FROM → $TO)"
else
  RANGE="$TO"
  TITLE="Release Notes (Full History)"
fi

echo "# $TITLE"
echo ""
echo "**Date:** $DATE"
echo ""

# Count stats
TOTAL_COMMITS=$(git log --oneline $RANGE 2>/dev/null | wc -l)
GAME_COUNT=$(ls -d src/games/*/ 2>/dev/null | wc -l)
MODULE_COUNT=$(find src -name '*.ts' | wc -l)
echo "**Commits:** $TOTAL_COMMITS | **Games:** $GAME_COUNT | **Modules:** $MODULE_COUNT"
echo ""

# Features (feat:)
FEATURES=$(git log --oneline $RANGE --grep="^feat" 2>/dev/null)
if [ -n "$FEATURES" ]; then
  echo "## New Games & Features"
  echo ""
  echo "$FEATURES" | while read -r line; do
    hash=$(echo "$line" | cut -d' ' -f1)
    msg=$(echo "$line" | cut -d' ' -f2-)
    echo "- $msg (\`$hash\`)"
  done
  echo ""
fi

# Fixes (fix:)
FIXES=$(git log --oneline $RANGE --grep="^fix" 2>/dev/null)
if [ -n "$FIXES" ]; then
  echo "## Bug Fixes & Improvements"
  echo ""
  echo "$FIXES" | while read -r line; do
    hash=$(echo "$line" | cut -d' ' -f1)
    msg=$(echo "$line" | cut -d' ' -f2-)
    echo "- $msg (\`$hash\`)"
  done
  echo ""
fi

# Refactors (refactor:)
REFACTORS=$(git log --oneline $RANGE --grep="^refactor" 2>/dev/null)
if [ -n "$REFACTORS" ]; then
  echo "## Refactoring"
  echo ""
  echo "$REFACTORS" | while read -r line; do
    hash=$(echo "$line" | cut -d' ' -f1)
    msg=$(echo "$line" | cut -d' ' -f2-)
    echo "- $msg (\`$hash\`)"
  done
  echo ""
fi

# Docs (docs:)
DOCS=$(git log --oneline $RANGE --grep="^docs" 2>/dev/null)
if [ -n "$DOCS" ]; then
  echo "## Documentation"
  echo ""
  echo "$DOCS" | while read -r line; do
    hash=$(echo "$line" | cut -d' ' -f1)
    msg=$(echo "$line" | cut -d' ' -f2-)
    echo "- $msg (\`$hash\`)"
  done
  echo ""
fi

# Chores (chore:)
CHORES=$(git log --oneline $RANGE --grep="^chore" 2>/dev/null)
if [ -n "$CHORES" ]; then
  echo "## Chores"
  echo ""
  echo "$CHORES" | while read -r line; do
    hash=$(echo "$line" | cut -d' ' -f1)
    msg=$(echo "$line" | cut -d' ' -f2-)
    echo "- $msg (\`$hash\`)"
  done
  echo ""
fi

# Game list by category
echo "## Game Roster ($GAME_COUNT games)"
echo ""
for category in arcade action puzzle strategy chill; do
  games=$(grep -A 100 "^  $category:" src/platform/GameRegistry.ts 2>/dev/null | grep "Game\|Game2048" | sed 's/.*\(.*Game\).*/\1/' | head -20)
  count=$(echo "$games" | grep -c "Game" 2>/dev/null || echo 0)
  echo "### ${category^} ($count)"
  echo ""
  # List game folders in this category
  grep -B1 "category: '$category'" src/games/*/index.ts 2>/dev/null | grep "name:" | sed "s/.*name: '\(.*\)'.*/- \1/" | sort
  echo ""
done

echo "---"
echo "*Generated on $DATE*"
