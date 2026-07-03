-- Marketing polish: email opt-out (unsubscribe) support

alter table public.members add column if not exists email_opt_out boolean not null default false;
alter table public.leads add column if not exists email_opt_out boolean not null default false;
