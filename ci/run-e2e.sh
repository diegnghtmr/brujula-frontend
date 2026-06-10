#!/usr/bin/env bash
# ci/run-e2e.sh — Frontend E2E (real-stack) gate — OPT-IN (local/manual)
#
# Brings up the full Compose stack (backend + Keycloak + Postgres + frontend),
# runs Playwright real-stack tests, then tears down.
#
# Prerequisites:
#   - Docker with Compose plugin available on PATH
#   - pnpm and Node.js on PATH
#   - brujula-backend repo at ../brujula-backend (relative to this repo)
#   - Backend ops/local/compose.full.yaml defines the full stack
#
# Usage:
#   bash ci/run-e2e.sh        # run from frontend repo root
#   ./ci/run-e2e.sh           # same (chmod +x ci/run-e2e.sh)
#
# Exit codes:
#   0 — E2E suite passed
#   1 — stack failed to start, tests failed, or teardown error

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Detect backend repo location:
#   - Local/dev layout: sibling directory ../brujula-backend
#   - CI layout (GitHub Actions): checked out to ./brujula-backend inside workspace
if [ -d "${REPO_ROOT}/../brujula-backend" ]; then
  BACKEND_ROOT="$(cd "${REPO_ROOT}/../brujula-backend" && pwd)"
elif [ -d "${REPO_ROOT}/brujula-backend" ]; then
  BACKEND_ROOT="$(cd "${REPO_ROOT}/brujula-backend" && pwd)"
else
  echo "[CI] ERROR: brujula-backend not found at ../brujula-backend or ./brujula-backend"
  exit 1
fi

COMPOSE_FILE="${BACKEND_ROOT}/ops/local/compose.full.yaml"

cd "$REPO_ROOT"

echo "=== [CI] Frontend E2E (real-stack) gate ==="
echo "    Frontend  : ${REPO_ROOT}"
echo "    Backend   : ${BACKEND_ROOT}"
echo "    Compose   : ${COMPOSE_FILE}"
echo ""

# Verify the compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "[CI] ERROR: compose file not found at ${COMPOSE_FILE}"
  exit 1
fi

# Cleanup function: always run compose down on exit (success or failure)
cleanup() {
  echo ""
  echo "--- [teardown] docker compose down ---"
  docker compose -f "$COMPOSE_FILE" down --remove-orphans || true
}
trap cleanup EXIT

echo "--- [1/3] docker compose up (full stack with health wait) ---"
docker compose -f "$COMPOSE_FILE" up -d --wait
echo "    Stack is healthy."

echo ""
echo "--- [2/3] pnpm test:e2e --project=real-stack ---"
pnpm test:e2e --project=real-stack

echo ""
echo "--- [3/3] teardown (handled by EXIT trap) ---"

echo ""
echo "=== [CI] E2E gate PASSED ==="
