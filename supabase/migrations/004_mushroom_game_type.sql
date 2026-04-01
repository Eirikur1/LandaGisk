-- Allow mushroom scores and aggregate them on the leaderboard view.
alter table public.game_scores drop constraint if exists game_scores_game_type_check;

alter table public.game_scores
  add constraint game_scores_game_type_check
  check (game_type in ('world', 'waterfall', 'flags', 'mushroom'));

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
