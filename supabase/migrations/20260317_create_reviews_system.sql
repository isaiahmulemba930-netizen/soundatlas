create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('song', 'album', 'artist')),
  entity_id text not null check (char_length(trim(entity_id)) > 0),
  entity_name text not null check (char_length(trim(entity_name)) > 0),
  entity_subtitle text,
  entity_href text not null check (char_length(trim(entity_href)) > 0),
  artwork_url text,
  review_title text,
  review_text text not null check (char_length(trim(review_text)) > 0),
  rating numeric(3,1),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  moderation_status text not null default 'active' check (moderation_status in ('active', 'hidden', 'removed')),
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists reviews_public_trending_idx
on public.reviews (visibility, moderation_status, view_count desc, last_viewed_at desc, created_at desc);

create index if not exists reviews_user_id_idx
on public.reviews (user_id, created_at desc);

create index if not exists reviews_entity_idx
on public.reviews (entity_type, entity_id);

create table if not exists public.review_views (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  viewer_user_id uuid references auth.users(id) on delete set null,
  viewer_token text,
  viewed_day date not null default timezone('utc', now())::date,
  created_at timestamptz not null default timezone('utc', now()),
  constraint review_views_viewer_identity check (
    viewer_user_id is not null or (viewer_token is not null and char_length(trim(viewer_token)) >= 8)
  )
);

create unique index if not exists review_views_unique_user_day_idx
on public.review_views (review_id, viewer_user_id, viewed_day)
where viewer_user_id is not null;

create unique index if not exists review_views_unique_token_day_idx
on public.review_views (review_id, viewer_token, viewed_day)
where viewer_token is not null;

create index if not exists review_views_review_id_idx
on public.review_views (review_id, created_at desc);

create or replace function public.touch_review_updated_at()
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

drop trigger if exists reviews_touch_updated_at on public.reviews;

create trigger reviews_touch_updated_at
before update on public.reviews
for each row execute procedure public.touch_review_updated_at();

create or replace function public.get_trending_reviews(limit_count integer default 5)
returns table (
  id uuid,
  entity_type text,
  entity_id text,
  entity_name text,
  entity_subtitle text,
  entity_href text,
  artwork_url text,
  review_title text,
  review_text text,
  rating numeric,
  view_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  reviewer_user_id uuid,
  reviewer_display_name text,
  reviewer_username text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.entity_type,
    r.entity_id,
    r.entity_name,
    r.entity_subtitle,
    r.entity_href,
    r.artwork_url,
    r.review_title,
    r.review_text,
    r.rating,
    r.view_count,
    r.created_at,
    r.updated_at,
    p.user_id as reviewer_user_id,
    p.display_name as reviewer_display_name,
    p.username as reviewer_username
  from public.reviews r
  join public.profiles p on p.user_id = r.user_id
  where r.visibility = 'public'
    and r.moderation_status = 'active'
    and char_length(trim(r.entity_id)) > 0
    and char_length(trim(r.entity_name)) > 0
    and char_length(trim(r.entity_href)) > 0
    and char_length(trim(r.review_text)) > 0
  order by
    case when r.view_count > 0 then 0 else 1 end asc,
    r.view_count desc,
    coalesce(r.last_viewed_at, r.created_at) desc,
    r.created_at desc
  limit greatest(1, least(coalesce(limit_count, 5), 12));
$$;

create or replace function public.get_public_review_detail(target_review_id uuid)
returns table (
  id uuid,
  entity_type text,
  entity_id text,
  entity_name text,
  entity_subtitle text,
  entity_href text,
  artwork_url text,
  review_title text,
  review_text text,
  rating numeric,
  view_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  reviewer_user_id uuid,
  reviewer_display_name text,
  reviewer_username text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.entity_type,
    r.entity_id,
    r.entity_name,
    r.entity_subtitle,
    r.entity_href,
    r.artwork_url,
    r.review_title,
    r.review_text,
    r.rating,
    r.view_count,
    r.created_at,
    r.updated_at,
    p.user_id as reviewer_user_id,
    p.display_name as reviewer_display_name,
    p.username as reviewer_username
  from public.reviews r
  join public.profiles p on p.user_id = r.user_id
  where r.id = target_review_id
    and r.visibility = 'public'
    and r.moderation_status = 'active'
    and char_length(trim(r.entity_id)) > 0
    and char_length(trim(r.entity_name)) > 0
    and char_length(trim(r.entity_href)) > 0
    and char_length(trim(r.review_text)) > 0;
$$;

create or replace function public.record_review_view(target_review_id uuid, viewer_token text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  effective_user_id uuid := auth.uid();
  next_view_count integer := 0;
  inserted_rows integer := 0;
begin
  if not exists (
    select 1
    from public.reviews r
    join public.profiles p on p.user_id = r.user_id
    where r.id = target_review_id
      and r.visibility = 'public'
      and r.moderation_status = 'active'
      and char_length(trim(r.entity_id)) > 0
      and char_length(trim(r.entity_name)) > 0
      and char_length(trim(r.entity_href)) > 0
      and char_length(trim(r.review_text)) > 0
  ) then
    return 0;
  end if;

  if effective_user_id is not null then
    insert into public.review_views (review_id, viewer_user_id)
    values (target_review_id, effective_user_id)
    on conflict do nothing;
  elsif viewer_token is not null and char_length(trim(viewer_token)) >= 8 then
    insert into public.review_views (review_id, viewer_token)
    values (target_review_id, trim(viewer_token))
    on conflict do nothing;
  end if;

  get diagnostics inserted_rows = row_count;

  if inserted_rows > 0 then
    update public.reviews
    set
      view_count = view_count + 1,
      last_viewed_at = timezone('utc', now())
    where id = target_review_id
    returning view_count into next_view_count;

    return coalesce(next_view_count, 0);
  end if;

  select r.view_count
  into next_view_count
  from public.reviews r
  where r.id = target_review_id;

  return coalesce(next_view_count, 0);
end;
$$;

alter table public.reviews enable row level security;
alter table public.review_views enable row level security;

drop policy if exists "Public active reviews are viewable by everyone" on public.reviews;
create policy "Public active reviews are viewable by everyone"
on public.reviews
for select
to anon, authenticated
using (
  (visibility = 'public' and moderation_status = 'active')
  or auth.uid() = user_id
);

drop policy if exists "Authenticated users can insert their own reviews" on public.reviews;
create policy "Authenticated users can insert their own reviews"
on public.reviews
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can update their own reviews" on public.reviews;
create policy "Authenticated users can update their own reviews"
on public.reviews
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can delete their own reviews" on public.reviews;
create policy "Authenticated users can delete their own reviews"
on public.reviews
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Anyone can record review views" on public.review_views;
create policy "Anyone can record review views"
on public.review_views
for insert
to anon, authenticated
with check (
  (viewer_user_id is null or viewer_user_id = auth.uid())
  and exists (
    select 1
    from public.reviews r
    join public.profiles p on p.user_id = r.user_id
    where r.id = review_id
      and r.visibility = 'public'
      and r.moderation_status = 'active'
  )
);

grant execute on function public.get_trending_reviews(integer) to anon, authenticated;
grant execute on function public.get_public_review_detail(uuid) to anon, authenticated;
grant execute on function public.record_review_view(uuid, text) to anon, authenticated;
