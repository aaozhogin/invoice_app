create table if not exists public.saved_calendars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_from date,
  date_to date,
  client_id integer,
  config jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists saved_calendars_name_idx on public.saved_calendars (name);
