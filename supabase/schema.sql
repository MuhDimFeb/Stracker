-- Clerk <-> Supabase native integration: enable Clerk as a third-party auth provider in Supabase.
create table if not exists user_state (
  user_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table user_state enable row level security;
create policy "own row select" on user_state for select using ((auth.jwt()->>'sub') = user_id);
create policy "own row insert" on user_state for insert with check ((auth.jwt()->>'sub') = user_id);
create policy "own row update" on user_state for update using ((auth.jwt()->>'sub') = user_id);
