import "server-only";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  getAlbumDetail,
  getArtistDetail,
  getTrackDetail,
  getTrendingAlbums,
  getTrendingArtists,
  getTrendingTracks,
  searchAlbums,
  searchArtists,
  searchTracks,
} from "@/lib/music-discovery";
import { discoveryGenres } from "@/lib/genre-discovery";
import {
  getMarketQuoteWindow,
  getNextSongRotation,
} from "@/lib/music-market-config";
import { buildPortfolioSummary } from "@/lib/music-market-portfolio";
import type {
  MarketActivityItem,
  MarketAccount,
  MarketAlbumSearchResult,
  MarketAssetDetail,
  MarketBadge,
  MarketEntityType,
  MarketLeaderboardEntry,
  MarketPosition,
  MarketQuote,
  MarketTransaction,
  MusicMarketDashboardData,
} from "@/lib/music-market-types";

type AssetRef = {
  entityType: MarketEntityType;
  entityId: string;
  country: string;
  countryName: string;
  entityName?: string;
};

const SONG_BASE_PRICE = 100;
const ARTIST_BASE_PRICE = 180;
const ALBUM_BASE_PRICE = 140;

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  return supabase;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function parseRank(label: string) {
  const match = label.match(/#(\d+)/);
  return match ? Number(match[1]) : null;
}

function parseAlbumIdFromHref(href: string) {
  const match = href.match(/\/album\/itunes-(\d+)/);
  return match?.[1] ?? "";
}

function getDaysSince(dateValue?: string | null) {
  if (!dateValue) {
    return null;
  }

  const timestamp = new Date(dateValue).getTime();
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.max((Date.now() - timestamp) / (1000 * 60 * 60 * 24), 0);
}

function buildTypeDisplay(entityType: MarketEntityType) {
  switch (entityType) {
    case "song":
      return "song";
    case "artist":
      return "artist";
    case "album":
      return "album";
  }
}

function rankStrength(rank: number | null, depth = 100) {
  if (!rank) {
    return 0;
  }

  return clamp((depth + 1 - rank) / depth, 0, 1);
}

function recencyStrength(dateValue?: string | null, freshnessWindowDays = 60) {
  const age = getDaysSince(dateValue);

  if (age === null) {
    return 0.15;
  }

  return clamp((freshnessWindowDays - Math.min(age, freshnessWindowDays)) / freshnessWindowDays, 0, 1);
}

function confidenceBoost(values: number[]) {
  return clamp(values.reduce((sum, value) => sum + value, 0), 0, 1);
}

function getTwoHourRotationWindow(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  const hour = Number(parts.hour ?? "0");
  const blockStartHour = Math.floor(hour / 2) * 2;
  const labelHour = blockStartHour === 0 ? 12 : blockStartHour > 12 ? blockStartHour - 12 : blockStartHour;
  const meridiem = blockStartHour >= 12 ? "PM" : "AM";

  return {
    key: `${parts.year}-${parts.month}-${parts.day}-${String(blockStartHour).padStart(2, "0")}-America-New_York`,
    label: `${labelHour}:00 ${meridiem} EST`,
  };
}

function formatMarketMetricLabel(metric: string, value: number) {
  const percent = Math.round(value * 100);
  return `${metric} ${percent}%`;
}

function releaseRewardMultiplier(dateValue?: string | null) {
  const ageDays = getDaysSince(dateValue);

  if (ageDays === null) {
    return 1;
  }

  if (ageDays <= 30) return 2.4;
  if (ageDays <= 120) return 1.9;
  if (ageDays <= 365) return 1.35;
  if (ageDays <= 365 * 5) return 0.55;
  if (ageDays <= 365 * 20) return 0.18;
  return 0.005;
}

function buildRewardProfile(multiplier: number, reason: string): MarketQuote["rewardProfile"] {
  if (multiplier >= 2) {
    return { label: "Boom", multiplier, reason };
  }
  if (multiplier >= 1.25) {
    return { label: "High", multiplier, reason };
  }
  if (multiplier >= 0.5) {
    return { label: "Moderate", multiplier, reason };
  }
  return { label: "Low", multiplier, reason };
}

function formatMomentumIndicator(value: number) {
  if (value >= 0.78) return "Rising fast";
  if (value >= 0.62) return "Breakout watch";
  if (value >= 0.45) return "Early momentum";
  if (value >= 0.25) return "Stable / low upside";
  return "Limited replay value";
}

function significanceWeight(values: number[]) {
  const average = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  return clamp(average, 0.2, 1);
}

async function getInvestorCount(entityType: MarketEntityType, entityId: string) {
  const client = getSupabaseClient();

  if (!client) {
    return 0;
  }

  const { count } = await client
    .from("market_positions")
    .select("*", { head: true, count: "exact" })
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .gt("shares", 0);

  return count ?? 0;
}

function buildReasons(
  quote: MarketQuote,
  chartRank: number | null,
  extras?: {
    releaseMomentum?: string | null;
    trackStrength?: string | null;
    consistency?: string | null;
  }
) {
  const reasons: string[] = [];

  if (quote.metrics.streamingGrowthRate > 0.15) {
    reasons.push(`${buildTypeDisplay(quote.entityType)} chart and platform momentum are currently running strong`);
  }

  if (quote.metrics.newListenerGrowth > 0.12) {
    reasons.push("new audience interest is accelerating across current discovery signals");
  }

  if (quote.metrics.appEngagementScore > 0.35) {
    reasons.push("external coverage and visibility signals are staying active");
  }

  if (chartRank && chartRank <= 10) {
    reasons.push("chart momentum is adding a strong external tailwind");
  }

  if (quote.investorCount >= 5) {
    reasons.push("more investors are crowding into the position");
  }

  if (extras?.releaseMomentum) {
    reasons.push(extras.releaseMomentum);
  }

  if (extras?.trackStrength) {
    reasons.push(extras.trackStrength);
  }

  if (extras?.consistency) {
    reasons.push(extras.consistency);
  }

  return reasons.length > 0 ? reasons : ["momentum is stable but not breaking out yet"];
}

function buildChartPoints(basePrice: number, priceScore: number) {
  const smoothedScores = [priceScore * 0.52, priceScore * 0.68, priceScore * 0.81, priceScore * 0.9, priceScore];
  const labels = ["4d", "3d", "2d", "1d", "Now"];

  return labels.map((label, index) => ({
    label,
    price: roundCurrency(basePrice * (1 + smoothedScores[index])),
  }));
}

function hypeLevel(changePercent: number, investorCount: number) {
  if (changePercent >= 18 || investorCount >= 12) return "Explosive";
  if (changePercent >= 9 || investorCount >= 6) return "Hot";
  if (changePercent >= 3 || investorCount >= 2) return "Warm";
  return "Low";
}

function matchesDiscoveryGenreValue(rawValue: string | null | undefined, aliases: string[]) {
  const normalizedValue = String(rawValue ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!normalizedValue) {
    return false;
  }

  return aliases.some((alias) => normalizedValue.includes(alias) || alias.includes(normalizedValue));
}

async function buildSongQuote(ref: AssetRef) {
  const [track, countryTrendingTracks, investorCount] = await Promise.all([
    getTrackDetail(Number(ref.entityId), ref.country),
    getTrendingTracks(ref.country),
    getInvestorCount("song", ref.entityId),
  ]);

  if (!track) {
    return null;
  }

  const chartEntry = countryTrendingTracks.find((item) => String(item.href).includes(`/track/${ref.entityId}`));
  const chartRank = chartEntry ? chartEntry.rank : parseRank(track.chartPerformance ?? "");
  const chartBoost = rankStrength(chartRank, 100);
  const recencyBoost = recencyStrength(track.releaseDate, 50);
  const meaningBoost = track.meaning ? 0.16 : 0;
  const contextBoost = track.sourcedContext ? 0.14 : 0;
  const similarityBoost = clamp(track.similarSongs.length / 8, 0, 0.22);
  const metrics = {
    streamingGrowthRate: clamp(chartBoost * 0.9 + recencyBoost * 0.1, 0, 1),
    newListenerGrowth: clamp(chartBoost * 0.55 + recencyBoost * 0.45, 0, 1),
    saveRate: confidenceBoost([chartBoost * 0.5, similarityBoost, meaningBoost * 0.35]),
    appEngagementScore: confidenceBoost([chartBoost * 0.45, contextBoost, meaningBoost]),
    momentumFactor: clamp(chartBoost * 0.5 + recencyBoost * 0.35 + contextBoost * 0.25, 0, 1),
  };
  const significance = significanceWeight([chartBoost, recencyBoost, metrics.momentumFactor, metrics.appEngagementScore]);

  const rawPriceScore = clamp(
    0.41 * metrics.streamingGrowthRate +
      0.17 * metrics.newListenerGrowth +
      0.12 * metrics.saveRate +
      0.12 * metrics.appEngagementScore +
      0.18 * (metrics.momentumFactor + chartBoost * 0.3),
    -0.52,
    1.25
  );
  const priceScore = clamp(rawPriceScore * significance, -0.52, 1.25);

  const currentPrice = roundCurrency(SONG_BASE_PRICE * (1 + priceScore));
  const previousPrice = roundCurrency(SONG_BASE_PRICE * (1 + clamp(priceScore - 0.1 - chartBoost * 0.45, -0.52, 1.25)));
  const changePercent = previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
  const rewardMultiplier = roundCurrency(releaseRewardMultiplier(track.releaseDate) * (1 + chartBoost * 0.35 + metrics.momentumFactor * 0.25));

  const quote: MarketQuote = {
    entityType: "song",
    entityId: ref.entityId,
    entityName: track.title,
    entitySubtitle: track.artist,
    entityHref: `/track/${ref.entityId}?country=${ref.country}`,
    artworkUrl: track.coverArt,
    country: ref.country,
    countryName: ref.countryName,
    basePrice: SONG_BASE_PRICE,
    currentPrice,
    previousPrice,
    changePercent: roundCurrency(changePercent),
    priceScore,
    investorCount,
    hypeLevel: hypeLevel(changePercent, investorCount),
    rewardProfile: buildRewardProfile(
      rewardMultiplier,
      rewardMultiplier >= 1.75
        ? "fresh release timing and momentum make this a higher-risk, higher-upside song bet"
        : "older or steadier songs usually pay less bonus AC attention than fresh breakouts"
    ),
    reasons: [],
    metrics,
    chartPoints: buildChartPoints(SONG_BASE_PRICE, priceScore),
  };

  quote.reasons = buildReasons(quote, chartRank, {
    consistency:
      quote.metrics.momentumFactor > 0.2
        ? `chart velocity and release freshness are pushing this song into a more volatile lane (${formatMarketMetricLabel("momentum", quote.metrics.momentumFactor)})`
        : null,
  });
  return quote;
}

function parseArtistIdFromHref(href: string) {
  const match = href.match(/\/artistmb\/([^?]+)/);
  return match?.[1] ?? "";
}

async function buildArtistQuote(ref: AssetRef) {
  const [artist, countryTrendingArtists, investorCount] = await Promise.all([
    getArtistDetail(ref.entityId, ref.country),
    getTrendingArtists(ref.country),
    getInvestorCount("artist", ref.entityId),
  ]);

  if (!artist) {
    return null;
  }

  const chartEntry = countryTrendingArtists.find((item) => parseArtistIdFromHref(item.href) === ref.entityId);
  const chartRank = chartEntry ? chartEntry.rank : null;
  const chartBoost = rankStrength(chartRank, 10);
  const catalogDepth = clamp(artist.majorAlbums.length / 8, 0, 1);
  const genreBreadth = clamp(artist.genres.length / 6, 0, 1);
  const relevanceBoost = artist.currentRelevance ? 0.35 : 0.12;
  const bioBoost = artist.biography ? 0.12 : 0;
  const metrics = {
    streamingGrowthRate: clamp(chartBoost * 0.75 + relevanceBoost * 0.25, 0, 1),
    newListenerGrowth: clamp(chartBoost * 0.45 + genreBreadth * 0.2 + relevanceBoost * 0.35, 0, 1),
    saveRate: clamp(catalogDepth * 0.55 + genreBreadth * 0.2 + chartBoost * 0.25, 0, 1),
    appEngagementScore: clamp(relevanceBoost + chartBoost * 0.3 + bioBoost, 0, 1),
    momentumFactor: clamp(chartBoost * 0.45 + relevanceBoost * 0.35 + catalogDepth * 0.2, 0, 1),
  };
  const significance = significanceWeight([chartBoost, relevanceBoost, metrics.newListenerGrowth, metrics.saveRate]);

  const rawPriceScore = clamp(
    0.22 * metrics.streamingGrowthRate +
      0.3 * metrics.newListenerGrowth +
      0.18 * metrics.saveRate +
      0.14 * metrics.appEngagementScore +
      0.08 * metrics.momentumFactor +
      0.08 * chartBoost,
    -0.32,
    0.85
  );
  const priceScore = clamp(rawPriceScore * significance, -0.32, 0.85);

  const currentPrice = roundCurrency(ARTIST_BASE_PRICE * (1 + priceScore));
  const previousPrice = roundCurrency(ARTIST_BASE_PRICE * (1 + clamp(priceScore - 0.04 - chartBoost * 0.2, -0.32, 0.85)));
  const changePercent = previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
  const rewardMultiplier = roundCurrency(0.8 + relevanceBoost * 1.6 + metrics.newListenerGrowth * 0.6 + chartBoost * 0.35);

  const quote: MarketQuote = {
    entityType: "artist",
    entityId: ref.entityId,
    entityName: artist.name,
    entitySubtitle: artist.origin ?? "Artist",
    entityHref: `/artistmb/${ref.entityId}?country=${ref.country}`,
    artworkUrl: chartEntry?.coverArt ?? "",
    country: ref.country,
    countryName: ref.countryName,
    basePrice: ARTIST_BASE_PRICE,
    currentPrice,
    previousPrice,
    changePercent: roundCurrency(changePercent),
    priceScore,
    investorCount,
    hypeLevel: hypeLevel(changePercent, investorCount),
    rewardProfile: buildRewardProfile(
      rewardMultiplier,
      rewardMultiplier >= 1.75
        ? "artist growth is accelerating fast enough to push this into a bigger-upside lane"
        : "more established artist bets move slower and reward patience more than sudden upside"
    ),
    reasons: [],
    metrics,
    chartPoints: buildChartPoints(ARTIST_BASE_PRICE, priceScore),
  };

  quote.reasons = buildReasons(quote, chartRank, {
    consistency:
      quote.metrics.saveRate > 0.18
        ? `their broader catalog footprint is supporting a steadier artist trend (${formatMarketMetricLabel("listener retention", quote.metrics.saveRate)})`
        : null,
  });
  return quote;
}

async function buildAlbumQuote(ref: AssetRef) {
  const collectionId = Number(ref.entityId);

  if (!Number.isFinite(collectionId)) {
    return null;
  }

  const [album, countryTrendingAlbums, investorCount] = await Promise.all([
    getAlbumDetail(collectionId, ref.country),
    getTrendingAlbums(ref.country),
    getInvestorCount("album", ref.entityId),
  ]);

  if (!album) {
    return null;
  }

  const chartEntry = countryTrendingAlbums.find((item) => parseAlbumIdFromHref(item.href) === ref.entityId);
  const chartRank = chartEntry ? chartEntry.rank : parseRank(album.chartPerformance ?? "");
  const chartBoost = rankStrength(chartRank, 100);
  const trackCount = Math.max(album.tracklist.length, 1);
  const releaseMomentum = recencyStrength(album.releaseDate, 75);
  const trackDepth = clamp(trackCount / 18, 0.2, 1);
  const genreBreadth = clamp(album.genres.length / 4, 0, 1);
  const contextBoost = album.sourcedContext ? 0.16 : 0;
  const metrics = {
    streamingGrowthRate: clamp(chartBoost * 0.7 + releaseMomentum * 0.3, 0, 1),
    newListenerGrowth: clamp(chartBoost * 0.45 + releaseMomentum * 0.35 + genreBreadth * 0.2, 0, 1),
    saveRate: clamp(trackDepth * 0.4 + chartBoost * 0.35 + genreBreadth * 0.25, 0, 1),
    appEngagementScore: clamp(chartBoost * 0.4 + contextBoost + releaseMomentum * 0.2, 0, 1),
    momentumFactor: clamp(chartBoost * 0.35 + releaseMomentum * 0.45 + trackDepth * 0.2, 0, 1),
  };
  const significance = significanceWeight([chartBoost, releaseMomentum, trackDepth, metrics.appEngagementScore]);

  const rawPriceScore = clamp(
    0.26 * metrics.streamingGrowthRate +
      0.16 * metrics.newListenerGrowth +
      0.14 * metrics.saveRate +
      0.12 * metrics.appEngagementScore +
      0.12 * metrics.momentumFactor +
      0.1 * trackDepth +
      0.06 * genreBreadth +
      0.04 * releaseMomentum +
      0.1 * chartBoost,
    -0.38,
    0.92
  );
  const priceScore = clamp(rawPriceScore * significance, -0.38, 0.92);

  const currentPrice = roundCurrency(ALBUM_BASE_PRICE * (1 + priceScore));
  const previousPrice = roundCurrency(ALBUM_BASE_PRICE * (1 + clamp(priceScore - 0.05 - chartBoost * 0.3, -0.38, 0.92)));
  const changePercent = previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;
  const rewardMultiplier = roundCurrency(releaseRewardMultiplier(album.releaseDate) * (1 + chartBoost * 0.25 + releaseMomentum * 0.3));

  const quote: MarketQuote = {
    entityType: "album",
    entityId: ref.entityId,
    entityName: album.title,
    entitySubtitle: `${album.artist}${album.releaseDate ? ` | ${album.releaseDate.slice(0, 10)}` : ""}`,
    entityHref: `/album/itunes-${ref.entityId}?country=${ref.country}`,
    artworkUrl: album.coverArt,
    country: ref.country,
    countryName: ref.countryName,
    basePrice: ALBUM_BASE_PRICE,
    currentPrice,
    previousPrice,
    changePercent: roundCurrency(changePercent),
    priceScore,
    investorCount,
    hypeLevel: hypeLevel(changePercent, investorCount),
    rewardProfile: buildRewardProfile(
      rewardMultiplier,
      rewardMultiplier >= 1.75
        ? "newer albums pay the strongest AC upside because they still have room to build replay value"
        : "older catalog albums usually carry lower AC upside unless fresh momentum returns"
    ),
    reasons: [],
    metrics,
    chartPoints: buildChartPoints(ALBUM_BASE_PRICE, priceScore),
  };

  quote.reasons = buildReasons(quote, chartRank, {
    releaseMomentum:
      releaseMomentum > 0.16
        ? `release momentum is still strong enough to keep album attention elevated (${formatMarketMetricLabel("release heat", releaseMomentum)})`
        : null,
    trackStrength:
      trackDepth > 0.4
        ? `the project has enough track depth to keep the album trade more stable than a one-song spike (${trackCount} tracks in play)`
        : null,
    consistency:
      genreBreadth > 0.2
        ? `cross-genre reach is helping the project hold attention beyond release week (${formatMarketMetricLabel("breadth", genreBreadth)})`
        : null,
  });
  return quote;
}

export async function getMarketQuote(ref: AssetRef) {
  switch (ref.entityType) {
    case "song":
      return buildSongQuote(ref);
    case "artist":
      return buildArtistQuote(ref);
    case "album":
      return buildAlbumQuote(ref);
  }
}

async function getPromisingTrackRefs(country: string, countryName: string): Promise<AssetRef[]> {
  const rotation = getTwoHourRotationWindow();
  const sortedGenres = [...discoveryGenres].sort((left, right) => left.slug.localeCompare(right.slug));
  const seed = rotation.key.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const startIndex = seed % Math.max(sortedGenres.length, 1);
  const selectedGenres = Array.from({ length: 3 }, (_, index) => sortedGenres[(startIndex + index) % sortedGenres.length]);

  const queries = selectedGenres.flatMap((genre) => [genre.title, ...genre.aliases.slice(0, 1)]).slice(0, 4);
  const resultSets = await Promise.all(queries.map((query) => searchTracks(query, country).catch(() => [])));
  const candidates = new Map<string, { id: string; score: number }>();

  resultSets.flat().forEach((track) => {
    const ageDays = getDaysSince(track.releaseDate);
    const recencyScore = ageDays === null ? 0.2 : clamp((240 - Math.min(ageDays, 240)) / 240, 0, 1);
    if (recencyScore < 0.18) {
      return;
    }

    const score = recencyScore * 0.75 + (track.genre ? 0.15 : 0) + (track.album ? 0.1 : 0);
    const existing = candidates.get(String(track.id));

    if (!existing || score > existing.score) {
      candidates.set(String(track.id), { id: String(track.id), score });
    }
  });

  const client = getSupabaseClient();
  if (client) {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await client
      .from("listening_events")
      .select("track_name, artist_name, source_platform, played_at")
      .in("source_platform", ["spotify", "apple-music"])
      .gte("played_at", fourteenDaysAgo)
      .order("played_at", { ascending: false })
      .limit(200);

    const replayLeaders = new Map<string, { query: string; score: number }>();
    (data ?? []).forEach((row, index) => {
      const trackName = String(row.track_name ?? "").trim();
      const artistName = String(row.artist_name ?? "").trim();
      if (!trackName || !artistName) {
        return;
      }

      const key = `${trackName.toLowerCase()}::${artistName.toLowerCase()}`;
      const current = replayLeaders.get(key) ?? { query: `${trackName} ${artistName}`, score: 0 };
      current.score += Math.max(0, 24 - index / 6);
      replayLeaders.set(key, current);
    });

    const platformQueries = Array.from(replayLeaders.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);

    const platformResults = await Promise.all(platformQueries.map((item) => searchTracks(item.query, country).catch(() => [])));
    platformResults.flat().forEach((track) => {
      const ageDays = getDaysSince(track.releaseDate);
      const recencyScore = ageDays === null ? 0.2 : clamp((240 - Math.min(ageDays, 240)) / 240, 0, 1);
      if (recencyScore < 0.12) {
        return;
      }

      const score = recencyScore * 0.6 + 0.32;
      const existing = candidates.get(String(track.id));
      if (!existing || score > existing.score) {
        candidates.set(String(track.id), { id: String(track.id), score });
      }
    });
  }

  return Array.from(candidates.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((candidate) => ({
      entityType: "song" as const,
      entityId: candidate.id,
      country,
      countryName,
    }));
}

async function getPromisingArtistRefs(country: string, countryName: string): Promise<AssetRef[]> {
  const rotation = getTwoHourRotationWindow();
  const sortedGenres = [...discoveryGenres].sort((left, right) => left.slug.localeCompare(right.slug));
  const seed = rotation.key.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const startIndex = seed % Math.max(sortedGenres.length, 1);
  const selectedGenres = Array.from({ length: 3 }, (_, index) => sortedGenres[(startIndex + index) % sortedGenres.length]);
  const results = await Promise.all(selectedGenres.map((genre) => searchArtists(genre.title).catch(() => [])));
  const candidates = new Map<string, { id: string; score: number }>();

  results.forEach((artistResults, genreIndex) => {
    const genre = selectedGenres[genreIndex];
    artistResults.forEach((artist, artistIndex) => {
      const genreMatch = artist.genres.some((artistGenre) => matchesDiscoveryGenreValue(artistGenre, genre.aliases));
      if (!genreMatch) {
        return;
      }

      const score = Math.max(16, 50 - artistIndex * 4) + Math.min(artist.genres.length, 3) * 6;
      const existing = candidates.get(artist.id);
      if (!existing || score > existing.score) {
        candidates.set(artist.id, { id: artist.id, score });
      }
    });
  });

  return Array.from(candidates.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((candidate) => ({
      entityType: "artist" as const,
      entityId: candidate.id,
      country,
      countryName,
    }));
}

async function getPromisingAlbumRefs(country: string, countryName: string): Promise<AssetRef[]> {
  const rotation = getTwoHourRotationWindow();
  const sortedGenres = [...discoveryGenres].sort((left, right) => left.slug.localeCompare(right.slug));
  const seed = rotation.key.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const startIndex = seed % Math.max(sortedGenres.length, 1);
  const selectedGenres = Array.from({ length: 3 }, (_, index) => sortedGenres[(startIndex + index) % sortedGenres.length]);
  const results = await Promise.all(selectedGenres.map((genre) => searchAlbums(genre.title, country).catch(() => [])));
  const candidates = new Map<string, { id: string; score: number }>();

  results.forEach((albumResults, genreIndex) => {
    const genre = selectedGenres[genreIndex];
    albumResults.forEach((album, albumIndex) => {
      if (!matchesDiscoveryGenreValue(album.genre, genre.aliases)) {
        return;
      }

      const ageDays = getDaysSince(album.releaseDate);
      const recencyScore = ageDays === null ? 0.15 : clamp((420 - Math.min(ageDays, 420)) / 420, 0, 1);
      if (recencyScore < 0.08) {
        return;
      }

      const score = Math.max(14, 48 - albumIndex * 3) + recencyScore * 24;
      const existing = candidates.get(String(album.id));
      if (!existing || score > existing.score) {
        candidates.set(String(album.id), { id: String(album.id), score });
      }
    });
  });

  return Array.from(candidates.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map((candidate) => ({
      entityType: "album" as const,
      entityId: candidate.id,
      country,
      countryName,
    }));
}

async function getUndergroundMoverRefs(country: string, countryName: string): Promise<AssetRef[]> {
  const [tracks, artists, albums] = await Promise.all([
    getPromisingTrackRefs(country, countryName),
    getPromisingArtistRefs(country, countryName),
    getPromisingAlbumRefs(country, countryName),
  ]);

  return [...tracks.slice(0, 2), ...artists.slice(0, 2), ...albums.slice(0, 2)].slice(0, 6);
}

export async function searchMarketplaceAlbums(query: string, country: string, countryName: string) {
  const trimmed = query.trim();

  if (!trimmed) {
    return [] as MarketAlbumSearchResult[];
  }

  const results = await searchAlbums(trimmed, country);
  const refs: AssetRef[] = results.slice(0, 8).map((album) => ({
    entityType: "album" as const,
    entityId: String(album.id),
    country,
    countryName,
  }));
  const quotes = await getQuotesForAssets(refs);
  const quoteById = new Map(quotes.map((quote) => [quote.entityId, quote]));

  return results
    .slice(0, 8)
    .map((album) => {
      const quote = quoteById.get(String(album.id));
      if (!quote) {
        return null;
      }

      return {
        quote,
        releaseDate: album.releaseDate || null,
        genre: album.genre || null,
        streamingMomentum: formatMomentumIndicator(quote.metrics.streamingGrowthRate),
        popularitySignal: formatMomentumIndicator(quote.metrics.appEngagementScore),
        regionalMomentum: quote.reasons.find((reason) => reason.includes("chart") || reason.includes("regional")) ?? null,
        replayValue: formatMomentumIndicator(quote.metrics.saveRate),
        platformTraction: quote.reasons.find((reason) => reason.includes("external") || reason.includes("momentum")) ?? null,
        artistGrowthTrend: formatMomentumIndicator(quote.metrics.newListenerGrowth),
      } satisfies MarketAlbumSearchResult;
    })
    .filter((result): result is MarketAlbumSearchResult => result !== null);
}

export async function getQuotesForAssets(refs: AssetRef[]) {
  const quotes = await Promise.all(refs.map((ref) => getMarketQuote(ref)));
  return quotes.filter((quote): quote is MarketQuote => quote !== null);
}

export async function getMusicMarketDashboard(
  country: string,
  countryName: string,
  searchedAlbumQuery = ""
): Promise<MusicMarketDashboardData> {
  const rotation = getTwoHourRotationWindow();
  const quoteWindow = getMarketQuoteWindow();
  const [trendingTracks, trendingArtists, trendingAlbums, promisingTrackRefs, undergroundMoverRefs, leaderboard, activityFeed, searchedAlbums] = await Promise.all([
    getTrendingTracks(country),
    getTrendingArtists(country),
    getTrendingAlbums(country),
    getPromisingTrackRefs(country, countryName),
    getUndergroundMoverRefs(country, countryName),
    getMarketLeaderboard(),
    getMarketActivityFeed(),
    searchMarketplaceAlbums(searchedAlbumQuery, country, countryName),
  ]);

  const songRefs: AssetRef[] = trendingTracks.map((track) => ({
    entityType: "song" as const,
    entityId: String(track.href.match(/\/track\/(\d+)/)?.[1] ?? ""),
    country,
    countryName,
  })).filter((ref) => Boolean(ref.entityId));

  const artistRefs: AssetRef[] = trendingArtists.map((artist) => ({
    entityType: "artist" as const,
    entityId: parseArtistIdFromHref(artist.href),
    country,
    countryName,
  })).filter((ref) => Boolean(ref.entityId));

  const albumRefs: AssetRef[] = trendingAlbums.map((album) => ({
    entityType: "album" as const,
    entityId: parseAlbumIdFromHref(album.href),
    country,
    countryName,
  })).filter((ref) => Boolean(ref.entityId));

  const mixedSongRefs = [
    ...songRefs.slice(0, 3),
    ...promisingTrackRefs.filter((ref) => !songRefs.some((existing) => existing.entityId === ref.entityId)).slice(0, 3),
  ].slice(0, 5);

  const [trendingSongs, risingArtists, breakoutAlbums, undergroundMovers] = await Promise.all([
    getQuotesForAssets(mixedSongRefs),
    getQuotesForAssets(artistRefs.slice(0, 5)),
    getQuotesForAssets(albumRefs.slice(0, 5)),
    getQuotesForAssets(undergroundMoverRefs),
  ]);

  return {
    marketCountry: country,
    marketCountryName: countryName,
    refreshedAt: new Date().toISOString(),
    quoteWindowStartedAt: quoteWindow.startedAt,
    nextQuoteRefreshAt: quoteWindow.nextRefreshAt,
    rotationLabel: rotation.label,
    nextSongRotationAt: getNextSongRotation(),
    trendingSongs,
    risingArtists,
    breakoutAlbums,
    undergroundMovers,
    searchedAlbums,
    searchedAlbumQuery,
    leaderboard,
    activityFeed,
  };
}

export async function getMarketAssetDetail(ref: AssetRef): Promise<MarketAssetDetail | null> {
  const quote = await getMarketQuote(ref);

  if (!quote) {
    return null;
  }

  const relatedRefs: AssetRef[] = [];

  if (quote.entityType === "song") {
    const relatedTrending = await getTrendingTracks(ref.country);
    relatedTrending.forEach((track) => {
      const trackId = String(track.href.match(/\/track\/(\d+)/)?.[1] ?? "");
      if (trackId && trackId !== ref.entityId) {
        relatedRefs.push({
          entityType: "song",
          entityId: trackId,
          country: ref.country,
          countryName: ref.countryName,
        });
      }
    });
  } else if (quote.entityType === "artist") {
    const relatedTrending = await getTrendingArtists(ref.country);
    relatedTrending.forEach((artist) => {
      const artistId = parseArtistIdFromHref(artist.href);
      if (artistId && artistId !== ref.entityId) {
        relatedRefs.push({
          entityType: "artist",
          entityId: artistId,
          country: ref.country,
          countryName: ref.countryName,
        });
      }
    });
  } else {
    const relatedTrending = await getTrendingAlbums(ref.country);
    relatedTrending.forEach((album) => {
      const albumId = parseAlbumIdFromHref(album.href);
      if (albumId && albumId !== ref.entityId) {
        relatedRefs.push({
          entityType: "album",
          entityId: albumId,
          country: ref.country,
          countryName: ref.countryName,
        });
      }
    });
  }

  return {
    quote,
    relatedQuotes: (await getQuotesForAssets(relatedRefs.slice(0, 4))).slice(0, 4),
  };
}

export async function getMarketLeaderboard(): Promise<MarketLeaderboardEntry[]> {
  const client = getSupabaseClient();

  if (!client) {
    return [];
  }

  const [{ data: accounts }, { data: profiles }, { data: positions }] = await Promise.all([
    client.from("market_accounts").select("user_id, atlas_credits_balance, is_public").eq("is_public", true),
    client.from("profiles").select("user_id, username, display_name"),
    client.from("market_positions").select("user_id, shares, average_cost_per_share").gt("shares", 0),
  ]);

  const valueByUser = new Map<string, number>();
  const profitByUser = new Map<string, number>();

  (accounts ?? []).forEach((account) => {
    valueByUser.set(account.user_id, Number(account.atlas_credits_balance ?? 0));
    profitByUser.set(account.user_id, Number(account.atlas_credits_balance ?? 0) - 10000);
  });

  (positions ?? []).forEach((position) => {
    const estimate = Number(position.shares ?? 0) * Number(position.average_cost_per_share ?? 0);
    valueByUser.set(position.user_id, (valueByUser.get(position.user_id) ?? 0) + estimate);
  });

  return (profiles ?? [])
    .filter((profile) => valueByUser.has(profile.user_id))
    .map((profile) => ({
      userId: profile.user_id,
      displayName: profile.display_name ?? "SoundAtlas user",
      username: profile.username ?? "user",
      totalPortfolioValue: roundCurrency(valueByUser.get(profile.user_id) ?? 0),
      totalProfitLoss: roundCurrency((valueByUser.get(profile.user_id) ?? 0) - 10000),
    }))
    .sort((left, right) => right.totalPortfolioValue - left.totalPortfolioValue)
    .slice(0, 5);
}

export async function getMarketActivityFeed(userIds?: string[]): Promise<MarketActivityItem[]> {
  const client = getSupabaseClient();

  if (!client) {
    return [];
  }

  let query = client
    .from("market_transactions")
    .select("id, user_id, side, entity_name, entity_type, total_amount, realized_profit_loss, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  if (userIds && userIds.length > 0) {
    query = query.in("user_id", userIds);
  }

  const { data: transactions } = await query;
  const profileIds = Array.from(new Set((transactions ?? []).map((item) => item.user_id)));
  const { data: profiles } = profileIds.length > 0
    ? await client.from("profiles").select("user_id, username, display_name").in("user_id", profileIds)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));

  return (transactions ?? []).map((transaction) => {
    const profile = profileById.get(transaction.user_id);
    return {
      id: transaction.id,
      displayName: profile?.display_name ?? "SoundAtlas user",
      username: profile?.username ?? "user",
      side: transaction.side,
      entityName: transaction.entity_name,
      entityType: transaction.entity_type,
      totalAmount: roundCurrency(Number(transaction.total_amount ?? 0)),
      realizedProfitLoss: roundCurrency(Number(transaction.realized_profit_loss ?? 0)),
      createdAt: transaction.created_at,
    };
  });
}

export async function getPublicPortfolioByUsername(username: string, country: string, countryName: string) {
  const client = getSupabaseClient();

  if (!client) {
    return null;
  }

  const { data: profile } = await client
    .from("profiles")
    .select("user_id, username, display_name")
    .eq("username", username)
    .maybeSingle();

  if (!profile?.user_id) {
    return null;
  }

  const [accountRow, positionRows, transactionRows, badgeRows] = await Promise.all([
    client.from("market_accounts").select("*").eq("user_id", profile.user_id).eq("is_public", true).maybeSingle(),
    client.from("market_positions").select("*").eq("user_id", profile.user_id).gt("shares", 0),
    client.from("market_transactions").select("*").eq("user_id", profile.user_id).order("created_at", { ascending: false }).limit(12),
    client
      .from("user_badges")
      .select("id, user_id, badge_key, badge_name, badge_description, unlocked_at")
      .eq("user_id", profile.user_id)
      .eq("badge_category", "Marketplace")
      .order("unlocked_at", { ascending: false }),
  ]);

  if (!accountRow.data) {
    return null;
  }

  const positions = (positionRows.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    entitySubtitle: row.entity_subtitle,
    entityHref: row.entity_href,
    artworkUrl: row.artwork_url,
    shares: Number(row.shares ?? 0),
    averageCostPerShare: Number(row.average_cost_per_share ?? 0),
    realizedProfitLoss: Number(row.realized_profit_loss ?? 0),
    updatedAt: row.updated_at,
  })) as MarketPosition[];

  const transactions = (transactionRows.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    entitySubtitle: row.entity_subtitle,
    entityHref: row.entity_href,
    artworkUrl: row.artwork_url,
    side: row.side,
    shares: Number(row.shares ?? 0),
    pricePerShare: Number(row.price_per_share ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    realizedProfitLoss: Number(row.realized_profit_loss ?? 0),
    createdAt: row.created_at,
  })) as MarketTransaction[];

  const badges = (badgeRows.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    badgeKey: row.badge_key,
    badgeLabel: row.badge_name,
    badgeDescription: row.badge_description,
    awardedAt: row.unlocked_at,
  })) as MarketBadge[];

  const account: MarketAccount = {
    userId: accountRow.data.user_id,
    atlasCreditsBalance: Number(accountRow.data.atlas_credits_balance ?? 0),
    totalInvestedCredits: Number(accountRow.data.total_invested_credits ?? 0),
    isPublic: Boolean(accountRow.data.is_public),
    createdAt: accountRow.data.created_at,
    updatedAt: accountRow.data.updated_at,
  };

  const quoteRefs = positions.map((position) => ({
    entityType: position.entityType,
    entityId: position.entityId,
    country,
    countryName,
  }));

  return {
    profile: {
      displayName: profile.display_name ?? "SoundAtlas user",
      username: profile.username ?? username,
    },
    summary: buildPortfolioSummary(account, positions, transactions, badges, await getQuotesForAssets(quoteRefs)),
  };
}
