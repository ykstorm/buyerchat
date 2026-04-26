#!/usr/bin/env sh
# One-shot verification suite. Replaces the 15-min manual click-through
# every sprint. Sub-agents can call this in a single bash invocation:
#   npm run verify
#
# Bails on first failure. Logs noisy build output to /tmp/verify-build.log
# so the foreground stays clean.

set -e

echo "=== Verification Suite ==="

echo ""
echo "[1/5] Type check..."
npx tsc --noEmit

echo ""
echo "[2/5] Lint..."
npm run lint

echo ""
echo "[3/5] Build..."
npm run build > /tmp/verify-build.log 2>&1 || (cat /tmp/verify-build.log && exit 1)
echo "  /chat bundle: $(grep -E '/chat ' /tmp/verify-build.log | head -1 | sed 's/^[[:space:]]*//')"
echo "  /     bundle: $(grep -E '^├ . / ' /tmp/verify-build.log | head -1 | sed 's/^[[:space:]]*//')"

echo ""
echo "[4/5] Tests..."
npm test --silent

echo ""
echo "[5/5] Schema..."
npx prisma format --schema=prisma/schema.prisma > /dev/null
npx prisma validate --schema=prisma/schema.prisma

echo ""
echo "=== ALL CHECKS PASS ==="
