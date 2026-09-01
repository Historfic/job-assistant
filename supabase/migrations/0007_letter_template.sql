-- Let a user set the shape of their own cover letters.
--
-- The letter came back however the model wrote it, and someone applying twenty
-- times a week has their own voice with no way to say so. Stored per user and
-- nullable: null means "use the default", so an existing row needs no backfill
-- and clearing the box restores the default rather than producing nothing.

alter table public.career_profiles
  add column if not exists letter_template text;
