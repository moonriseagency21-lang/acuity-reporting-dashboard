-- RPCs for Today's Board: appointments + pacing.
-- All queries use SECURITY DEFINER to bypass the RLS that blocks direct
-- table access via the PostgREST API layer.
-- Run in Supabase SQL Editor.

-- B-tree index on raw datetime text for range-based pre-filtering
CREATE INDEX IF NOT EXISTS idx_acuity_v2_datetime_text
  ON acuity_appointments_v2(datetime);

-- ── Today's historical appointments (from acuity_appointments_v2) ─────────────
CREATE OR REPLACE FUNCTION get_today_appointments(p_date date)
RETURNS TABLE(
  appointment_id   bigint,
  datetime         text,
  first_name       text,
  last_name        text,
  calendar         text,
  appointment_type text,
  label_name       text,
  canceled         boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    a.id::bigint,
    a.datetime::text,
    a.first_name::text,
    a.last_name::text,
    a.calendar::text,
    a.appointment_type::text,
    COALESCE(
      (SELECT
         CASE
           WHEN jsonb_typeof(elem) = 'object' THEN elem->>'name'
           WHEN jsonb_typeof(elem) = 'string' THEN elem#>>'{}'
         END
       FROM jsonb_array_elements(
         CASE
           WHEN a.labels IS NOT NULL
                AND jsonb_typeof(a.labels) = 'array'
                AND jsonb_array_length(a.labels) > 0
           THEN a.labels
           ELSE '[]'::jsonb
         END
       ) AS elem
       WHERE (CASE
                WHEN jsonb_typeof(elem) = 'object' THEN elem->>'name'
                WHEN jsonb_typeof(elem) = 'string' THEN elem#>>'{}'
              END) IS NOT NULL
       LIMIT 1),
      '(blank)'
    ) AS label_name,
    a.canceled::boolean
  FROM acuity_appointments_v2 a
  WHERE a.datetime >= p_date::text              -- index-friendly string prefix (UTC date ≥ Eastern date)
    AND a.datetime <  (p_date + 2)::text        -- +2 day buffer covers UTC offset for Eastern time
    AND (a.datetime::timestamptz AT TIME ZONE 'America/New_York')::date = p_date  -- precise filter
  ORDER BY a.datetime;
$$;

-- ── Today's future/upcoming appointments (from future_appointments) ────────────
CREATE OR REPLACE FUNCTION get_today_future_appointments(p_date date)
RETURNS TABLE(
  id               bigint,
  datetime         text,
  first_name       text,
  last_name        text,
  calendar         text,
  appointment_type text,
  canceled         boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    id::bigint,
    datetime::text,
    first_name::text,
    last_name::text,
    calendar::text,
    appointment_type::text,
    canceled::boolean
  FROM future_appointments
  WHERE (datetime::timestamptz AT TIME ZONE 'America/New_York')::date = p_date
    AND canceled = false
  ORDER BY datetime;
$$;

-- ── Today's pacing counts (single-row result) ─────────────────────────────────
CREATE OR REPLACE FUNCTION get_today_pacing()
RETURNS TABLE(
  occurred_count bigint,
  future_count   bigint,
  show_count     bigint,
  sale_count     bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    -- Occurred: historical appointments that have already started today
    (SELECT count(*)
     FROM acuity_appointments_v2
     WHERE (datetime::timestamptz AT TIME ZONE 'America/New_York')::date = CURRENT_DATE
       AND canceled = false
       AND (datetime::timestamptz AT TIME ZONE 'America/New_York') <= (NOW() AT TIME ZONE 'America/New_York')
    )::bigint AS occurred_count,

    -- Future: upcoming appointments still booked for today
    (SELECT count(*)
     FROM future_appointments
     WHERE (datetime::timestamptz AT TIME ZONE 'America/New_York')::date = CURRENT_DATE
       AND canceled = false
       AND (datetime::timestamptz AT TIME ZONE 'America/New_York') > (NOW() AT TIME ZONE 'America/New_York')
    )::bigint AS future_count,

    -- Shows today: opportunity/show labels from daily mat view
    COALESCE(
      (SELECT sum(cnt)
       FROM mv_daily_label_counts
       WHERE appt_date = CURRENT_DATE
         AND label_name IN (
           '$ale', '$ale BNPL CIG', '$ale BNPL LTP', '$ale CIG', '$ale CIG Kim',
           'Declined BNPL', 'Declined BNPL PD', 'Declined BNPLCIG', 'Declined II PD',
           'GO', 'NO SALE', 'No Sale CIG', 'No Sale CIG Kim'
         )
      ), 0
    )::bigint AS show_count,

    -- Sales today: $ale labels from daily mat view
    COALESCE(
      (SELECT sum(cnt)
       FROM mv_daily_label_counts
       WHERE appt_date = CURRENT_DATE
         AND label_name IN (
           '$ale', '$ale BNPL CIG', '$ale BNPL LTP', '$ale CIG', '$ale CIG Kim'
         )
      ), 0
    )::bigint AS sale_count;
$$;
