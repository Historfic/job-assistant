-- Bring back daily job alerts, opt-in and paid-only.
--
-- Removed once for cost: every alert runs a full search, so the email is free
-- but finding the jobs to put in it is not. The old version ran for anyone who
-- had ever enabled it, whether or not they still opened the app, so a dormant
-- free account billed us every month forever.
--
-- Two things changed. A search costs about a fifth of what it did, and this is
-- now restricted to paying accounts -- so the cost sits against a P999
-- subscription rather than against somebody who signed up once in March.
--
-- seen_urls is what stops the same job arriving every morning until it expires.

create table if not exists public.job_alerts (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  keyword     text not null,
  sources     text[] not null default '{onlinejobs}',
  min_salary  integer,
  job_type    text,
  enabled     boolean not null default true,
  seen_urls   text[] not null default '{}',
  last_run_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.job_alerts enable row level security;

create policy "job_alerts_all_own" on public.job_alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists job_alerts_enabled_idx on public.job_alerts (enabled) where enabled;
