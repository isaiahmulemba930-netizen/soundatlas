import "server-only";

type ItunesSearchResult = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  trackCount?: number;
  collectionType?: string;
};

type ItunesTrackResult = {
  wrapperType: string;
  trackId?: number;
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  trackNumber?: number;
  trackName?: string;
  trackTimeMillis?: number;
};

export type AlbumLookupTrack = {
  id: number | null;
  title: string;
  trackNumber: number | null;
  durationMs: number | null;
};

export type AlbumLookup = {
  title: string;
  artist: string;
  genre: string;
  releaseDate: string;
  artworkUrl: string;
  tracks: AlbumLookupTrack[];
};

export type GenreSearchAlbum = {
  slug: string;
  collectionId: number;
  title: string;
  artist: string;
  genre: string;
  releaseDate: string;
  artworkUrl: string;
  trackCount: number | null;
  matchedTerms: string[];
  score: number;
};

function normalizeValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function upscaleArtwork(url?: string) {
  if (!url) return "";
  return url.replace("100x100bb", "600x600bb");
}

function pickBestMatch(results: ItunesSearchResult[], artist: string, album: string) {
  const normalizedArtist = normalizeValue(artist);
  const normalizedAlbum = normalizeValue(album);

  const exact = results.find((result) => {
    return (
      normalizeValue(result.artistName).includes(normalizedArtist) &&
      normalizeValue(result.collectionName) === normalizedAlbum
    );
  });

  if (exact) return exact;

  const closeArtist = results.find((result) =>
    normalizeValue(result.artistName).includes(normalizedArtist)
  );

  return closeArtist ?? results[0] ?? null;
}

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildAlbumSlug(collectionId: number) {
  return `itunes-${collectionId}`;
}

async function resolveTrackId(params: {
  title: string;
  artist: string;
  album: string;
  collectionId?: number;
  trackNumber?: number | null;
}) {
  try {
    const searchParams = new URLSearchParams({
      term: `${params.artist} ${params.title}`,
      media: "music",
      entity: "song",
      limit: "20",
    });

    const response = await fetch(`https://itunes.apple.com/search?${searchParams.toString()}`, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      results?: ItunesTrackResult[];
    };

    const normalizedTitle = normalizeValue(params.title);
    const normalizedArtist = normalizeValue(params.artist);
    const normalizedAlbum = normalizeValue(params.album);

    const exactCollectionMatch = (payload.results ?? []).find((result) => {
      return (
        typeof result.trackId === "number" &&
        normalizeValue(result.trackName ?? "") === normalizedTitle &&
        normalizeValue(result.artistName ?? "").includes(normalizedArtist) &&
        typeof params.collectionId === "number" &&
        result.collectionId === params.collectionId
      );
    });

    if (exactCollectionMatch?.trackId) {
      return exactCollectionMatch.trackId;
    }

    const albumMatch = (payload.results ?? []).find((result) => {
      return (
        typeof result.trackId === "number" &&
        normalizeValue(result.trackName ?? "") === normalizedTitle &&
        normalizeValue(result.artistName ?? "").includes(normalizedArtist) &&
        normalizeValue(result.collectionName ?? "") === normalizedAlbum &&
        (params.trackNumber == null || result.trackNumber === params.trackNumber)
      );
    });

    if (albumMatch?.trackId) {
      return albumMatch.trackId;
    }

    const looseMatch = (payload.results ?? []).find((result) => {
      return (
        typeof result.trackId === "number" &&
        normalizeValue(result.trackName ?? "") === normalizedTitle &&
        normalizeValue(result.artistName ?? "").includes(normalizedArtist)
      );
    });

    return looseMatch?.trackId ?? null;
  } catch {
    return null;
  }
}

export async function fetchAlbumLookup(artist: string, album: string): Promise<AlbumLookup | null> {
  try {
    const searchParams = new URLSearchParams({
      term: `${artist} ${album}`,
      media: "music",
      entity: "album",
      limit: "10",
    });

    const searchResponse = await fetch(`https://itunes.apple.com/search?${searchParams.toString()}`, {
      next: { revalidate: 86400 },
    });

    if (!searchResponse.ok) {
      return null;
    }

    const searchData = (await searchResponse.json()) as {
      results?: ItunesSearchResult[];
    };

    const match = pickBestMatch(searchData.results ?? [], artist, album);
    if (!match) {
      return null;
    }

    const lookupParams = new URLSearchParams({
      id: String(match.collectionId),
      entity: "song",
    });

    const lookupResponse = await fetch(`https://itunes.apple.com/lookup?${lookupParams.toString()}`, {
      next: { revalidate: 86400 },
    });

    if (!lookupResponse.ok) {
      return {
        title: match.collectionName,
        artist: match.artistName,
        genre: match.primaryGenreName ?? "",
        releaseDate: match.releaseDate ?? "",
        artworkUrl: upscaleArtwork(match.artworkUrl100),
        tracks: [],
      };
    }

    const lookupData = (await lookupResponse.json()) as {
      results?: ItunesTrackResult[];
    };

    const trackItems = (lookupData.results ?? [])
      .filter((item) => item.wrapperType === "track" && item.trackName)
      .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0));

    const tracks = await Promise.all(
      trackItems.map(async (item) => ({
        id:
          item.trackId ??
          (await resolveTrackId({
            title: item.trackName as string,
            artist: item.artistName ?? match.artistName,
            album: item.collectionName ?? match.collectionName,
            collectionId: item.collectionId ?? match.collectionId,
            trackNumber: item.trackNumber ?? null,
          })),
        title: item.trackName as string,
        trackNumber: item.trackNumber ?? null,
        durationMs: item.trackTimeMillis ?? null,
      }))
    );

    return {
      title: match.collectionName,
      artist: match.artistName,
      genre: match.primaryGenreName ?? "",
      releaseDate: match.releaseDate ?? "",
      artworkUrl: upscaleArtwork(match.artworkUrl100),
      tracks,
    };
  } catch {
    return null;
  }
}

export async function fetchAlbumLookupByCollectionId(collectionId: number): Promise<AlbumLookup | null> {
  try {
    const lookupParams = new URLSearchParams({
      id: String(collectionId),
      entity: "song",
    });

    const lookupResponse = await fetch(`https://itunes.apple.com/lookup?${lookupParams.toString()}`, {
      next: { revalidate: 21600 },
    });

    if (!lookupResponse.ok) {
      return null;
    }

    const lookupData = (await lookupResponse.json()) as {
      results?: ItunesTrackResult[];
    };

    const [collection, ...items] = lookupData.results ?? [];

    if (!collection?.collectionName || !collection.artistName) {
      return null;
    }

    const collectionArtist = collection.artistName;
    const collectionName = collection.collectionName;

    const trackItems = items
      .filter((item) => item.wrapperType === "track" && item.trackName)
      .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0));

    const tracks = await Promise.all(
      trackItems.map(async (item) => ({
        id:
          item.trackId ??
          (await resolveTrackId({
            title: item.trackName as string,
            artist: item.artistName ?? collectionArtist,
            album: item.collectionName ?? collectionName,
            collectionId: item.collectionId ?? collectionId,
            trackNumber: item.trackNumber ?? null,
          })),
        title: item.trackName as string,
        trackNumber: item.trackNumber ?? null,
        durationMs: item.trackTimeMillis ?? null,
      }))
    );

    return {
      title: collection.collectionName,
      artist: collection.artistName,
      genre: collection.primaryGenreName ?? "",
      releaseDate: collection.releaseDate ?? "",
      artworkUrl: upscaleArtwork(collection.artworkUrl100),
      tracks,
    };
  } catch {
    return null;
  }
}

async function searchAlbumsForTerm(term: string) {
  const searchParams = new URLSearchParams({
    term,
    media: "music",
    entity: "album",
    limit: "25",
  });

  const response = await fetch(`https://itunes.apple.com/search?${searchParams.toString()}`, {
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    results?: ItunesSearchResult[];
  };

  return (payload.results ?? []).filter((result) => {
    return result.collectionId && result.collectionName && result.artistName;
  });
}

function normalizedGenreMatchesHints(genreValue: string, hints: string[]) {
  const normalizedGenre = normalizeForSearch(genreValue);
  if (!normalizedGenre) {
    return false;
  }

  return hints.some((hint) => normalizedGenre.includes(hint) || hint.includes(normalizedGenre));
}

export async function searchGenreAlbums(
  searchTerms: string[],
  genreHints: string[],
  maxAlbums = 12
): Promise<GenreSearchAlbum[]> {
  try {
    const uniqueTerms = Array.from(new Set(searchTerms.map((term) => term.trim()).filter(Boolean))).slice(0, 8);
    const normalizedHints = genreHints.map(normalizeForSearch);
    const searchResults = await Promise.all(uniqueTerms.map((term) => searchAlbumsForTerm(term)));
    const albumsById = new Map<number, GenreSearchAlbum>();

    searchResults.forEach((results, termIndex) => {
      const term = uniqueTerms[termIndex];
      const normalizedTerm = normalizeForSearch(term);

      results.forEach((result, resultIndex) => {
        const normalizedGenre = normalizeForSearch(result.primaryGenreName ?? "");
        const normalizedTitle = normalizeForSearch(result.collectionName);
        const normalizedArtist = normalizeForSearch(result.artistName);
        const hintMatch = normalizedGenreMatchesHints(result.primaryGenreName ?? "", normalizedHints);
        const textMatch =
          normalizedTitle.includes(normalizedTerm) ||
          normalizedArtist.includes(normalizedTerm) ||
          normalizedGenre.includes(normalizedTerm);

        if (!hintMatch) {
          return;
        }

        const existing = albumsById.get(result.collectionId);
        const scoreBoost = Math.max(8, 60 - resultIndex * 2) + (hintMatch ? 30 : 0) + (textMatch ? 14 : 0);

        if (!existing) {
          albumsById.set(result.collectionId, {
            slug: buildAlbumSlug(result.collectionId),
            collectionId: result.collectionId,
            title: result.collectionName,
            artist: result.artistName,
            genre: result.primaryGenreName ?? "",
            releaseDate: result.releaseDate ?? "",
            artworkUrl: upscaleArtwork(result.artworkUrl100),
            trackCount: result.trackCount ?? null,
            matchedTerms: [term],
            score: scoreBoost,
          });
          return;
        }

        existing.score += scoreBoost;

        if (!existing.matchedTerms.includes(term)) {
          existing.matchedTerms.push(term);
        }
      });
    });

    return Array.from(albumsById.values())
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.title.localeCompare(right.title);
      })
      .slice(0, maxAlbums);
  } catch {
    return [];
  }
}
