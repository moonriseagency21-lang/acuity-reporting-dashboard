-- Future appointments table: stores appointments not yet occurred (today → end of month).
-- Refreshed every 15 min by acuity-future-sync edge function.
-- Realtime enabled so the dashboard updates without polling.

create table if not exists future_appointments (
  id                   bigint primary key,
  datetime             timestamptz not null,
  first_name           text,
  last_name            text,
  email                text,
  phone                text,
  calendar             text,
  calendar_id          bigint,
  appointment_type     text,
  appointment_type_id  bigint,
  labels               jsonb,
  canceled             boolean not null default false,
  synced_at            timestamptz not null default now()
);

create index if not exists future_appointments_datetime_idx on future_appointments (datetime);

-- RLS: anon key cannot read directly; server-side queries use service role (bypasses RLS).
alter table future_appointments enable row level security;

-- Enable Realtime so the dashboard receives live inserts/updates.
alter publication supabase_realtime add table future_appointments;
