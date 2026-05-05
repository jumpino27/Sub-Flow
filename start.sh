#!/usr/bin/env sh
set -eu

cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Run ./install-unix.sh first."
  exit 1
fi

if [ ! -x node_modules/.bin/next ]; then
  echo "Dependencies are missing or incomplete. Installing now..."
  npm install
fi

url="http://127.0.0.1:3100"
echo "Starting SubFlow at $url"

(
  sleep 3
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
) &

npm run dev -- --hostname 127.0.0.1 --port 3100
