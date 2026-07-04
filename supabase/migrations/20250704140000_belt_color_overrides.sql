-- Per-gym belt display color overrides (belt name -> hex color)
alter table public.gyms add column if not exists belt_color_overrides jsonb;
