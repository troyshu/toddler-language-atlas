create table if not exists public.app_state (
  namespace text not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (namespace, key)
);

alter table public.app_state enable row level security;

drop policy if exists "public read app state" on public.app_state;
drop policy if exists "public insert app state" on public.app_state;
drop policy if exists "public update app state" on public.app_state;

create policy "public read app state"
  on public.app_state
  for select
  using (true);

create policy "public insert app state"
  on public.app_state
  for insert
  with check (true);

create policy "public update app state"
  on public.app_state
  for update
  using (true)
  with check (true);
