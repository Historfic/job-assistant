-- Daily job alerts: "4 new jobs matched your search today".
--
-- One alert per user by design. Each run costs real money (scraping + AI), and
-- the product is a one-time payment, so per-customer cost has to stay bounded.
--
-- seen_urls holds the job URLs already emailed, so a customer is never told
-- about the same listing twice.

create table public.job_alerts (
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

-- The scheduled runner (service role, bypasses RLS) picks up due alerts
create index job_alerts_due on public.job_alerts (enabled, last_run_at);
