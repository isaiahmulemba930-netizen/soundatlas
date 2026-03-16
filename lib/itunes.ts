import "server-only";

type ItunesSearchResult = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
};

type ItunesTrackResult = {
  wrapperType: string;
  trackNumber?: number;
  trackName?: string;
};

export type AlbumLookup = {
  title: string;
  artist: string;
  genre: string;
  releaseDate: string;
  artworkUrl: string;
  tracks: string[];
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

    const tracks = (lookupData.results ?? [])
      .filter((item) => item.wrapperType === "track" && item.trackName)
      .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
      .map((item) => item.trackName as string);

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
