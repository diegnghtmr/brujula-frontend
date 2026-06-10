#!/usr/bin/env bash
# ci/run.sh — Frontend CI gate (local/manual)
#
# Runs the full frontend quality gate:
#   1. pnpm install --frozen-lockfile  — reproducible dependency install
#   2. pnpm api:generate               — regenerate OpenAPI client from spec
#                                        (postapi:generate hook auto-applies DEBT-F7-005 patch)
#   3. pnpm lint                       — ESLint + jsx-a11y (--max-warnings 0)
#   4. pnpm typecheck                  — tsc -b --noEmit (strict, noEmit)
#   5. pnpm test                       — Vitest unit + component tests
#
# Prerequisites:
#   - Node.js (18+) and pnpm on PATH
#   - The OpenAPI spec is at openapi/brujula-api.v1.yaml (no running backend needed)
#
# DEBT-F7-005 note:
#   The OpenAPI generator collapses allOf(PageMeta + {content: T[]}) to a bare PageMeta
#   alias for OfferingPage/SimulationPage/StaffPage. The postapi:generate hook
#   (scripts/patch-generated.mjs) automatically restores the content field after
#   generation. This pipeline does NOT require a running backend to run api:generate
#   because the spec file is committed at openapi/brujula-api.v1.yaml.
#
# Usage:
#   bash ci/run.sh          # run from repo root
#   ./ci/run.sh             # same (chmod +x ci/run.sh)
#
# E2E (real-stack):
#   Use ci/run-e2e.sh for real-stack Playwright tests (requires Docker + running backend).
#
# Exit codes:
#   0 — all gates passed
#   1 — one or more gates failed

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== [CI] Frontend quality gate ==="
echo "    Repo root : ${REPO_ROOT}"
echo ""

echo "--- [1/5] pnpm install --frozen-lockfile ---"
pnpm install --frozen-lockfile

echo ""
echo "--- [2/5] pnpm api:generate (+ postapi:generate patch for DEBT-F7-005) ---"
pnpm api:generate
# The postapi:generate npm hook runs automatically after this step.
# It applies scripts/patch-generated.mjs to restore content: T[] on:
#   OfferingPage, SimulationPage, StaffPage

echo ""
echo "--- [3/5] pnpm lint ---"
pnpm lint

echo ""
echo "--- [4/5] pnpm typecheck ---"
pnpm typecheck

echo ""
echo "--- [5/5] pnpm test ---"
pnpm test

echo ""
echo "=== [CI] All gates PASSED ==="
