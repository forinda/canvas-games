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

# Detect GitHub repo URL for commit links
REPO_URL=""
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$REMOTE_URL" == *"github.com"* ]]; then
  REPO_URL=$(echo "$REMOTE_URL" | sed -E 's|git@github\.com:|https://github.com/|;s|\.git$||')
fi

# Helper: format entry with hash link + author
format_entry() {
  local line="$1"
  local hash=$(echo "$line" | cut -d' ' -f1)
  local msg=$(echo "$line" | cut -d' ' -f2-)
  local author=$(git log -1 --format='%an' "$hash" 2>/dev/null)

  if [ -n "$REPO_URL" ]; then
    echo "- $msg ([\`$hash\`]($REPO_URL/commit/$hash)) — @$author"
  else
    echo "- $msg (\`$hash\`) — @$author"
  fi
}

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
    format_entry "$line"
  done
  echo ""
fi

# Fixes (fix:)
FIXES=$(git log --oneline $RANGE --grep="^fix" 2>/dev/null)
if [ -n "$FIXES" ]; then
  echo "## Bug Fixes & Improvements"
  echo ""
  echo "$FIXES" | while read -r line; do
    format_entry "$line"
  done
  echo ""
fi

# Refactors (refactor:)
REFACTORS=$(git log --oneline $RANGE --grep="^refactor" 2>/dev/null)
if [ -n "$REFACTORS" ]; then
  echo "## Refactoring"
  echo ""
  echo "$REFACTORS" | while read -r line; do
    format_entry "$line"
  done
  echo ""
fi

# Docs (docs:)
DOCS=$(git log --oneline $RANGE --grep="^docs" 2>/dev/null)
if [ -n "$DOCS" ]; then
  echo "## Documentation"
  echo ""
  echo "$DOCS" | while read -r line; do
    format_entry "$line"
  done
  echo ""
fi

# Chores (chore:)
CHORES=$(git log --oneline $RANGE --grep="^chore" 2>/dev/null)
if [ -n "$CHORES" ]; then
  echo "## Chores"
  echo ""
  echo "$CHORES" | while read -r line; do
    format_entry "$line"
  done
  echo ""
fi

# Contributors
echo "## Contributors"
echo ""
git log --format='%an' $RANGE 2>/dev/null | sort -u | while read -r author; do
  COMMITS=$(git log --oneline $RANGE --author="$author" 2>/dev/null | wc -l)
  echo "- **$author** ($COMMITS commits)"
done
echo ""

echo "---"
echo "*Generated on $DATE*"
