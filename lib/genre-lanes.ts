import {
  DiscoveryGenre,
  getDiscoveryGenreBySlug,
} from "@/lib/genre-discovery";
import {
  GenreAlbum,
  GenreCollection,
  genreAlbums,
  getGenreCollectionBySlug,
} from "@/lib/genre-catalog";
import {
  GenreSearchAlbum,
  searchGenreAlbums,
} from "@/lib/itunes";

export type GenreLane = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  searchTerms: string[];
  genreHints: string[];
  fallbackAlbumSlugs: string[];
  familyTitle: string;
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
  source: "live" | "editorial";
  matchedTerms: string[];
  whyItShowsUp: string;
};

const laneOverrides: Record<string, { searchTerms: string[]; genreHints: string[]; fallbackAlbumSlugs?: string[] }> = {
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
  indie: {
    searchTerms: ["indie albums", "indie rock albums", "indie pop albums"],
    genreHints: ["indie", "indie rock", "indie pop", "indie folk"],
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
  "k-pop": {
    searchTerms: ["k-pop albums", "kpop albums", "korean pop albums"],
    genreHints: ["k-pop", "korean pop", "j-pop"],
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
  amapiano: {
    searchTerms: ["amapiano albums", "south african dance albums", "afrobeats albums"],
    genreHints: ["amapiano", "afrobeats", "afropop"],
  },
  "j-pop": {
    searchTerms: ["j-pop albums", "japanese pop albums", "city pop albums"],
    genreHints: ["j-pop", "japanese pop", "city pop"],
  },
};

function buildCollectionLane(collection: GenreCollection): GenreLane {
  const override = laneOverrides[collection.slug];

  return {
    slug: collection.slug,
    title: collection.title,
    subtitle: collection.subtitle,
    description: collection.subtitle,
    searchTerms: override?.searchTerms ?? [collection.title, `${collection.title} albums`],
    genreHints: override?.genreHints ?? [collection.title],
    fallbackAlbumSlugs: collection.albumSlugs,
    familyTitle: "Catalog lane",
  };
}

function buildDiscoveryLane(genre: DiscoveryGenre): GenreLane {
  const override = laneOverrides[genre.slug];

  return {
    slug: genre.slug,
    title: genre.title,
    subtitle: `${genre.description} This lane refreshes from live album results every 6 hours.`,
    description: genre.description,
    searchTerms: override?.searchTerms ?? [genre.title, ...genre.aliases.slice(1, 4)],
    genreHints: override?.genreHints ?? [genre.title, ...genre.aliases],
    fallbackAlbumSlugs: override?.fallbackAlbumSlugs ?? [],
    familyTitle: genre.familyTitle,
  };
}

export function getGenreLaneBySlug(slug: string): GenreLane | null {
  const collection = getGenreCollectionBySlug(slug);

  if (collection) {
    return buildCollectionLane(collection);
  }

  const discoveryGenre = getDiscoveryGenreBySlug(slug);

  if (discoveryGenre) {
    return buildDiscoveryLane(discoveryGenre);
  }

  return null;
}

function formatReleaseYear(releaseDate: string) {
  if (!releaseDate) {
    return "Recent catalog signal";
  }

  const parsed = new Date(releaseDate);

  if (Number.isNaN(parsed.getTime())) {
    return releaseDate;
  }

  return String(parsed.getFullYear());
}

function buildLiveWhyItShowsUp(album: GenreSearchAlbum, lane: GenreLane, rank: number) {
  const reasons = [
    `${album.title} is surfacing in the current ${lane.title.toLowerCase()} lane because it matched ${album.matchedTerms.length > 1 ? "multiple" : "a live"} iTunes search signal${album.matchedTerms.length > 1 ? "s" : ""} for this genre.`,
  ];

  if (album.genre) {
    reasons.push(`Its current storefront genre is listed as ${album.genre}, which keeps it inside this six-hour refresh.`);
  }

  if (rank < 2) {
    reasons.push("It ranked near the top of the current rotation window, so it holds a lead card position.");
  }

  return reasons.join(" ");
}

function buildEditorialWhyItShowsUp(album: GenreAlbum, lane: GenreLane) {
  return `${album.title} stays in the ${lane.title.toLowerCase()} lane because it remains a frequently discussed reference point for this scene and still anchors the fallback shelf when live storefront results are thin.`;
}

export async function getGenreLaneAlbums(lane: GenreLane) {
  const liveAlbums = await searchGenreAlbums(lane.searchTerms, lane.genreHints, 18);
  const sixHourBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 6));
  const liveOffset = liveAlbums.length > 6 ? sixHourBucket % (liveAlbums.length - 5) : 0;
  const rotatedLiveAlbums = liveAlbums.slice(liveOffset, liveOffset + 6);

  if (rotatedLiveAlbums.length > 0) {
    return rotatedLiveAlbums.map((album, index) => ({
      slug: album.slug,
      href: `/album/${album.slug}?lane=${lane.slug}`,
      title: album.title,
      artist: album.artist,
      genre: album.genre || lane.title,
      releaseDate: album.releaseDate,
      artworkUrl: album.artworkUrl,
      trackCount: album.trackCount,
      source: "live" as const,
      matchedTerms: album.matchedTerms,
      whyItShowsUp: buildLiveWhyItShowsUp(album, lane, index),
    }));
  }

  const fallbackAlbums = lane.fallbackAlbumSlugs
    .map((albumSlug) => genreAlbums.find((album) => album.slug === albumSlug) ?? null)
    .filter((album): album is GenreAlbum => album !== null)
    .slice(0, 6);

  return fallbackAlbums.map((album) => ({
    slug: album.slug,
    href: `/album/${album.slug}?lane=${lane.slug}`,
    title: album.title,
    artist: album.artist,
    genre: album.genre,
    releaseDate: formatReleaseYear(album.year),
    artworkUrl: "",
    trackCount: null,
    source: "editorial" as const,
    matchedTerms: [lane.title],
    whyItShowsUp: buildEditorialWhyItShowsUp(album, lane),
  }));
}
