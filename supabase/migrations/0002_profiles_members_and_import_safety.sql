-- Extends the isolated Buku Kerja Digital schema for real onboarding and
-- teacher-scoped access. Apply this only after 0001_initial_schema.sql.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'wali_kelas' check (role in ('wali_kelas', 'guru_mapel')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'guru_mapel' check (role in ('owner', 'wali_kelas', 'guru_mapel')),
  created_at timestamptz not null default now(),
  unique (school_id, user_id)
);

create unique index if not exists idx_students_school_nisn
  on public.students(school_id, nisn)
  where nisn is not null and nisn <> '';

alter table public.profiles enable row level security;
alter table public.school_members enable row level security;

create or replace function public.has_school_access(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.schools s
    where s.id = target_school_id and s.owner_id = auth.uid()
  ) or exists (
    select 1 from public.school_members m
    where m.school_id = target_school_id and m.user_id = auth.uid()
  );
$$;

grant execute on function public.has_school_access(uuid) to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.school_members to authenticated;
grant select, insert, update, delete on public.schools to authenticated;
grant select, insert, update, delete on public.academic_years, public.classes, public.subjects,
  public.teacher_assignments, public.students, public.enrollments, public.attendance_records,
  public.teaching_journals, public.assessments, public.assessment_scores, public.ai_usage_logs
  to authenticated;

drop policy if exists "profile owner access" on public.profiles;
create policy "profile owner access" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "school owner access" on public.schools;
drop policy if exists "school members can read" on public.schools;
create policy "school owner manages school" on public.schools
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "school members can read" on public.schools
  for select to authenticated
  using (exists (
    select 1 from public.school_members m
    where m.school_id = id and m.user_id = (select auth.uid())
  ));

drop policy if exists "school owner manages members" on public.school_members;
drop policy if exists "member reads own membership" on public.school_members;
create policy "school owner manages members" on public.school_members
  for all to authenticated
  using (exists (
    select 1 from public.schools s
    where s.id = school_id and s.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.schools s
    where s.id = school_id and s.owner_id = (select auth.uid())
  ));
create policy "member reads own membership" on public.school_members
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "school scoped academic years" on public.academic_years;
create policy "school access academic years" on public.academic_years
  for all to authenticated using (public.has_school_access(school_id))
  with check (public.has_school_access(school_id));

drop policy if exists "school scoped classes" on public.classes;
create policy "school access classes" on public.classes
  for all to authenticated using (public.has_school_access(school_id))
  with check (public.has_school_access(school_id));

drop policy if exists "school scoped subjects" on public.subjects;
create policy "school access subjects" on public.subjects
  for all to authenticated using (public.has_school_access(school_id))
  with check (public.has_school_access(school_id));

drop policy if exists "assignment user access" on public.teacher_assignments;
create policy "assignment scoped access" on public.teacher_assignments
  for all to authenticated
  using (user_id = (select auth.uid()) or public.has_school_access(school_id))
  with check (user_id = (select auth.uid()) or public.has_school_access(school_id));

drop policy if exists "school scoped students" on public.students;
create policy "school access students" on public.students
  for all to authenticated using (public.has_school_access(school_id))
  with check (public.has_school_access(school_id));

drop policy if exists "school scoped enrollments" on public.enrollments;
create policy "school access enrollments" on public.enrollments
  for all to authenticated using (public.has_school_access(school_id))
  with check (public.has_school_access(school_id));

drop policy if exists "recorded attendance access" on public.attendance_records;
create policy "teacher attendance access" on public.attendance_records
  for all to authenticated
  using (recorded_by = (select auth.uid()) or public.has_school_access(school_id))
  with check (public.has_school_access(school_id) and recorded_by = (select auth.uid()));

drop policy if exists "journal creator access" on public.teaching_journals;
create policy "teacher journal access" on public.teaching_journals
  for all to authenticated
  using (created_by = (select auth.uid()) or public.has_school_access(school_id))
  with check (public.has_school_access(school_id) and created_by = (select auth.uid()));

drop policy if exists "assessment creator access" on public.assessments;
create policy "teacher assessment access" on public.assessments
  for all to authenticated
  using (created_by = (select auth.uid()) or public.has_school_access(school_id))
  with check (public.has_school_access(school_id) and created_by = (select auth.uid()));

drop policy if exists "assessment score access" on public.assessment_scores;
create policy "teacher score access" on public.assessment_scores
  for all to authenticated
  using (exists (
    select 1 from public.assessments a
    where a.id = assessment_id and (a.created_by = (select auth.uid()) or public.has_school_access(a.school_id))
  ))
  with check (exists (
    select 1 from public.assessments a
    where a.id = assessment_id and (a.created_by = (select auth.uid()) or public.has_school_access(a.school_id))
  ));

drop policy if exists "ai usage owner access" on public.ai_usage_logs;
create policy "ai usage owner access" on public.ai_usage_logs
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
