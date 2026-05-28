-- Nightly Acuity sync — runs at 5:00 AM UTC (midnight US Eastern, covers both EST and EDT).
-- Paste this into the Supabase SQL editor (not the cron UI).
-- Replace YOUR_SERVICE_ROLE_KEY with the key from Settings > API > service_role.

select cron.schedule(
  'acuity-nightly-sync',
  '0 5 * * *',
  $$
  select net.http_post(
    url    := 'https://ewgookyitoxxphfjfkcm.supabase.co/functions/v1/acuity-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type',  'application/json'
    ),
    body   := '{"mode": "daily"}'::jsonb
  );
  $$
);

-- To verify the job was created:
-- select * from cron.job;

-- To remove it later:
-- select cron.unschedule('acuity-nightly-sync');
