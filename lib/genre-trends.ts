import "server-only";

import { genreCollections } from "@/lib/genre-catalog";
import { getEditorialFallbackGenres, mapRawGenreToCatalogSlug } from "@/lib/genre-discovery";

type AppleChartEntry = {
  artistName?: string;
  genres?: Array<{ name?: string }>;
  primaryGenreName?: string;
};

type TrendingGenreCard = {
  slug: string;
  title: string;
  subtitle: string;
  href: string;
  signal: string;
};

export type TrendingGenresPayload = {
  genres: TrendingGenreCard[];
  mode: "live-derived" | "fallback";
  sourceSummary: string;
  refreshedAt: string;
  windowMinutes: number;
};

type GenreSignal = {
  score: number;
  mentions: number;
  bestRank: number;
};

const TREND_WINDOW_MINUTES = 30;
const TREND_COUNTRIES = ["us", "gb", "br", "mx", "ng", "za", "fr", "de", "jp", "kr", "au"];

function buildChartEndpoints(country: string) {
  return [
    `https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/100/albums.json`,
    `https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/50/albums.json`,
    `https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/25/albums.json`,
    `https://rss.itunes.apple.com/api/v1/${country}/apple-music/top-albums/all/100/explicit.json`,
  ];
}

function extractChartEntries(payload: unknown): AppleChartEntry[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidate = payload as {
    feed?: {
      results?: AppleChartEntry[];
      entry?: AppleChartEntry[];
    };
  };

  if (Array.isArray(candidate.feed?.results)) {
    return candidate.feed.results;
  }

  if (Array.isArray(candidate.feed?.entry)) {
    return candidate.feed.entry;
  }

  return [];
}

function extractGenres(entry: AppleChartEntry) {
  const genres = new Set<string>();

  if (Array.isArray(entry.genres)) {
    entry.genres.forEach((genre) => {
      if (genre?.name) {
        genres.add(genre.name);
      }
    });
  }

  if (entry.primaryGenreName) {
    genres.add(entry.primaryGenreName);
  }

  return Array.from(genres);
}

async function fetchCountryChart(country: string) {
  for (const endpoint of buildChartEndpoints(country)) {
    try {
      const response = await fetch(endpoint, {
        next: { revalidate: TREND_WINDOW_MINUTES * 60 },
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as unknown;
      const entries = extractChartEntries(payload);

      if (entries.length > 0) {
        return entries;
      }
    } catch {
      continue;
    }
  }

  return [];
}

function scoreGenres(entriesByCountry: Array<{ country: string; entries: AppleChartEntry[] }>) {
  const genreSignals = new Map<string, GenreSignal>();

  entriesByCountry.forEach(({ entries }) => {
    entries.forEach((entry, index) => {
      const genres = extractGenres(entry);
      const weight = Math.max(5, 110 - index);

      genres.forEach((rawGenre) => {
        const catalogSlug = mapRawGenreToCatalogSlug(rawGenre);

        if (!catalogSlug) {
          return;
        }

        const existing = genreSignals.get(catalogSlug) ?? {
          score: 0,
          mentions: 0,
          bestRank: Number.POSITIVE_INFINITY,
        };

        existing.score += weight;
        existing.mentions += 1;
        existing.bestRank = Math.min(existing.bestRank, index + 1);
        genreSignals.set(catalogSlug, existing);
      });
    });
  });

  return genreSignals;
}

function buildSignalLine(mentions: number, bestRank: number, marketCount: number) {
  if (mentions >= marketCount * 4) {
    return "Showing the strongest worldwide lift in the current chart window.";
  }

  if (bestRank <= 5) {
    return "Landing near the very top of multiple current album charts.";
  }

  if (mentions >= marketCount * 2) {
    return "Holding broad cross-market momentum instead of one-region heat.";
  }

  return "Still surfacing repeatedly across live album charts worldwide.";
}

export async function getTrendingGenres(): Promise<TrendingGenresPayload> {
  const chartResults = await Promise.all(
    TREND_COUNTRIES.map(async (country) => ({
      country,
      entries: await fetchCountryChart(country),
    }))
  );

  const successfulMarkets = chartResults.filter((result) => result.entries.length > 0);
  const signals = scoreGenres(successfulMarkets);

  const rankedLiveGenres = Array.from(signals.entries())
    .sort((left, right) => {
      if (right[1].score !== left[1].score) {
        return right[1].score - left[1].score;
      }

      if (left[1].bestRank !== right[1].bestRank) {
        return left[1].bestRank - right[1].bestRank;
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, 5)
    .map(([slug, signal]) => {
      const collection = genreCollections.find((candidate) => candidate.slug === slug);

      if (!collection) {
        return null;
      }

      return {
        slug,
        title: collection.title,
        subtitle: `${collection.subtitle} ${buildSignalLine(
          signal.mentions,
          signal.bestRank,
          Math.max(1, successfulMarkets.length)
        )}`,
        href: `/catalog/${collection.slug}`,
        signal: `${signal.mentions} chart hits · best rank #${signal.bestRank}`,
      } satisfies TrendingGenreCard;
    })
    .filter((genre): genre is TrendingGenreCard => genre !== null);

  const fallbackGenres = getEditorialFallbackGenres().map((collection) => ({
    slug: collection.slug,
    title: collection.title,
    subtitle: `${collection.subtitle} Live global chart data is temporarily unavailable, so this lane is using SoundAtlas's editorial fallback set.`,
    href: `/catalog/${collection.slug}`,
    signal: "Editorial fallback",
  }));

  const genres = (rankedLiveGenres.length === 5 ? rankedLiveGenres : [
    ...rankedLiveGenres,
    ...fallbackGenres.filter((fallback) => !rankedLiveGenres.some((genre) => genre.slug === fallback.slug)),
  ]).slice(0, 5);

  const usedLiveData = successfulMarkets.length > 0 && rankedLiveGenres.length > 0;

  return {
    genres,
    mode: usedLiveData ? "live-derived" : "fallback",
    sourceSummary: usedLiveData
      ? `Derived from Apple Music top-album charts across ${successfulMarkets.length} markets and refreshed every ${TREND_WINDOW_MINUTES} minutes.`
      : `Apple Music chart data is currently unavailable, so this view is using a documented SoundAtlas editorial fallback until the next refresh.`,
    refreshedAt: new Date().toISOString(),
    windowMinutes: TREND_WINDOW_MINUTES,
  };
}
