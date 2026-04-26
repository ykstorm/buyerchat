#!/usr/bin/env sh
# Surfaces the Sentry "new issues since N hours" URL. Doesn't query the
# API itself (no Sentry CLI/auth assumed); just prints the deeplink so
# the operator can click once after every prod push.
#
# Usage: ./scripts/sentry-since.sh [hours-back, default 1]

HOURS=${1:-1}
URL="https://buyerchat.sentry.io/issues/?query=is:unresolved+age:-${HOURS}h"

echo "Sentry — new unresolved issues in last ${HOURS}h:"
echo "  $URL"
echo ""
echo "If nothing new in that window, the deploy is clean."
