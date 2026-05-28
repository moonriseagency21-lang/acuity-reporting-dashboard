-- Run this in Supabase SQL Editor before deploying acuity-sync-v2.

CREATE TABLE IF NOT EXISTS acuity_appointments_v2 (
  id                   bigint       PRIMARY KEY,
  datetime             text,
  end_time             text,
  timezone             text,
  first_name           text,
  last_name            text,
  email                text,
  phone                text,
  calendar             text,
  calendar_id          int,
  appointment_type     text,
  appointment_type_id  int,
  duration             int,
  notes                text,
  labels               jsonb,        -- stored exactly as Acuity returns it (null, [], or [{id,name,color}])
  canceled             boolean      DEFAULT false,
  no_show              boolean      DEFAULT false,
  paid                 text,
  price                numeric,
  raw                  jsonb,        -- complete unmodified Acuity response (includes priceSold, amountPaid, forms, etc.)
  synced_at            timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS acuity_appts_v2_datetime     ON acuity_appointments_v2 (datetime);
CREATE INDEX IF NOT EXISTS acuity_appts_v2_email        ON acuity_appointments_v2 (email);
CREATE INDEX IF NOT EXISTS acuity_appts_v2_canceled     ON acuity_appointments_v2 (canceled);
