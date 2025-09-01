#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   OPENAI_API_KEY=sk-... npm run set:openai
#   or just: npm run set:openai (will prompt securely)

KEY="${OPENAI_API_KEY:-}"
if [ -z "$KEY" ]; then
  echo "Enter your OPENAI_API_KEY (input hidden):"
  # shellcheck disable=SC2162
  stty -echo; read KEY; stty echo; echo
fi

if [ -z "$KEY" ]; then
  echo "No key provided. Aborting." >&2; exit 1;
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

touch "$ENV_FILE"
if grep -q '^OPENAI_API_KEY=' "$ENV_FILE"; then
  # Replace existing line
  tmp="$ENV_FILE.tmp.$$"
  sed -e 's/^OPENAI_API_KEY=.*/OPENAI_API_KEY=REDACTED_FOR_LOGS/' "$ENV_FILE" >/dev/null # dry run (log redaction only)
  sed -e "s/^OPENAI_API_KEY=.*/OPENAI_API_KEY=${KEY//\//\/}/" "$ENV_FILE" >"$tmp" && mv "$tmp" "$ENV_FILE"
else
  echo "OPENAI_API_KEY=$KEY" >> "$ENV_FILE"
fi

# Ensure env files are ignored
if ! grep -q '^\.env\.local$' "$ROOT_DIR/.gitignore" 2>/dev/null; then
  echo ".env.local" >> "$ROOT_DIR/.gitignore" || true
fi

echo "OPENAI_API_KEY saved to .env.local (git-ignored)."
echo "Do NOT commit this file. You're good to run the app and scripts."

