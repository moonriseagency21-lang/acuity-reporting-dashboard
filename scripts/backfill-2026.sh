#!/bin/bash
# One-time backfill of 2026 Acuity data into Supabase.
# Jan 2026 is already in the DB — this pulls Feb through yesterday.
#
# Usage:
#   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
#   bash scripts/backfill-2026.sh

URL="https://ewgookyitoxxphfjfkcm.supabase.co/functions/v1/acuity-sync"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY is not set."
  echo "  export SUPABASE_SERVICE_ROLE_KEY=your_key_here"
  exit 1
fi

# start|end pairs — adjust if you need different coverage
MONTHS=(
  "2026-02-01|2026-02-28"
  "2026-03-01|2026-03-31"
  "2026-04-01|2026-04-30"
  "2026-05-01|2026-05-27"
)

for MONTH in "${MONTHS[@]}"; do
  IFS='|' read -r START END <<< "$MONTH"
  echo ""
  echo "━━━ Pulling $START → $END ━━━"

  curl -s -X POST "$URL" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"mode\": \"backfill\", \"startDate\": \"$START\", \"endDate\": \"$END\"}" \
    | python3 -m json.tool 2>/dev/null || echo "(raw response above)"

  echo ""
  echo "Sleeping 30s before next month…"
  sleep 30
done

echo ""
echo "━━━ Backfill complete ━━━"
