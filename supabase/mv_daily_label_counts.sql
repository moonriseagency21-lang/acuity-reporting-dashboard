-- Materialized view: one row per (appt_date, label_name).
-- Powers get_label_counts() for the KPI cards and bucket distribution panel.
-- Much faster than scanning vw_v2_labels directly — ~16k rows vs millions of scans.
-- Run in Supabase SQL Editor.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_label_counts AS
SELECT
  appt_date,
  label_name,
  count(*)::bigint AS cnt
FROM vw_v2_labels
WHERE label_name != 'Z_Test_Data'
GROUP BY appt_date, label_name
ORDER BY appt_date, label_name;

CREATE INDEX IF NOT EXISTS mv_daily_label_counts_date
  ON mv_daily_label_counts(appt_date);

CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_label_counts_pk
  ON mv_daily_label_counts(appt_date, label_name);

-- Rewrite get_label_counts to read from the mat view instead of vw_v2_labels
CREATE OR REPLACE FUNCTION get_label_counts(p_start date, p_end date)
RETURNS TABLE(label_name text, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT label_name, sum(cnt)::bigint AS cnt
  FROM mv_daily_label_counts
  WHERE appt_date BETWEEN p_start AND p_end
  GROUP BY label_name;
$$;

-- Add daily mat view to the nightly refresh
CREATE OR REPLACE FUNCTION refresh_monthly_metrics()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_label_counts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_label_counts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_metrics;
$$;
