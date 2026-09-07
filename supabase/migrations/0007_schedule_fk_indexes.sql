create index if not exists teacher_schedules_class_id_idx
  on public.teacher_schedules (class_id);

create index if not exists teacher_schedules_subject_id_idx
  on public.teacher_schedules (subject_id);
