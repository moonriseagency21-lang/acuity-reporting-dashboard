-- One row per (appointment × label). Appointments with no labels produce one row with label_name = '(blank)'.
-- Used for the label drill-down page.

CREATE OR REPLACE VIEW vw_acuity_appointments_with_labels AS
SELECT
  a.id,
  a.datetime,
  a.first_name,
  a.last_name,
  a.email,
  a.calendar,
  a.appointment_type,
  a.labels,
  a.notes,
  a.paid,
  EXTRACT(YEAR  FROM (a.datetime::timestamptz AT TIME ZONE 'America/New_York'))::int AS year_num,
  EXTRACT(MONTH FROM (a.datetime::timestamptz AT TIME ZONE 'America/New_York'))::int AS month_num,
  sub.label_name
FROM acuity_appointments a,
LATERAL (
  SELECT
    CASE
      WHEN jsonb_typeof(elem) = 'object' THEN elem->>'name'
      WHEN jsonb_typeof(elem) = 'string' THEN elem#>>'{}'
      ELSE '(blank)'
    END AS label_name
  FROM jsonb_array_elements(
    CASE
      WHEN a.labels IS NOT NULL
       AND jsonb_typeof(a.labels) = 'array'
       AND jsonb_array_length(a.labels) > 0
      THEN a.labels
      ELSE '["(blank)"]'::jsonb
    END
  ) AS elem
) sub;
