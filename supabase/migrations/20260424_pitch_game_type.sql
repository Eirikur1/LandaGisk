-- Add 'pitch' to game_type constraint and pitch_xp to leaderboard view.
-- Run this in the Supabase SQL editor.

-- 1. Drop old check constraint and add new one including 'pitch'
alter table public.game_scores
  drop constraint if exists game_scores_game_type_check;

alter table public.game_scores
  add constraint game_scores_game_type_check
  check (game_type in ('world', 'waterfall', 'flags', 'mushroom', 'color', 'pitch'));

-- 2. Recreate leaderboard view with pitch_xp column
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.username,
  p.avatar_url,
  coalesce(sum(case when gs.game_type = 'world'     then gs.xp else 0 end), 0) as world_xp,
  coalesce(sum(case when gs.game_type = 'waterfall' then gs.xp else 0 end), 0) as waterfall_xp,
  coalesce(sum(case when gs.game_type = 'flags'     then gs.xp else 0 end), 0) as flags_xp,
  coalesce(sum(case when gs.game_type = 'mushroom'  then gs.xp else 0 end), 0) as mushroom_xp,
  coalesce(sum(case when gs.game_type = 'color'     then gs.xp else 0 end), 0) as color_xp,
  coalesce(sum(case when gs.game_type = 'pitch'     then gs.xp else 0 end), 0) as pitch_xp,
  coalesce(sum(gs.xp), 0) as total_xp
from public.profiles p
left join public.game_scores gs on p.id = gs.user_id
group by p.id, p.username, p.avatar_url;
