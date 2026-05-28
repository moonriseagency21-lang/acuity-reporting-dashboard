-- Extracts per-label appointment counts directly from the raw acuity_appointments table.
-- Handles both object labels ({id,name,color}) and legacy plain-string labels.
-- Appointments with no labels are counted under "(blank)".
-- Run this in the Supabase SQL Editor.

CREATE OR REPLACE VIEW vw_acuity_label_monthly_counts AS
SELECT
  EXTRACT(YEAR  FROM (datetime::timestamptz AT TIME ZONE 'America/New_York'))::int AS year_num,
  EXTRACT(MONTH FROM (datetime::timestamptz AT TIME ZONE 'America/New_York'))::int AS month_num,
  label_name,
  COUNT(*) AS cnt
FROM acuity_appointments,
LATERAL (
  SELECT
    CASE
      WHEN jsonb_typeof(elem) = 'object' THEN elem->>'name'
      WHEN jsonb_typeof(elem) = 'string' THEN elem#>>'{}'
      ELSE '(blank)'
    END AS label_name
  FROM jsonb_array_elements(
    CASE
      WHEN labels IS NOT NULL
       AND jsonb_typeof(labels) = 'array'
       AND jsonb_array_length(labels) > 0
      THEN labels
      ELSE '["(blank)"]'::jsonb
    END
  ) AS elem
) sub
GROUP BY 1, 2, 3;
