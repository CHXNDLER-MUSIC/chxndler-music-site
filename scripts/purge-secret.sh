#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   SECRET=sk-... npm run purge:secret
#   or just: npm run purge:secret (will prompt securely)

SECRET="${SECRET:-}"
if [ -z "$SECRET" ]; then
  echo "Enter the OLD secret value to purge from git history (input hidden):"
  # shellcheck disable=SC2162
  stty -echo; read SECRET; stty echo; echo
fi

if [ -z "$SECRET" ]; then
  echo "No secret provided. Aborting." >&2; exit 1;
fi

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "git-filter-repo not found. Install it first:" >&2
  echo "  macOS: brew install git-filter-repo" >&2
  echo "  or:    pipx install git-filter-repo" >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TMP_RULES="$(mktemp)"
echo "literal:${SECRET}==>REDACTED" > "$TMP_RULES"

echo "[purge] Rewriting history to drop env.local.json and redact provided secret..."
git filter-repo --force --path env.local.json --invert-paths
git filter-repo --force --replace-text "$TMP_RULES"

echo "[purge] Done. You must force-push the rewritten history:" >&2
echo "  git push --force --all" >&2
echo "  git push --force --tags" >&2
echo "Collaborators should re-clone or hard reset to the new history." >&2

