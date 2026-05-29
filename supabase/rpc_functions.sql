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

CREATE OR REPLACE FUNCTION get_monthly_metrics(p_start date, p_end date)
RETURNS TABLE(
  year_month     text,
  total          bigint,
  booked         bigint,
  no_show        bigint,
  show           bigint,
  opportunity    bigint,
  no_opportunity bigint,
  sale           bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  -- Step 1: collapse to one row per appointment, flagging each metric as true/false.
  -- This fixes double-counting for appointments that carry multiple labels.
  WITH per_appt AS (
    SELECT
      appointment_id,
      appt_date,
      bool_or(label_name = 'No SHOW')                                      AS is_no_show,
      bool_or(label_name IN (
        '$ale', '$ale CIG', '$ale CIG Kim', '$ale BNPL CIG', '$ale BNPL LTP',
        'GO', 'NO SALE', 'No Sale CIG', 'No Sale CIG Kim',
        'Declined II PD', 'Declined BNPL', 'DECLINED BNPL PD', 'Declined BNPLCIG'
      ))                                                                    AS is_opportunity,
      bool_or(label_name IN (
        'CALL BACK PEND', 'Cancel', 'Customer Service', 'F Requirements',
        'Incomplete', 'Left Message', 'No SHOW', 'No VM - No LM',
        'Not confirmed', 'Z_Test_Data'
      ))                                                                    AS is_no_opportunity,
      bool_or(label_name LIKE '$ale%')                                     AS is_sale
    FROM vw_v2_labels
    WHERE appt_date BETWEEN p_start AND p_end
    GROUP BY appointment_id, appt_date
  ),
  -- Step 2: total appointments booked from the base table (independent of labels).
  booked_by_month AS (
    SELECT
      to_char((datetime::timestamptz AT TIME ZONE 'America/New_York')::date, 'YYYY-MM') AS year_month,
      count(*)::bigint AS booked
    FROM acuity_appointments_v2
    WHERE (datetime::timestamptz AT TIME ZONE 'America/New_York')::date BETWEEN p_start AND p_end
      AND canceled = false
    GROUP BY 1
  )
  -- Step 3: count appointments (not label-rows) per month.
  SELECT
    to_char(p.appt_date, 'YYYY-MM')                             AS year_month,
    count(*)::bigint                                             AS total,
    coalesce(b.booked, 0)                                        AS booked,
    count(*) FILTER (WHERE p.is_no_show)::bigint                AS no_show,
    count(*) FILTER (WHERE NOT p.is_no_show)::bigint            AS show,
    count(*) FILTER (WHERE p.is_opportunity)::bigint            AS opportunity,
    count(*) FILTER (WHERE p.is_no_opportunity)::bigint         AS no_opportunity,
    count(*) FILTER (WHERE p.is_sale)::bigint                   AS sale
  FROM per_appt p
  LEFT JOIN booked_by_month b ON b.year_month = to_char(p.appt_date, 'YYYY-MM')
  GROUP BY to_char(p.appt_date, 'YYYY-MM'), b.booked
  ORDER BY year_month;
$$;
