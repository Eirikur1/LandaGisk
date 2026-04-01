-- ============================================================
-- Run this SQL in your Supabase project's SQL editor.
-- Already set up? Apply migrations in supabase/migrations/ instead.
-- ============================================================

-- 1. Profiles (username from sign-up metadata; display name on leaderboard)
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text not null,
  avatar_url  text,
  created_at  timestamptz default now(),
  constraint username_length check (char_length(trim(username)) between 3 and 24)
);

-- Case-insensitive uniqueness
create unique index profiles_username_lower_idx on public.profiles (lower(trim(username)));

alter table public.profiles enable row level security;
create policy "Profiles viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile"  on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := trim(coalesce(new.raw_user_meta_data->>'username', ''));
  if uname = '' then
    uname := trim(split_part(new.email, '@', 1));
  end if;
  if length(uname) < 3 or length(uname) > 24 then
    raise exception 'Invalid username';
  end if;
  insert into public.profiles (id, username) values (new.id, uname);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Login with username: map to auth email (client then calls signInWithPassword)
create or replace function public.get_email_for_username(uname text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select au.email::text
  from auth.users au
  inner join public.profiles p on p.id = au.id
  where lower(trim(p.username)) = lower(trim(uname))
  limit 1;
$$;

grant execute on function public.get_email_for_username(text) to anon, authenticated;

-- 2. Game scores (one row per user per game per day — unique constraint prevents cheating)
create table public.game_scores (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_type  text not null check (game_type in ('world', 'waterfall', 'flags', 'mushroom')),
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
  p.avatar_url,
  coalesce(sum(case when gs.game_type = 'world'     then gs.xp else 0 end), 0) as world_xp,
  coalesce(sum(case when gs.game_type = 'waterfall' then gs.xp else 0 end), 0) as waterfall_xp,
  coalesce(sum(case when gs.game_type = 'flags'     then gs.xp else 0 end), 0) as flags_xp,
  coalesce(sum(case when gs.game_type = 'mushroom'  then gs.xp else 0 end), 0) as mushroom_xp,
  coalesce(sum(gs.xp), 0) as total_xp
from public.profiles p
left join public.game_scores gs on p.id = gs.user_id
group by p.id, p.username, p.avatar_url;
