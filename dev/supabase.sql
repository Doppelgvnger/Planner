-- Planner: the cloud tables (Supabase). Paste into Supabase > SQL Editor and press Run. Safe to run again.
-- Every row belongs to one account (user_id); Row Level Security lets each account see and change only its own rows.
-- A planner is kept as rows: one per campaign, one per task (General's tasks have campaign_id 'general'), and one per
-- other piece of data (settings, notes, pet, trash, ...) in docs, holding the same text the browser keeps locally.

create table if not exists public.campaigns (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  pos integer not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.tasks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  campaign_id text not null,
  pos integer not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- updated_at follows every change
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists touch on public.campaigns;
drop trigger if exists touch on public.tasks;
drop trigger if exists touch on public.docs;
create trigger touch before update on public.campaigns for each row execute function public.touch_updated_at();
create trigger touch before update on public.tasks for each row execute function public.touch_updated_at();
create trigger touch before update on public.docs for each row execute function public.touch_updated_at();

-- each account sees and changes only its own rows
alter table public.campaigns enable row level security;
alter table public.tasks enable row level security;
alter table public.docs enable row level security;
drop policy if exists "own rows" on public.campaigns;
drop policy if exists "own rows" on public.tasks;
drop policy if exists "own rows" on public.docs;
create policy "own rows" on public.campaigns for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.tasks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.docs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- only signed-in accounts reach these tables (never anonymous visitors)
revoke all on public.campaigns, public.tasks, public.docs from anon;
grant select, insert, update, delete on public.campaigns, public.tasks, public.docs to authenticated;

-- live updates: a change made on one computer reaches the others
do $$ begin
  begin alter publication supabase_realtime add table public.campaigns; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.tasks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.docs; exception when duplicate_object then null; end;
end $$;
