-- ============================================================
-- Run this SQL in your Supabase project's SQL editor.
-- ============================================================

-- 1. Profiles (one row per user, username derived from email on sign-up)
create table public.profiles (
  id       uuid primary key references auth.users on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Profiles viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile"  on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Game scores (one row per user per game per day — unique constraint prevents cheating)
create table public.game_scores (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_type  text not null check (game_type in ('world', 'waterfall', 'flags')),
  game_date  date not null,
  guesses    int  not null,
  xp         int  not null,
  won        boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id, game_type, game_date)
);

alter table public.game_scores enable row level security;
create policy "Scores viewable by everyone" on public.game_scores for select using (true);
create policy "Users insert own scores"     on public.game_scores for insert with check (auth.uid() = user_id);

-- 3. Leaderboard view — aggregates XP per user per game type
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.username,
  coalesce(sum(case when gs.game_type = 'world'     then gs.xp else 0 end), 0) as world_xp,
  coalesce(sum(case when gs.game_type = 'waterfall' then gs.xp else 0 end), 0) as waterfall_xp,
  coalesce(sum(case when gs.game_type = 'flags'     then gs.xp else 0 end), 0) as flags_xp,
  coalesce(sum(gs.xp), 0) as total_xp
from public.profiles p
left join public.game_scores gs on p.id = gs.user_id
group by p.id, p.username;
