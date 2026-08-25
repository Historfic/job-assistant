-- Drop the daily job alerts feature.
--
-- Alerts ran a full search per subscriber per day whether or not they ever
-- opened the app, so the cost was fixed per user and detached from use. The
-- feature is gone from the code; this removes its table.
--
-- Destructive and irreversible. Run it only when you're sure — the app works
-- fine with the table still present, since nothing references it any more.

drop table if exists public.job_alerts;
