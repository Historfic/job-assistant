-- Career profile: the user's own CV / experience summary, used to personalise
-- cover letters and (later) job scoring.
--
-- Deliberately its own table rather than a column on `profiles`: `profiles`
-- has no UPDATE policy so nobody can self-upgrade `tier`, and this keeps that
-- guarantee intact while still letting users edit their own CV.

create table public.career_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  headline   text,          -- e.g. "Virtual Assistant · 3 years"
  cv_text    text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.career_profiles enable row level security;

create policy "career_profiles_all_own" on public.career_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
