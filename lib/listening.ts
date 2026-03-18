"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const LISTENING_ACTIVITY_EVENT = "soundatlas-listening-activity";

export type ListeningEventInput = {
  trackId: string;
  trackName: string;
  artistId?: string | null;
  artistName: string;
  albumId?: string | null;
  albumName?: string | null;
  genre?: string | null;
  playedAt?: string;
  durationPlayedSeconds?: number | null;
  sourcePlatform?: string | null;
  sourceType?: string | null;
  metadata?: Record<string, unknown>;
};

export type ListeningEventRecord = {
  id: string;
  user_id: string;
  track_id: string;
  track_name: string;
  artist_id: string | null;
  artist_name: string;
  album_id: string | null;
  album_name: string | null;
  genre: string | null;
  played_at: string;
  played_day: string;
  duration_played_seconds: number | null;
  source_platform: string | null;
  source_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ListeningStatsEntity = {
  trackId?: string | null;
  artistId?: string | null;
  albumId?: string | null;
  trackName?: string | null;
  artistName: string;
  albumName?: string | null;
  genre?: string | null;
  playCount: number;
  listenSeconds: number;
};

export type ListeningDaySeriesPoint = {
  date: string;
  listenSeconds: number;
  playCount: number;
};

export type ListeningStatsResponse = {
  timeframe: ListeningTimeframe;
  periodStart: string;
  periodEnd: string;
  totals: {
    listeningTimeSeconds: number;
    songsPlayed: number;
    uniqueSongs: number;
    artistsPlayed: number;
    albumsPlayed: number;
    activeDays: number;
    averageListeningTimePerDaySeconds: number;
  };
  trends: {
    listeningTimeSecondsChange: number | null;
    songsPlayedChange: number | null;
  };
  streaks: {
    current: number;
    longest: number;
  };
  topSongs: ListeningStatsEntity[];
  topArtists: ListeningStatsEntity[];
  topAlbums: ListeningStatsEntity[];
  sourceBreakdown: Array<{
    sourcePlatform: string;
    sourceType: string;
    playCount: number;
    listenSeconds: number;
    uniqueSongs: number;
  }>;
  mostActiveDays: Array<{
    date: string;
    playCount: number;
    listenSeconds: number;
    uniqueTracks: number;
  }>;
  dailySeries: ListeningDaySeriesPoint[];
};

export type ListeningTimeframe = "weekly" | "monthly" | "yearly" | "all-time";

export type ListeningHistoryFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  artist?: string;
  album?: string;
  song?: string;
  genre?: string;
  sourcePlatform?: string;
  startAt?: string | null;
  endAt?: string | null;
};

export type MusicPlatformConnection = {
  id: string;
  user_id: string;
  platform: string;
  connection_type: string;
  status: string;
  external_account_id: string | null;
  external_account_label: string | null;
  metadata: Record<string, unknown>;
  connected_at: string;
  updated_at: string;
};

export type ListeningImportBatch = {
  id: string;
  user_id: string;
  connection_id: string | null;
  platform: string;
  source_label: string | null;
  imported_events: number;
  imported_at: string;
  metadata: Record<string, unknown>;
};

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this deployment yet.");
  }

  return supabase;
}

function emitListeningActivity() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(LISTENING_ACTIVITY_EVENT));
}

export function subscribeToListeningActivity(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(LISTENING_ACTIVITY_EVENT, callback);
  return () => {
    window.removeEventListener(LISTENING_ACTIVITY_EVENT, callback);
  };
}

export async function getAuthenticatedListeningUser() {
  const client = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return session?.user ?? null;
}

function normalizeListeningEvent(event: ListeningEventInput, userId: string) {
  return {
    user_id: userId,
    track_id: event.trackId.trim(),
    track_name: event.trackName.trim(),
    artist_id: event.artistId?.trim() || null,
    artist_name: event.artistName.trim(),
    album_id: event.albumId?.trim() || null,
    album_name: event.albumName?.trim() || null,
    genre: event.genre?.trim() || null,
    played_at: event.playedAt ?? new Date().toISOString(),
    duration_played_seconds: event.durationPlayedSeconds ?? null,
    source_platform: event.sourcePlatform?.trim() || null,
    source_type: event.sourceType?.trim() || "in_app",
    metadata: event.metadata ?? {},
  };
}

export async function trackListeningEvent(event: ListeningEventInput) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedListeningUser();

  if (!user) {
    throw new Error("Log in to track listening activity.");
  }

  const payload = normalizeListeningEvent(event, user.id);

  const { data, error } = await client
    .from("listening_events")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  emitListeningActivity();
  return data as ListeningEventRecord;
}

export async function importListeningHistory(events: ListeningEventInput[]) {
  if (events.length === 0) {
    return [] as ListeningEventRecord[];
  }

  const client = getSupabaseClient();
  const user = await getAuthenticatedListeningUser();

  if (!user) {
    throw new Error("Log in to import listening history.");
  }

  const payload = events.map((event) => normalizeListeningEvent(event, user.id));
  const { data, error } = await client
    .from("listening_events")
    .insert(payload)
    .select("*");

  if (error) {
    throw error;
  }

  emitListeningActivity();
  return (data ?? []) as ListeningEventRecord[];
}

export async function upsertMusicPlatformConnection(input: {
  platform: string;
  connectionType?: string;
  status?: string;
  externalAccountId?: string | null;
  externalAccountLabel?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedListeningUser();

  if (!user) {
    throw new Error("Log in to manage music platform connections.");
  }

  const payload = {
    user_id: user.id,
    platform: input.platform,
    connection_type: input.connectionType ?? "import",
    status: input.status ?? "connected",
    external_account_id: input.externalAccountId ?? "",
    external_account_label: input.externalAccountLabel ?? null,
    metadata: input.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("music_platform_connections")
    .upsert(payload, {
      onConflict: "user_id,platform,connection_type,external_account_id",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  emitListeningActivity();
  return data as MusicPlatformConnection;
}

export async function createListeningImportBatch(input: {
  connectionId?: string | null;
  platform: string;
  sourceLabel?: string | null;
  importedEvents: number;
  metadata?: Record<string, unknown>;
}) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedListeningUser();

  if (!user) {
    throw new Error("Log in to save import history.");
  }

  const { data, error } = await client
    .from("listening_import_batches")
    .insert({
      user_id: user.id,
      connection_id: input.connectionId ?? null,
      platform: input.platform,
      source_label: input.sourceLabel ?? null,
      imported_events: input.importedEvents,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  emitListeningActivity();
  return data as ListeningImportBatch;
}

export async function getMusicPlatformConnections() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("music_platform_connections")
    .select("*")
    .order("connected_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as MusicPlatformConnection[];
}

export async function getListeningImportBatches(limit = 20) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("listening_import_batches")
    .select("*")
    .order("imported_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as ListeningImportBatch[];
}

export async function getListeningStats(timeframe: ListeningTimeframe) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_listening_stats", {
    timeframe,
  });

  if (error) {
    throw error;
  }

  return data as ListeningStatsResponse;
}

export async function getListeningHistory(filters: ListeningHistoryFilters = {}) {
  const client = getSupabaseClient();
  const pageSize = Math.min(filters.pageSize ?? 40, 100);
  const page = Math.max(filters.page ?? 0, 0);
  let query = client
    .from("listening_events")
    .select("*", { count: "exact" })
    .order("played_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (filters.startAt) {
    query = query.gte("played_at", filters.startAt);
  }

  if (filters.endAt) {
    query = query.lt("played_at", filters.endAt);
  }

  if (filters.artist?.trim()) {
    query = query.ilike("artist_name", `%${filters.artist.trim()}%`);
  }

  if (filters.album?.trim()) {
    query = query.ilike("album_name", `%${filters.album.trim()}%`);
  }

  if (filters.song?.trim()) {
    query = query.ilike("track_name", `%${filters.song.trim()}%`);
  }

  if (filters.genre?.trim()) {
    query = query.ilike("genre", `%${filters.genre.trim()}%`);
  }

  if (filters.sourcePlatform?.trim()) {
    query = query.eq("source_platform", filters.sourcePlatform.trim());
  }

  if (filters.search?.trim()) {
    const safeQuery = filters.search.trim().replace(/,/g, " ");
    query = query.or(
      [
        `track_name.ilike.%${safeQuery}%`,
        `artist_name.ilike.%${safeQuery}%`,
        `album_name.ilike.%${safeQuery}%`,
        `genre.ilike.%${safeQuery}%`,
      ].join(",")
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    events: (data ?? []) as ListeningEventRecord[],
    count: count ?? 0,
    page,
    pageSize,
  };
}

export async function getListeningEventsWithinRange(startAt: string, endAt: string, limit = 1000) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("listening_events")
    .select("*")
    .gte("played_at", startAt)
    .lt("played_at", endAt)
    .order("played_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as ListeningEventRecord[];
}

export async function getRecentListeningEvents(limit = 250) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("listening_events")
    .select("*")
    .order("played_at", { ascending: false })
    .limit(Math.min(limit, 1000));

  if (error) {
    throw error;
  }

  return (data ?? []) as ListeningEventRecord[];
}

export function formatListeningDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatTrend(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "No baseline yet";
  }

  if (value === 0) {
    return "Flat vs previous period";
  }

  const prefix = value > 0 ? "up" : "down";
  return `${prefix} ${Math.abs(value).toFixed(1)}% from previous period`;
}
