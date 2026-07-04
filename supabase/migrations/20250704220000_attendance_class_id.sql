-- Optional class link on gym-wide attendance (kiosk / staff check-in)
alter table public.attendance add column if not exists class_id uuid references public.classes(id) on delete set null;

create index if not exists idx_attendance_class_id on public.attendance(class_id) where class_id is not null;
