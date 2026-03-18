create table if not exists public.listening_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  track_name text not null,
  artist_id text,
  artist_name text not null,
  album_id text,
  album_name text,
  genre text,
  played_at timestamptz not null default timezone('utc', now()),
  played_day date not null default (timezone('utc', now()))::date,
  duration_played_seconds integer,
  source_platform text,
  source_type text not null default 'in_app',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint listening_events_track_id_nonempty check (char_length(trim(track_id)) > 0),
  constraint listening_events_track_name_nonempty check (char_length(trim(track_name)) > 0),
  constraint listening_events_artist_name_nonempty check (char_length(trim(artist_name)) > 0),
  constraint listening_events_duration_nonnegative check (
    duration_played_seconds is null or duration_played_seconds >= 0
  )
);

create index if not exists listening_events_user_played_at_idx
on public.listening_events (user_id, played_at desc);

create index if not exists listening_events_user_played_day_idx
on public.listening_events (user_id, played_day desc);

create index if not exists listening_events_user_track_idx
on public.listening_events (user_id, track_id);

create index if not exists listening_events_user_artist_idx
on public.listening_events (user_id, artist_name);

create index if not exists listening_events_user_album_idx
on public.listening_events (user_id, album_name);

create table if not exists public.listening_daily_rollups (
  user_id uuid not null references auth.users(id) on delete cascade,
  played_day date not null,
  total_listen_seconds bigint not null default 0,
  total_plays integer not null default 0,
  unique_tracks integer not null default 0,
  unique_artists integer not null default 0,
  unique_albums integer not null default 0,
  first_played_at timestamptz,
  last_played_at timestamptz,
  primary key (user_id, played_day)
);

create index if not exists listening_daily_rollups_user_day_idx
on public.listening_daily_rollups (user_id, played_day desc);

create or replace function public.apply_listening_event_day()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.played_day := (timezone('utc', new.played_at))::date;
  return new;
end;
$$;

create or replace function public.recalculate_listening_daily_rollup(target_user_id uuid, target_day date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null or target_day is null then
    return;
  end if;

  insert into public.listening_daily_rollups (
    user_id,
    played_day,
    total_listen_seconds,
    total_plays,
    unique_tracks,
    unique_artists,
    unique_albums,
    first_played_at,
    last_played_at
  )
  select
    target_user_id,
    target_day,
    coalesce(sum(duration_played_seconds), 0),
    count(*)::integer,
    count(distinct track_id)::integer,
    count(distinct artist_name)::integer,
    count(distinct coalesce(album_name, '')) filter (where coalesce(album_name, '') <> '')::integer,
    min(played_at),
    max(played_at)
  from public.listening_events
  where user_id = target_user_id
    and played_day = target_day
  having count(*) > 0
  on conflict (user_id, played_day)
  do update set
    total_listen_seconds = excluded.total_listen_seconds,
    total_plays = excluded.total_plays,
    unique_tracks = excluded.unique_tracks,
    unique_artists = excluded.unique_artists,
    unique_albums = excluded.unique_albums,
    first_played_at = excluded.first_played_at,
    last_played_at = excluded.last_played_at;

  delete from public.listening_daily_rollups
  where user_id = target_user_id
    and played_day = target_day
    and not exists (
      select 1
      from public.listening_events
      where user_id = target_user_id
        and played_day = target_day
    );
end;
$$;

create or replace function public.sync_listening_daily_rollup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_listening_daily_rollup(old.user_id, old.played_day);
    return old;
  end if;

  perform public.recalculate_listening_daily_rollup(new.user_id, new.played_day);

  if tg_op = 'UPDATE' and (old.user_id <> new.user_id or old.played_day <> new.played_day) then
    perform public.recalculate_listening_daily_rollup(old.user_id, old.played_day);
  end if;

  return new;
end;
$$;

drop trigger if exists listening_events_apply_day on public.listening_events;
create trigger listening_events_apply_day
before insert or update of played_at
on public.listening_events
for each row execute procedure public.apply_listening_event_day();

drop trigger if exists listening_events_sync_rollup on public.listening_events;
create trigger listening_events_sync_rollup
after insert or update or delete
on public.listening_events
for each row execute procedure public.sync_listening_daily_rollup();

create or replace function public.get_listening_stats(
  timeframe text default 'weekly',
  anchor_at timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_timeframe text := lower(coalesce(timeframe, 'weekly'));
  period_start timestamptz;
  period_end timestamptz;
  previous_start timestamptz;
  previous_end timestamptz;
  period_days integer;
  totals_record record;
  previous_seconds bigint := 0;
  previous_plays integer := 0;
  top_songs jsonb := '[]'::jsonb;
  top_artists jsonb := '[]'::jsonb;
  top_albums jsonb := '[]'::jsonb;
  active_days jsonb := '[]'::jsonb;
  daily_series jsonb := '[]'::jsonb;
  source_breakdown jsonb := '[]'::jsonb;
  current_streak integer := 0;
  longest_streak integer := 0;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to view listening stats.';
  end if;

  case normalized_timeframe
    when 'weekly' then
      period_start := date_trunc('week', timezone('utc', anchor_at)) at time zone 'utc';
      period_end := (date_trunc('week', timezone('utc', anchor_at)) + interval '1 week') at time zone 'utc';
      previous_start := period_start - interval '1 week';
    when 'monthly' then
      period_start := date_trunc('month', timezone('utc', anchor_at)) at time zone 'utc';
      period_end := (date_trunc('month', timezone('utc', anchor_at)) + interval '1 month') at time zone 'utc';
      previous_start := (date_trunc('month', timezone('utc', anchor_at)) - interval '1 month') at time zone 'utc';
    when 'yearly' then
      period_start := date_trunc('year', timezone('utc', anchor_at)) at time zone 'utc';
      period_end := (date_trunc('year', timezone('utc', anchor_at)) + interval '1 year') at time zone 'utc';
      previous_start := (date_trunc('year', timezone('utc', anchor_at)) - interval '1 year') at time zone 'utc';
    when 'all-time' then
      select coalesce(min(played_at), date_trunc('day', timezone('utc', anchor_at)) at time zone 'utc')
      into period_start
      from public.listening_events
      where user_id = current_user_id;

      period_end := anchor_at + interval '1 second';
      previous_start := null;
    else
      raise exception 'Unsupported timeframe: %', timeframe;
  end case;

  previous_end := period_start;
  period_days := greatest(1, ((timezone('utc', period_end))::date - (timezone('utc', period_start))::date));

  select
    coalesce(sum(duration_played_seconds), 0)::bigint as total_listen_seconds,
    count(*)::integer as total_plays,
    count(distinct track_id)::integer as total_songs,
    count(distinct artist_name)::integer as total_artists,
    count(distinct coalesce(album_name, '')) filter (where coalesce(album_name, '') <> '')::integer as total_albums,
    count(distinct played_day)::integer as active_day_count
  into totals_record
  from public.listening_events
  where user_id = current_user_id
    and played_at >= period_start
    and played_at < period_end;

  if normalized_timeframe <> 'all-time' then
    select
      coalesce(sum(duration_played_seconds), 0)::bigint,
      count(*)::integer
    into previous_seconds, previous_plays
    from public.listening_events
    where user_id = current_user_id
      and played_at >= previous_start
      and played_at < previous_end;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'trackId', track_id,
        'trackName', track_name,
        'artistName', artist_name,
        'albumName', album_name,
        'genre', genre,
        'playCount', play_count,
        'listenSeconds', listen_seconds
      )
      order by play_count desc, listen_seconds desc, track_name asc
    ),
    '[]'::jsonb
  )
  into top_songs
  from (
    select
      track_id,
      max(track_name) as track_name,
      max(artist_name) as artist_name,
      max(album_name) as album_name,
      max(genre) as genre,
      count(*)::integer as play_count,
      coalesce(sum(duration_played_seconds), 0)::bigint as listen_seconds
    from public.listening_events
    where user_id = current_user_id
      and played_at >= period_start
      and played_at < period_end
    group by track_id
    order by play_count desc, listen_seconds desc, max(track_name) asc
    limit 5
  ) ranked_tracks;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'artistId', artist_id,
        'artistName', artist_name,
        'playCount', play_count,
        'listenSeconds', listen_seconds
      )
      order by play_count desc, listen_seconds desc, artist_name asc
    ),
    '[]'::jsonb
  )
  into top_artists
  from (
    select
      max(artist_id) as artist_id,
      artist_name,
      count(*)::integer as play_count,
      coalesce(sum(duration_played_seconds), 0)::bigint as listen_seconds
    from public.listening_events
    where user_id = current_user_id
      and played_at >= period_start
      and played_at < period_end
    group by artist_name
    order by play_count desc, listen_seconds desc, artist_name asc
    limit 5
  ) ranked_artists;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'albumId', album_id,
        'albumName', album_name,
        'artistName', artist_name,
        'playCount', play_count,
        'listenSeconds', listen_seconds
      )
      order by play_count desc, listen_seconds desc, album_name asc
    ),
    '[]'::jsonb
  )
  into top_albums
  from (
    select
      max(album_id) as album_id,
      album_name,
      max(artist_name) as artist_name,
      count(*)::integer as play_count,
      coalesce(sum(duration_played_seconds), 0)::bigint as listen_seconds
    from public.listening_events
    where user_id = current_user_id
      and played_at >= period_start
      and played_at < period_end
      and coalesce(album_name, '') <> ''
    group by album_name
    order by play_count desc, listen_seconds desc, album_name asc
    limit 5
  ) ranked_albums;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', played_day,
        'playCount', total_plays,
        'listenSeconds', total_listen_seconds,
        'uniqueTracks', unique_tracks
      )
      order by total_listen_seconds desc, total_plays desc, played_day desc
    ),
    '[]'::jsonb
  )
  into active_days
  from (
    select
      played_day,
      total_plays,
      total_listen_seconds,
      unique_tracks
    from public.listening_daily_rollups
    where user_id = current_user_id
      and played_day >= (timezone('utc', period_start))::date
      and played_day < (timezone('utc', period_end))::date
    order by total_listen_seconds desc, total_plays desc, played_day desc
    limit 5
  ) ranked_days;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sourcePlatform', source_platform,
        'sourceType', source_type,
        'playCount', play_count,
        'listenSeconds', listen_seconds,
        'uniqueSongs', unique_songs
      )
      order by play_count desc, listen_seconds desc, source_platform asc, source_type asc
    ),
    '[]'::jsonb
  )
  into source_breakdown
  from (
    select
      coalesce(source_platform, 'soundatlas') as source_platform,
      coalesce(source_type, 'in_app') as source_type,
      count(*)::integer as play_count,
      coalesce(sum(duration_played_seconds), 0)::bigint as listen_seconds,
      count(distinct track_id)::integer as unique_songs
    from public.listening_events
    where user_id = current_user_id
      and played_at >= period_start
      and played_at < period_end
    group by coalesce(source_platform, 'soundatlas'), coalesce(source_type, 'in_app')
    order by play_count desc, listen_seconds desc, coalesce(source_platform, 'soundatlas') asc
  ) source_groups;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', day_series.day,
        'listenSeconds', coalesce(day_rollup.total_listen_seconds, 0),
        'playCount', coalesce(day_rollup.total_plays, 0)
      )
      order by day_series.day asc
    ),
    '[]'::jsonb
  )
  into daily_series
  from (
    select generate_series(
      (timezone('utc', period_start))::date,
      greatest((timezone('utc', period_end))::date - 1, (timezone('utc', period_start))::date),
      interval '1 day'
    )::date as day
  ) day_series
  left join public.listening_daily_rollups day_rollup
    on day_rollup.user_id = current_user_id
   and day_rollup.played_day = day_series.day;

  select count(*)::integer
  into current_streak
  from (
    select played_day
    from public.listening_daily_rollups
    where user_id = current_user_id
      and played_day <= (timezone('utc', anchor_at))::date
    order by played_day desc
  ) streak_days
  where played_day >= (
    select coalesce(min(candidate_day), (timezone('utc', anchor_at))::date + 1)
    from (
      select
        ((timezone('utc', anchor_at))::date - row_number() over (order by played_day desc) + 1)::date as candidate_day
      from public.listening_daily_rollups
      where user_id = current_user_id
        and played_day <= (timezone('utc', anchor_at))::date
      order by played_day desc
    ) expected_days
    where candidate_day not in (
      select played_day
      from public.listening_daily_rollups
      where user_id = current_user_id
        and played_day <= (timezone('utc', anchor_at))::date
    )
  );

  select coalesce(max(streak_length), 0)::integer
  into longest_streak
  from (
    select count(*) as streak_length
    from (
      select
        played_day,
        played_day - row_number() over (order by played_day) * interval '1 day' as streak_group
      from public.listening_daily_rollups
      where user_id = current_user_id
    ) grouped_streaks
    group by streak_group
  ) streak_lengths;

  return jsonb_build_object(
    'timeframe', normalized_timeframe,
    'periodStart', period_start,
    'periodEnd', period_end,
    'totals', jsonb_build_object(
      'listeningTimeSeconds', coalesce(totals_record.total_listen_seconds, 0),
      'songsPlayed', coalesce(totals_record.total_plays, 0),
      'uniqueSongs', coalesce(totals_record.total_songs, 0),
      'artistsPlayed', coalesce(totals_record.total_artists, 0),
      'albumsPlayed', coalesce(totals_record.total_albums, 0),
      'activeDays', coalesce(totals_record.active_day_count, 0),
      'averageListeningTimePerDaySeconds',
      floor(coalesce(totals_record.total_listen_seconds, 0)::numeric / period_days)::bigint
    ),
    'trends', jsonb_build_object(
      'listeningTimeSecondsChange',
      case
        when normalized_timeframe = 'all-time' then null
        when previous_seconds = 0 and coalesce(totals_record.total_listen_seconds, 0) = 0 then 0
        when previous_seconds = 0 then null
        else round((((coalesce(totals_record.total_listen_seconds, 0) - previous_seconds)::numeric / previous_seconds::numeric) * 100), 1)
      end,
      'songsPlayedChange',
      case
        when normalized_timeframe = 'all-time' then null
        when previous_plays = 0 and coalesce(totals_record.total_plays, 0) = 0 then 0
        when previous_plays = 0 then null
        else round((((coalesce(totals_record.total_plays, 0) - previous_plays)::numeric / previous_plays::numeric) * 100), 1)
      end
    ),
    'streaks', jsonb_build_object(
      'current', current_streak,
      'longest', longest_streak
    ),
    'topSongs', top_songs,
    'topArtists', top_artists,
    'topAlbums', top_albums,
    'sourceBreakdown', source_breakdown,
    'mostActiveDays', active_days,
    'dailySeries', daily_series
  );
end;
$$;

alter table public.listening_events enable row level security;
alter table public.listening_daily_rollups enable row level security;

drop policy if exists "Users can view their own listening events" on public.listening_events;
create policy "Users can view their own listening events"
on public.listening_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own listening events" on public.listening_events;
create policy "Users can insert their own listening events"
on public.listening_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own listening events" on public.listening_events;
create policy "Users can update their own listening events"
on public.listening_events
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own listening events" on public.listening_events;
create policy "Users can delete their own listening events"
on public.listening_events
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their own listening daily rollups" on public.listening_daily_rollups;
create policy "Users can view their own listening daily rollups"
on public.listening_daily_rollups
for select
to authenticated
using (auth.uid() = user_id);

grant execute on function public.get_listening_stats(text, timestamptz) to authenticated;
