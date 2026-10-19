#!/usr/bin/env bash
# Sandbox-only: يشغّل كل الاختبارات ويطبع الملخص. يحتاج خادماً على 4173 يقدّم .sandbox-build
set -u
cd "$(dirname "$0")/.."
OUT=${1:-/tmp/sudun-tests}; mkdir -p "$OUT"
node sandbox-tools/build.mjs > /dev/null || { echo "BUILD FAILED"; exit 1; }
echo "## unit";        node .sandbox-build/tests.mjs | tail -1
echo "## checkout";    node sandbox-tools/checkout-e2e.mjs 2>&1 | grep -E "✗|passed"
echo "## matrix";      node sandbox-tools/functional-matrix.mjs 2>&1 | grep -E "✗[1-9]|TOTAL"
echo "## audit";       node sandbox-tools/responsive-audit.mjs --out="$OUT/audit.json" 2>&1 | grep -E "===|^- "
echo "## buybar";      node sandbox-tools/buybar-check.mjs 2>&1 | grep -E "✗|passed"
echo "## orientation"; node sandbox-tools/orientation-audit.mjs "$OUT/orientation.json" 2>&1 | grep -v agent-proxy | tail -60
echo "## done"
