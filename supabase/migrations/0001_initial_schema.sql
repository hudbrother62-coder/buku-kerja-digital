-- Buku Kerja Digital isolated schema
-- Apply only to the dedicated Supabase project for this application.

create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  teacher_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  label text not null,
  semester text not null check (semester in ('ganjil','genap')),
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null,
  grade_level text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  mode text not null check (mode in ('wali_kelas','guru_mapel')),
  is_homeroom boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  nis text,
  nisn text,
  gender text,
  address text,
  parent_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  active boolean not null default true,
  unique (class_id, student_id, academic_year_id)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  student_id uuid not null references public.students(id) on delete cascade,
  recorded_by uuid not null references auth.users(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('H','S','I','A')),
  note text,
  created_at timestamptz not null default now(),
  unique (class_id, subject_id, student_id, attendance_date)
);

create table if not exists public.teaching_journals (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  journal_date date not null,
  topic text,
  learning_objectives text,
  strategy text,
  media text,
  assessment text,
  homework text,
  activity text,
  reflection text,
  follow_up text,
  status text not null default 'draft' check (status in ('draft','complete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  max_point numeric not null default 100,
  assessment_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  point numeric,
  comment text,
  created_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  provider text not null default 'gemini',
  model text,
  source text not null default 'application',
  prompt_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_assignments_user on public.teacher_assignments(user_id);
create index if not exists idx_enrollments_class on public.enrollments(class_id);
create index if not exists idx_attendance_date on public.attendance_records(attendance_date);
create index if not exists idx_journals_creator_date on public.teaching_journals(created_by, journal_date);
create index if not exists idx_scores_student on public.assessment_scores(student_id);

alter table public.schools enable row level security;
alter table public.academic_years enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance_records enable row level security;
alter table public.teaching_journals enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_scores enable row level security;
alter table public.ai_usage_logs enable row level security;

create policy "school owner access" on public.schools for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "school scoped academic years" on public.academic_years for all using (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid()));
create policy "school scoped classes" on public.classes for all using (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid()));
create policy "school scoped subjects" on public.subjects for all using (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid()));
create policy "assignment user access" on public.teacher_assignments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "school scoped students" on public.students for all using (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid()));
create policy "school scoped enrollments" on public.enrollments for all using (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.schools s where s.id = school_id and s.owner_id = auth.uid()));
create policy "recorded attendance access" on public.attendance_records for all using (recorded_by = auth.uid()) with check (recorded_by = auth.uid());
create policy "journal creator access" on public.teaching_journals for all using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "assessment creator access" on public.assessments for all using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "assessment score access" on public.assessment_scores for all using (exists (select 1 from public.assessments a where a.id = assessment_id and a.created_by = auth.uid())) with check (exists (select 1 from public.assessments a where a.id = assessment_id and a.created_by = auth.uid()));
create policy "ai usage owner access" on public.ai_usage_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
