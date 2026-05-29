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
  year_month  text,
  total       bigint,
  no_show     bigint,
  show        bigint,
  opportunity bigint,
  no_opportunity bigint,
  sale        bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    to_char(appt_date, 'YYYY-MM')                                        AS year_month,
    count(*)::bigint                                                      AS total,
    count(*) FILTER (WHERE label_name = 'No SHOW')::bigint               AS no_show,
    (count(*) - count(*) FILTER (WHERE label_name = 'No SHOW'))::bigint  AS show,
    count(*) FILTER (WHERE label_name IN (
      '$ale', '$ale CIG', '$ale CIG Kim', '$ale BNPL CIG', '$ale BNPL LTP',
      'GO', 'NO SALE', 'No Sale CIG', 'No Sale CIG Kim',
      'Declined II PD', 'Declined BNPL', 'DECLINED BNPL PD', 'Declined BNPLCIG'
    ))::bigint                                                            AS opportunity,
    count(*) FILTER (WHERE label_name IN (
      'CALL BACK PEND', 'Cancel', 'Customer Service', 'F Requirements',
      'Incomplete', 'Left Message', 'No SHOW', 'No VM - No LM',
      'Not confirmed', 'Z_Test_Data'
    ))::bigint                                                            AS no_opportunity,
    count(*) FILTER (WHERE label_name LIKE '$ale%')::bigint              AS sale
  FROM vw_v2_labels
  WHERE appt_date BETWEEN p_start AND p_end
  GROUP BY to_char(appt_date, 'YYYY-MM')
  ORDER BY year_month;
$$;
