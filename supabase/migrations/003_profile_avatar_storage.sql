-- Profile photo URL + public avatars bucket. Run in Supabase SQL Editor once.

alter table public.profiles add column if not exists avatar_url text;

-- Leaderboard view: include avatar for home cards / UI
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.username,
  p.avatar_url,
  coalesce(sum(case when gs.game_type = 'world'     then gs.xp else 0 end), 0) as world_xp,
  coalesce(sum(case when gs.game_type = 'waterfall' then gs.xp else 0 end), 0) as waterfall_xp,
  coalesce(sum(case when gs.game_type = 'flags'     then gs.xp else 0 end), 0) as flags_xp,
  coalesce(sum(gs.xp), 0) as total_xp
from public.profiles p
left join public.game_scores gs on p.id = gs.user_id
group by p.id, p.username, p.avatar_url;

-- Storage: public bucket, objects keyed as {user_id}/{filename}
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "Users upload own avatar folder" on storage.objects;
drop policy if exists "Users update own avatar" on storage.objects;
drop policy if exists "Users delete own avatar" on storage.objects;

create policy "Public read avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "Users upload own avatar folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

create policy "Users update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

create policy "Users delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );
