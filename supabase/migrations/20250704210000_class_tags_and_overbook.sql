-- Class category tags, accent colors, and optional overbooking allowance
alter table public.classes add column if not exists category_tag text;
alter table public.classes add column if not exists color text;
alter table public.classes add column if not exists overbook_allowance integer not null default 0;

alter table public.classes drop constraint if exists classes_color_hex_check;
alter table public.classes add constraint classes_color_hex_check
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.classes drop constraint if exists classes_overbook_allowance_check;
alter table public.classes add constraint classes_overbook_allowance_check
  check (overbook_allowance >= 0 and overbook_allowance <= 50);
