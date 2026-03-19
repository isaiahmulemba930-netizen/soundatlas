"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { PublicProfile } from "@/lib/follows";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type TasteEntityEntry = {
  id: string | null;
  name: string;
  artistName?: string | null;
  count?: number;
  rating?: number | null;
  entityType?: "song" | "album" | "artist";
  href?: string | null;
  artworkUrl?: string | null;
};

export type TasteGenreEntry = {
  name: string;
  count: number;
};

export type TasteMarkers = {
  explorationScore: number;
  repeatDepth: number;
  reviewDepth: number;
  marketBoldness: number;
  undergroundLean: number;
  listeningMomentum: number;
};

export type UserTasteProfile = {
  userId: string;
  topArtists: TasteEntityEntry[];
  topAlbums: TasteEntityEntry[];
  topSongs: TasteEntityEntry[];
  topGenres: TasteGenreEntry[];
  ratedEntities: TasteEntityEntry[];
  marketEntities: TasteEntityEntry[];
  tasteMarkers: TasteMarkers;
  activityScore: number;
  compatibilityReady: boolean;
  lastSourceActivityAt: string | null;
  lastSyncedAt: string;
};

export type TasteMatchType =
  | "Best Match"
  | "Very Similar Taste"
  | "Expands Your Taste"
  | "Opposite but Interesting"
  | "Underground Twin"
  | "Same Favorites, Different Style";

export type TasteMatch = {
  user: PublicProfile;
  compatibilityScore: number;
  matchType: TasteMatchType;
  explanation: string;
  sharedArtists: string[];
  sharedAlbums: string[];
  sharedSongs: string[];
  sharedGenres: string[];
  complementaryArtists: string[];
  profile: UserTasteProfile;
};

export type TasteComparison = {
  otherUser: PublicProfile;
  compatibilityScore: number;
  matchType: TasteMatchType;
  explanation: string;
  sharedArtists: TasteEntityEntry[];
  sharedAlbums: TasteEntityEntry[];
  sharedSongs: TasteEntityEntry[];
  sharedGenres: TasteGenreEntry[];
  ratingsAgree: Array<{
    entityName: string;
    entityType: string;
    yourRating: number;
    theirRating: number;
  }>;
  ratingsDisagree: Array<{
    entityName: string;
    entityType: string;
    yourRating: number;
    theirRating: number;
  }>;
  differenceNotes: string[];
  recommendationsFromThem: TasteEntityEntry[];
  recommendationsForThem: TasteEntityEntry[];
};

export type TasteMatchFilters = {
  genre?: string;
  similarity?: "all" | "high" | "medium" | "expanding";
  discoveryStyle?: "all" | "underground" | "balanced" | "mainstream";
  activeOnly?: boolean;
};

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this deployment yet.");
  }

  return supabase;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueByName<T extends { name: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeText(item.name);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function parseEntityArray(value: Json): TasteEntityEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries: TasteEntityEntry[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return;
    }

    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) {
      return;
    }

    entries.push({
      id: typeof item.id === "string" ? item.id : null,
      name,
      artistName: typeof item.artistName === "string" ? item.artistName : null,
      count: typeof item.count === "number" ? item.count : undefined,
      rating: typeof item.rating === "number" ? item.rating : null,
      entityType:
        item.entityType === "song" || item.entityType === "album" || item.entityType === "artist"
          ? item.entityType
          : undefined,
      href: typeof item.href === "string" ? item.href : null,
      artworkUrl: typeof item.artworkUrl === "string" ? item.artworkUrl : null,
    });
  });

  return entries;
}

function parseGenreArray(value: Json): TasteGenreEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const name = typeof item.name === "string" ? item.name.trim() : "";
      const count = typeof item.count === "number" ? item.count : 0;
      if (!name) {
        return null;
      }

      return { name, count } satisfies TasteGenreEntry;
    })
    .filter((item): item is TasteGenreEntry => Boolean(item));
}

function parseMarkers(value: Json): TasteMarkers {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      explorationScore: 0,
      repeatDepth: 0,
      reviewDepth: 0,
      marketBoldness: 0,
      undergroundLean: 0,
      listeningMomentum: 0,
    };
  }

  return {
    explorationScore: Number(value.explorationScore ?? 0),
    repeatDepth: Number(value.repeatDepth ?? 0),
    reviewDepth: Number(value.reviewDepth ?? 0),
    marketBoldness: Number(value.marketBoldness ?? 0),
    undergroundLean: Number(value.undergroundLean ?? 0),
    listeningMomentum: Number(value.listeningMomentum ?? 0),
  };
}

function toTasteProfile(row: {
  user_id: string;
  top_artists: Json;
  top_albums: Json;
  top_songs: Json;
  top_genres: Json;
  rated_entities: Json;
  market_entities: Json;
  taste_markers: Json;
  activity_score: number | string;
  compatibility_ready: boolean;
  last_source_activity_at: string | null;
  last_synced_at: string;
}) {
  return {
    userId: row.user_id,
    topArtists: parseEntityArray(row.top_artists),
    topAlbums: parseEntityArray(row.top_albums),
    topSongs: parseEntityArray(row.top_songs),
    topGenres: parseGenreArray(row.top_genres),
    ratedEntities: parseEntityArray(row.rated_entities),
    marketEntities: parseEntityArray(row.market_entities),
    tasteMarkers: parseMarkers(row.taste_markers),
    activityScore: Number(row.activity_score ?? 0),
    compatibilityReady: Boolean(row.compatibility_ready),
    lastSourceActivityAt: row.last_source_activity_at,
    lastSyncedAt: row.last_synced_at,
  } satisfies UserTasteProfile;
}

async function getAuthenticatedUser() {
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

function pickTopEntries(
  values: Array<{
    id?: string | null;
    name: string;
    artistName?: string | null;
    href?: string | null;
    artworkUrl?: string | null;
    entityType?: "song" | "album" | "artist";
  }>,
  limit: number
) {
  const counts = new Map<string, TasteEntityEntry & { count: number }>();

  values.forEach((value) => {
    const key = normalizeText(value.name) + "::" + normalizeText(value.artistName);
    if (!key.trim()) {
      return;
    }

    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }

    counts.set(key, {
      id: value.id ?? null,
      name: value.name,
      artistName: value.artistName ?? null,
      href: value.href ?? null,
      artworkUrl: value.artworkUrl ?? null,
      entityType: value.entityType,
      count: 1,
    });
  });

  return Array.from(counts.values())
    .sort((left, right) => {
      const countDiff = (right.count ?? 0) - (left.count ?? 0);
      if (countDiff !== 0) {
        return countDiff;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      name: item.name,
      artistName: item.artistName,
      count: item.count,
      href: item.href ?? null,
      artworkUrl: item.artworkUrl ?? null,
      entityType: item.entityType,
    }));
}

function pickTopGenres(values: Array<string | null | undefined>, limit: number) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const cleaned = String(value ?? "").trim();
    if (!cleaned) {
      return;
    }

    counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

function buildRatedEntities(
  rows: Array<{
    entity_type: "song" | "album" | "artist";
    entity_id: string;
    entity_name: string;
    rating: number | null;
  }>
) {
  return rows
    .filter((row) => typeof row.rating === "number" && row.rating > 0)
    .map((row) => ({
      id: row.entity_id,
      name: row.entity_name,
      rating: row.rating,
      entityType: row.entity_type,
    }))
    .slice(0, 24);
}

function buildMarketEntities(
  rows: Array<{
    entity_type: "song" | "album" | "artist";
    entity_id: string;
    entity_name: string;
    entity_href: string;
    artwork_url: string | null;
  }>
) {
  return rows.slice(0, 18).map((row) => ({
    id: row.entity_id,
    name: row.entity_name,
    href: row.entity_href,
    artworkUrl: row.artwork_url,
    entityType: row.entity_type,
  }));
}

function intersectionByName(first: TasteEntityEntry[], second: TasteEntityEntry[]) {
  const secondByKey = new Map(second.map((item) => [normalizeText(item.name), item]));
  const overlaps: TasteEntityEntry[] = [];

  first.forEach((item) => {
    const match = secondByKey.get(normalizeText(item.name));
    if (!match) {
      return;
    }

    overlaps.push({
      id: item.id ?? match.id ?? null,
      name: item.name,
      artistName: item.artistName ?? match.artistName ?? null,
      count: Math.max(item.count ?? 0, match.count ?? 0),
      entityType: item.entityType ?? match.entityType,
      href: item.href ?? match.href ?? null,
      artworkUrl: item.artworkUrl ?? match.artworkUrl ?? null,
    });
  });

  return uniqueByName(overlaps);
}

function overlapRatio(first: string[], second: string[]) {
  if (first.length === 0 || second.length === 0) {
    return 0;
  }

  const firstSet = new Set(first.map(normalizeText).filter(Boolean));
  const secondSet = new Set(second.map(normalizeText).filter(Boolean));
  let matches = 0;
  firstSet.forEach((value) => {
    if (secondSet.has(value)) {
      matches += 1;
    }
  });

  return matches / Math.max(firstSet.size, secondSet.size, 1);
}

function computeRatingAlignment(first: TasteEntityEntry[], second: TasteEntityEntry[]) {
  const secondByKey = new Map(
    second
      .filter((item) => typeof item.rating === "number")
      .map((item) => [normalizeText(`${item.entityType}:${item.name}`), item])
  );

  let agreementScore = 0;
  let comparisons = 0;
  const agreements: TasteComparison["ratingsAgree"] = [];
  const disagreements: TasteComparison["ratingsDisagree"] = [];

  first.forEach((item) => {
    if (typeof item.rating !== "number" || !item.entityType) {
      return;
    }

    const match = secondByKey.get(normalizeText(`${item.entityType}:${item.name}`));
    if (!match || typeof match.rating !== "number") {
      return;
    }

    const diff = Math.abs(item.rating - match.rating);
    agreementScore += clamp(1 - diff / 4);
    comparisons += 1;

    if (diff <= 0.75) {
      agreements.push({
        entityName: item.name,
        entityType: item.entityType,
        yourRating: item.rating,
        theirRating: match.rating,
      });
    } else if (diff >= 1.5) {
      disagreements.push({
        entityName: item.name,
        entityType: item.entityType,
        yourRating: item.rating,
        theirRating: match.rating,
      });
    }
  });

  return {
    score: comparisons > 0 ? agreementScore / comparisons : 0,
    agreements: agreements.slice(0, 6),
    disagreements: disagreements.slice(0, 6),
  };
}

function getDiscoveryStyle(markers: TasteMarkers) {
  if (markers.undergroundLean >= 0.72) {
    return "underground";
  }

  if (markers.undergroundLean <= 0.38) {
    return "mainstream";
  }

  return "balanced";
}

function computeMatchType(
  score: number,
  sharedArtistCount: number,
  sharedGenreCount: number,
  explorationGap: number,
  bothUnderground: boolean
): TasteMatchType {
  if (bothUnderground && sharedArtistCount >= 2) {
    return "Underground Twin";
  }

  if (score >= 88) {
    return "Best Match";
  }

  if (score >= 74) {
    return "Very Similar Taste";
  }

  if (sharedArtistCount >= 3 && sharedGenreCount <= 2 && explorationGap >= 0.18) {
    return "Same Favorites, Different Style";
  }

  if (score >= 54) {
    return "Expands Your Taste";
  }

  return "Opposite but Interesting";
}

function buildExplanation(params: {
  matchType: TasteMatchType;
  sharedArtists: TasteEntityEntry[];
  sharedAlbums: TasteEntityEntry[];
  sharedSongs: TasteEntityEntry[];
  sharedGenres: TasteGenreEntry[];
  ratingAlignScore: number;
  complementaryArtists: TasteEntityEntry[];
}) {
  const reasons: string[] = [];

  if (params.sharedArtists.length > 0) {
    reasons.push(`You share ${params.sharedArtists.length} top artist${params.sharedArtists.length === 1 ? "" : "s"}`);
  }

  if (params.sharedAlbums.length > 0) {
    reasons.push(`${params.sharedAlbums.length} of your album favorites overlap`);
  }

  if (params.sharedSongs.length > 0) {
    reasons.push(`you both keep returning to ${params.sharedSongs[0].name}`);
  }

  if (params.sharedGenres.length > 0) {
    reasons.push(`both of you lean into ${params.sharedGenres.slice(0, 2).map((genre) => genre.name).join(" and ")}`);
  }

  if (params.ratingAlignScore >= 0.7) {
    reasons.push("your public ratings line up closely");
  }

  if (params.complementaryArtists.length > 0 && (params.matchType === "Expands Your Taste" || params.matchType === "Opposite but Interesting")) {
    reasons.push(`${params.complementaryArtists[0].name} could expand your rotation`);
  }

  return reasons.length > 0 ? reasons.join(", ") + "." : "Your recent listening and reviews are lining up in meaningful ways.";
}

function buildDifferenceNotes(viewer: UserTasteProfile, other: UserTasteProfile, sharedGenres: TasteGenreEntry[]) {
  const notes: string[] = [];
  const explorationGap = other.tasteMarkers.explorationScore - viewer.tasteMarkers.explorationScore;

  if (Math.abs(explorationGap) >= 0.18) {
    notes.push(
      explorationGap > 0
        ? "They cast a wider discovery net, while you replay your core favorites more heavily."
        : "You branch out more widely, while they stay tighter around their heaviest repeats."
    );
  }

  if (sharedGenres.length === 0) {
    notes.push("Your genre lanes barely overlap, which makes this more of a bridge match than a mirror match.");
  }

  const marketGap = other.tasteMarkers.marketBoldness - viewer.tasteMarkers.marketBoldness;
  if (Math.abs(marketGap) >= 0.2) {
    notes.push(
      marketGap > 0
        ? "They make bolder marketplace plays, which could pull you toward earlier breakout bets."
        : "You take bigger marketplace swings, while they stay more measured."
    );
  }

  return notes.slice(0, 3);
}

function buildRecommendations(source: TasteEntityEntry[], against: TasteEntityEntry[]) {
  const blocked = new Set(against.map((item) => normalizeText(item.name)));
  return uniqueByName(source.filter((item) => !blocked.has(normalizeText(item.name)))).slice(0, 6);
}

function computeCompatibility(
  viewer: UserTasteProfile,
  other: UserTasteProfile
): {
  compatibilityScore: number;
  matchType: TasteMatchType;
  explanation: string;
  sharedArtists: TasteEntityEntry[];
  sharedAlbums: TasteEntityEntry[];
  sharedSongs: TasteEntityEntry[];
  sharedGenres: TasteGenreEntry[];
  ratingsAgree: TasteComparison["ratingsAgree"];
  ratingsDisagree: TasteComparison["ratingsDisagree"];
  recommendationsFromThem: TasteEntityEntry[];
  recommendationsForThem: TasteEntityEntry[];
  differenceNotes: string[];
  complementaryArtists: TasteEntityEntry[];
} {
  const sharedArtists = intersectionByName(viewer.topArtists, other.topArtists).slice(0, 6);
  const sharedAlbums = intersectionByName(viewer.topAlbums, other.topAlbums).slice(0, 6);
  const sharedSongs = intersectionByName(viewer.topSongs, other.topSongs).slice(0, 6);
  const sharedGenres = viewer.topGenres.filter((genre) =>
    other.topGenres.some((otherGenre) => normalizeText(otherGenre.name) === normalizeText(genre.name))
  );
  const genreScore = overlapRatio(
    viewer.topGenres.map((genre) => genre.name),
    other.topGenres.map((genre) => genre.name)
  );
  const artistScore = overlapRatio(
    viewer.topArtists.map((artist) => artist.name),
    other.topArtists.map((artist) => artist.name)
  );
  const albumScore = overlapRatio(
    viewer.topAlbums.map((album) => album.name),
    other.topAlbums.map((album) => album.name)
  );
  const songScore = overlapRatio(
    viewer.topSongs.map((song) => song.name),
    other.topSongs.map((song) => song.name)
  );
  const marketScore = overlapRatio(
    viewer.marketEntities.map((item) => item.name),
    other.marketEntities.map((item) => item.name)
  );
  const ratings = computeRatingAlignment(viewer.ratedEntities, other.ratedEntities);
  const styleScore =
    1 -
    clamp(
      Math.abs(viewer.tasteMarkers.explorationScore - other.tasteMarkers.explorationScore) * 0.45 +
        Math.abs(viewer.tasteMarkers.marketBoldness - other.tasteMarkers.marketBoldness) * 0.3 +
        Math.abs(viewer.tasteMarkers.undergroundLean - other.tasteMarkers.undergroundLean) * 0.25
    );

  const rawScore =
    artistScore * 0.26 +
    albumScore * 0.15 +
    songScore * 0.14 +
    genreScore * 0.18 +
    ratings.score * 0.14 +
    styleScore * 0.08 +
    marketScore * 0.05;

  const compatibilityScore = Math.round(clamp(rawScore, 0, 1) * 100);
  const complementaryArtists = buildRecommendations(other.topArtists, viewer.topArtists);
  const explorationGap = Math.abs(viewer.tasteMarkers.explorationScore - other.tasteMarkers.explorationScore);
  const bothUnderground =
    getDiscoveryStyle(viewer.tasteMarkers) === "underground" &&
    getDiscoveryStyle(other.tasteMarkers) === "underground";
  const matchType = computeMatchType(
    compatibilityScore,
    sharedArtists.length,
    sharedGenres.length,
    explorationGap,
    bothUnderground
  );

  return {
    compatibilityScore,
    matchType,
    explanation: buildExplanation({
      matchType,
      sharedArtists,
      sharedAlbums,
      sharedSongs,
      sharedGenres,
      ratingAlignScore: ratings.score,
      complementaryArtists,
    }),
    sharedArtists,
    sharedAlbums,
    sharedSongs,
    sharedGenres,
    ratingsAgree: ratings.agreements,
    ratingsDisagree: ratings.disagreements,
    recommendationsFromThem: buildRecommendations(other.topSongs, viewer.topSongs),
    recommendationsForThem: buildRecommendations(viewer.topSongs, other.topSongs),
    differenceNotes: buildDifferenceNotes(viewer, other, sharedGenres),
    complementaryArtists,
  };
}

export async function syncTasteProfileForCurrentUser() {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: events }, { data: reviews }, { data: positions }] = await Promise.all([
    client
      .from("profiles")
      .select("favorite_genres, favorite_artist")
      .eq("user_id", user.id)
      .maybeSingle(),
    client
      .from("listening_events")
      .select("track_id, track_name, artist_id, artist_name, album_id, album_name, genre, played_at")
      .eq("user_id", user.id)
      .order("played_at", { ascending: false })
      .limit(600),
    client
      .from("reviews")
      .select("entity_type, entity_id, entity_name, rating, review_text, created_at")
      .eq("user_id", user.id)
      .eq("moderation_status", "active")
      .order("updated_at", { ascending: false })
      .limit(80),
    client
      .from("market_positions")
      .select("entity_type, entity_id, entity_name, entity_href, artwork_url, shares")
      .eq("user_id", user.id)
      .gt("shares", 0)
      .order("updated_at", { ascending: false })
      .limit(24),
  ]);

  const listeningRows = events ?? [];
  const reviewRows = reviews ?? [];
  const marketRows = positions ?? [];

  const topArtists = pickTopEntries(
    listeningRows.map((row) => ({
      id: row.artist_id,
      name: row.artist_name,
      entityType: "artist" as const,
    })),
    12
  );
  const topAlbums = pickTopEntries(
    listeningRows
      .filter((row) => row.album_name)
      .map((row) => ({
        id: row.album_id,
        name: row.album_name ?? "",
        artistName: row.artist_name,
        entityType: "album" as const,
      })),
    12
  );
  const topSongs = pickTopEntries(
    listeningRows.map((row) => ({
      id: row.track_id,
      name: row.track_name,
      artistName: row.artist_name,
      entityType: "song" as const,
      href: row.track_id ? `/track/${row.track_id}` : null,
    })),
    12
  );

  const topGenres = pickTopGenres(
    [
      ...listeningRows.map((row) => row.genre),
      ...String(profile?.favorite_genres ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ],
    10
  );

  const ratedEntities = buildRatedEntities(
    reviewRows.map((row) => ({
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      entity_name: row.entity_name,
      rating: typeof row.rating === "number" ? row.rating : null,
    }))
  );
  const marketEntities = buildMarketEntities(
    marketRows.map((row) => ({
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      entity_name: row.entity_name,
      entity_href: row.entity_href,
      artwork_url: row.artwork_url,
    }))
  );

  const uniqueArtists = new Set(listeningRows.map((row) => normalizeText(row.artist_name)).filter(Boolean)).size;
  const totalPlays = Math.max(listeningRows.length, 1);
  const topArtistShare = (topArtists[0]?.count ?? 0) / totalPlays;
  const reviewDepth = clamp(reviewRows.length / 20);
  const marketBoldness = clamp(marketRows.length / 10);
  const explorationScore = clamp((uniqueArtists / Math.max(totalPlays, 1)) * 2.4);
  const undergroundLean = clamp(explorationScore * 0.65 + marketBoldness * 0.2 + (1 - topArtistShare) * 0.15);
  const activityScore = round(
    listeningRows.length * 0.18 +
      reviewRows.length * 2.4 +
      marketRows.length * 3 +
      topGenres.length * 1.5,
    2
  );
  const compatibilityReady =
    topArtists.length >= 3 || topSongs.length >= 4 || ratedEntities.length >= 3 || marketEntities.length >= 2;
  const lastSourceActivityAt = [
    listeningRows[0]?.played_at ?? null,
    reviewRows[0]?.created_at ?? null,
  ]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  const tasteMarkers: TasteMarkers = {
    explorationScore: round(explorationScore),
    repeatDepth: round(topArtistShare),
    reviewDepth: round(reviewDepth),
    marketBoldness: round(marketBoldness),
    undergroundLean: round(undergroundLean),
    listeningMomentum: round(clamp(listeningRows.slice(0, 80).length / 80)),
  };

  const { data, error } = await client
    .from("user_taste_profiles")
    .upsert(
      {
        user_id: user.id,
        top_artists: topArtists,
        top_albums: topAlbums,
        top_songs: topSongs,
        top_genres: topGenres,
        rated_entities: ratedEntities,
        market_entities: marketEntities,
        taste_markers: tasteMarkers,
        activity_score: activityScore,
        compatibility_ready: compatibilityReady,
        last_source_activity_at: lastSourceActivityAt,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toTasteProfile(data);
}

async function getOwnTasteProfile() {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const { data } = await client.from("user_taste_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!data || !data.compatibility_ready) {
    return syncTasteProfileForCurrentUser();
  }

  return toTasteProfile(data);
}

async function getPublicProfilesByIds(userIds: string[]) {
  if (userIds.length === 0) {
    return [] as PublicProfile[];
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("user_id, username, display_name, bio, favorite_genres, favorite_artist, pinned_badge_keys")
    .in("user_id", userIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as PublicProfile[];
}

function passesFilters(match: TasteMatch, filters: TasteMatchFilters) {
  if (filters.genre) {
    const normalizedGenre = normalizeText(filters.genre);
    const genreMatch =
      match.sharedGenres.some((genre) => normalizeText(genre) === normalizedGenre) ||
      match.profile.topGenres.some((genre) => normalizeText(genre.name) === normalizedGenre);

    if (!genreMatch) {
      return false;
    }
  }

  if (filters.similarity === "high" && match.compatibilityScore < 75) {
    return false;
  }

  if (filters.similarity === "medium" && (match.compatibilityScore < 55 || match.compatibilityScore >= 75)) {
    return false;
  }

  if (filters.similarity === "expanding" && !["Expands Your Taste", "Opposite but Interesting"].includes(match.matchType)) {
    return false;
  }

  if (filters.discoveryStyle && filters.discoveryStyle !== "all") {
    if (getDiscoveryStyle(match.profile.tasteMarkers) !== filters.discoveryStyle) {
      return false;
    }
  }

  if (filters.activeOnly && match.profile.activityScore < 8) {
    return false;
  }

  return true;
}

export async function getTasteMatches(filters: TasteMatchFilters = {}) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [] as TasteMatch[];
  }

  const [ownProfile, snapshotsResult] = await Promise.all([
    getOwnTasteProfile(),
    client
      .from("user_taste_profiles")
      .select("*")
      .neq("user_id", user.id)
      .eq("compatibility_ready", true)
      .order("activity_score", { ascending: false })
      .limit(80),
  ]);

  if (!ownProfile) {
    return [] as TasteMatch[];
  }

  if (snapshotsResult.error) {
    throw snapshotsResult.error;
  }

  const otherProfiles = (snapshotsResult.data ?? []).map(toTasteProfile);
  const publicProfiles = await getPublicProfilesByIds(otherProfiles.map((profile) => profile.userId));
  const profileById = new Map(publicProfiles.map((profile) => [profile.user_id, profile]));

  return otherProfiles
    .map((profile) => {
      const userProfile = profileById.get(profile.userId);
      if (!userProfile) {
        return null;
      }

      const comparison = computeCompatibility(ownProfile, profile);
      return {
        user: userProfile,
        compatibilityScore: comparison.compatibilityScore,
        matchType: comparison.matchType,
        explanation: comparison.explanation,
        sharedArtists: comparison.sharedArtists.map((item) => item.name).slice(0, 3),
        sharedAlbums: comparison.sharedAlbums.map((item) => item.name).slice(0, 3),
        sharedSongs: comparison.sharedSongs.map((item) => item.name).slice(0, 3),
        sharedGenres: comparison.sharedGenres.map((item) => item.name).slice(0, 3),
        complementaryArtists: comparison.complementaryArtists.map((item) => item.name).slice(0, 3),
        profile,
      } satisfies TasteMatch;
    })
    .filter((item): item is TasteMatch => Boolean(item))
    .filter((item) => passesFilters(item, filters))
    .sort((left, right) => {
      if (right.compatibilityScore !== left.compatibilityScore) {
        return right.compatibilityScore - left.compatibilityScore;
      }

      return right.profile.activityScore - left.profile.activityScore;
    });
}

export async function recordTasteMatchView(matchedUserId: string, compatibilityScore: number, matchType: TasteMatchType) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user || user.id === matchedUserId) {
    return;
  }

  await client.from("taste_match_history").upsert(
    {
      viewer_user_id: user.id,
      matched_user_id: matchedUserId,
      compatibility_score: compatibilityScore,
      match_type: matchType,
      created_at: new Date().toISOString(),
    },
    { onConflict: "viewer_user_id,matched_user_id" }
  );
}

export async function getTasteMatchHistory() {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [] as Array<{ user: PublicProfile; compatibilityScore: number; matchType: string; createdAt: string }>;
  }

  const { data, error } = await client
    .from("taste_match_history")
    .select("*")
    .eq("viewer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw error;
  }

  const profiles = await getPublicProfilesByIds((data ?? []).map((row) => row.matched_user_id));
  const byId = new Map(profiles.map((profile) => [profile.user_id, profile]));

  return (data ?? [])
    .map((row) => {
      const profile = byId.get(row.matched_user_id);
      if (!profile) {
        return null;
      }

      return {
        user: profile,
        compatibilityScore: row.compatibility_score,
        matchType: row.match_type,
        createdAt: row.created_at,
      };
    })
    .filter((item): item is { user: PublicProfile; compatibilityScore: number; matchType: string; createdAt: string } => Boolean(item));
}

export async function getTasteComparisonByUsername(username: string) {
  const client = getSupabaseClient();
  const viewerProfile = await getOwnTasteProfile();

  if (!viewerProfile) {
    return null;
  }

  const { data: otherUserProfile, error: profileError } = await client
    .from("profiles")
    .select("user_id, username, display_name, bio, favorite_genres, favorite_artist, pinned_badge_keys")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!otherUserProfile) {
    return null;
  }

  const { data: snapshotRow, error: snapshotError } = await client
    .from("user_taste_profiles")
    .select("*")
    .eq("user_id", otherUserProfile.user_id)
    .maybeSingle();

  if (snapshotError) {
    throw snapshotError;
  }

  if (!snapshotRow) {
    return null;
  }

  const otherSnapshot = toTasteProfile(snapshotRow);
  const comparison = computeCompatibility(viewerProfile, otherSnapshot);

  await recordTasteMatchView(otherSnapshot.userId, comparison.compatibilityScore, comparison.matchType);

  return {
    otherUser: otherUserProfile as PublicProfile,
    compatibilityScore: comparison.compatibilityScore,
    matchType: comparison.matchType,
    explanation: comparison.explanation,
    sharedArtists: comparison.sharedArtists,
    sharedAlbums: comparison.sharedAlbums,
    sharedSongs: comparison.sharedSongs,
    sharedGenres: comparison.sharedGenres,
    ratingsAgree: comparison.ratingsAgree,
    ratingsDisagree: comparison.ratingsDisagree,
    differenceNotes: comparison.differenceNotes,
    recommendationsFromThem: comparison.recommendationsFromThem,
    recommendationsForThem: comparison.recommendationsForThem,
  } satisfies TasteComparison;
}

export async function getTasteCompatibilitySummaryForUserId(userId: string) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user || user.id === userId) {
    return null;
  }

  const viewerProfile = await getOwnTasteProfile();
  if (!viewerProfile) {
    return null;
  }

  const { data, error } = await client.from("user_taste_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const comparison = computeCompatibility(viewerProfile, toTasteProfile(data));
  return {
    compatibilityScore: comparison.compatibilityScore,
    matchType: comparison.matchType,
    explanation: comparison.explanation,
    sharedArtists: comparison.sharedArtists.map((item) => item.name).slice(0, 3),
    sharedGenres: comparison.sharedGenres.map((item) => item.name).slice(0, 3),
  };
}
