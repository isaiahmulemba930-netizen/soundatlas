import "server-only";

import { getCountryName } from "@/lib/market";
import type { UpcomingRelease, UpcomingReleasesPayload, UpcomingReleaseStatus } from "@/lib/upcoming-release-types";

type AppleChartEntry = {
  artistName?: string;
};

type AppleChartPayload = {
  feed?: {
    results?: AppleChartEntry[];
  };
};

type ItunesAlbumResult = {
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  collectionType?: string;
  releaseDate?: string;
  artworkUrl100?: string;
  primaryGenreName?: string;
  trackCount?: number;
  url?: string;
};

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  sourceName: string;
};

type ArtistCandidate = {
  name: string;
  href: string;
};

const UPCOMING_REVALIDATE_SECONDS = 60 * 30;
const NEWS_REVALIDATE_SECONDS = 60 * 30;
const MAX_ARTISTS_TO_SCAN = 12;
const REFERENCE_DATE_ISO = "2026-03-17T23:59:59.000Z";
const REFERENCE_TIMESTAMP = new Date(REFERENCE_DATE_ISO).getTime();
const SUPPORTED_NEWS_SOURCES = new Set([
  "Billboard",
  "Billboard Canada",
  "Rolling Stone",
  "Variety",
  "Pitchfork",
  "NME",
  "Complex",
  "UPROXX",
  "Hypebeast",
  "The FADER",
  "Consequence",
  "Stereogum",
  "Clash",
  "Okayplayer",
  "HipHopDX",
  "Rap-Up",
  "XXL",
  "The Source",
  "People",
  "Forbes",
]);

function upscaleArtwork(url?: string) {
  if (!url) {
    return "";
  }

  return url.replace("100x100bb", "600x600bb");
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, "").trim();
}

function formatReleaseDate(value: string | null) {
  if (!value) {
    return "Date unconfirmed";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unconfirmed";
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getArtistHref(artistName: string) {
  return `/discover/artists?q=${encodeURIComponent(artistName)}`;
}

async function searchArtistCandidates(query: string) {
  try {
    const response = await fetch(`https://musicbrainz.org/ws/2/artist?${new URLSearchParams({
      query,
      fmt: "json",
      limit: "5",
    }).toString()}`, {
      headers: { "User-Agent": "SoundAtlasApp/1.0 (upcoming releases artist search)" },
      next: { revalidate: UPCOMING_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return [] as ArtistCandidate[];
    }

    const payload = (await response.json()) as {
      artists?: Array<{ id?: string; name?: string }>;
    };

    return (payload.artists ?? [])
      .filter((artist) => artist.id && artist.name)
      .map((artist) => ({
        name: artist.name as string,
        href: `/artistmb/${artist.id}`,
      }));
  } catch {
    return [] as ArtistCandidate[];
  }
}

function isCompleteReleaseTitle(value: string, artistName: string) {
  const title = value.trim();
  const normalizedTitle = normalize(title);

  if (!title || title.length < 3 || title.length > 80) {
    return false;
  }

  if (normalizedTitle === normalize(artistName)) {
    return false;
  }

  if (!/[a-z0-9]/i.test(title)) {
    return false;
  }

  if (/[.:-]\s*$/.test(title)) {
    return false;
  }

  if (/\b(album|project|ep|mixtape|single|release|rollout|era|music)\b$/i.test(title)) {
    return false;
  }

  if (/^(new|upcoming|next|forthcoming)\s+/i.test(title)) {
    return false;
  }

  if (title.split(/\s+/).length === 1 && title.length < 5) {
    return false;
  }

  return true;
}

function isReleaseTitleSupportedByHeadline(headline: string, artistName: string, releaseTitle: string) {
  const normalizedHeadline = normalize(headline);
  const normalizedReleaseTitle = normalize(releaseTitle);

  if (!normalizedHeadline.includes(normalizedReleaseTitle)) {
    return false;
  }

  if (new RegExp(`(?:single|song|track)\\s+${normalizedReleaseTitle}`).test(normalizedHeadline)) {
    return false;
  }

  if (new RegExp(`${normalizedReleaseTitle}\\s+(?:single|song|track)`).test(normalizedHeadline)) {
    return false;
  }

  if (!/\b(album|ep|mixtape|project|record)\b/.test(normalizedHeadline) && /\b(single|song|track)\b/.test(normalizedHeadline)) {
    return false;
  }

  if (normalizedReleaseTitle === normalize(artistName)) {
    return false;
  }

  return true;
}

function getStatusLabel(status: UpcomingReleaseStatus) {
  if (status === "confirmed") {
    return "Confirmed";
  }

  if (status === "expected") {
    return "Expected";
  }

  return "Teased";
}

function getReleaseType(collectionType?: string | null) {
  const normalized = normalize(collectionType ?? "");

  if (normalized.includes("ep")) {
    return "EP";
  }

  if (normalized.includes("mixtape")) {
    return "Mixtape";
  }

  if (normalized.includes("single")) {
    return "Single";
  }

  return "Album";
}

function parseXmlItems(xml: string) {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  return items
    .map((item) => {
      const title = decodeHtml(stripTags(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? ""));
      const link = decodeHtml(stripTags(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? ""));
      const pubDate = decodeHtml(stripTags(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? ""));
      const sourceName = decodeHtml(stripTags(item.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] ?? ""));

      if (!title || !link) {
        return null;
      }

      return {
        title,
        link,
        pubDate,
        sourceName,
      } satisfies NewsItem;
    })
    .filter((item): item is NewsItem => item !== null);
}

function getCountryLabel(country: string) {
  return getCountryName(country);
}

async function fetchJson<T>(url: string, init?: RequestInit & { next?: { revalidate?: number } }) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchText(url: string, init?: RequestInit & { next?: { revalidate?: number } }) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return response.text();
}

async function fetchAppleChart(kind: "albums" | "songs", country: string, limit = 100) {
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
        next: { revalidate: UPCOMING_REVALIDATE_SECONDS },
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

async function getRelevantArtists(country: string) {
  const [songEntries, albumEntries] = await Promise.all([
    fetchAppleChart("songs", country, 80),
    fetchAppleChart("albums", country, 80),
  ]);

  const scores = new Map<string, number>();

  songEntries.forEach((entry, index) => {
    const artist = entry.artistName?.trim();

    if (!artist) {
      return;
    }

    scores.set(artist, (scores.get(artist) ?? 0) + Math.max(8, 120 - index));
  });

  albumEntries.forEach((entry, index) => {
    const artist = entry.artistName?.trim();

    if (!artist) {
      return;
    }

    scores.set(artist, (scores.get(artist) ?? 0) + Math.max(8, 100 - index));
  });

  return Array.from(scores.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, MAX_ARTISTS_TO_SCAN);
}

async function fetchOfficialArtistReleases(artistName: string, country: string) {
  try {
    const url = `https://itunes.apple.com/search?${new URLSearchParams({
      term: artistName,
      media: "music",
      entity: "album",
      country,
      limit: "25",
    }).toString()}`;

    const payload = await fetchJson<{ results?: ItunesAlbumResult[] }>(url, {
      next: { revalidate: UPCOMING_REVALIDATE_SECONDS },
    });

    return (payload.results ?? []).filter((release) => {
      const artist = release.artistName?.trim();
      const title = release.collectionName?.trim();
      const releaseTime = release.releaseDate ? new Date(release.releaseDate).getTime() : Number.NaN;

      return (
        Boolean(artist) &&
        Boolean(title) &&
        normalize(artist ?? "").includes(normalize(artistName)) &&
        isCompleteReleaseTitle(title ?? "", artistName) &&
        Number.isFinite(releaseTime) &&
        releaseTime > REFERENCE_TIMESTAMP &&
        getReleaseType(release.collectionType ?? null) !== "Single"
      );
    });
  } catch {
    return [] as ItunesAlbumResult[];
  }
}

async function fetchArtistNews(artistName: string, country: string) {
  const query = `"${artistName}" (album OR EP OR mixtape OR project) (announce OR announced OR release OR teaser OR teased OR upcoming)`;
  const ceidCountry = country.toUpperCase();
  const url = `https://news.google.com/rss/search?${new URLSearchParams({
    hl: "en-US",
    gl: ceidCountry,
    ceid: `${ceidCountry}:en`,
    q: query,
  }).toString()}`;

  try {
    const xml = await fetchText(url, {
      next: { revalidate: NEWS_REVALIDATE_SECONDS },
    });

    return parseXmlItems(xml)
      .filter((item) => {
        return item.sourceName ? SUPPORTED_NEWS_SOURCES.has(item.sourceName) : false;
      })
      .slice(0, 8);
  } catch {
    return [] as NewsItem[];
  }
}

function parseReleaseTitleFromNews(title: string, artistName: string) {
  const quotedMatches = Array.from(title.matchAll(/[“"'‘’]([^“"'‘’]{2,80})[”"'‘’]/g))
    .map((match) => match[1].trim())
    .filter((value) => value && normalize(value) !== normalize(artistName));

  if (quotedMatches.length > 0) {
    return quotedMatches[quotedMatches.length - 1];
  }

  const titledMatch = title.match(/(?:album|ep|mixtape|project)\s+([A-Z0-9][A-Za-z0-9$'&:!\- ]{1,60})/);

  if (titledMatch?.[1]) {
    const candidate = titledMatch[1].trim();

    if (!normalize(candidate).includes(normalize(artistName))) {
      return candidate;
    }
  }

  return null;
}

function parseStatusFromNews(title: string): UpcomingReleaseStatus | null {
  const normalizedTitle = normalize(title);

  if (/\b(out now|released|release day|review|reviews|streaming now|now available|first week|debuted|debuts|earns)\b/.test(normalizedTitle)) {
    return null;
  }

  if (/\b(delayed|delay|postponed|pushes back|pushed back)\b/.test(normalizedTitle)) {
    return "expected";
  }

  if (/\b(announces|announced|official release date|release date|arrives|dropping|drops)\b/.test(normalizedTitle)) {
    return "expected";
  }

  if (/\b(teases|teased|working on|rollout|preview|hints|hinted|upcoming)\b/.test(normalizedTitle)) {
    return "teased";
  }

  return null;
}

function parseReleaseTypeFromNews(title: string) {
  const normalizedTitle = normalize(title);

  if (normalizedTitle.includes("mixtape")) {
    return "Mixtape";
  }

  if (normalizedTitle.includes(" ep ")) {
    return "EP";
  }

  if (normalizedTitle.includes("project")) {
    return "Project";
  }

  return "Album";
}

function parseDateFromText(value: string) {
  const monthMatch = value.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?/i
  );

  if (!monthMatch) {
    return null;
  }

  const parsed = new Date(monthMatch[0]);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function parseNewsDate(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeReleaseKey(artistName: string, releaseTitle: string) {
  const normalizedTitle = normalize(releaseTitle)
    .replace(/\b(deluxe|expanded|explicit|clean|version|edition|complete)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${normalize(artistName)}::${normalizedTitle}`;
}

function buildOfficialReason(countryName: string, artistMomentum: number, daysUntilRelease: number) {
  if (artistMomentum >= 180) {
    return `Officially announced and drawing strong attention in ${countryName} because the artist is already moving heavily in local listening right now.`;
  }

  if (daysUntilRelease <= 14) {
    return "Officially announced and nearing release, which is driving a fresh wave of pre-release attention.";
  }

  return "Officially announced and already visible through real pre-release listings, making it one of the stronger upcoming signals right now.";
}

function buildNewsReason(status: UpcomingReleaseStatus, sourceName: string, artistMomentum: number, countryName: string) {
  if (status === "teased" && artistMomentum >= 180) {
    return `Recently teased by the artist and widely covered, with especially strong fan attention around ${countryName}.`;
  }

  if (status === "teased") {
    return `Recently teased and picked up by ${sourceName}, which is giving the project real early momentum.`;
  }

  if (artistMomentum >= 180) {
    return `Widely covered and highly anticipated in ${countryName} because the artist already has strong local momentum.`;
  }

  return `Credibly surfaced by ${sourceName} and drawing enough real anticipation to stand out in the current release cycle.`;
}

function daysUntil(releaseDate: string) {
  const parsed = new Date(releaseDate);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.ceil((parsed.getTime() - REFERENCE_TIMESTAMP) / (1000 * 60 * 60 * 24));
}

type AggregatedRelease = UpcomingRelease & {
  evidenceCount: number;
};

function mergeRelease(current: AggregatedRelease | undefined, next: AggregatedRelease) {
  if (!current) {
    return next;
  }

  const statusPriority: Record<UpcomingReleaseStatus, number> = {
    confirmed: 3,
    expected: 2,
    teased: 1,
  };

  const winner = statusPriority[next.status] > statusPriority[current.status] ? next : current;

  return {
    ...winner,
    artistHref: winner.artistHref || current.artistHref || next.artistHref,
    artworkUrl: winner.artworkUrl || current.artworkUrl || next.artworkUrl,
    sourceUrl: winner.sourceUrl || current.sourceUrl || next.sourceUrl,
    href: winner.href || current.href || next.href,
    releaseDate: winner.releaseDate || current.releaseDate || next.releaseDate,
    dateLabel:
      winner.releaseDate || current.releaseDate || next.releaseDate
        ? formatReleaseDate(winner.releaseDate || current.releaseDate || next.releaseDate)
        : "Date unconfirmed",
    score: Math.max(current.score, next.score) + Math.min(current.evidenceCount + next.evidenceCount, 5) * 4,
    evidenceCount: current.evidenceCount + next.evidenceCount,
  };
}

async function buildArtistReleasePool(artistName: string, country: string, countryName: string, artistMomentum: number) {
  const artistCandidates = await searchArtistCandidates(artistName);
  const artistHref =
    artistCandidates.find((candidate) => normalize(candidate.name) === normalize(artistName))?.href ??
    artistCandidates.find((candidate) => normalize(candidate.name).includes(normalize(artistName)))?.href ??
    getArtistHref(artistName);

  const [officialReleases, newsItems] = await Promise.all([
    fetchOfficialArtistReleases(artistName, country),
    fetchArtistNews(artistName, country),
  ]);

  const releases = new Map<string, AggregatedRelease>();

  officialReleases.forEach((release) => {
    const releaseTitle = release.collectionName?.trim();
    const artist = release.artistName?.trim();
    const releaseDate = release.releaseDate ? new Date(release.releaseDate).toISOString() : null;

    if (!releaseTitle || !artist || !releaseDate) {
      return;
    }

    const daysAway = daysUntil(releaseDate);

    if (daysAway === null || daysAway < 0) {
      return;
    }

    const key = normalizeReleaseKey(artist, releaseTitle);

    releases.set(
      key,
      mergeRelease(releases.get(key), {
        id: `official-${release.collectionId ?? key}`,
        artistName: artist,
        artistHref: artistHref,
        releaseTitle,
        releaseType: getReleaseType(release.collectionType ?? null),
        status: "confirmed",
        statusLabel: "Confirmed",
        dateLabel: formatReleaseDate(releaseDate),
        releaseDate,
        artworkUrl: upscaleArtwork(release.artworkUrl100),
        reason: buildOfficialReason(countryName, artistMomentum, daysAway),
        href: release.collectionId ? `/album/itunes-${release.collectionId}?country=${country}` : null,
        sourceUrl: release.url ?? null,
        sourceLabel: "Official pre-release listing",
        country,
        countryName,
        score: 240 + artistMomentum + Math.max(0, 45 - daysAway),
        evidenceCount: 1,
      })
    );
  });

  newsItems.forEach((item) => {
    const releaseTitle = parseReleaseTitleFromNews(item.title, artistName);
    const status = parseStatusFromNews(item.title);

    if (
      !releaseTitle ||
      !status ||
      !isCompleteReleaseTitle(releaseTitle, artistName) ||
      !isReleaseTitleSupportedByHeadline(item.title, artistName, releaseTitle)
    ) {
      return;
    }

    const parsedDate = parseDateFromText(item.title);
    const publishedAt = parseNewsDate(item.pubDate);

    if (publishedAt) {
      const publishedTime = new Date(publishedAt).getTime();

      if (publishedTime > REFERENCE_TIMESTAMP || publishedTime < REFERENCE_TIMESTAMP - 1000 * 60 * 60 * 24 * 120) {
        return;
      }
    }

    if (parsedDate && new Date(parsedDate).getTime() <= REFERENCE_TIMESTAMP) {
      return;
    }

    const key = normalizeReleaseKey(artistName, releaseTitle);

    releases.set(
      key,
      mergeRelease(releases.get(key), {
        id: `news-${key}`,
        artistName,
        artistHref: artistHref,
        releaseTitle,
        releaseType: parseReleaseTypeFromNews(item.title),
        status,
        statusLabel: getStatusLabel(status),
        dateLabel: parsedDate ? formatReleaseDate(parsedDate) : "Date unconfirmed",
        releaseDate: parsedDate,
        artworkUrl: "",
        reason: buildNewsReason(status, item.sourceName, artistMomentum, countryName),
        href: null,
        sourceUrl: item.link,
        sourceLabel: item.sourceName || "Credible coverage",
        country,
        countryName,
        score: (status === "teased" ? 120 : 160) + artistMomentum + (parsedDate ? 20 : 0),
        evidenceCount: 1,
      })
    );
  });

  return Array.from(releases.values());
}

function sortUpcomingReleases(left: AggregatedRelease, right: AggregatedRelease) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if ((left.releaseDate ?? "9999") !== (right.releaseDate ?? "9999")) {
    return (left.releaseDate ?? "9999").localeCompare(right.releaseDate ?? "9999");
  }

  return left.artistName.localeCompare(right.artistName);
}

async function collectUpcomingReleases(country: string, artistQuery?: string) {
  const countryName = getCountryLabel(country);
  const artistPool = artistQuery?.trim()
    ? [[artistQuery.trim(), 220] as const]
    : await getRelevantArtists(country);

  const releaseGroups = await Promise.all(
    artistPool.map(async ([artistName, momentum]) => buildArtistReleasePool(artistName, country, countryName, momentum))
  );

  const deduped = new Map<string, AggregatedRelease>();

  releaseGroups.flat().forEach((release) => {
    const key = normalizeReleaseKey(release.artistName, release.releaseTitle);
    deduped.set(key, mergeRelease(deduped.get(key), release));
  });

  return {
    country,
    countryName,
    releases: Array.from(deduped.values()).sort(sortUpcomingReleases),
  };
}

export async function getUpcomingReleases(country: string, limit = 5) {
  const payload = await collectUpcomingReleases(country);

  return {
    releases: payload.releases.slice(0, limit),
    country: payload.country,
    countryName: payload.countryName,
    sourceSummary: `Ranked from official pre-release listings, credible music coverage, and current artist momentum in ${payload.countryName}.`,
    refreshedAt: new Date().toISOString(),
  } satisfies UpcomingReleasesPayload;
}

export async function searchUpcomingReleases(artistQuery: string, country: string) {
  const trimmed = artistQuery.trim();

  if (!trimmed) {
    return {
      releases: [] as UpcomingRelease[],
      country,
      countryName: getCountryLabel(country),
      sourceSummary: "",
      refreshedAt: new Date().toISOString(),
    } satisfies UpcomingReleasesPayload;
  }

  const payload = await collectUpcomingReleases(country, trimmed);

  return {
    releases: payload.releases.slice(0, 10),
    country: payload.country,
    countryName: payload.countryName,
    sourceSummary: `Search results are built from official listings and credible coverage tied to ${trimmed} in ${payload.countryName}.`,
    refreshedAt: new Date().toISOString(),
  } satisfies UpcomingReleasesPayload;
}
