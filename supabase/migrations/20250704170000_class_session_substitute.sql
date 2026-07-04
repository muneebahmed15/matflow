-- Substitute instructor for a specific class session
alter table public.class_sessions add column if not exists substitute_instructor text;
alter table public.class_sessions add column if not exists substitute_staff_id uuid references public.staff_roles(id);
