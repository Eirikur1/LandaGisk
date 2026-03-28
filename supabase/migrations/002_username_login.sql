-- Run in Supabase SQL editor if you already applied the original schema.sql.
-- New projects: use the updated schema.sql only (includes these changes).

-- Allow case-insensitive unique usernames
alter table public.profiles drop constraint if exists profiles_username_key;
drop index if exists profiles_username_lower_idx;
create unique index profiles_username_lower_idx on public.profiles (lower(trim(username)));

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

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

-- Resolve login email from public username (needed because Supabase auth is email-based)
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
