-- Run once in the Supabase SQL editor. Anyone with the site link can view and save.
-- Writes go through a revision check; direct table writes and history access stay disabled.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create table if not exists public.ivry_design (
  id text primary key check (id = 'ivry'),
  revision integer not null default 0 check (revision >= 0),
  payload jsonb,
  updated_at timestamptz not null default now(),
  check (payload is null or (jsonb_typeof(payload) = 'object' and payload->>'format' = 'ivry-design' and payload->>'version' = '1' and octet_length(payload::text) <= 8388608))
);
insert into public.ivry_design(id) values ('ivry') on conflict do nothing;
alter table public.ivry_design enable row level security;
revoke all on public.ivry_design from anon, authenticated;
grant select on public.ivry_design to anon, authenticated;
drop policy if exists "Anyone can view the shared apartment" on public.ivry_design;
create policy "Anyone can view the shared apartment" on public.ivry_design for select to anon, authenticated using (id = 'ivry');
create table if not exists app_private.ivry_history (
  revision integer primary key,
  payload jsonb not null,
  saved_at timestamptz not null default now(),
  saved_by uuid references auth.users(id) on delete set null
);
create or replace function public.ivry_save_design(expected_revision integer, design jsonb)
returns setof public.ivry_design language plpgsql security definer set search_path = '' as $$
declare next_row public.ivry_design;
begin
  if design is null or jsonb_typeof(design) <> 'object' or design->>'format' is distinct from 'ivry-design' or design->>'version' is distinct from '1' or octet_length(design::text)>8388608 then
    raise exception 'Invalid design format or size' using errcode = '22023';
  end if;
  update public.ivry_design set payload=design, revision=revision+1, updated_at=now()
    where id='ivry' and revision=expected_revision returning * into next_row;
  if not found then raise exception 'A newer shared revision exists. Load it before saving.' using errcode = '40001'; end if;
  insert into app_private.ivry_history(revision,payload,saved_by) values(next_row.revision,next_row.payload,auth.uid());
  return next next_row;
end;
$$;
revoke all on function public.ivry_save_design(integer,jsonb) from public;
grant execute on function public.ivry_save_design(integer,jsonb) to anon, authenticated;
