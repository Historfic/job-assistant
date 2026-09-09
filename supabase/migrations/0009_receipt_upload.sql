-- Receipt screenshots instead of typed reference numbers.
--
-- Asking someone to find and retype a reference number is the step where a
-- payment stops being reported. Everyone already screenshots the GCash receipt
-- out of habit, and that image carries more than the number did: amount, time,
-- sender name and reference all at once.
--
-- The bucket is PRIVATE. A receipt shows a real person's name, their partial
-- account number and what they paid; a public bucket would put that behind a
-- guessable URL forever. Uploads and reads both go through the service role, so
-- there is no client-side storage policy to get wrong.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

alter table public.payment_claims
  add column if not exists receipt_path text;

-- The reference number is optional now: it is visible in the screenshot, and
-- requiring both means requiring the harder one.
alter table public.payment_claims
  alter column reference drop not null;

-- A claim needs one or the other, or Rafael has nothing to check against.
alter table public.payment_claims
  drop constraint if exists payment_claims_has_evidence;
alter table public.payment_claims
  add constraint payment_claims_has_evidence
  check (receipt_path is not null or (reference is not null and length(btrim(reference)) > 0));
