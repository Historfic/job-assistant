-- Payment claims: "I paid, here is my reference number."
--
-- GCash, BPI and GoTyme QR payments do not notify anything. The money lands in
-- Rafael's app and the website never hears about it -- so the customer has to
-- tell us, and Rafael has to check. This table is that handoff.
--
-- It is a CLAIM, not a payment. Anyone can submit one. Approval stays human
-- and stays in /admin, because the only real verification is Rafael opening
-- GCash and seeing the money.
--
-- Written to the database before any email is attempted. Email is the
-- notification; this table is the record. A notification that silently fails
-- must never be the only trace of somebody's P999.

create table if not exists public.payment_claims (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  email        text not null,
  method       text not null check (method in ('gcash', 'bpi', 'gotyme')),
  reference    text not null,
  amount       integer not null default 999,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note         text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  text
);

create index if not exists payment_claims_status_idx  on public.payment_claims (status, created_at desc);
create index if not exists payment_claims_user_idx    on public.payment_claims (user_id);

alter table public.payment_claims enable row level security;

-- A customer may file a claim and watch its status. They may not edit it after
-- the fact -- a reference number that can change after Rafael has checked it
-- against GCash is not evidence of anything.
create policy "payment_claims_select_own" on public.payment_claims
  for select using (auth.uid() = user_id);
create policy "payment_claims_insert_own" on public.payment_claims
  for insert with check (auth.uid() = user_id);

-- No update or delete policy at all: only the service role (the admin console)
-- can resolve a claim.
