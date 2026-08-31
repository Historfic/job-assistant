-- Close the free-tier alias hole.
--
-- The free tier is 3 LIFETIME searches, counted per user. Gmail ignores dots
-- and everything after a '+', so one Gmail account could produce unlimited
-- users -- raffy@, r.a.f.f.y@, raffy+1@ -- each with a fresh allowance, at no
-- effort and no cost to the person doing it.
--
-- Storing the normalised form lets the lifetime count span every alias of the
-- same inbox. Deliberately NOT a unique constraint: a failed signup with a
-- confusing error is a worse first impression than a shared allowance, and the
-- allowance is what we actually care about.

alter table public.profiles add column if not exists normalized_email text;

-- Gmail only for dot-stripping. Outlook and Yahoo treat dots as significant, so
-- collapsing them there would merge two genuinely different people.
create or replace function public.normalize_email(addr text) returns text
language sql immutable as $$
  select case
    when addr is null or position('@' in addr) = 0 then lower(btrim(addr))
    else (
      with parts as (
        select
          split_part(lower(btrim(addr)), '@', 1) as local_part,
          split_part(lower(btrim(addr)), '@', 2) as domain_part
      ),
      stripped as (
        select
          case when position('+' in local_part) > 1
               then split_part(local_part, '+', 1)
               else local_part end as local_part,
          domain_part
        from parts
      )
      select case
        when domain_part in ('gmail.com', 'googlemail.com')
          then replace(local_part, '.', '') || '@gmail.com'
        else local_part || '@' || domain_part
      end
      from stripped
    )
  end
$$;

update public.profiles
   set normalized_email = public.normalize_email(email)
 where normalized_email is null;

create index if not exists profiles_normalized_email_idx
  on public.profiles (normalized_email);

-- Keep it filled on signup.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, normalized_email)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    public.normalize_email(new.email)
  );
  return new;
end $$;
