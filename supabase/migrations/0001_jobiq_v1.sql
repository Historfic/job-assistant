-- JobIQ v1 schema. Run in the Supabase SQL editor (or `supabase db push`).

-- ── profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  tier       text not null default 'free' check (tier in ('free', 'pro')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
-- No UPDATE policy on purpose: v1 has no client-side profile editing, and
-- tier upgrades are performed manually in the Supabase dashboard (service
-- role bypasses RLS). Without an UPDATE policy, authenticated users cannot
-- modify their own row — including self-upgrading `tier`.

-- Auto-create a profile on signup. Tier upgrades to 'pro' are done manually in
-- the Supabase dashboard until payments ship (see spec: payments deferred).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── oj_connections ───────────────────────────────────────────────────────────
create table public.oj_connections (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  encrypted_session text not null,
  status            text not null default 'active' check (status in ('active', 'expired')),
  consent_at        timestamptz not null,
  connected_at      timestamptz not null default now()
);
alter table public.oj_connections enable row level security;
create policy "oj_all_own" on public.oj_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── job_statuses ─────────────────────────────────────────────────────────────
create table public.job_statuses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  job_url    text not null,
  status     text not null check (status in ('applied', 'rejected')),
  title      text,
  company    text,
  source     text,
  snapshot   jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, job_url)
);
alter table public.job_statuses enable row level security;
create policy "job_statuses_all_own" on public.job_statuses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── searches ─────────────────────────────────────────────────────────────────
create table public.searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  sources    text[] not null,
  keyword    text not null,
  created_at timestamptz not null default now()
);
alter table public.searches enable row level security;
create policy "searches_all_own" on public.searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index searches_user_created on public.searches (user_id, created_at desc);
