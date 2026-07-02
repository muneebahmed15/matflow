-- Production readiness: configurable waiver gate at check-in

alter table public.gyms
  add column if not exists require_waiver_for_checkin boolean not null default true;
