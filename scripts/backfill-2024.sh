#!/bin/bash
# One-time backfill of all 2024 Acuity data into acuity_appointments_v2.
#
# Usage:
#   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
#   bash scripts/backfill-2024.sh

URL="https://ewgookyitoxxphfjfkcm.supabase.co/functions/v1/acuity-sync-v2"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY is not set."
  echo "  export SUPABASE_SERVICE_ROLE_KEY=your_key_here"
  exit 1
fi

MONTHS=(
  "2024-01-01|2024-01-31"
  "2024-02-01|2024-02-29"
  "2024-03-01|2024-03-31"
  "2024-04-01|2024-04-30"
  "2024-05-01|2024-05-31"
  "2024-06-01|2024-06-30"
  "2024-07-01|2024-07-31"
  "2024-08-01|2024-08-31"
  "2024-09-01|2024-09-30"
  "2024-10-01|2024-10-31"
  "2024-11-01|2024-11-30"
  "2024-12-01|2024-12-31"
)

for MONTH in "${MONTHS[@]}"; do
  IFS='|' read -r START END <<< "$MONTH"
  echo ""
  echo "━━━ $START → $END ━━━"

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
echo "━━━ 2024 backfill complete ━━━"
