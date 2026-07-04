-- Recurring class series metadata (RRULE + grouped rows)
alter table public.classes add column if not exists series_id uuid;
alter table public.classes add column if not exists recurrence_rule text;

create index if not exists idx_classes_series_id on public.classes(series_id) where series_id is not null;
