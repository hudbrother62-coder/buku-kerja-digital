-- Keep the tenant membership helper outside the exposed Data API schema and
-- add covering indexes for the application's common relational lookups.

create schema if not exists private;
revoke all on schema private from public;

alter function public.has_school_access(uuid) set schema private;
revoke all on function private.has_school_access(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.has_school_access(uuid) to authenticated;

create index if not exists idx_schools_owner_id on public.schools(owner_id);
create index if not exists idx_academic_years_school_id on public.academic_years(school_id);
create index if not exists idx_classes_school_id on public.classes(school_id);
create index if not exists idx_classes_academic_year_id on public.classes(academic_year_id);
create index if not exists idx_subjects_school_id on public.subjects(school_id);
create index if not exists idx_teacher_assignments_school_id on public.teacher_assignments(school_id);
create index if not exists idx_teacher_assignments_class_id on public.teacher_assignments(class_id);
create index if not exists idx_teacher_assignments_subject_id on public.teacher_assignments(subject_id);
create index if not exists idx_school_members_user_id on public.school_members(user_id);
create index if not exists idx_enrollments_school_id on public.enrollments(school_id);
create index if not exists idx_enrollments_student_id on public.enrollments(student_id);
create index if not exists idx_enrollments_academic_year_id on public.enrollments(academic_year_id);
create index if not exists idx_attendance_school_id on public.attendance_records(school_id);
create index if not exists idx_attendance_student_id on public.attendance_records(student_id);
create index if not exists idx_attendance_subject_id on public.attendance_records(subject_id);
create index if not exists idx_attendance_recorded_by on public.attendance_records(recorded_by);
create index if not exists idx_journals_school_id on public.teaching_journals(school_id);
create index if not exists idx_journals_class_id on public.teaching_journals(class_id);
create index if not exists idx_journals_subject_id on public.teaching_journals(subject_id);
create index if not exists idx_assessments_school_id on public.assessments(school_id);
create index if not exists idx_assessments_class_id on public.assessments(class_id);
create index if not exists idx_assessments_subject_id on public.assessments(subject_id);
create index if not exists idx_assessments_created_by on public.assessments(created_by);
create index if not exists idx_ai_usage_user_id on public.ai_usage_logs(user_id);
create index if not exists idx_ai_usage_school_id on public.ai_usage_logs(school_id);
