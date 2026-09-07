-- Monthly agenda and consistent cascade cleanup for Buku Kerja Digital.

create table if not exists public.teacher_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  event_date date not null,
  start_time time,
  end_time time,
  event_type text not null default 'other'
    check (event_type in ('meeting', 'ceremony', 'teaching', 'reminder', 'other')),
  note text,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_events_time_check check (
    all_day or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists teacher_events_user_date_idx
  on public.teacher_events (user_id, event_date, start_time);
create index if not exists teacher_events_school_date_idx
  on public.teacher_events (school_id, event_date);
create index if not exists teacher_events_class_id_idx
  on public.teacher_events (class_id);
create index if not exists teacher_events_subject_id_idx
  on public.teacher_events (subject_id);

alter table public.teacher_events enable row level security;
grant select, insert, update, delete on table public.teacher_events to authenticated;

create policy teacher_events_select_own on public.teacher_events
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and (select private.has_school_access(school_id))
  );
create policy teacher_events_insert_own on public.teacher_events
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
    and (select private.has_school_access(school_id))
  );
create policy teacher_events_update_own on public.teacher_events
  for update to authenticated
  using (user_id = (select auth.uid()) and (select private.has_school_access(school_id)))
  with check (user_id = (select auth.uid()) and (select private.has_school_access(school_id)));
create policy teacher_events_delete_own on public.teacher_events
  for delete to authenticated
  using (user_id = (select auth.uid()) and (select private.has_school_access(school_id)));

-- A deleted student must not leave attendance, enrollment, or score rows behind.
do $$
declare constraint_row record;
begin
  for constraint_row in
    select conrelid::regclass as child_table, conname,
           pg_get_constraintdef(oid) as definition
    from pg_constraint
    where contype = 'f'
      and confrelid = 'public.students'::regclass
      and conrelid in (
        'public.enrollments'::regclass,
        'public.attendance_records'::regclass,
        'public.assessment_scores'::regclass
      )
  loop
    execute format('alter table %s drop constraint %I', constraint_row.child_table, constraint_row.conname);
    execute format('alter table %s add constraint %I %s on delete cascade',
      constraint_row.child_table,
      constraint_row.conname,
      regexp_replace(constraint_row.definition, ' ON DELETE [A-Z ]+', '', 'i')
    );
  end loop;
end $$;
