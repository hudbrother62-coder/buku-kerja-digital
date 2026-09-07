-- Deleting master data is deliberate in the UI and must complete atomically.

alter table public.teacher_assignments drop constraint if exists teacher_assignments_class_id_fkey;
alter table public.teacher_assignments add constraint teacher_assignments_class_id_fkey foreign key (class_id) references public.classes(id) on delete cascade;
alter table public.enrollments drop constraint if exists enrollments_class_id_fkey;
alter table public.enrollments add constraint enrollments_class_id_fkey foreign key (class_id) references public.classes(id) on delete cascade;
alter table public.attendance_records drop constraint if exists attendance_records_class_id_fkey;
alter table public.attendance_records add constraint attendance_records_class_id_fkey foreign key (class_id) references public.classes(id) on delete cascade;
alter table public.teaching_journals drop constraint if exists teaching_journals_class_id_fkey;
alter table public.teaching_journals add constraint teaching_journals_class_id_fkey foreign key (class_id) references public.classes(id) on delete cascade;
alter table public.assessments drop constraint if exists assessments_class_id_fkey;
alter table public.assessments add constraint assessments_class_id_fkey foreign key (class_id) references public.classes(id) on delete cascade;

alter table public.teacher_assignments drop constraint if exists teacher_assignments_subject_id_fkey;
alter table public.teacher_assignments add constraint teacher_assignments_subject_id_fkey foreign key (subject_id) references public.subjects(id) on delete set null;
alter table public.attendance_records drop constraint if exists attendance_records_subject_id_fkey;
alter table public.attendance_records add constraint attendance_records_subject_id_fkey foreign key (subject_id) references public.subjects(id) on delete set null;
alter table public.teaching_journals drop constraint if exists teaching_journals_subject_id_fkey;
alter table public.teaching_journals add constraint teaching_journals_subject_id_fkey foreign key (subject_id) references public.subjects(id) on delete set null;
alter table public.assessments drop constraint if exists assessments_subject_id_fkey;
alter table public.assessments add constraint assessments_subject_id_fkey foreign key (subject_id) references public.subjects(id) on delete cascade;

alter table public.assessment_scores drop constraint if exists assessment_scores_assessment_id_fkey;
alter table public.assessment_scores add constraint assessment_scores_assessment_id_fkey foreign key (assessment_id) references public.assessments(id) on delete cascade;
