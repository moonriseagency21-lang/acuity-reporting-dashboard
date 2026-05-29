-- Fast appointments-by-label lookup using a GIN index on the labels JSONB column.
-- Replaces the slow vw_v2_labels scan in get_appointments_by_label().
-- Run in Supabase SQL Editor.

-- GIN index enables fast @> containment queries on the labels array
CREATE INDEX IF NOT EXISTS idx_acuity_v2_labels_gin
  ON acuity_appointments_v2 USING GIN (labels);


CREATE OR REPLACE FUNCTION get_appointments_by_label(
  p_start date,
  p_end date,
  p_label text
)
RETURNS TABLE(
  appointment_id  bigint,
  appt_date       date,
  start_time      time,
  first_name      text,
  last_name       text,
  email           text,
  calendar        text,
  appointment_type text,
  label_name      text,
  notes           text,
  paid            text
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    id::bigint,
    (datetime::timestamptz AT TIME ZONE 'America/New_York')::date,
    (datetime::timestamptz AT TIME ZONE 'America/New_York')::time,
    first_name::text,
    last_name::text,
    email::text,
    calendar::text,
    appointment_type::text,
    p_label,
    notes::text,
    paid::text
  FROM acuity_appointments_v2
  WHERE
    -- Convert date boundaries to timestamptz so the datetime index can be used
    datetime::timestamptz >= p_start::timestamp AT TIME ZONE 'America/New_York'
    AND datetime::timestamptz <  (p_end::timestamp + interval '1 day') AT TIME ZONE 'America/New_York'
    AND (
      CASE
        WHEN p_label = '(blank)' THEN
          labels IS NULL
          OR labels = '[]'::jsonb
          OR jsonb_array_length(labels) = 0
        ELSE
          labels @> jsonb_build_array(jsonb_build_object('name', p_label))
          OR labels @> jsonb_build_array(to_jsonb(p_label))
      END
    )
  ORDER BY datetime
  LIMIT 5000;
$$;
