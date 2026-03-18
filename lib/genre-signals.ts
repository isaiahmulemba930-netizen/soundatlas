import "server-only";

import { discoveryGenres, getDiscoveryGenreBySlug, mapRawGenreToDiscoverySlug, type DiscoveryGenre } from "@/lib/genre-discovery";
import { searchGenreAlbums } from "@/lib/itunes";

type AppleChartGenre = {
  name?: string;
};

type AppleChartEntry = {
  id?: string;
  name?: string;
  artistName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  url?: string;
  genres?: AppleChartGenre[];
  primaryGenreName?: string;
};

type GenreChartMarket = {
  country: string;
  entries: AppleChartEntry[];
};

type GenreChartSnapshot = {
  chartHits: number;
  bestRank: number | null;
  marketCount: number;
  topMarkets: string[];
  topArtists: string[];
  recentChartReleases: number;
};

type GenreAlbumCandidate = {
  collectionId: number;
  slug: string;
  href: string;
  title: string;
  artist: string;
  genre: string;
  releaseDate: string;
  artworkUrl: string;
  trackCount: number | null;
  matchedTerms: string[];
  chartHits: number;
  chartMarkets: string[];
  artistChartMarkets: string[];
  bestRank: number | null;
  score: number;
};

export type GenreLaneAlbum = {
  slug: string;
  href: string;
  title: string;
  artist: string;
  genre: string;
  releaseDate: string;
  artworkUrl: string;
  trackCount: number | null;
  source: "chart" | "search";
  matchedTerms: string[];
  sourceLabel: string;
  whyItShowsUp: string;
};

export type GenreLaneData = {
  genre: DiscoveryGenre;
  summary: string;
  signalLine: string;
  albums: GenreLaneAlbum[];
};

export type TrendingGenreCard = {
  slug: string;
  title: string;
  subtitle: string;
  href: string;
  signal: string;
};

export type TrendingGenresPayload = {
  genres: TrendingGenreCard[];
  mode: "live-derived" | "signal-thin";
  sourceSummary: string;
  refreshedAt: string;
  windowMinutes: number;
};

const TREND_WINDOW_MINUTES = 30;
const TREND_COUNTRIES = ["us", "gb", "br", "mx", "ng", "za", "fr", "de", "jp", "kr", "au"];
const COUNTRY_LABELS: Record<string, string> = {
  us: "the US",
  gb: "the UK",
  br: "Brazil",
  mx: "Mexico",
  ng: "Nigeria",
  za: "South Africa",
  fr: "France",
  de: "Germany",
  jp: "Japan",
  kr: "South Korea",
  au: "Australia",
};

const SEARCH_TERM_OVERRIDES: Record<string, { searchTerms: string[]; genreHints: string[] }> = {
  rock: {
    searchTerms: ["rock albums", "classic rock albums", "indie rock albums"],
    genreHints: ["rock", "classic rock", "alternative rock"],
  },
  country: {
    searchTerms: ["country albums", "americana albums", "modern country albums"],
    genreHints: ["country", "americana", "bluegrass"],
  },
  alternative: {
    searchTerms: ["alternative albums", "alternative rock albums", "indie alternative albums"],
    genreHints: ["alternative", "alternative rock", "indie rock", "shoegaze"],
  },
  "indie-rock": {
    searchTerms: ["indie rock albums", "indie albums", "indie guitar albums"],
    genreHints: ["indie rock", "indie", "alternative rock"],
  },
  dance: {
    searchTerms: ["dance albums", "dance pop albums", "house albums"],
    genreHints: ["dance", "dance pop", "house", "electronic"],
  },
  latin: {
    searchTerms: ["latin albums", "reggaeton albums", "regional mexicano albums"],
    genreHints: ["latin", "reggaeton", "latin pop", "regional mexicano", "salsa"],
  },
  afrobeats: {
    searchTerms: ["afrobeats albums", "amapiano albums", "afro fusion albums"],
    genreHints: ["afrobeats", "afropop", "afro-fusion", "amapiano"],
  },
  amapiano: {
    searchTerms: ["amapiano albums", "south african dance albums", "afrobeats albums"],
    genreHints: ["amapiano", "afrobeats", "afropop"],
  },
  "k-pop": {
    searchTerms: ["k-pop albums", "kpop albums", "korean pop albums"],
    genreHints: ["k-pop", "korean pop", "idol pop"],
  },
  "j-pop": {
    searchTerms: ["j-pop albums", "japanese pop albums", "city pop albums"],
    genreHints: ["j-pop", "japanese pop", "city pop"],
  },
  electronic: {
    searchTerms: ["electronic albums", "techno albums", "ambient albums"],
    genreHints: ["electronic", "techno", "ambient", "drum and bass"],
  },
  soul: {
    searchTerms: ["soul albums", "r&b albums", "neo soul albums"],
    genreHints: ["soul", "r&b", "neo-soul", "funk"],
  },
  metal: {
    searchTerms: ["metal albums", "thrash metal albums", "death metal albums"],
    genreHints: ["metal", "heavy metal", "thrash metal", "death metal"],
  },
  drill: {
    searchTerms: ["drill albums", "uk drill albums", "brooklyn drill albums", "Pop Smoke album", "Headie One album"],
    genreHints: ["drill", "uk drill", "brooklyn drill", "hip-hop/rap"],
  },
  "hip-hop": {
    searchTerms: ["hip hop albums", "rap albums", "hip-hop albums"],
    genreHints: ["hip-hop/rap", "hip hop", "rap"],
  },
  trap: {
    searchTerms: ["trap albums", "southern trap albums", "rap albums"],
    genreHints: ["trap", "hip-hop/rap", "rap"],
  },
  "r-b": {
    searchTerms: ["r&b albums", "rhythm and blues albums", "alternative r&b albums"],
    genreHints: ["r&b", "rhythm and blues", "alternative r&b"],
  },
  reggaeton: {
    searchTerms: ["reggaeton albums", "urbano latino albums", "latin trap albums"],
    genreHints: ["reggaeton", "urbano latino", "latin"],
  },
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatCountry(country: string) {
  return COUNTRY_LABELS[country] ?? country.toUpperCase();
}

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

function joinList(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function daysSince(dateValue: string) {
  if (!dateValue) {
    return null;
  }

  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

function formatReleaseLine(releaseDate: string) {
  if (!releaseDate) {
    return "Release date unavailable";
  }

  const parsed = new Date(releaseDate);

  if (Number.isNaN(parsed.getTime())) {
    return releaseDate;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildGenreSearchConfig(genre: DiscoveryGenre) {
  const override = SEARCH_TERM_OVERRIDES[genre.slug];

  if (override) {
    return override;
  }

  const searchTerms = Array.from(new Set([genre.title, `${genre.title} albums`, ...genre.aliases.slice(0, 3)])).slice(0, 6);
  const genreHints = Array.from(new Set([genre.title, ...genre.aliases]));

  return { searchTerms, genreHints };
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

async function fetchChartMarkets() {
  const results = await Promise.all(
    TREND_COUNTRIES.map(async (country) => ({
      country,
      entries: await fetchCountryChart(country),
    }))
  );

  return results.filter((result) => result.entries.length > 0);
}

function entryMatchesGenre(entry: AppleChartEntry, genre: DiscoveryGenre) {
  const rawGenres = extractGenres(entry);

  return rawGenres.some((rawGenre) => {
    const mappedSlug = mapRawGenreToDiscoverySlug(rawGenre);

    if (mappedSlug === genre.slug) {
      return true;
    }

    const normalizedRaw = normalize(rawGenre);

    return genre.aliases.some((alias) => normalizedRaw.includes(alias) || alias.includes(normalizedRaw));
  });
}

function buildChartSnapshot(genre: DiscoveryGenre, markets: GenreChartMarket[]): GenreChartSnapshot {
  const marketSignals = new Map<string, { hits: number; bestRank: number }>();
  const artistSignals = new Map<string, number>();
  let chartHits = 0;
  let bestRank: number | null = null;
  let recentChartReleases = 0;

  markets.forEach(({ country, entries }) => {
    entries.forEach((entry, index) => {
      if (!entryMatchesGenre(entry, genre)) {
        return;
      }

      chartHits += 1;
      bestRank = bestRank === null ? index + 1 : Math.min(bestRank, index + 1);

      const marketSignal = marketSignals.get(country) ?? { hits: 0, bestRank: Number.POSITIVE_INFINITY };
      marketSignal.hits += 1;
      marketSignal.bestRank = Math.min(marketSignal.bestRank, index + 1);
      marketSignals.set(country, marketSignal);

      const artist = entry.artistName?.trim();

      if (artist) {
        artistSignals.set(artist, (artistSignals.get(artist) ?? 0) + 1);
      }

      const age = daysSince(entry.releaseDate ?? "");

      if (age !== null && age <= 120) {
        recentChartReleases += 1;
      }
    });
  });

  const topMarkets = Array.from(marketSignals.entries())
    .sort((left, right) => right[1].hits - left[1].hits || left[1].bestRank - right[1].bestRank)
    .slice(0, 3)
    .map(([country]) => formatCountry(country));

  const topArtists = Array.from(artistSignals.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([artist]) => artist);

  return {
    chartHits,
    bestRank,
    marketCount: marketSignals.size,
    topMarkets,
    topArtists,
    recentChartReleases,
  };
}

function buildSummary(genre: DiscoveryGenre, snapshot: GenreChartSnapshot, searchAlbumCount: number) {
  const opening =
    snapshot.marketCount >= 4
      ? `${genre.title} is moving because releases tied to the lane are charting across ${snapshot.marketCount} markets${snapshot.topMarkets.length > 0 ? `, with the clearest pull in ${joinList(snapshot.topMarkets)}` : ""}.`
      : snapshot.bestRank !== null && snapshot.bestRank <= 5
        ? `${genre.title} is surfacing because the lane is landing near the top of current album charts${snapshot.topMarkets.length > 0 ? ` in ${joinList(snapshot.topMarkets)}` : ""}.`
        : searchAlbumCount > 0
          ? `${genre.title} is being surfaced because current listening interest around the lane is returning a strong set of matching releases right now.`
          : `${genre.title} is temporarily waiting on the next verified trend snapshot.`;

  const details: string[] = [];

  if (snapshot.topArtists.length > 0) {
    details.push(`Artists setting the pace include ${joinList(snapshot.topArtists)}.`);
  }

  if (snapshot.recentChartReleases >= 2) {
    details.push(`${snapshot.recentChartReleases} of the strongest chart matches are recent releases, so fresh output is part of the current lift.`);
  } else if (searchAlbumCount >= 6) {
    details.push(`Search activity around the genre is broad enough to keep the lane deeper than a one-album spike.`);
  }

  return [opening, ...details].join(" ").trim();
}

function buildSignalLine(snapshot: GenreChartSnapshot, searchAlbumCount: number) {
  const parts: string[] = [];

  if (snapshot.chartHits > 0) {
    parts.push(`${snapshot.chartHits} chart hits`);
  }

  if (snapshot.bestRank !== null) {
    parts.push(`best rank #${snapshot.bestRank}`);
  }

  if (snapshot.marketCount > 0) {
    parts.push(`${snapshot.marketCount} active markets`);
  }

  if (parts.length === 0 && searchAlbumCount > 0) {
    parts.push(`${searchAlbumCount} strong matching releases`);
  }

  return parts.join(" · ");
}

function buildSourceLabel(candidate: GenreAlbumCandidate) {
  if (candidate.chartHits >= 3) {
    return "Cross-market momentum";
  }

  const releaseAge = daysSince(candidate.releaseDate);

  if (releaseAge !== null && releaseAge <= 120) {
    return "Recent release heat";
  }

  if (candidate.matchedTerms.length >= 3) {
    return "Search lift";
  }

  if (candidate.artistChartMarkets.length >= 2) {
    return "Artist momentum";
  }

  return "Listener pull";
}

function buildAlbumReason(candidate: GenreAlbumCandidate, genre: DiscoveryGenre, index: number) {
  const reasons: string[] = [];

  if (candidate.chartHits > 0) {
    reasons.push(
      `${candidate.artist} is carrying current ${genre.title.toLowerCase()} traction with chart activity${candidate.chartMarkets.length > 0 ? ` in ${joinList(candidate.chartMarkets.slice(0, 2).map(formatCountry))}` : ""}.`
    );
  } else if (candidate.artistChartMarkets.length > 0) {
    reasons.push(
      `${candidate.artist} is part of the current ${genre.title.toLowerCase()} conversation because the artist is showing momentum across ${candidate.artistChartMarkets.length} active market${candidate.artistChartMarkets.length === 1 ? "" : "s"}.`
    );
  }

  if (candidate.matchedTerms.length > 0) {
    reasons.push(
      `${candidate.title} kept turning up across ${candidate.matchedTerms.length} separate ${genre.title.toLowerCase()} search patterns, which is a strong sign of current listener intent.`
    );
  }

  const releaseAge = daysSince(candidate.releaseDate);

  if (releaseAge !== null && releaseAge <= 120) {
    reasons.push("It is also a recent release, so fresh-streaming activity is helping it stay near the front of the lane.");
  }

  if (index === 0 && candidate.bestRank !== null && candidate.bestRank <= 10) {
    reasons.push(`It holds a lead spot here because the lane is seeing top-tier chart movement and this release is one of the clearest signals.`);
  }

  return reasons.join(" ").trim();
}

function upscaleArtwork(url?: string) {
  if (!url) {
    return "";
  }

  return url.replace("100x100bb", "600x600bb");
}

function createCandidateKey(entry: { collectionId?: number; artist: string; title: string }) {
  if (entry.collectionId) {
    return `id:${entry.collectionId}`;
  }

  return `text:${normalize(entry.artist)}::${normalize(entry.title)}`;
}

function mergeChartCandidates(genre: DiscoveryGenre, markets: GenreChartMarket[], candidates: Map<string, GenreAlbumCandidate>) {
  markets.forEach(({ country, entries }) => {
    entries.forEach((entry, index) => {
      if (!entryMatchesGenre(entry, genre)) {
        return;
      }

      const collectionId = Number(entry.id);

      if (!Number.isFinite(collectionId)) {
        return;
      }

      const title = entry.name?.trim();
      const artist = entry.artistName?.trim();

      if (!title || !artist) {
        return;
      }

      const key = createCandidateKey({ collectionId, artist, title });
      const existing = candidates.get(key) ?? {
        collectionId,
        slug: `itunes-${collectionId}`,
        href: `/album/itunes-${collectionId}?lane=${genre.slug}`,
        title,
        artist,
        genre: genre.title,
        releaseDate: entry.releaseDate ?? "",
        artworkUrl: upscaleArtwork(entry.artworkUrl100),
        trackCount: null,
        matchedTerms: [],
        chartHits: 0,
        chartMarkets: [],
        artistChartMarkets: [],
        bestRank: null,
        score: 0,
      };

      existing.chartHits += 1;
      existing.bestRank = existing.bestRank === null ? index + 1 : Math.min(existing.bestRank, index + 1);
      existing.score += Math.max(40, 160 - index * 3);

      if (!existing.chartMarkets.includes(country)) {
        existing.chartMarkets.push(country);
      }

      candidates.set(key, existing);
    });
  });

  const chartArtistMarkets = new Map<string, Set<string>>();

  candidates.forEach((candidate) => {
    const artistKey = normalize(candidate.artist);
    const existing = chartArtistMarkets.get(artistKey) ?? new Set<string>();
    candidate.chartMarkets.forEach((market) => existing.add(market));
    chartArtistMarkets.set(artistKey, existing);
  });

  candidates.forEach((candidate) => {
    const marketsForArtist = chartArtistMarkets.get(normalize(candidate.artist));

    if (!marketsForArtist) {
      return;
    }

    candidate.artistChartMarkets = Array.from(marketsForArtist);
    candidate.score += candidate.artistChartMarkets.length * 18;
  });
}

function mergeSearchCandidates(genre: DiscoveryGenre, searchAlbums: Awaited<ReturnType<typeof searchGenreAlbums>>, candidates: Map<string, GenreAlbumCandidate>) {
  searchAlbums.forEach((album) => {
    const key = createCandidateKey({
      collectionId: album.collectionId,
      artist: album.artist,
      title: album.title,
    });

    const existing = candidates.get(key) ?? {
      collectionId: album.collectionId,
      slug: album.slug,
      href: `/album/${album.slug}?lane=${genre.slug}`,
      title: album.title,
      artist: album.artist,
      genre: album.genre || genre.title,
      releaseDate: album.releaseDate,
      artworkUrl: album.artworkUrl,
      trackCount: album.trackCount,
      matchedTerms: [],
      chartHits: 0,
      chartMarkets: [],
      artistChartMarkets: [],
      bestRank: null,
      score: 0,
    };

    existing.genre = album.genre || existing.genre || genre.title;
    existing.releaseDate = existing.releaseDate || album.releaseDate;
    existing.artworkUrl = existing.artworkUrl || album.artworkUrl;
    existing.trackCount = existing.trackCount ?? album.trackCount ?? null;
    existing.score += album.score;

    album.matchedTerms.forEach((term) => {
      if (!existing.matchedTerms.includes(term)) {
        existing.matchedTerms.push(term);
      }
    });

    const releaseAge = daysSince(album.releaseDate);

    if (releaseAge !== null && releaseAge <= 120) {
      existing.score += 22;
    }

    candidates.set(key, existing);
  });
}

function buildAlbums(genre: DiscoveryGenre, searchAlbums: Awaited<ReturnType<typeof searchGenreAlbums>>, markets: GenreChartMarket[]) {
  const candidates = new Map<string, GenreAlbumCandidate>();

  mergeSearchCandidates(genre, searchAlbums, candidates);
  mergeChartCandidates(genre, markets, candidates);

  return Array.from(candidates.values())
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if ((left.bestRank ?? Number.POSITIVE_INFINITY) !== (right.bestRank ?? Number.POSITIVE_INFINITY)) {
        return (left.bestRank ?? Number.POSITIVE_INFINITY) - (right.bestRank ?? Number.POSITIVE_INFINITY);
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, 6)
    .map((candidate, index) => ({
      slug: candidate.slug,
      href: candidate.href,
      title: candidate.title,
      artist: candidate.artist,
      genre: candidate.genre || genre.title,
      releaseDate: candidate.releaseDate,
      artworkUrl: candidate.artworkUrl,
      trackCount: candidate.trackCount,
      source: candidate.chartHits > 0 ? "chart" as const : "search" as const,
      matchedTerms: candidate.matchedTerms,
      sourceLabel: buildSourceLabel(candidate),
      whyItShowsUp: buildAlbumReason(candidate, genre, index),
    }));
}

export async function getGenreLaneData(slug: string): Promise<GenreLaneData | null> {
  const genre = getDiscoveryGenreBySlug(slug);

  if (!genre) {
    return null;
  }

  const { searchTerms, genreHints } = buildGenreSearchConfig(genre);
  const [markets, searchAlbums] = await Promise.all([
    fetchChartMarkets(),
    searchGenreAlbums(searchTerms, genreHints, 24),
  ]);

  const snapshot = buildChartSnapshot(genre, markets);
  const albums = buildAlbums(genre, searchAlbums, markets);

  return {
    genre,
    summary: buildSummary(genre, snapshot, searchAlbums.length),
    signalLine: buildSignalLine(snapshot, searchAlbums.length),
    albums,
  };
}

function buildTrendingSubtitle(genre: DiscoveryGenre, snapshot: GenreChartSnapshot) {
  if (snapshot.marketCount >= 4) {
    return `${genre.description} Current lift is broad, with chart traction across ${snapshot.marketCount} markets${snapshot.topMarkets.length > 0 ? ` led by ${joinList(snapshot.topMarkets)}` : ""}.`;
  }

  if (snapshot.bestRank !== null && snapshot.bestRank <= 5) {
    return `${genre.description} The lane is breaking into the top of current album charts${snapshot.topMarkets.length > 0 ? ` in ${joinList(snapshot.topMarkets)}` : ""}.`;
  }

  if (snapshot.chartHits > 0) {
    return `${genre.description} The latest chart snapshot still shows repeated activity around this lane.`;
  }

  return `${genre.description} Awaiting the next verified trend update.`;
}

export async function getTrendingGenres(): Promise<TrendingGenresPayload> {
  const markets = await fetchChartMarkets();

  const ranked = discoveryGenres
    .map((genre) => {
      const snapshot = buildChartSnapshot(genre, markets);
      const score = snapshot.chartHits * 12 + snapshot.marketCount * 40 + (snapshot.bestRank ? Math.max(0, 30 - snapshot.bestRank) : 0);

      return {
        genre,
        snapshot,
        score,
      };
    })
    .filter((item) => item.snapshot.chartHits > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (left.snapshot.bestRank ?? Number.POSITIVE_INFINITY) - (right.snapshot.bestRank ?? Number.POSITIVE_INFINITY);
    })
    .slice(0, 5)
    .map(({ genre, snapshot }) => ({
      slug: genre.slug,
      title: genre.title,
      subtitle: buildTrendingSubtitle(genre, snapshot),
      href: `/catalog/${genre.slug}`,
      signal: buildSignalLine(snapshot, 0),
    }));

  return {
    genres: ranked,
    mode: ranked.length > 0 ? "live-derived" : "signal-thin",
    sourceSummary:
      ranked.length > 0
        ? `Built from the latest Apple Music chart snapshot across ${markets.length} active markets and refreshed every ${TREND_WINDOW_MINUTES} minutes.`
        : `The latest verified genre pulse is still refreshing, so this section will repopulate as soon as chart signals return.`,
    refreshedAt: new Date().toISOString(),
    windowMinutes: TREND_WINDOW_MINUTES,
  };
}

export function formatGenreAlbumRelease(releaseDate: string) {
  return formatReleaseLine(releaseDate);
}
