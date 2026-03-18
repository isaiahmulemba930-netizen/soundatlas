import { genreCollections } from "@/lib/genre-catalog";

export type DiscoveryGenre = {
  slug: string;
  title: string;
  description: string;
  familySlug: string;
  familyTitle: string;
  aliases: string[];
  catalogSlug: string | null;
};

export type DiscoveryFamily = {
  slug: string;
  title: string;
  description: string;
  catalogSlug: string | null;
  genres: DiscoveryGenre[];
};

type GenreSeed = {
  title: string;
  description: string;
  aliases?: string[];
  catalogSlug?: string | null;
};

type FamilySeed = {
  slug: string;
  title: string;
  description: string;
  catalogSlug?: string | null;
  genres: GenreSeed[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeGenreName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const discoverySeeds: FamilySeed[] = [
  {
    slug: "pop",
    title: "Pop",
    description: "Big-tent songwriting lanes, from radio-dominant hooks to sharper left-of-center hybrids.",
    catalogSlug: "dance",
    genres: [
      { title: "Pop", description: "Mainstream songwriting built for immediacy, scale, and chorus memory.", aliases: ["mainstream pop", "adult contemporary"], catalogSlug: "dance" },
      { title: "Dance Pop", description: "Pop records engineered around club pulse, gloss, and physical release.", aliases: ["dance-pop"], catalogSlug: "dance" },
      { title: "Synthpop", description: "Melodic pop driven by synthetic texture, drama, and clean architecture.", aliases: ["synth pop"], catalogSlug: "dance" },
      { title: "Art Pop", description: "Pop with a stronger conceptual frame, stranger details, and a visual point of view.", aliases: ["art-pop"], catalogSlug: "alternative" },
      { title: "Alt-Pop", description: "Pop songwriting with indie, electronic, or left-field production instincts.", aliases: ["alt pop", "alternative pop"], catalogSlug: "alternative" },
      { title: "City Pop", description: "Japanese studio-pop warmth with polished musicianship and after-hours atmosphere.", aliases: ["japanese city pop"], catalogSlug: "dance" },
    ],
  },
  {
    slug: "hip-hop-and-r-and-b",
    title: "Hip-Hop & R&B",
    description: "Rhythm-forward genres shaped by flow, groove, and constant stylistic mutation.",
    catalogSlug: "soul",
    genres: [
      { title: "Hip-Hop", description: "Rap-centered records where beat construction and vocal character lead the whole frame.", aliases: ["hip hop", "rap"], catalogSlug: "soul" },
      { title: "Trap", description: "Percussive rap built from sharp hi-hats, low-end force, and melodic tension.", aliases: ["southern trap"], catalogSlug: "soul" },
      { title: "Drill", description: "Dark, clipped, rhythm-heavy rap descended from street reportage and tense production.", aliases: ["uk drill", "brooklyn drill"], catalogSlug: "soul" },
      { title: "Conscious Rap", description: "Rap with a stronger focus on reportage, point of view, and lyrical density.", aliases: ["political hip hop"], catalogSlug: "soul" },
      { title: "R&B", description: "Song-first rhythm music where vocal texture, intimacy, and groove carry the center.", aliases: ["rnb", "rhythm and blues"], catalogSlug: "soul" },
      { title: "Neo-Soul", description: "Loose, musicianly R&B with deeper pocket, jazz inflection, and soul lineage.", aliases: ["neo soul"], catalogSlug: "soul" },
      { title: "Alternative R&B", description: "Moodier, more atmospheric R&B that bends toward electronic and art-pop detail.", aliases: ["alt r&b", "alternative rhythm and blues"], catalogSlug: "soul" },
    ],
  },
  {
    slug: "electronic-and-club",
    title: "Electronic & Club",
    description: "Rhythmic systems built from machines, DJs, scenes, and obsessive sound design.",
    catalogSlug: "electronic",
    genres: [
      { title: "Electronic", description: "A broad lane for synthetic, producer-led records that do not sit neatly in one club scene.", aliases: ["electronica"], catalogSlug: "electronic" },
      { title: "House", description: "Four-on-the-floor dance music built on lift, repetition, and bodily momentum.", aliases: ["deep house", "afro house"], catalogSlug: "dance" },
      { title: "Techno", description: "Mechanical, propulsive club music with forward drive and stripped force.", aliases: ["minimal techno"], catalogSlug: "electronic" },
      { title: "Drum and Bass", description: "High-velocity breakbeat music with bass pressure and meticulous motion.", aliases: ["drum & bass", "dnb"], catalogSlug: "electronic" },
      { title: "Garage", description: "Swinging club music with clipped drums, vocal fragments, and UK lineage.", aliases: ["uk garage", "2-step"], catalogSlug: "dance" },
      { title: "Ambient", description: "Atmospheric music designed around texture, drift, and emotional environment.", aliases: ["ambient electronic"], catalogSlug: "electronic" },
      { title: "Trance", description: "Peak-building club music organized around progression, suspension, and release.", aliases: ["uplifting trance"], catalogSlug: "dance" },
    ],
  },
  {
    slug: "rock-and-alternative",
    title: "Rock & Alternative",
    description: "Guitar-led families that still dominate canon talk, fandom identity, and subcultural crossover.",
    catalogSlug: "rock",
    genres: [
      { title: "Rock", description: "The broad backbone: riffs, bands, momentum, and records built to outlast eras.", aliases: ["classic rock"], catalogSlug: "rock" },
      { title: "Alternative", description: "Rock that pulls toward mood, abrasion, or art-school reconfiguration.", aliases: ["alternative rock"], catalogSlug: "alternative" },
      { title: "Indie Rock", description: "Band-centered songwriting with smaller-scene sensibility and stronger personality signatures.", aliases: ["indie rock"], catalogSlug: "indie" },
      { title: "Shoegaze", description: "Blurred guitars, submerged vocals, and wall-of-sound melancholy.", aliases: ["dream pop", "noise pop"], catalogSlug: "alternative" },
      { title: "Post-Punk", description: "Lean, nervy rock shaped by repetition, tension, and scene aesthetics.", aliases: ["post punk"], catalogSlug: "alternative" },
      { title: "Emo", description: "Emotionally sharpened rock driven by confession, dynamic swings, and youth-scene energy.", aliases: ["midwest emo"], catalogSlug: "alternative" },
      { title: "Punk", description: "Fast, oppositional guitar music built from immediacy, scene identity, and compression.", aliases: ["punk rock", "hardcore punk"], catalogSlug: "rock" },
    ],
  },
  {
    slug: "latin-and-caribbean",
    title: "Latin & Caribbean",
    description: "A wide field of regional and global styles powering some of the biggest cross-border momentum in music.",
    catalogSlug: "latin",
    genres: [
      { title: "Latin", description: "A broad lane spanning contemporary urbano, established classics, and crossover giants.", aliases: ["latin music"], catalogSlug: "latin" },
      { title: "Reggaeton", description: "Dem Bow-rooted urbano music built for momentum, chant, and global scale.", aliases: ["urbano latino"], catalogSlug: "latin" },
      { title: "Latin Pop", description: "Hook-driven pop records shaped through Spanish-language crossover and regional detail.", aliases: ["pop latino"], catalogSlug: "latin" },
      { title: "Regional Mexicano", description: "Current Mexican regional styles with huge audience energy and rapidly shifting stars.", aliases: ["regional mexican", "corridos tumbados"], catalogSlug: "latin" },
      { title: "Salsa", description: "Percussive, band-led Caribbean dance music built from groove, arrangement, and charisma.", aliases: ["salsa dura"], catalogSlug: "latin" },
      { title: "Bachata", description: "Romantic guitar-led Dominican music with soft sway and mainstream durability.", aliases: ["modern bachata"], catalogSlug: "latin" },
      { title: "Cumbia", description: "Rhythmic Colombian-rooted music that keeps mutating across regional scenes.", aliases: ["cumbia pop", "cumbia sonidera"], catalogSlug: "latin" },
    ],
  },
  {
    slug: "african-and-diaspora",
    title: "African & Diaspora",
    description: "Contemporary African pop systems with strong regional roots and world-spanning crossover pull.",
    catalogSlug: "afrobeats",
    genres: [
      { title: "Afrobeats", description: "Hook-rich West African pop with bounce, melody, and enormous international reach.", aliases: ["afrobeats", "afropop"], catalogSlug: "afrobeats" },
      { title: "Amapiano", description: "South African log-drum house with patient build, swing, and scene-specific texture.", aliases: ["ama piano"], catalogSlug: "afrobeats" },
      { title: "Afro-Fusion", description: "A looser crossover lane where Afrobeats meets R&B, dancehall, or alternative pop.", aliases: ["afrofusion", "afro fusion"], catalogSlug: "afrobeats" },
      { title: "Highlife", description: "A melodic West African lineage heard in both legacy records and new pop borrowing.", aliases: ["modern highlife"], catalogSlug: "afrobeats" },
      { title: "Afro House", description: "Club-rooted African dance music with deeper percussion and more ritual build.", aliases: ["african house"], catalogSlug: "dance" },
      { title: "Bongo Flava", description: "Tanzanian pop-rap and R&B blend shaped by local storytelling and huge mass appeal.", aliases: ["bongo flava"], catalogSlug: "afrobeats" },
    ],
  },
  {
    slug: "east-asian-pop",
    title: "East Asian Pop",
    description: "Idol pop, singer-songwriter lanes, and regional hit systems with immense domestic scale and global spillover.",
    catalogSlug: "k-pop",
    genres: [
      { title: "K-Pop", description: "Korean idol and pop production culture built on concept, precision, and fan intensity.", aliases: ["kpop", "korean pop"], catalogSlug: "k-pop" },
      { title: "Korean R&B", description: "A softer, mood-led Korean lane blending R&B intimacy with sleek modern production.", aliases: ["k-r&b", "krnb"], catalogSlug: "k-pop" },
      { title: "J-Pop", description: "Japanese pop built around melody craft, scene specificity, and domestic chart power.", aliases: ["jpop", "japanese pop"], catalogSlug: "k-pop" },
      { title: "Mandopop", description: "Mandarin-language pop with a strong singer-songwriter and ballad lineage.", aliases: ["mandarin pop"], catalogSlug: "k-pop" },
      { title: "Anime Pop", description: "Theme-song adjacent pop-rock and synth-pop with outsized streaming tails.", aliases: ["anime music"], catalogSlug: "k-pop" },
      { title: "Ballad Pop", description: "Big-emotion vocal pop driven by performance, drama, and replay value.", aliases: ["asian ballad"], catalogSlug: "k-pop" },
    ],
  },
  {
    slug: "country-and-folk",
    title: "Country & Folk",
    description: "Songwriter-first traditions rooted in region, storytelling, and strong audience loyalty.",
    catalogSlug: "country",
    genres: [
      { title: "Country", description: "Mainline country records built around storytelling, vocal identity, and place.", aliases: ["modern country"], catalogSlug: "country" },
      { title: "Americana", description: "Roots music that lives between country, folk, blues, and singer-songwriter craft.", aliases: ["american roots"], catalogSlug: "country" },
      { title: "Alt-Country", description: "Country songwriting with rougher edges, indie instincts, and less polish.", aliases: ["alternative country"], catalogSlug: "country" },
      { title: "Bluegrass", description: "String-band music built on virtuosity, speed, and old-time ensemble interplay.", aliases: ["progressive bluegrass"], catalogSlug: "country" },
      { title: "Contemporary Folk", description: "Modern acoustic songwriting centered on narrative clarity and intimacy.", aliases: ["modern folk", "folk"], catalogSlug: "indie" },
      { title: "Singer-Songwriter", description: "Personal songwriting where voice, lyric, and arrangement stay up front.", aliases: ["acoustic singer songwriter"], catalogSlug: "indie" },
    ],
  },
  {
    slug: "jazz-and-soul",
    title: "Jazz & Soul",
    description: "Improvisational and groove-heavy traditions with deep historical gravity and ongoing reinvention.",
    catalogSlug: "soul",
    genres: [
      { title: "Soul", description: "Emotion-forward groove music where vocal presence carries enormous weight.", aliases: ["classic soul"], catalogSlug: "soul" },
      { title: "Funk", description: "Pocket-first rhythm music built from interlocking parts and kinetic repetition.", aliases: ["p-funk"], catalogSlug: "soul" },
      { title: "Jazz", description: "Improvisational music with a huge spectrum, from classic standards to contemporary fusion.", aliases: ["straight-ahead jazz"], catalogSlug: "soul" },
      { title: "Jazz Fusion", description: "Jazz that leans into electric rhythm, rock movement, and technical fireworks.", aliases: ["fusion jazz"], catalogSlug: "electronic" },
      { title: "Contemporary Jazz", description: "Current jazz recordings with more crossover pull, texture, and modern production.", aliases: ["modern jazz"], catalogSlug: "soul" },
      { title: "Gospel Soul", description: "Soul and praise traditions meeting in big dynamics, harmony, and communal lift.", aliases: ["gospel soul"], catalogSlug: "soul" },
    ],
  },
  {
    slug: "metal-and-heavy",
    title: "Metal & Heavy",
    description: "Intensity-first genres built on precision, speed, distortion, and scene devotion.",
    catalogSlug: "metal",
    genres: [
      { title: "Metal", description: "Heavy guitar music centered on force, technicality, and long-form fan commitment.", aliases: ["heavy metal"], catalogSlug: "metal" },
      { title: "Thrash Metal", description: "Fast, precise metal driven by riff density and relentless propulsion.", aliases: ["thrash"], catalogSlug: "metal" },
      { title: "Death Metal", description: "Extreme metal built around density, aggression, and lower-register power.", aliases: ["melodic death metal"], catalogSlug: "metal" },
      { title: "Black Metal", description: "Atmospheric and often abrasive metal with strong scene codes and visual identity.", aliases: ["atmospheric black metal"], catalogSlug: "metal" },
      { title: "Metalcore", description: "Heavy music where breakdown architecture and melodic hooks coexist.", aliases: ["post-hardcore metalcore"], catalogSlug: "metal" },
      { title: "Hardcore", description: "Short-form heavy music built around community intensity and direct force.", aliases: ["hardcore punk"], catalogSlug: "metal" },
    ],
  },
  {
    slug: "blues-and-roots",
    title: "Blues & Roots",
    description: "Foundational American forms that continue to feed rock, soul, country, and modern revival scenes.",
    catalogSlug: "rock",
    genres: [
      { title: "Blues", description: "Guitar- and voice-led traditions rooted in feeling, phrasing, and durable song form.", aliases: ["electric blues"], catalogSlug: "rock" },
      { title: "Blues Rock", description: "Amplified blues language with bigger riffs and rock-band momentum.", aliases: ["blues-rock"], catalogSlug: "rock" },
      { title: "Roots Rock", description: "Rock music that leans harder into American tradition, groove, and grit.", aliases: ["roots rock"], catalogSlug: "rock" },
      { title: "Southern Soul", description: "Earthier soul built from church feeling, band interplay, and physical rhythm.", aliases: ["deep soul"], catalogSlug: "soul" },
      { title: "Swamp Pop", description: "Regional roots-pop where country, R&B, and local texture blur together.", aliases: ["louisiana pop"], catalogSlug: "country" },
    ],
  },
  {
    slug: "spiritual-and-choral",
    title: "Spiritual & Choral",
    description: "Sacred and devotional music traditions that still shape popular music vocabulary and community listening.",
    catalogSlug: "soul",
    genres: [
      { title: "Gospel", description: "Praise-centered music defined by testimony, lift, and vocal conviction.", aliases: ["black gospel"], catalogSlug: "soul" },
      { title: "Contemporary Worship", description: "Modern devotional songwriting designed for collective singing and emotional clarity.", aliases: ["worship music"], catalogSlug: "soul" },
      { title: "Choral", description: "Voice ensemble traditions centered on harmony, resonance, and scale.", aliases: ["choral music"], catalogSlug: "electronic" },
      { title: "Sacred Jazz", description: "Improvisational music with spiritual framing and church-rooted uplift.", aliases: ["spiritual jazz"], catalogSlug: "soul" },
    ],
  },
  {
    slug: "classical-and-instrumental",
    title: "Classical & Instrumental",
    description: "Long-form and non-vocal listening lanes shaped by composition, atmosphere, and pure arrangement.",
    catalogSlug: "electronic",
    genres: [
      { title: "Classical", description: "Orchestral and chamber traditions centered on composition, ensemble, and interpretation.", aliases: ["orchestral"], catalogSlug: "electronic" },
      { title: "Contemporary Classical", description: "Modern composed music where atmosphere and structure share the frame.", aliases: ["modern classical"], catalogSlug: "electronic" },
      { title: "Piano Instrumental", description: "Instrumental records led by melody, space, and intimate detail.", aliases: ["solo piano"], catalogSlug: "electronic" },
      { title: "Film Score", description: "Cinematic instrumental music that travels well outside the screen.", aliases: ["soundtrack"], catalogSlug: "electronic" },
      { title: "Post-Minimal", description: "Repeating, slowly shifting instrumental music built around patience and pattern.", aliases: ["minimal classical"], catalogSlug: "electronic" },
    ],
  },
];

const discoveryFamilies = discoverySeeds.map((family) => {
  const dedupedGenres = new Map<string, DiscoveryGenre>();

  family.genres.forEach((genre) => {
    const slug = slugify(genre.title);
    const key = normalizeGenreName(genre.title);

    if (dedupedGenres.has(key)) {
      return;
    }

    dedupedGenres.set(key, {
      slug,
      title: genre.title,
      description: genre.description,
      familySlug: family.slug,
      familyTitle: family.title,
      aliases: Array.from(
        new Set([genre.title, ...(genre.aliases ?? [])].map((alias) => normalizeGenreName(alias)))
      ),
      catalogSlug: slug,
    });
  });

  return {
    slug: family.slug,
    title: family.title,
    description: family.description,
    catalogSlug: family.catalogSlug ?? null,
    genres: Array.from(dedupedGenres.values()).sort((left, right) => left.title.localeCompare(right.title)),
  } satisfies DiscoveryFamily;
});

const catalogGenreAliasMap = new Map<string, string>();

function registerCatalogAliases(catalogSlug: string, values: string[]) {
  values.forEach((value) => {
    catalogGenreAliasMap.set(normalizeGenreName(value), catalogSlug);
  });
}

registerCatalogAliases("rock", [
  "rock",
  "classic rock",
  "folk rock",
  "album rock",
  "blues rock",
  "roots rock",
  "punk",
]);
registerCatalogAliases("country", [
  "country",
  "americana",
  "alt-country",
  "alternative country",
  "bluegrass",
]);
registerCatalogAliases("alternative", [
  "alternative",
  "alternative rock",
  "post-punk",
  "shoegaze",
  "emo",
  "dream pop",
]);
registerCatalogAliases("indie", [
  "indie",
  "indie rock",
  "indie pop",
  "indie folk",
  "singer songwriter",
  "singer-songwriter",
  "folk",
]);
registerCatalogAliases("dance", [
  "dance",
  "dance pop",
  "dance-pop",
  "pop",
  "synthpop",
  "synth pop",
  "house",
  "disco",
  "trance",
  "garage",
]);
registerCatalogAliases("latin", [
  "latin",
  "latin music",
  "latin pop",
  "pop latino",
  "reggaeton",
  "urbano latino",
  "regional mexicano",
  "regional mexican",
  "corridos tumbados",
  "salsa",
  "bachata",
  "cumbia",
]);
registerCatalogAliases("afrobeats", [
  "afrobeats",
  "afropop",
  "afro pop",
  "afro-fusion",
  "afrofusion",
  "amapiano",
  "highlife",
  "bongo flava",
]);
registerCatalogAliases("k-pop", [
  "k-pop",
  "kpop",
  "korean pop",
  "korean r and b",
  "korean rhythm and blues",
  "j-pop",
  "jpop",
  "japanese pop",
  "mandopop",
  "anime pop",
]);
registerCatalogAliases("electronic", [
  "electronic",
  "electronica",
  "techno",
  "drum and bass",
  "drum & bass",
  "ambient",
  "classical",
  "film score",
  "soundtrack",
  "contemporary classical",
  "jazz fusion",
]);
registerCatalogAliases("soul", [
  "soul",
  "r and b",
  "r&b",
  "rhythm and blues",
  "neo soul",
  "neo-soul",
  "alternative r and b",
  "alternative r&b",
  "funk",
  "jazz",
  "gospel",
  "gospel soul",
  "spiritual jazz",
]);
registerCatalogAliases("metal", [
  "metal",
  "heavy metal",
  "thrash metal",
  "death metal",
  "black metal",
  "metalcore",
  "hardcore",
]);

const editorialFallbackSlugs = ["latin", "afrobeats", "dance", "k-pop", "electronic"];

export const discoveryGenreFamilies = discoveryFamilies;
export const discoveryGenres = discoveryFamilies.flatMap((family) => family.genres);

export function mapRawGenreToCatalogSlug(rawGenre: string) {
  const normalized = normalizeGenreName(rawGenre);

  if (catalogGenreAliasMap.has(normalized)) {
    return catalogGenreAliasMap.get(normalized) ?? null;
  }

  for (const [alias, slug] of catalogGenreAliasMap.entries()) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return slug;
    }
  }

  return null;
}

export function mapRawGenreToDiscoverySlug(rawGenre: string) {
  const normalized = normalizeGenreName(rawGenre);

  if (!normalized) {
    return null;
  }

  const exactMatch = discoveryGenres.find((genre) => {
    return genre.aliases.some((alias) => alias === normalized) || normalizeGenreName(genre.title) === normalized;
  });

  if (exactMatch) {
    return exactMatch.slug;
  }

  const partialMatch = discoveryGenres.find((genre) => {
    return genre.aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized));
  });

  return partialMatch?.slug ?? null;
}

export function getEditorialFallbackGenres() {
  return editorialFallbackSlugs
    .map((slug) => genreCollections.find((collection) => collection.slug === slug) ?? null)
    .filter((collection): collection is NonNullable<typeof collection> => collection !== null);
}

export function getDiscoveryGenreBySlug(slug: string) {
  return discoveryGenres.find((genre) => genre.slug === slug) ?? null;
}

export function filterDiscoveryFamilies(searchQuery: string, familySlug: string) {
  const normalizedSearch = normalizeGenreName(searchQuery);

  return discoveryFamilies
    .filter((family) => familySlug === "all" || family.slug === familySlug)
    .map((family) => {
      if (!normalizedSearch) {
        return family;
      }

      const genres = family.genres.filter((genre) => {
        return (
          normalizeGenreName(genre.title).includes(normalizedSearch) ||
          normalizeGenreName(genre.description).includes(normalizedSearch) ||
          genre.aliases.some((alias) => alias.includes(normalizedSearch))
        );
      });

      if (genres.length === 0 && !normalizeGenreName(family.title).includes(normalizedSearch)) {
        return null;
      }

      return {
        ...family,
        genres,
      };
    })
    .filter((family): family is DiscoveryFamily => family !== null);
}
