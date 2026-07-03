-- Historical data imports: track which import job created attendance and belt promotion rows
-- so imports can be rolled back.

alter table public.attendance add column if not exists import_job_id uuid references public.import_jobs(id) on delete set null;
alter table public.belt_promotions add column if not exists import_job_id uuid references public.import_jobs(id) on delete set null;

create index if not exists idx_attendance_import_job on public.attendance(import_job_id) where import_job_id is not null;
create index if not exists idx_belt_promotions_import_job on public.belt_promotions(import_job_id) where import_job_id is not null;
