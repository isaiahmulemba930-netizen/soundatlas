import "server-only";

import { getDiscoveryGenreBySlug, type DiscoveryGenre, discoveryGenres } from "@/lib/genre-discovery";
import { fetchAlbumLookupByCollectionId } from "@/lib/itunes";

type AppleChartGenre = {
  name?: string;
};

type AppleChartEntry = {
  id?: string;
  name?: string;
  artistName?: string;
  artistUrl?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  url?: string;
  genres?: AppleChartGenre[];
};

type AppleChartPayload = {
  feed?: {
    title?: string;
    results?: AppleChartEntry[];
  };
};

type ItunesAlbumResult = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  releaseDate?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  trackCount?: number;
};

type ItunesSongResult = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionId?: number;
  collectionName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
};

type MusicBrainzArtistSearchResult = {
  id: string;
  name: string;
  country?: string;
  "life-span"?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  genres?: Array<{ name?: string }>;
  tags?: Array<{ name?: string }>;
};

type MusicBrainzArtistSearchPayload = {
  artists?: MusicBrainzArtistSearchResult[];
};

type MusicBrainzArtistPayload = {
  id: string;
  name: string;
  country?: string;
  area?: { name?: string };
  "begin-area"?: { name?: string };
  "life-span"?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  genres?: Array<{ name?: string }>;
  tags?: Array<{ name?: string }>;
};

type MusicBrainzReleaseGroup = {
  id: string;
  title: string;
  "first-release-date"?: string;
};

type MusicBrainzReleaseGroupPayload = {
  "release-groups"?: MusicBrainzReleaseGroup[];
};

type MusicBrainzReleaseSearchPayload = {
  releases?: Array<{
    "label-info"?: Array<{
      label?: {
        name?: string;
      };
    }>;
  }>;
};

type MusicBrainzRecordingSearchPayload = {
  recordings?: Array<{
    id: string;
  }>;
};

type MusicBrainzRecordingPayload = {
  relations?: Array<{
    type?: string;
    artist?: {
      name?: string;
    };
    work?: {
      id?: string;
    };
  }>;
};

type MusicBrainzWorkPayload = {
  relations?: Array<{
    type?: string;
    artist?: {
      name?: string;
    };
  }>;
};

type WikipediaSummaryPayload = {
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
};

type WikipediaSearchPayload = {
  query?: {
    search?: Array<{
      title?: string;
    }>;
  };
};

type GeniusSearchPayload = {
  response?: {
    sections?: Array<{
      type?: string;
      hits?: Array<{
        result?: {
          id?: number;
          url?: string;
          primary_artist?: {
            name?: string;
          };
        };
      }>;
    }>;
  };
};

type GeniusSongPayload = {
  response?: {
    song?: {
      description_preview?: string;
      url?: string;
    };
  };
};

export type TrendingAlbum = {
  rank: number;
  title: string;
  artist: string;
  href: string;
  coverArt: string;
  releaseDate: string;
  sourceUrl: string;
  chartLabel: string;
};

export type TrendingArtist = {
  rank: number;
  name: string;
  href: string;
  coverArt: string;
  sourceLabel: string;
  chartEvidence: string;
};

export type TrendingTrack = {
  rank: number;
  title: string;
  artist: string;
  href: string;
  coverArt: string;
  sourceUrl: string;
  chartLabel: string;
};

export type SearchAlbumResult = {
  id: number;
  title: string;
  artist: string;
  releaseDate: string;
  genre: string;
  coverArt: string;
  href: string;
};

export type SearchTrackResult = {
  id: number;
  title: string;
  artist: string;
  album: string;
  releaseDate: string;
  genre: string;
  durationMs: number | null;
  coverArt: string;
  href: string;
};

export type SearchArtistResult = {
  id: string;
  name: string;
  origin: string;
  genres: string[];
  yearsActive: string | null;
  href: string;
};

export type AlbumDetail = {
  title: string;
  artist: string;
  releaseDate: string;
  coverArt: string;
  genres: string[];
  tracklist: Array<{ title: string; trackNumber: number | null; durationMs: number | null }>;
  label: string | null;
  chartPerformance: string | null;
  sourcedContext: string | null;
  sourceUrl: string | null;
};

export type ArtistDetail = {
  name: string;
  origin: string | null;
  genres: string[];
  yearsActive: string | null;
  biography: string | null;
  sourceUrl: string | null;
  majorAlbums: Array<{ id: string; title: string; releaseDate: string }>;
  currentRelevance: string | null;
};

export type TrackDetail = {
  title: string;
  artist: string;
  primaryArtist: string;
  featuredArtists: string[];
  album: string | null;
  releaseDate: string | null;
  durationMs: number | null;
  genres: string[];
  producers: string[];
  songwriters: string[];
  label: string | null;
  chartPerformance: string | null;
  sourcedContext: string | null;
  sourceUrl: string | null;
  coverArt: string;
  meaning: {
    sourceName: string;
    sourceType: "artist_source_backed" | "editorial_database";
    text: string;
    sourceUrl: string | null;
  } | null;
  similarSongs: Array<{
    id: number;
    title: string;
    album: string;
    releaseDate: string;
    coverArt: string;
    href: string;
    reason: string;
  }>;
};

export type GenreFeatureCard = {
  id: string;
  type: "album" | "artist" | "track";
  title: string;
  subtitle: string;
  href: string;
  artworkUrl: string;
  whyItShowsUp: string;
  sourceLabel: string;
};

function upscaleArtwork(url?: string) {
  if (!url) return "";
  return url.replace("100x100bb", "600x600bb");
}

function sanitizeQuery(value: string) {
  return value.trim();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => (value ?? "").trim()).filter(Boolean)));
}

function splitArtistCredits(artistName: string) {
  const featuringPatterns = [
    /\s+\(feat\.\s*([^)]+)\)/i,
    /\s+feat\.\s+(.+)$/i,
    /\s+featuring\s+(.+)$/i,
  ];

  for (const pattern of featuringPatterns) {
    const match = artistName.match(pattern);
    if (match) {
      return {
        primaryArtist: artistName.replace(pattern, "").trim(),
        featuredArtists: uniqueStrings(match[1].split(/,|&| x /i)),
      };
    }
  }

  return {
    primaryArtist: artistName,
    featuredArtists: [] as string[],
  };
}

async function fetchJson<T>(url: string, options?: RequestInit & { next?: { revalidate?: number } }) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return (await response.json()) as T;
}

function getCountryFallbacks(country: string) {
  const normalized = country.toLowerCase();
  if (normalized === "us") {
    return ["us", "gb"];
  }

  return [normalized, "us", "gb"];
}

async function fetchAppleChart(kind: "albums" | "songs", country: string, limit = 10) {
  const endpoints = kind === "albums"
    ? [
        `https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/100/albums.json`,
        `https://rss.itunes.apple.com/api/v1/${country}/apple-music/top-albums/all/100/explicit.json`,
      ]
    : [
        `https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/100/songs.json`,
        `https://rss.itunes.apple.com/api/v1/${country}/apple-music/top-songs/all/100/explicit.json`,
      ];

  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJson<AppleChartPayload>(endpoint, {
        next: { revalidate: 1800 },
      });

      const results = payload.feed?.results ?? [];
      if (results.length > 0) {
        return results.slice(0, limit);
      }
    } catch {
      continue;
    }
  }

  return [] as AppleChartEntry[];
}

export async function getTrendingAlbums(country: string) {
  for (const candidate of getCountryFallbacks(country)) {
    const entries = await fetchAppleChart("albums", candidate, 5);
    if (entries.length === 5) {
      return entries.map((entry, index) => ({
        rank: index + 1,
        title: entry.name ?? "Unknown album",
        artist: entry.artistName ?? "Unknown artist",
        href: `/album/${entry.id ? `itunes-${entry.id}` : ""}`,
        coverArt: upscaleArtwork(entry.artworkUrl100),
        releaseDate: entry.releaseDate ?? "",
        sourceUrl: entry.url ?? "",
        chartLabel: `Apple Music Top Albums · ${candidate.toUpperCase()} · #${index + 1}`,
      })) satisfies TrendingAlbum[];
    }
  }

  return [] as TrendingAlbum[];
}

export async function getTrendingTracks(country: string) {
  for (const candidate of getCountryFallbacks(country)) {
    const entries = await fetchAppleChart("songs", candidate, 5);
    if (entries.length === 5) {
      return entries.map((entry, index) => ({
        rank: index + 1,
        title: entry.name ?? "Unknown track",
        artist: entry.artistName ?? "Unknown artist",
        href: `/track/${entry.id ?? ""}?country=${candidate}`,
        coverArt: upscaleArtwork(entry.artworkUrl100),
        sourceUrl: entry.url ?? "",
        chartLabel: `Apple Music Top Songs · ${candidate.toUpperCase()} · #${index + 1}`,
      })) satisfies TrendingTrack[];
    }
  }

  return [] as TrendingTrack[];
}

export async function getTrendingArtists(country: string) {
  for (const candidate of getCountryFallbacks(country)) {
    const [songEntries, albumEntries] = await Promise.all([
      fetchAppleChart("songs", candidate, 30),
      fetchAppleChart("albums", candidate, 30),
    ]);

    const scores = new Map<string, { score: number; artworkUrl: string; bestRank: number }>();

    songEntries.forEach((entry, index) => {
      const name = entry.artistName?.trim();
      if (!name) return;
      const current = scores.get(name) ?? {
        score: 0,
        artworkUrl: upscaleArtwork(entry.artworkUrl100),
        bestRank: index + 1,
      };
      current.score += 100 - index;
      current.bestRank = Math.min(current.bestRank, index + 1);
      if (!current.artworkUrl) current.artworkUrl = upscaleArtwork(entry.artworkUrl100);
      scores.set(name, current);
    });

    albumEntries.forEach((entry, index) => {
      const name = entry.artistName?.trim();
      if (!name) return;
      const current = scores.get(name) ?? {
        score: 0,
        artworkUrl: upscaleArtwork(entry.artworkUrl100),
        bestRank: index + 1,
      };
      current.score += 80 - index;
      current.bestRank = Math.min(current.bestRank, index + 1);
      if (!current.artworkUrl) current.artworkUrl = upscaleArtwork(entry.artworkUrl100);
      scores.set(name, current);
    });

    const ranked = Array.from(scores.entries())
      .sort((left, right) => right[1].score - left[1].score || left[1].bestRank - right[1].bestRank)
      .slice(0, 5);

    if (ranked.length === 5) {
      const searchResults = await Promise.all(
        ranked.map(async ([name]) => {
          const payload = await fetchJson<MusicBrainzArtistSearchPayload>(
            `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(name)}&fmt=json&limit=1`,
            {
              headers: { "User-Agent": "SoundAtlasApp/1.0 (discovery route)" },
              next: { revalidate: 1800 },
            }
          ).catch(() => ({ artists: [] }));

          return payload.artists?.[0] ?? null;
        })
      );

      return ranked.map(([name, signal], index) => {
        const mbArtist = searchResults[index];
        return {
          rank: index + 1,
          name,
          href: mbArtist ? `/artistmb/${mbArtist.id}?country=${candidate}` : `/discover/artists?q=${encodeURIComponent(name)}`,
          coverArt: signal.artworkUrl,
          sourceLabel: `Derived from Apple Music top songs and albums in ${candidate.toUpperCase()}`,
          chartEvidence: `Strongest current artist signal in the ${candidate.toUpperCase()} chart window, best rank #${signal.bestRank}.`,
        } satisfies TrendingArtist;
      });
    }
  }

  return [] as TrendingArtist[];
}

export async function searchAlbums(query: string, country: string) {
  const trimmed = sanitizeQuery(query);
  if (!trimmed) return [] as SearchAlbumResult[];

  const payload = await fetchJson<{ results?: ItunesAlbumResult[] }>(
    `https://itunes.apple.com/search?${new URLSearchParams({
      term: trimmed,
      media: "music",
      entity: "album",
      country,
      limit: "12",
    }).toString()}`,
    { next: { revalidate: 3600 } }
  ).catch(() => ({ results: [] }));

  return (payload.results ?? []).map((album) => ({
    id: album.collectionId,
    title: album.collectionName,
    artist: album.artistName,
    releaseDate: album.releaseDate ?? "",
    genre: album.primaryGenreName ?? "",
    coverArt: upscaleArtwork(album.artworkUrl100),
    href: `/album/itunes-${album.collectionId}?country=${country}`,
  }));
}

export async function searchTracks(query: string, country: string) {
  const trimmed = sanitizeQuery(query);
  if (!trimmed) return [] as SearchTrackResult[];

  const payload = await fetchJson<{ results?: ItunesSongResult[] }>(
    `https://itunes.apple.com/search?${new URLSearchParams({
      term: trimmed,
      media: "music",
      entity: "song",
      country,
      limit: "18",
    }).toString()}`,
    { next: { revalidate: 3600 } }
  ).catch(() => ({ results: [] }));

  return (payload.results ?? []).map((track) => ({
    id: track.trackId,
    title: track.trackName,
    artist: track.artistName,
    album: track.collectionName ?? "",
    releaseDate: track.releaseDate ?? "",
    genre: track.primaryGenreName ?? "",
    durationMs: track.trackTimeMillis ?? null,
    coverArt: upscaleArtwork(track.artworkUrl100),
    href: `/track/${track.trackId}?country=${country}`,
  }));
}

export async function searchArtists(query: string) {
  const trimmed = sanitizeQuery(query);
  if (!trimmed) return [] as SearchArtistResult[];

  const payload = await fetchJson<MusicBrainzArtistSearchPayload>(
    `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(trimmed)}&fmt=json&limit=12`,
    {
      headers: { "User-Agent": "SoundAtlasApp/1.0 (artist search)" },
      next: { revalidate: 3600 },
    }
  ).catch(() => ({ artists: [] }));

  return (payload.artists ?? []).map((artist) => ({
    id: artist.id,
    name: artist.name,
    origin: artist.country ?? "",
    genres: uniqueStrings([
      ...(artist.genres?.map((genre) => genre.name) ?? []),
      ...(artist.tags?.map((tag) => tag.name) ?? []),
    ]).slice(0, 3),
    yearsActive: artist["life-span"]?.begin
      ? `${artist["life-span"]?.begin}${artist["life-span"]?.end ? ` - ${artist["life-span"]?.end}` : artist["life-span"]?.ended ? "" : " - present"}`
      : null,
    href: `/artistmb/${artist.id}`,
  }));
}

async function searchWikipediaTitle(query: string) {
  const payload = await fetchJson<WikipediaSearchPayload>(
    `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
      action: "query",
      list: "search",
      format: "json",
      srlimit: "3",
      srsearch: query,
    }).toString()}`,
    {
      headers: { "User-Agent": "SoundAtlasApp/1.0 (wikipedia search)" },
      next: { revalidate: 86400 },
    }
  ).catch(() => ({ query: { search: [] } }));

  return payload.query?.search?.[0]?.title ?? null;
}

async function fetchWikipediaSummary(title: string) {
  const payload = await fetchJson<WikipediaSummaryPayload>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    {
      headers: { "User-Agent": "SoundAtlasApp/1.0 (wikipedia summary)" },
      next: { revalidate: 86400 },
    }
  ).catch(() => ({ extract: undefined, content_urls: undefined } satisfies WikipediaSummaryPayload));

  return {
    extract: payload.extract ?? null,
    sourceUrl: payload.content_urls?.desktop?.page ?? null,
  };
}

async function fetchAlbumContext(title: string, artist: string) {
  const pageTitle = await searchWikipediaTitle(`"${title}" album ${artist}`);
  if (!pageTitle) return { extract: null, sourceUrl: null };
  return fetchWikipediaSummary(pageTitle);
}

async function fetchTrackContext(title: string, artist: string) {
  const pageTitle = await searchWikipediaTitle(`"${title}" song ${artist}`);
  if (!pageTitle) return { extract: null, sourceUrl: null };
  return fetchWikipediaSummary(pageTitle);
}

async function fetchArtistContext(name: string) {
  const pageTitle = await searchWikipediaTitle(`${name} musician`);
  if (!pageTitle) return { extract: null, sourceUrl: null };
  return fetchWikipediaSummary(pageTitle);
}

async function fetchMusicBrainzRelease(title: string, artist: string) {
  return fetchJson<MusicBrainzReleaseSearchPayload>(
    `https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(`release:"${title}" AND artist:"${artist}"`)}&fmt=json&limit=5&inc=labels`,
    {
      headers: { "User-Agent": "SoundAtlasApp/1.0 (release detail)" },
      next: { revalidate: 86400 },
    }
  ).catch(() => ({ releases: [] }));
}

async function fetchTrackCredits(title: string, artist: string) {
  const searchPayload = await fetchJson<MusicBrainzRecordingSearchPayload>(
    `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`)}&fmt=json&limit=1`,
    {
      headers: { "User-Agent": "SoundAtlasApp/1.0 (recording search)" },
      next: { revalidate: 86400 },
    }
  ).catch(() => ({ recordings: [] }));

  const recordingId = searchPayload.recordings?.[0]?.id;
  if (!recordingId) {
    return { producers: [] as string[], songwriters: [] as string[] };
  }

  const recordingPayload = await fetchJson<MusicBrainzRecordingPayload>(
    `https://musicbrainz.org/ws/2/recording/${recordingId}?inc=artist-rels+work-rels&fmt=json`,
    {
      headers: { "User-Agent": "SoundAtlasApp/1.0 (recording detail)" },
      next: { revalidate: 86400 },
    }
  ).catch(() => null);

  if (!recordingPayload) {
    return { producers: [] as string[], songwriters: [] as string[] };
  }

  const producers = uniqueStrings(
    recordingPayload.relations
      ?.filter((relation) => (relation.type ?? "").toLowerCase().includes("producer"))
      .map((relation) => relation.artist?.name) ?? []
  );

  const workIds = uniqueStrings(
    recordingPayload.relations
      ?.filter((relation) => relation.work?.id)
      .map((relation) => relation.work?.id) ?? []
  );

  const workPayloads = await Promise.all(
    workIds.slice(0, 3).map((workId) =>
      fetchJson<MusicBrainzWorkPayload>(
        `https://musicbrainz.org/ws/2/work/${workId}?inc=artist-rels&fmt=json`,
        {
          headers: { "User-Agent": "SoundAtlasApp/1.0 (work detail)" },
          next: { revalidate: 86400 },
        }
      ).catch(() => ({ relations: [] }))
    )
  );

  const songwriters = uniqueStrings(
    workPayloads.flatMap((payload) =>
      payload.relations
        ?.filter((relation) => ["writer", "lyricist", "composer"].includes((relation.type ?? "").toLowerCase()))
        .map((relation) => relation.artist?.name) ?? []
    )
  );

  return { producers, songwriters };
}

async function fetchGeniusMeaning(title: string, artist: string): Promise<TrackDetail["meaning"]> {
  const searchPayload = await fetchJson<GeniusSearchPayload>(
    `https://genius.com/api/search/song?${new URLSearchParams({
      q: `${title} ${artist}`,
      per_page: "5",
    }).toString()}`,
    {
      headers: { "User-Agent": "SoundAtlasApp/1.0 (genius search)" },
      next: { revalidate: 86400 },
    }
  ).catch(() => ({ response: { sections: [] } }));

  const songHit = searchPayload.response?.sections
    ?.find((section) => section.type === "song")
    ?.hits?.find((hit) => {
      const hitArtist = hit.result?.primary_artist?.name?.toLowerCase() ?? "";
      return hitArtist.includes(artist.toLowerCase());
    })
    ?.result;

  if (!songHit?.id) {
    return null;
  }

  const songPayload = await fetchJson<GeniusSongPayload>(
    `https://genius.com/api/songs/${songHit.id}`,
    {
      headers: { "User-Agent": "SoundAtlasApp/1.0 (genius song)" },
      next: { revalidate: 86400 },
    }
  ).catch(() => ({ response: { song: undefined } }));

  const preview = songPayload.response?.song?.description_preview?.trim();
  if (!preview) {
    return null;
  }

  return {
    sourceName: "Genius",
    sourceType: "editorial_database" as const,
    text: preview,
    sourceUrl: songPayload.response?.song?.url ?? songHit.url ?? null,
  };
}

async function getSimilarSongsByArtist(artist: string, currentTitle: string, currentAlbum: string | null, country: string) {
  const results = await searchTracks(artist, country);

  return results
    .filter((track) => track.artist.toLowerCase().includes(artist.toLowerCase()))
    .filter((track) => track.title.toLowerCase() !== currentTitle.toLowerCase())
    .sort((left, right) => {
      const leftSameAlbum = currentAlbum && left.album.toLowerCase() === currentAlbum.toLowerCase() ? 1 : 0;
      const rightSameAlbum = currentAlbum && right.album.toLowerCase() === currentAlbum.toLowerCase() ? 1 : 0;
      return rightSameAlbum - leftSameAlbum;
    })
    .slice(0, 6)
    .map((track) => ({
      id: track.id,
      title: track.title,
      album: track.album,
      releaseDate: track.releaseDate,
      coverArt: track.coverArt,
      href: track.href,
      reason:
        currentAlbum && track.album.toLowerCase() === currentAlbum.toLowerCase()
          ? `From the same album era as ${currentTitle}.`
          : "Surfacing from the same artist’s current verified catalog results.",
    }));
}

export async function getAlbumDetail(collectionId: number, country: string) {
  const [albumLookup, chartEntries] = await Promise.all([
    fetchAlbumLookupByCollectionId(collectionId),
    fetchAppleChart("albums", country, 100),
  ]);

  if (!albumLookup) {
    return null;
  }

  const chartRank = chartEntries.findIndex((entry) => String(entry.id) === String(collectionId));
  const mbRelease = await fetchMusicBrainzRelease(albumLookup.title, albumLookup.artist);
  const label = mbRelease.releases?.[0]?.["label-info"]?.find((item) => item.label?.name)?.label?.name ?? null;
  const wikiContext = await fetchAlbumContext(albumLookup.title, albumLookup.artist);

  return {
    title: albumLookup.title,
    artist: albumLookup.artist,
    releaseDate: albumLookup.releaseDate,
    coverArt: albumLookup.artworkUrl,
    genres: uniqueStrings([albumLookup.genre]),
    tracklist: albumLookup.tracks,
    label,
    chartPerformance: chartRank >= 0 ? `Currently #${chartRank + 1} on Apple Music Top Albums in ${country.toUpperCase()}.` : null,
    sourcedContext: wikiContext.extract,
    sourceUrl: wikiContext.sourceUrl,
  } satisfies AlbumDetail;
}

export async function getArtistDetail(artistId: string, country: string) {
  const [artistPayload, releaseGroups, context, trendingArtists] = await Promise.all([
    fetchJson<MusicBrainzArtistPayload>(
      `https://musicbrainz.org/ws/2/artist/${artistId}?inc=url-rels+genres+tags+aliases&fmt=json`,
      {
        headers: { "User-Agent": "SoundAtlasApp/1.0 (artist detail)" },
        next: { revalidate: 86400 },
      }
    ).catch(() => null),
    fetchJson<MusicBrainzReleaseGroupPayload>(
      `https://musicbrainz.org/ws/2/release-group?artist=${artistId}&type=album&fmt=json&limit=8`,
      {
        headers: { "User-Agent": "SoundAtlasApp/1.0 (artist albums)" },
        next: { revalidate: 86400 },
      }
    ).catch(() => ({ "release-groups": [] })),
    (async () => {
      const artist = await fetchJson<MusicBrainzArtistPayload>(
        `https://musicbrainz.org/ws/2/artist/${artistId}?inc=url-rels+genres+tags+aliases&fmt=json`,
        {
          headers: { "User-Agent": "SoundAtlasApp/1.0 (artist context)" },
          next: { revalidate: 86400 },
        }
      ).catch(() => null);

      if (!artist) return { extract: null, sourceUrl: null };
      return fetchArtistContext(artist.name);
    })(),
    getTrendingArtists(country),
  ]);

  if (!artistPayload) {
    return null;
  }

  const trendingMatch = trendingArtists.find((artist) => artist.name.toLowerCase() === artistPayload.name.toLowerCase());

  return {
    name: artistPayload.name,
    origin: artistPayload["begin-area"]?.name ?? artistPayload.area?.name ?? artistPayload.country ?? null,
    genres: uniqueStrings([
      ...(artistPayload.genres?.map((genre) => genre.name) ?? []),
      ...(artistPayload.tags?.map((tag) => tag.name) ?? []),
    ]).slice(0, 6),
    yearsActive: artistPayload["life-span"]?.begin
      ? `${artistPayload["life-span"]?.begin}${artistPayload["life-span"]?.end ? ` - ${artistPayload["life-span"]?.end}` : artistPayload["life-span"]?.ended ? "" : " - present"}`
      : null,
    biography: context.extract,
    sourceUrl: context.sourceUrl,
    majorAlbums: (releaseGroups["release-groups"] ?? []).map((album) => ({
      id: album.id,
      title: album.title,
      releaseDate: album["first-release-date"] ?? "",
    })),
    currentRelevance: trendingMatch ? trendingMatch.chartEvidence : null,
  } satisfies ArtistDetail;
}

export async function getTrackDetail(trackId: number, country: string) {
  const [payload, chartEntries] = await Promise.all([
    fetchJson<{ results?: ItunesSongResult[] }>(
      `https://itunes.apple.com/lookup?${new URLSearchParams({ id: String(trackId) }).toString()}`,
      { next: { revalidate: 86400 } }
    ).catch(() => ({ results: [] })),
    fetchAppleChart("songs", country, 100),
  ]);

  const track = payload.results?.find((item) => item.trackId === trackId);
  if (!track) {
    return null;
  }

  const artistCredits = splitArtistCredits(track.artistName);
  const chartRank = chartEntries.findIndex((entry) => String(entry.id) === String(trackId));
  const [context, credits, meaning, releasePayload, similarSongs] = await Promise.all([
    fetchTrackContext(track.trackName, track.artistName),
    fetchTrackCredits(track.trackName, track.artistName),
    fetchGeniusMeaning(track.trackName, track.artistName),
    fetchMusicBrainzRelease(track.collectionName ?? track.trackName, track.artistName),
    getSimilarSongsByArtist(artistCredits.primaryArtist, track.trackName, track.collectionName ?? null, country),
  ]);
  const label = releasePayload.releases?.[0]?.["label-info"]?.find((item) => item.label?.name)?.label?.name ?? null;

  return {
    title: track.trackName,
    artist: track.artistName,
    primaryArtist: artistCredits.primaryArtist,
    featuredArtists: artistCredits.featuredArtists,
    album: track.collectionName ?? null,
    releaseDate: track.releaseDate ?? null,
    durationMs: track.trackTimeMillis ?? null,
    genres: uniqueStrings([track.primaryGenreName]),
    producers: credits.producers,
    songwriters: credits.songwriters,
    label,
    chartPerformance: chartRank >= 0 ? `Currently #${chartRank + 1} on Apple Music Top Songs in ${country.toUpperCase()}.` : null,
    sourcedContext: context.extract,
    sourceUrl: context.sourceUrl,
    coverArt: upscaleArtwork(track.artworkUrl100),
    meaning,
    similarSongs,
  } satisfies TrackDetail;
}

export function getRotatingGenres() {
  const sortedGenres = [...discoveryGenres].sort((left, right) => left.slug.localeCompare(right.slug));
  const bucket = Math.floor(Date.now() / (1000 * 60 * 30));
  const startIndex = (bucket * 5) % sortedGenres.length;
  return Array.from({ length: 5 }, (_, index) => sortedGenres[(startIndex + index) % sortedGenres.length]);
}

function genreMatches(itemGenres: Array<string | undefined>, genre: DiscoveryGenre) {
  const normalized = uniqueStrings(itemGenres).map((value) => value.toLowerCase());
  return genre.aliases.some((alias) => normalized.some((value) => value.includes(alias) || alias.includes(value)));
}

export async function getGenreFeatureCards(slug: string, country: string) {
  const genre = getDiscoveryGenreBySlug(slug);
  if (!genre) {
    return [];
  }

  const [albums, tracks, artists] = await Promise.all([
    searchAlbums(`${genre.title}`, country),
    searchTracks(`${genre.title}`, country),
    searchArtists(`${genre.title}`),
  ]);

  const albumCards = albums
    .filter((album) => genreMatches([album.genre], genre))
    .slice(0, 3)
    .map((album, index) => ({
      id: `album-${album.id}`,
      type: "album" as const,
      title: album.title,
      subtitle: album.artist,
      href: album.href,
      artworkUrl: album.coverArt,
      whyItShowsUp: `${album.title} is surfacing here because iTunes currently classifies it inside or adjacent to ${genre.title}, and it is ranking high enough in live storefront search for this genre query.`,
      sourceLabel: index === 0 ? "Live iTunes album search" : "Genre storefront signal",
    }));

  const trackCards = tracks
    .filter((track) => genreMatches([track.genre], genre))
    .slice(0, 2)
    .map((track) => ({
      id: `track-${track.id}`,
      type: "track" as const,
      title: track.title,
      subtitle: `${track.artist}${track.album ? ` · ${track.album}` : ""}`,
      href: track.href,
      artworkUrl: track.coverArt,
      whyItShowsUp: `${track.title} appears because the current song search signal for ${genre.title} is returning it with a verified ${track.genre || genre.title} classification.`,
      sourceLabel: "Live iTunes song search",
    }));

  const artistCards = artists
    .filter((artist) => artist.genres.some((artistGenre) => genre.aliases.some((alias) => artistGenre.toLowerCase().includes(alias))))
    .slice(0, 2)
    .map((artist) => ({
      id: `artist-${artist.id}`,
      type: "artist" as const,
      title: artist.name,
      subtitle: artist.origin || "Origin unavailable",
      href: artist.href,
      artworkUrl: "",
      whyItShowsUp: `${artist.name} shows up here because MusicBrainz tags and genre data currently connect this artist to ${genre.title}.`,
      sourceLabel: "MusicBrainz artist metadata",
    }));

  return [...albumCards, ...artistCards, ...trackCards].slice(0, 6) as GenreFeatureCard[];
}
