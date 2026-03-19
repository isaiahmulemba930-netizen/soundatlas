alter table public.profiles
add column if not exists pinned_badge_keys text[] not null default '{}';

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  badge_name text not null,
  badge_icon text not null,
  badge_category text not null,
  badge_description text not null,
  badge_rarity text not null check (badge_rarity in ('Common', 'Rare', 'Epic', 'Legendary')),
  unlock_requirement text not null,
  unlocked_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, badge_key)
);

create index if not exists user_badges_user_idx
on public.user_badges (user_id, unlocked_at desc);

create index if not exists user_badges_category_idx
on public.user_badges (badge_category, badge_rarity, unlocked_at desc);

create table if not exists public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (review_id, user_id)
);

create index if not exists review_likes_user_idx
on public.review_likes (user_id, created_at desc);

create index if not exists review_likes_review_idx
on public.review_likes (review_id, created_at desc);

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.review_comments(id) on delete cascade,
  comment_text text not null check (char_length(trim(comment_text)) >= 12),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists review_comments_review_idx
on public.review_comments (review_id, created_at desc);

create index if not exists review_comments_user_idx
on public.review_comments (user_id, created_at desc);

create or replace function public.touch_review_comment_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists review_comments_touch_updated_at on public.review_comments;
create trigger review_comments_touch_updated_at
before update on public.review_comments
for each row execute procedure public.touch_review_comment_updated_at();

alter table public.user_badges enable row level security;
alter table public.review_likes enable row level security;
alter table public.review_comments enable row level security;

drop policy if exists "Public user badges are viewable by everyone" on public.user_badges;
create policy "Public user badges are viewable by everyone"
on public.user_badges
for select
to anon, authenticated
using (true);

drop policy if exists "Users can manage their own badges" on public.user_badges;
create policy "Users can manage their own badges"
on public.user_badges
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Review likes are viewable by everyone" on public.review_likes;
create policy "Review likes are viewable by everyone"
on public.review_likes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.reviews r
    where r.id = review_likes.review_id
      and r.visibility = 'public'
      and r.moderation_status = 'active'
  )
);

drop policy if exists "Authenticated users can like public reviews" on public.review_likes;
create policy "Authenticated users can like public reviews"
on public.review_likes
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.reviews r
    where r.id = review_id
      and r.visibility = 'public'
      and r.moderation_status = 'active'
      and r.user_id <> auth.uid()
  )
);

drop policy if exists "Authenticated users can remove their own review likes" on public.review_likes;
create policy "Authenticated users can remove their own review likes"
on public.review_likes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Public review comments are viewable by everyone" on public.review_comments;
create policy "Public review comments are viewable by everyone"
on public.review_comments
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.reviews r
    where r.id = review_comments.review_id
      and r.visibility = 'public'
      and r.moderation_status = 'active'
  )
);

drop policy if exists "Authenticated users can comment on public reviews" on public.review_comments;
create policy "Authenticated users can comment on public reviews"
on public.review_comments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.reviews r
    where r.id = review_id
      and r.visibility = 'public'
      and r.moderation_status = 'active'
  )
);

drop policy if exists "Authenticated users can update their own review comments" on public.review_comments;
create policy "Authenticated users can update their own review comments"
on public.review_comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can delete their own review comments" on public.review_comments;
create policy "Authenticated users can delete their own review comments"
on public.review_comments
for delete
to authenticated
using (auth.uid() = user_id);
