-- Bantu Beres Buku Kerja Digital: master data, role gabungan, sesi presensi,
-- preferensi dasbor, dan agenda mingguan guru.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('wali_kelas', 'guru_mapel', 'gabungan'));

alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;

alter table public.teacher_assignments
  drop constraint if exists teacher_assignments_mode_check;

alter table public.teacher_assignments
  add constraint teacher_assignments_mode_check
  check (mode in ('wali_kelas', 'guru_mapel', 'gabungan'));

alter table public.students
  add column if not exists nickname text,
  add column if not exists birth_date date,
  add column if not exists phone text;

alter table public.attendance_records
  add column if not exists session_type text not null default 'homeroom',
  add column if not exists start_time time,
  add column if not exists end_time time;

alter table public.attendance_records
  drop constraint if exists attendance_records_session_type_check;

alter table public.attendance_records
  add constraint attendance_records_session_type_check
  check (session_type in ('homeroom', 'subject'));

alter table public.attendance_records
  drop constraint if exists attendance_records_class_id_subject_id_student_id_attend_key;

drop index if exists public.attendance_records_session_unique;
create unique index attendance_records_session_unique
  on public.attendance_records (
    class_id,
    coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    student_id,
    attendance_date,
    session_type,
    coalesce(start_time, '00:00'::time),
    coalesce(end_time, '00:00'::time)
  );

create index if not exists attendance_records_class_date_session_idx
  on public.attendance_records (class_id, attendance_date desc, session_type);

create index if not exists students_school_name_idx
  on public.students (school_id, full_name);

create table if not exists public.teacher_schedules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_schedules_time_check check (end_time > start_time)
);

create unique index if not exists teacher_schedules_slot_unique
  on public.teacher_schedules (
    user_id,
    class_id,
    coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    day_of_week,
    start_time,
    end_time
  );

create index if not exists teacher_schedules_school_user_day_idx
  on public.teacher_schedules (school_id, user_id, day_of_week, start_time);

alter table public.teacher_schedules enable row level security;

grant select, insert, update, delete on table public.teacher_schedules to authenticated;

drop policy if exists teacher_schedules_select_own on public.teacher_schedules;
create policy teacher_schedules_select_own
  on public.teacher_schedules
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and (select private.has_school_access(school_id))
  );

drop policy if exists teacher_schedules_insert_own on public.teacher_schedules;
create policy teacher_schedules_insert_own
  on public.teacher_schedules
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and (select private.has_school_access(school_id))
  );

drop policy if exists teacher_schedules_update_own on public.teacher_schedules;
create policy teacher_schedules_update_own
  on public.teacher_schedules
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.has_school_access(school_id))
  )
  with check (
    user_id = (select auth.uid())
    and (select private.has_school_access(school_id))
  );

drop policy if exists teacher_schedules_delete_own on public.teacher_schedules;
create policy teacher_schedules_delete_own
  on public.teacher_schedules
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.has_school_access(school_id))
  );
