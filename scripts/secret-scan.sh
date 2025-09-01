#!/usr/bin/env bash
set -euo pipefail

# Stop on Windows PowerShell by exiting early (not supported)
case "${OS:-}" in *Windows*) echo "Secret scan skipped on Windows shell"; exit 0;; esac

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

FAIL=0

echo "[secrets] Running gitleaks..."
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --source . --config .gitleaks.toml --redact --no-banner || FAIL=1
else
  echo "[secrets] gitleaks not installed. Install: brew install gitleaks (or see https://github.com/gitleaks/gitleaks)" >&2
fi

echo "[secrets] Running trufflehog (filesystem)..."
if command -v trufflehog >/dev/null 2>&1; then
  trufflehog filesystem --no-update --only-verified --fail --exclude_paths .gitignore . || FAIL=1
else
  echo "[secrets] trufflehog not installed. Install: pipx install trufflehog (or pip install trufflehog)" >&2
fi

if [ "$FAIL" -ne 0 ]; then
  echo "[secrets] Potential secrets detected. Commit aborted. Review output above." >&2
  exit 1
fi

echo "[secrets] OK — no secrets detected."
exit 0

