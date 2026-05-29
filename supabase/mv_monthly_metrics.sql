-- Materialized view: pre-aggregated monthly metrics.
-- Replaces the expensive full-scan of vw_v2_labels in get_monthly_metrics.
-- Run in Supabase SQL Editor.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_metrics AS
WITH per_appt AS (
  SELECT
    appointment_id,
    appt_date,
    bool_or(label_name = 'No SHOW') AS is_no_show,
    bool_or(label_name IN (
      '$ale', '$ale CIG', '$ale CIG Kim', '$ale BNPL CIG', '$ale BNPL LTP',
      'GO', 'NO SALE', 'No Sale CIG', 'No Sale CIG Kim',
      'Declined II PD', 'Declined BNPL', 'DECLINED BNPL PD', 'Declined BNPLCIG'
    )) AS is_opportunity,
    bool_or(label_name IN (
      'CALL BACK PEND', 'Cancel', 'Customer Service', 'F Requirements',
      'Incomplete', 'Left Message', 'No SHOW', 'No VM - No LM',
      'Not confirmed', 'Z_Test_Data'
    )) AS is_no_opportunity,
    bool_or(label_name LIKE '$ale%') AS is_sale
  FROM vw_v2_labels
  GROUP BY appointment_id, appt_date
)
SELECT
  to_char(appt_date, 'YYYY-MM')                        AS year_month,
  count(*)::bigint                                      AS total,
  count(*) FILTER (WHERE is_no_show)::bigint           AS no_show,
  count(*) FILTER (WHERE NOT is_no_show)::bigint       AS show,
  count(*) FILTER (WHERE is_opportunity)::bigint       AS opportunity,
  count(*) FILTER (WHERE is_no_opportunity)::bigint    AS no_opportunity,
  count(*) FILTER (WHERE is_sale)::bigint              AS sale
FROM per_appt
GROUP BY to_char(appt_date, 'YYYY-MM')
ORDER BY year_month;

-- Index for fast range scans
CREATE UNIQUE INDEX IF NOT EXISTS mv_monthly_metrics_ym ON mv_monthly_metrics(year_month);

-- Wrapper so the edge function can refresh without direct SQL access
CREATE OR REPLACE FUNCTION refresh_monthly_metrics()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_metrics;
$$;

-- Updated RPC: reads from the materialized view instead of vw_v2_labels
CREATE OR REPLACE FUNCTION get_monthly_metrics(p_start date, p_end date)
RETURNS TABLE(
  year_month     text,
  total          bigint,
  no_show        bigint,
  show           bigint,
  opportunity    bigint,
  no_opportunity bigint,
  sale           bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT year_month, total, no_show, show, opportunity, no_opportunity, sale
  FROM mv_monthly_metrics
  WHERE year_month BETWEEN to_char(p_start, 'YYYY-MM') AND to_char(p_end, 'YYYY-MM')
  ORDER BY year_month;
$$;
