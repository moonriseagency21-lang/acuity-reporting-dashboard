-- One row per (appointment × label) from acuity_appointments_v2.
-- Appointments with no labels produce one row with label_name = '(blank)'.
-- Run this in the Supabase SQL Editor.

CREATE OR REPLACE VIEW vw_v2_labels AS
SELECT
  a.id                                                                          AS appointment_id,
  (a.datetime::timestamptz AT TIME ZONE 'America/New_York')::date              AS appt_date,
  (a.datetime::timestamptz AT TIME ZONE 'America/New_York')::time              AS start_time,
  a.first_name,
  a.last_name,
  a.email,
  a.calendar,
  a.appointment_type,
  a.notes,
  a.paid,
  a.canceled,
  sub.label_name
FROM acuity_appointments_v2 a,
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
