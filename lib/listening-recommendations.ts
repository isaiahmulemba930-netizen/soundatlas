import { genreAlbums, genreCollections } from "@/lib/genre-catalog";
import type {
  ListeningEventRecord,
  ListeningStatsResponse,
  ListeningTimeframe,
} from "@/lib/listening";

export type RecommendationCard = {
  id: string;
  title: string;
  artist: string;
  reason: string;
  href: string;
  genre: string;
  year: string;
};

export type RecommendationSection = {
  id: string;
  title: string;
  description: string;
  items: RecommendationCard[];
};

export type ListeningMemory = {
  dateLabel: string;
  title: string;
  summary: string;
  items: Array<{
    title: string;
    artist: string;
    playedAt: string;
  }>;
};

function normalizeValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function titleKey(event: ListeningEventRecord) {
  return normalizeValue(`${event.track_name}::${event.artist_name}`);
}

function albumKey(title: string, artist: string) {
  return normalizeValue(`${title}::${artist}`);
}

function pickListeningWindow(events: ListeningEventRecord[]) {
  const buckets = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };

  for (const event of events) {
    const hour = new Date(event.played_at).getHours();
    if (hour >= 5 && hour < 12) buckets.morning += 1;
    else if (hour >= 12 && hour < 17) buckets.afternoon += 1;
    else if (hour >= 17 && hour < 22) buckets.evening += 1;
    else buckets.night += 1;
  }

  return Object.entries(buckets).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "evening";
}

function buildGenreCounts(events: ListeningEventRecord[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    const genre = normalizeValue(event.genre);
    if (!genre) continue;

    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function findCollectionSlugForGenre(input: string) {
  const normalizedInput = normalizeValue(input);

  const directCollection = genreCollections.find((collection) => {
    return normalizeValue(collection.title) === normalizedInput || normalizeValue(collection.slug) === normalizedInput;
  });

  if (directCollection) {
    return directCollection.slug;
  }

  const broadMatches: Record<string, string> = {
    "hip-hop": "dance",
    rap: "dance",
    "r&b": "soul",
    "alternative r&b": "soul",
    electronic: "electronic",
    indie: "indie",
    rock: "rock",
    alternative: "alternative",
    pop: "dance",
    latin: "latin",
    reggaeton: "latin",
    afrobeats: "afrobeats",
    "k-pop": "k-pop",
    soul: "soul",
    metal: "metal",
    country: "country",
  };

  return broadMatches[normalizedInput] ?? null;
}

function dedupeCards(cards: RecommendationCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = normalizeValue(`${card.title}::${card.artist}`);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getUnplayedCatalogCards(
  playedAlbums: Set<string>,
  playedArtists: Set<string>,
  preferredCollectionSlugs: string[],
  reasonBuilder: (albumTitle: string, artistName: string, genre: string) => string,
  excludePlayedArtists = false
) {
  const cards = genreAlbums
    .filter((album) => preferredCollectionSlugs.includes(findCollectionSlugForGenre(album.genre) ?? ""))
    .filter((album) => !playedAlbums.has(albumKey(album.title, album.artist)))
    .filter((album) => !excludePlayedArtists || !playedArtists.has(normalizeValue(album.artist)))
    .map((album) => ({
      id: album.slug,
      title: album.title,
      artist: album.artist,
      reason: reasonBuilder(album.title, album.artist, album.genre),
      href: `/album/${album.slug}?lane=${findCollectionSlugForGenre(album.genre) ?? "rock"}`,
      genre: album.genre,
      year: album.year,
    }));

  return dedupeCards(cards);
}

export function buildRecommendationSections(
  allEvents: ListeningEventRecord[],
  recentEvents: ListeningEventRecord[],
  weeklyStats: ListeningStatsResponse,
  allTimeStats: ListeningStatsResponse
) {
  const signatureArtist = allTimeStats.topArtists[0]?.artistName;
  const playedAlbums = new Set(
    allEvents
      .filter((event) => event.album_name)
      .map((event) => albumKey(event.album_name ?? "", event.artist_name))
  );
  const playedArtists = new Set(allEvents.map((event) => normalizeValue(event.artist_name)));
  const genreCounts = buildGenreCounts(allEvents);
  const topCollectionSlugs = genreCounts
    .map(([genre]) => findCollectionSlugForGenre(genre))
    .filter((slug): slug is string => Boolean(slug))
    .slice(0, 3);
  const weeklyRotationGenres = buildGenreCounts(recentEvents)
    .map(([genre]) => findCollectionSlugForGenre(genre))
    .filter((slug): slug is string => Boolean(slug))
    .slice(0, 2);
  const listeningWindow = pickListeningWindow(recentEvents.length > 0 ? recentEvents : allEvents);
  const timeOfDaySuggestions: Record<string, string[]> = {
    morning: ["indie", "soul", "country"],
    afternoon: ["dance", "rock", "latin"],
    evening: ["alternative", "soul", "electronic"],
    night: ["electronic", "alternative", "k-pop"],
  };

  const becauseYouListenTo = getUnplayedCatalogCards(
    playedAlbums,
    playedArtists,
    topCollectionSlugs,
    (albumTitle, artistName, genre) => {
      void albumTitle;
      return (
      signatureArtist
        ? `Built from your strongest ${genre.toLowerCase()} habits and the artists you revisit alongside ${signatureArtist}.`
        : `Built from your strongest ${genre.toLowerCase()} habits and the artists you come back to most.`
      );
    },
  ).slice(0, 4);

  const similarToFavorites = getUnplayedCatalogCards(
    playedAlbums,
    playedArtists,
    topCollectionSlugs,
    (albumTitle, artistName) => {
      void albumTitle;
      return `${artistName} sits in the same lane as the favorites dominating your all-time taste.`;
    },
    true
  ).slice(0, 4);

  const weeklyRotation = getUnplayedCatalogCards(
    playedAlbums,
    playedArtists,
    weeklyRotationGenres.length > 0 ? weeklyRotationGenres : topCollectionSlugs,
    (albumTitle, artistName, genre) => {
      void albumTitle;
      void artistName;
      return `This matches the ${genre.toLowerCase()} energy driving your ${weeklyStats.timeframe === "weekly" ? "weekly" : "recent"} rotation right now.`;
    },
  ).slice(0, 4);

  const allTimeTaste = getUnplayedCatalogCards(
    playedAlbums,
    playedArtists,
    topCollectionSlugs,
    (albumTitle, artistName, genre) => {
      void albumTitle;
      void artistName;
      return `Your all-time history keeps circling back to ${genre.toLowerCase()}, so this belongs on your radar.`;
    },
  ).slice(0, 4);

  const trySomethingNew = getUnplayedCatalogCards(
    playedAlbums,
    playedArtists,
    timeOfDaySuggestions[listeningWindow] ?? ["electronic", "alternative", "soul"],
    (albumTitle, artistName, genre) => {
      void albumTitle;
      void artistName;
      return `You listen most in the ${listeningWindow}, so this ${genre.toLowerCase()} pick opens a nearby lane without losing your mood.`;
    },
    true
  ).slice(0, 4);

  const recentTrackKeys = new Set(recentEvents.map(titleKey));
  const dormantFavorites = allEvents
    .reduce<Array<{ event: ListeningEventRecord; playCount: number; lastPlayedAt: string }>>((accumulator, event) => {
      const key = titleKey(event);
      const existing = accumulator.find((item) => titleKey(item.event) === key);
      if (existing) {
        existing.playCount += 1;
        if (new Date(event.played_at).getTime() > new Date(existing.lastPlayedAt).getTime()) {
          existing.lastPlayedAt = event.played_at;
        }
        return accumulator;
      }

      accumulator.push({
        event,
        playCount: 1,
        lastPlayedAt: event.played_at,
      });
      return accumulator;
    }, [])
    .filter((item) => item.playCount >= 2)
    .filter((item) => !recentTrackKeys.has(titleKey(item.event)))
    .sort((left, right) => right.playCount - left.playCount || new Date(left.lastPlayedAt).getTime() - new Date(right.lastPlayedAt).getTime())
    .slice(0, 4)
    .map((item) => ({
      id: `memory-${item.event.id}`,
      title: item.event.track_name,
      artist: item.event.artist_name,
      reason: `You played this ${item.playCount} times before it slipped out of your recent history.`,
      href: `/history?song=${encodeURIComponent(item.event.track_name)}&artist=${encodeURIComponent(item.event.artist_name)}`,
      genre: item.event.genre ?? "Your history",
      year: new Date(item.lastPlayedAt).getFullYear().toString(),
    }));

  const sections: RecommendationSection[] = [
    {
      id: "because-you-listen-to",
      title: "Because you listen to...",
      description: "Your listening history, turned into personalized recommendations.",
      items: becauseYouListenTo,
    },
    {
      id: "artists-similar",
      title: "Artists similar to your favorites",
      description: "Fresh names from the same lanes that dominate your repeats.",
      items: similarToFavorites,
    },
    {
      id: "forgotten-favorites",
      title: "You may have forgotten these",
      description: "Heavy past favorites that have gone quiet in your recent history.",
      items: dormantFavorites,
    },
    {
      id: "weekly-rotation",
      title: "Based on your weekly rotation",
      description: "Picked from the sounds shaping this week for you.",
      items: weeklyRotation,
    },
    {
      id: "all-time-taste",
      title: "Based on your all-time taste",
      description: "Catalog picks anchored in the genres and artists that define your long-term listening.",
      items: allTimeTaste,
    },
    {
      id: "try-something-new",
      title: "Try something new",
      description: "A nearby left turn built from when you listen most and where your taste already leans.",
      items: trySomethingNew,
    },
  ];

  return sections.filter((section) => section.items.length > 0);
}

export function buildOnThisDayMemory(events: ListeningEventRecord[], today = new Date()): ListeningMemory | null {
  const month = today.getMonth();
  const day = today.getDate();
  const matching = events.filter((event) => {
    const playedAt = new Date(event.played_at);
    return playedAt.getMonth() === month && playedAt.getDate() === day && playedAt.getFullYear() !== today.getFullYear();
  });

  if (matching.length === 0) {
    return null;
  }

  const groupedByYear = new Map<number, ListeningEventRecord[]>();
  for (const event of matching) {
    const year = new Date(event.played_at).getFullYear();
    groupedByYear.set(year, [...(groupedByYear.get(year) ?? []), event]);
  }

  const [year, yearEvents] = [...groupedByYear.entries()].sort((left, right) => right[0] - left[0])[0];

  return {
    dateLabel: new Date(yearEvents[0].played_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    title: "On this day",
    summary: `You were especially locked into ${yearEvents[0].artist_name} around this date in ${year}.`,
    items: yearEvents.slice(0, 4).map((event) => ({
      title: event.track_name,
      artist: event.artist_name,
      playedAt: event.played_at,
    })),
  };
}

export function getTimeframeLabel(timeframe: ListeningTimeframe) {
  switch (timeframe) {
    case "weekly":
      return "This week";
    case "monthly":
      return "This month";
    case "yearly":
      return "This year";
    case "all-time":
      return "All time";
  }
}
