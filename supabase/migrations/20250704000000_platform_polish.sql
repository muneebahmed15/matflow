-- Platform polish: timezone, import rollback tracking

alter table public.gyms
  add column if not exists timezone text not null default 'America/New_York';

alter table public.members
  add column if not exists import_job_id uuid references public.import_jobs(id) on delete set null;

alter table public.leads
  add column if not exists import_job_id uuid references public.import_jobs(id) on delete set null;

create index if not exists idx_members_import_job on public.members(import_job_id)
  where import_job_id is not null;

create index if not exists idx_leads_import_job on public.leads(import_job_id)
  where import_job_id is not null;

alter table public.import_jobs
  add column if not exists rolled_back_at timestamptz;
