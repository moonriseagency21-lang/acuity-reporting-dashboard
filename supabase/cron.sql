-- Nightly Acuity sync using acuity-sync-v2 (writes to acuity_appointments_v2).
-- Runs at 7:00 AM UTC = 3:00 AM Eastern (covers both EST and EDT).
--
-- Run in Supabase SQL Editor. Replace YOUR_SERVICE_ROLE_KEY with your key
-- from Settings > API > Secret keys.

-- Remove old job if it exists
select cron.unschedule('acuity-nightly-sync');

-- Create updated job pointing at acuity-sync-v2
select cron.schedule(
  'acuity-nightly-sync',
  '0 7 * * *',
  $$
  select net.http_post(
    url     := 'https://ewgookyitoxxphfjfkcm.supabase.co/functions/v1/acuity-sync-v2',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type',  'application/json'
    ),
    body    := '{"mode": "daily"}'::jsonb
  );
  $$
);

-- Verify:
-- select * from cron.job;

-- To remove later:
-- select cron.unschedule('acuity-nightly-sync');


-- ─── Future appointments sync (every 15 minutes) ──────────────────────────────
-- Pulls today → end of month from Acuity into future_appointments.
-- Realtime subscription in the dashboard picks up changes instantly.
--
-- Replace YOUR_SERVICE_ROLE_KEY with your key from Settings > API > Secret keys.

select cron.unschedule('acuity-future-sync') where exists (
  select 1 from cron.job where jobname = 'acuity-future-sync'
);

select cron.schedule(
  'acuity-future-sync',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://ewgookyitoxxphfjfkcm.supabase.co/functions/v1/acuity-future-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- To remove later:
-- select cron.unschedule('acuity-future-sync');
