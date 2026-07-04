-- Class reminder lead time (hours before start) and class import rollback support
alter table public.gyms add column if not exists class_reminder_hours integer not null default 2;
alter table public.gyms drop constraint if exists gyms_class_reminder_hours_check;
alter table public.gyms add constraint gyms_class_reminder_hours_check
  check (class_reminder_hours >= 0 and class_reminder_hours <= 24);

alter table public.classes add column if not exists import_job_id uuid references public.import_jobs(id) on delete set null;

create index if not exists idx_classes_import_job on public.classes(import_job_id) where import_job_id is not null;
