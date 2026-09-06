-- Break the schools <-> school_members RLS recursion with private,
-- security-definer predicates that are not exposed through the Data API.

create or replace function private.is_school_owner(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.schools s
    where s.id = target_school_id
      and s.owner_id = (select auth.uid())
  );
$$;

create or replace function private.is_school_member(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.school_members m
    where m.school_id = target_school_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_school_owner(uuid) from public;
revoke all on function private.is_school_member(uuid) from public;
grant execute on function private.is_school_owner(uuid) to authenticated;
grant execute on function private.is_school_member(uuid) to authenticated;

drop policy if exists "school members can read" on public.schools;
create policy "school members can read" on public.schools
  for select to authenticated
  using (private.is_school_member(id));

drop policy if exists "school owner manages members" on public.school_members;
create policy "school owner manages members" on public.school_members
  for all to authenticated
  using (private.is_school_owner(school_id))
  with check (private.is_school_owner(school_id));
