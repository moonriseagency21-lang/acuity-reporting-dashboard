-- Materialized view: one row per (year_month, label_name) with appointment count.
-- All derived monthly-metric views read from this — never from vw_v2_labels directly.
-- Run in Supabase SQL Editor.
--
-- Label sets (verified against Acuity API label_name values):
--   Opportunity / Show  : $ale variants, Declined BNPL, Declined BNPLCIG, Declined II PD, GO, NO SALE, No Sale CIG/Kim
--   $ale (Bucket 2)     : $ale, $ale BNPL CIG, $ale BNPL LTP, $ale CIG, $ale CIG Kim
--   No Opportunity      : CALL BACK PEND, Cancel, Customer Service, F Requirements,
--                         Incomplete, Left Message, No SHOW, No VM - No LM, Not confirmed, Re-schedule
--   Blank               : (blank) — appointment with no label selected; counted in total
--   Excluded            : Z_Test_Data

-- ── Materialized view ─────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_label_counts AS
SELECT
  to_char(appt_date, 'YYYY-MM') AS year_month,
  label_name,
  count(*)::bigint               AS cnt
FROM vw_v2_labels
WHERE label_name != 'Z_Test_Data'
GROUP BY to_char(appt_date, 'YYYY-MM'), label_name
ORDER BY year_month, label_name;

CREATE UNIQUE INDEX IF NOT EXISTS mv_monthly_label_counts_pk
  ON mv_monthly_label_counts(year_month, label_name);

-- ── Rebuild mv_monthly_metrics with corrected label sets ──────────────────────
-- DROP required because we changed column definitions.
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_metrics CASCADE;

CREATE MATERIALIZED VIEW mv_monthly_metrics AS
SELECT
  year_month,
  sum(cnt)::bigint AS total,
  sum(cnt) FILTER (WHERE label_name = 'No SHOW')::bigint AS no_show,
  -- show = opportunity = appointments where a sales conversation occurred
  sum(cnt) FILTER (WHERE label_name IN (
    '$ale', '$ale BNPL CIG', '$ale BNPL LTP', '$ale CIG', '$ale CIG Kim',
    'Declined BNPL', 'Declined BNPL PD', 'Declined BNPLCIG', 'Declined II PD',
    'GO', 'NO SALE', 'No Sale CIG', 'No Sale CIG Kim'
  ))::bigint AS show,
  sum(cnt) FILTER (WHERE label_name IN (
    '$ale', '$ale BNPL CIG', '$ale BNPL LTP', '$ale CIG', '$ale CIG Kim',
    'Declined BNPL', 'Declined BNPL PD', 'Declined BNPLCIG', 'Declined II PD',
    'GO', 'NO SALE', 'No Sale CIG', 'No Sale CIG Kim'
  ))::bigint AS opportunity,
  sum(cnt) FILTER (WHERE label_name IN (
    'CALL BACK PEND', 'Cancel', 'Customer Service', 'F Requirements',
    'Incomplete', 'Left Message', 'No SHOW', 'No VM - No LM',
    'Not confirmed', 'Re-schedule'
  ))::bigint AS no_opportunity,
  sum(cnt) FILTER (WHERE label_name IN (
    '$ale', '$ale BNPL CIG', '$ale BNPL LTP', '$ale CIG', '$ale CIG Kim'
  ))::bigint AS sale,
  sum(cnt) FILTER (WHERE label_name = '(blank)')::bigint AS blank
FROM mv_monthly_label_counts
GROUP BY year_month
ORDER BY year_month;

CREATE UNIQUE INDEX IF NOT EXISTS mv_monthly_metrics_ym ON mv_monthly_metrics(year_month);

-- ── Derived views (instant — read from materialized views) ────────────────────

-- No Shows
CREATE OR REPLACE VIEW vw_monthly_no_shows AS
SELECT year_month, label_name, cnt
FROM mv_monthly_label_counts
WHERE label_name = 'No SHOW'
ORDER BY year_month;

-- Shows (= Opportunity labels)
CREATE OR REPLACE VIEW vw_monthly_shows AS
SELECT year_month, label_name, cnt
FROM mv_monthly_label_counts
WHERE label_name IN (
  '$ale', '$ale BNPL CIG', '$ale BNPL LTP', '$ale CIG', '$ale CIG Kim',
  'Declined BNPL', 'Declined BNPL PD', 'Declined BNPLCIG', 'Declined II PD',
  'GO', 'NO SALE', 'No Sale CIG', 'No Sale CIG Kim'
)
ORDER BY year_month, label_name;

-- Opportunity (same label set as Shows)
CREATE OR REPLACE VIEW vw_monthly_opportunity AS
SELECT year_month, label_name, cnt
FROM mv_monthly_label_counts
WHERE label_name IN (
  '$ale', '$ale BNPL CIG', '$ale BNPL LTP', '$ale CIG', '$ale CIG Kim',
  'Declined BNPL', 'Declined BNPL PD', 'Declined BNPLCIG', 'Declined II PD',
  'GO', 'NO SALE', 'No Sale CIG', 'No Sale CIG Kim'
)
ORDER BY year_month, label_name;

-- No Opportunity
CREATE OR REPLACE VIEW vw_monthly_no_opportunity AS
SELECT year_month, label_name, cnt
FROM mv_monthly_label_counts
WHERE label_name IN (
  'CALL BACK PEND', 'Cancel', 'Customer Service', 'F Requirements',
  'Incomplete', 'Left Message', 'No SHOW', 'No VM - No LM',
  'Not confirmed', 'Re-schedule'
)
ORDER BY year_month, label_name;

-- Sales ($ale bucket only)
CREATE OR REPLACE VIEW vw_monthly_sales AS
SELECT year_month, label_name, cnt
FROM mv_monthly_label_counts
WHERE label_name IN (
  '$ale', '$ale BNPL CIG', '$ale BNPL LTP', '$ale CIG', '$ale CIG Kim'
)
ORDER BY year_month, label_name;

-- Show Rate: shows / total booked appointments
CREATE OR REPLACE VIEW vw_monthly_show_rate AS
SELECT
  m.year_month,
  m.show                         AS show_count,
  t.booked_including_canceled    AS total_appointments,
  CASE
    WHEN t.booked_including_canceled > 0
    THEN round((m.show::numeric / t.booked_including_canceled) * 100, 1)
    ELSE 0
  END AS show_rate_pct
FROM mv_monthly_metrics m
LEFT JOIN vw_monthly_total_appointments t USING (year_month)
ORDER BY year_month;

-- ── Refresh helper (called by nightly sync edge function) ─────────────────────
CREATE OR REPLACE FUNCTION refresh_monthly_metrics()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_label_counts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_metrics;
$$;
