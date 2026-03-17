create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists follows_following_id_idx on public.follows (following_id);
create index if not exists follows_follower_id_idx on public.follows (follower_id);

alter table public.follows enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can view follow relationships" on public.follows;
create policy "Anyone can view follow relationships"
on public.follows
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can follow others" on public.follows;
create policy "Authenticated users can follow others"
on public.follows
for insert
to authenticated
with check (auth.uid() = follower_id and follower_id <> following_id);

drop policy if exists "Authenticated users can unfollow others" on public.follows;
create policy "Authenticated users can unfollow others"
on public.follows
for delete
to authenticated
using (auth.uid() = follower_id);
