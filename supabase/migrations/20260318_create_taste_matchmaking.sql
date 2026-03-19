create table if not exists public.user_taste_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  top_artists jsonb not null default '[]'::jsonb,
  top_albums jsonb not null default '[]'::jsonb,
  top_songs jsonb not null default '[]'::jsonb,
  top_genres jsonb not null default '[]'::jsonb,
  rated_entities jsonb not null default '[]'::jsonb,
  market_entities jsonb not null default '[]'::jsonb,
  taste_markers jsonb not null default '{}'::jsonb,
  activity_score numeric(6,2) not null default 0,
  compatibility_ready boolean not null default false,
  last_source_activity_at timestamptz,
  last_synced_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_taste_profiles_ready_idx
on public.user_taste_profiles (compatibility_ready, activity_score desc, last_synced_at desc);

create table if not exists public.taste_match_history (
  id uuid primary key default gen_random_uuid(),
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  matched_user_id uuid not null references auth.users(id) on delete cascade,
  compatibility_score integer not null check (compatibility_score between 0 and 100),
  match_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (viewer_user_id, matched_user_id)
);

create index if not exists taste_match_history_viewer_idx
on public.taste_match_history (viewer_user_id, created_at desc);

create table if not exists public.collaborative_playlists (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  playlist_type text not null check (playlist_type in ('shared-favorites', 'discover-from-each-other', 'best-blend', 'debate-playlist')),
  title text not null,
  description text,
  source_match_score integer check (source_match_score between 0 and 100),
  source_match_type text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint collaborative_playlists_distinct_users check (user_a_id <> user_b_id)
);

create index if not exists collaborative_playlists_users_idx
on public.collaborative_playlists (user_a_id, user_b_id, updated_at desc);

create table if not exists public.collaborative_playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.collaborative_playlists(id) on delete cascade,
  added_by_user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  track_name text not null,
  artist_name text not null,
  album_name text,
  artwork_url text,
  note text,
  source_reason text,
  position_index integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists collaborative_playlist_tracks_playlist_idx
on public.collaborative_playlist_tracks (playlist_id, position_index asc, created_at asc);

create table if not exists public.taste_debates (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  other_user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  subject_type text not null check (subject_type in ('song', 'album', 'artist', 'general')),
  subject_id text,
  subject_name text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint taste_debates_distinct_users check (created_by_user_id <> other_user_id)
);

create index if not exists taste_debates_pair_idx
on public.taste_debates (created_by_user_id, other_user_id, updated_at desc);

create table if not exists public.taste_debate_messages (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references public.taste_debates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 12),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists taste_debate_messages_debate_idx
on public.taste_debate_messages (debate_id, created_at asc);

create table if not exists public.taste_debate_votes (
  debate_id uuid not null references public.taste_debates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('agree', 'disagree')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (debate_id, user_id)
);

create index if not exists taste_debate_votes_reaction_idx
on public.taste_debate_votes (debate_id, reaction);

create table if not exists public.taste_debate_reports (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references public.taste_debates(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) >= 8),
  created_at timestamptz not null default timezone('utc', now()),
  unique (debate_id, reporter_user_id)
);

create index if not exists taste_debate_reports_debate_idx
on public.taste_debate_reports (debate_id, created_at desc);

create or replace function public.touch_taste_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_taste_profiles_touch_updated_at on public.user_taste_profiles;
create trigger user_taste_profiles_touch_updated_at
before update on public.user_taste_profiles
for each row execute function public.touch_taste_updated_at();

drop trigger if exists collaborative_playlists_touch_updated_at on public.collaborative_playlists;
create trigger collaborative_playlists_touch_updated_at
before update on public.collaborative_playlists
for each row execute function public.touch_taste_updated_at();

drop trigger if exists taste_debates_touch_updated_at on public.taste_debates;
create trigger taste_debates_touch_updated_at
before update on public.taste_debates
for each row execute function public.touch_taste_updated_at();

alter table public.user_taste_profiles enable row level security;
alter table public.taste_match_history enable row level security;
alter table public.collaborative_playlists enable row level security;
alter table public.collaborative_playlist_tracks enable row level security;
alter table public.taste_debates enable row level security;
alter table public.taste_debate_messages enable row level security;
alter table public.taste_debate_votes enable row level security;
alter table public.taste_debate_reports enable row level security;

drop policy if exists "Public taste profiles are viewable by everyone" on public.user_taste_profiles;
create policy "Public taste profiles are viewable by everyone"
on public.user_taste_profiles
for select
to anon, authenticated
using (compatibility_ready = true or auth.uid() = user_id);

drop policy if exists "Users can manage their own taste profile" on public.user_taste_profiles;
create policy "Users can manage their own taste profile"
on public.user_taste_profiles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view their own match history" on public.taste_match_history;
create policy "Users can view their own match history"
on public.taste_match_history
for select
to authenticated
using (auth.uid() = viewer_user_id);

drop policy if exists "Users can manage their own match history" on public.taste_match_history;
create policy "Users can manage their own match history"
on public.taste_match_history
for all
to authenticated
using (auth.uid() = viewer_user_id)
with check (auth.uid() = viewer_user_id);

drop policy if exists "Participants can view collaborative playlists" on public.collaborative_playlists;
create policy "Participants can view collaborative playlists"
on public.collaborative_playlists
for select
to authenticated
using (auth.uid() in (user_a_id, user_b_id, created_by_user_id));

drop policy if exists "Participants can manage collaborative playlists" on public.collaborative_playlists;
create policy "Participants can manage collaborative playlists"
on public.collaborative_playlists
for all
to authenticated
using (auth.uid() in (user_a_id, user_b_id, created_by_user_id))
with check (auth.uid() in (user_a_id, user_b_id, created_by_user_id));

drop policy if exists "Participants can view collaborative playlist tracks" on public.collaborative_playlist_tracks;
create policy "Participants can view collaborative playlist tracks"
on public.collaborative_playlist_tracks
for select
to authenticated
using (
  exists (
    select 1
    from public.collaborative_playlists playlist
    where playlist.id = collaborative_playlist_tracks.playlist_id
      and auth.uid() in (playlist.user_a_id, playlist.user_b_id, playlist.created_by_user_id)
  )
);

drop policy if exists "Participants can insert collaborative playlist tracks" on public.collaborative_playlist_tracks;
create policy "Participants can insert collaborative playlist tracks"
on public.collaborative_playlist_tracks
for insert
to authenticated
with check (
  auth.uid() = added_by_user_id
  and exists (
    select 1
    from public.collaborative_playlists playlist
    where playlist.id = collaborative_playlist_tracks.playlist_id
      and auth.uid() in (playlist.user_a_id, playlist.user_b_id, playlist.created_by_user_id)
  )
);

drop policy if exists "Participants can update collaborative playlist tracks" on public.collaborative_playlist_tracks;
create policy "Participants can update collaborative playlist tracks"
on public.collaborative_playlist_tracks
for update
to authenticated
using (
  exists (
    select 1
    from public.collaborative_playlists playlist
    where playlist.id = collaborative_playlist_tracks.playlist_id
      and auth.uid() in (playlist.user_a_id, playlist.user_b_id, playlist.created_by_user_id)
  )
)
with check (
  exists (
    select 1
    from public.collaborative_playlists playlist
    where playlist.id = collaborative_playlist_tracks.playlist_id
      and auth.uid() in (playlist.user_a_id, playlist.user_b_id, playlist.created_by_user_id)
  )
);

drop policy if exists "Participants can delete collaborative playlist tracks" on public.collaborative_playlist_tracks;
create policy "Participants can delete collaborative playlist tracks"
on public.collaborative_playlist_tracks
for delete
to authenticated
using (
  exists (
    select 1
    from public.collaborative_playlists playlist
    where playlist.id = collaborative_playlist_tracks.playlist_id
      and auth.uid() in (playlist.user_a_id, playlist.user_b_id, playlist.created_by_user_id)
  )
);

drop policy if exists "Participants can view taste debates" on public.taste_debates;
create policy "Participants can view taste debates"
on public.taste_debates
for select
to authenticated
using (auth.uid() in (created_by_user_id, other_user_id));

drop policy if exists "Participants can manage taste debates" on public.taste_debates;
create policy "Participants can manage taste debates"
on public.taste_debates
for all
to authenticated
using (auth.uid() in (created_by_user_id, other_user_id))
with check (auth.uid() in (created_by_user_id, other_user_id));

drop policy if exists "Participants can view taste debate messages" on public.taste_debate_messages;
create policy "Participants can view taste debate messages"
on public.taste_debate_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.taste_debates debate
    where debate.id = taste_debate_messages.debate_id
      and auth.uid() in (debate.created_by_user_id, debate.other_user_id)
  )
);

drop policy if exists "Participants can manage taste debate messages" on public.taste_debate_messages;
create policy "Participants can manage taste debate messages"
on public.taste_debate_messages
for all
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.taste_debates debate
    where debate.id = taste_debate_messages.debate_id
      and auth.uid() in (debate.created_by_user_id, debate.other_user_id)
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.taste_debates debate
    where debate.id = taste_debate_messages.debate_id
      and auth.uid() in (debate.created_by_user_id, debate.other_user_id)
  )
);

drop policy if exists "Participants can view taste debate votes" on public.taste_debate_votes;
create policy "Participants can view taste debate votes"
on public.taste_debate_votes
for select
to authenticated
using (
  exists (
    select 1
    from public.taste_debates debate
    where debate.id = taste_debate_votes.debate_id
      and auth.uid() in (debate.created_by_user_id, debate.other_user_id)
  )
);

drop policy if exists "Participants can manage their own taste debate votes" on public.taste_debate_votes;
create policy "Participants can manage their own taste debate votes"
on public.taste_debate_votes
for all
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.taste_debates debate
    where debate.id = taste_debate_votes.debate_id
      and auth.uid() in (debate.created_by_user_id, debate.other_user_id)
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.taste_debates debate
    where debate.id = taste_debate_votes.debate_id
      and auth.uid() in (debate.created_by_user_id, debate.other_user_id)
  )
);

drop policy if exists "Participants can report taste debates" on public.taste_debate_reports;
create policy "Participants can report taste debates"
on public.taste_debate_reports
for all
to authenticated
using (auth.uid() = reporter_user_id)
with check (
  auth.uid() = reporter_user_id
  and exists (
    select 1
    from public.taste_debates debate
    where debate.id = taste_debate_reports.debate_id
      and auth.uid() in (debate.created_by_user_id, debate.other_user_id)
  )
);
