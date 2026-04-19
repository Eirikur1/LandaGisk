-- Grant SELECT on the leaderboard view to anon and authenticated roles.
-- Without this, the view returns no rows for unauthenticated users because
-- Postgres views do not inherit grants from their underlying tables.

-- Also rebuild the view filtering won=true so only won games count toward XP.
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
left join public.game_scores gs on p.id = gs.user_id and gs.won = true
group by p.id, p.username, p.avatar_url;

grant select on public.leaderboard to anon, authenticated;
