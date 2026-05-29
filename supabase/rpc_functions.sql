-- Run this in Supabase SQL Editor.
-- Replaces multi-page JS loops with single-query aggregations.

CREATE OR REPLACE FUNCTION get_label_counts(p_start date, p_end date)
RETURNS TABLE(label_name text, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT label_name, count(*)::bigint AS cnt
  FROM vw_v2_labels
  WHERE appt_date BETWEEN p_start AND p_end
  GROUP BY label_name;
$$;

-- booked counts now come from vw_monthly_booked (queried separately in the app).
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
  -- Collapse to one row per appointment before counting to prevent
  -- double-counting appointments that carry multiple labels.
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
    WHERE appt_date BETWEEN p_start AND p_end
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
$$;
