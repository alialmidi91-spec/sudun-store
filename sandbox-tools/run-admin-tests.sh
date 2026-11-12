#!/usr/bin/env bash
# Sandbox-only: اختبارات لوحة التحكم والمتجر وهو مربوط بقاعدة بيانات (خادم Supabase تجريبي محلي)
set -u
cd "$(dirname "$0")/.."
ANON=mock-anon-key-xxxxxxxxxxxxxxxxxxxxxxxx
VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=$ANON node sandbox-tools/build.mjs --out=.sandbox-build-sb > /dev/null || { echo "BUILD FAILED"; exit 1; }
node sandbox-tools/mock-supabase.mjs .sandbox-build-sb/seed-rows.json 54321 > /tmp/mock-sb.log 2>&1 & MOCK=$!
python3 -m http.server 4174 -d .sandbox-build-sb > /dev/null 2>&1 & WEB=$!
trap 'kill $MOCK $WEB 2>/dev/null' EXIT
sleep 1.5
echo "## sql (PostgreSQL حقيقي)"; ./sandbox-tools/sql-test.sh 2>&1 | grep -E "✗|sql:"
echo "## admin e2e";  node sandbox-tools/admin-e2e.mjs 2>&1 | grep -v agent-proxy
B=http://localhost:4174/#/
echo "## checkout (المتجر من قاعدة البيانات)"; curl -s localhost:54321/__reset >/dev/null; BASE=$B node sandbox-tools/checkout-e2e.mjs 2>&1 | grep -E "✗|passed"
echo "## matrix (المتجر من قاعدة البيانات)";   curl -s localhost:54321/__reset >/dev/null; BASE=$B node sandbox-tools/functional-matrix.mjs 2>&1 | grep -E "✗[1-9]|TOTAL|✗ "
echo "## responsive audit (المتجر من قاعدة البيانات)"; curl -s localhost:54321/__reset >/dev/null; BASE=$B node sandbox-tools/responsive-audit.mjs --out=/tmp/audit-sb.json 2>&1 | grep -E "===|^- "
echo "## done"
