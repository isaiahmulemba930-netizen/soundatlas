type AlbumContextInput = {
  title: string;
  artist: string;
  laneTitle: string;
  primaryGenre: string;
  releaseDate: string;
  trackCount: number;
  matchedTerms: string[];
  source: "live" | "editorial";
  artistInfo?: string | null;
};

export type AlbumContextSection = {
  label: string;
  text: string;
};

type AlbumEditorialProfile = {
  whyItShowsUp?: string;
  sections: AlbumContextSection[];
};

function normalizeKey(artist: string, title: string) {
  return `${artist}::${title}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9:]+/g, " ")
    .trim();
}

const editorialProfiles = new Map<string, AlbumEditorialProfile>([
  [
    normalizeKey("Pink Floyd", "The Dark Side of the Moon"),
    {
      whyItShowsUp:
        "This album keeps appearing in rock lanes because it fused studio ambition, conceptual sequencing, and mass reach into one of the most cited canonical records in modern music.",
      sections: [
        {
          label: "Making of",
          text: "Pink Floyd developed the material while touring earlier versions of the suite before recording it, which helped lock in the album's seamless, side-long pacing.",
        },
        {
          label: "Legacy",
          text: "Its sustained chart life and status in all-time album conversations made it a permanent reference point for progressive and conceptual rock.",
        },
      ],
    },
  ],
  [
    normalizeKey("Radiohead", "OK Computer"),
    {
      whyItShowsUp:
        "It shows up in alternative lanes because it widened the genre's emotional and sonic range while becoming one of the most frequently cited late-1990s rock records.",
      sections: [
        {
          label: "Mindset",
          text: "Radiohead approached the album as a bigger, more alienating response to sudden success, leaning into anxiety, dislocation, and more layered studio construction.",
        },
        {
          label: "Critical reputation",
          text: "The record's reputation as a landmark art-rock album has only grown, and it still anchors conversations about how alternative music changed at the end of the 1990s.",
        },
      ],
    },
  ],
  [
    normalizeKey("Daft Punk", "Discovery"),
    {
      whyItShowsUp:
        "Discovery remains a core dance-lane record because it turned house, disco, and pop interpolation into a sleek crossover album that still defines modern dance-pop ambition.",
      sections: [
        {
          label: "Creative goal",
          text: "Daft Punk deliberately pushed toward brighter melody, fantasy, and songcraft, treating the album as a more emotional and open follow-up to their first record.",
        },
        {
          label: "Impact",
          text: "Its blend of French house technique and pop immediacy made it a long-term reference point for dance records built to work both in clubs and on headphones.",
        },
      ],
    },
  ],
  [
    normalizeKey("Bad Bunny", "Un Verano Sin Ti"),
    {
      whyItShowsUp:
        "It appears in Latin lanes because it was a massive cross-market release that widened the center of Latin pop and reggaeton without flattening its regional identity.",
      sections: [
        {
          label: "Scope",
          text: "The album was built as a wide, beach-season record that moved across reggaeton, dembow, indie pop, and Caribbean textures rather than staying in one substyle.",
        },
        {
          label: "Cultural reach",
          text: "Its commercial scale and streaming longevity made it one of the defining Latin releases of its era, especially in global crossover discussions.",
        },
      ],
    },
  ],
  [
    normalizeKey("Burna Boy", "African Giant"),
    {
      whyItShowsUp:
        "It keeps showing up in Afrobeats lanes because it crystallized Burna Boy's global rise and remains one of the key albums in conversations about the genre's worldwide expansion.",
      sections: [
        {
          label: "Positioning",
          text: "The project arrived at a moment when Burna Boy was scaling rapidly beyond regional success, and the album leaned into that broader audience without losing local grounding.",
        },
        {
          label: "Genre impact",
          text: "Its reach helped reinforce Afrobeats as a global album lane rather than only a singles-driven scene.",
        },
      ],
    },
  ],
  [
    normalizeKey("BTS", "Love Yourself 轉 'Tear'"),
    {
      whyItShowsUp:
        "This record shows up in K-Pop lanes because it pairs idol-scale production with a level of album framing and global reach that made it a touchstone release.",
      sections: [
        {
          label: "Album frame",
          text: "The record was positioned as a darker emotional chapter, with stronger emphasis on heartbreak, self-interrogation, and a more dramatic sonic palette.",
        },
        {
          label: "Recognition",
          text: "Its impact on the group's international profile helped make full-length K-pop albums feel more central to mainstream global album discourse.",
        },
      ],
    },
  ],
  [
    normalizeKey("Marvin Gaye", "What's Going On"),
    {
      whyItShowsUp:
        "It continues to surface in soul lanes because it combines lush vocal craft with social commentary and remains one of the genre's most universally cited landmarks.",
      sections: [
        {
          label: "Why it was made",
          text: "Marvin Gaye pushed for a more personal and socially observant record, departing from a stricter singles model toward a more unified album statement.",
        },
        {
          label: "Legacy",
          text: "The album's blend of conscience, arrangement, and intimacy keeps it near the center of conversations about soul as an album form.",
        },
      ],
    },
  ],
  [
    normalizeKey("Metallica", "Master of Puppets"),
    {
      whyItShowsUp:
        "It shows up in metal lanes because it is still treated as one of the clearest examples of thrash metal at both peak aggression and peak structural ambition.",
      sections: [
        {
          label: "Reputation",
          text: "The record's technical discipline, speed, and song scale made it a benchmark for metal bands trying to balance heaviness with composition.",
        },
        {
          label: "Genre impact",
          text: "Its long-standing status in best-of-metal lists keeps it anchored in heavy music discovery shelves.",
        },
      ],
    },
  ],
]);

function formatReleaseYear(releaseDate: string) {
  if (!releaseDate) {
    return null;
  }

  const parsed = new Date(releaseDate);

  if (Number.isNaN(parsed.getTime())) {
    return releaseDate;
  }

  return String(parsed.getFullYear());
}

export function buildAlbumWhyItShowsUp(input: AlbumContextInput) {
  const editorial = editorialProfiles.get(normalizeKey(input.artist, input.title));

  if (editorial?.whyItShowsUp) {
    return editorial.whyItShowsUp;
  }

  const reasons = [
    `${input.title} appears in the ${input.laneTitle.toLowerCase()} lane because it is currently matching ${input.matchedTerms.length > 1 ? "multiple live search signals" : "a live search signal"} for that genre.`,
  ];

  if (input.primaryGenre) {
    reasons.push(`Its storefront genre is listed as ${input.primaryGenre}, which keeps the match grounded in live metadata rather than a loose fallback.`);
  }

  if (input.source === "editorial") {
    reasons.push("Live results were thin for this refresh, so the lane fell back to a documented editorial anchor instead of inventing a random substitute.");
  }

  return reasons.join(" ");
}

export function buildAlbumContextSections(input: AlbumContextInput) {
  const editorial = editorialProfiles.get(normalizeKey(input.artist, input.title));
  const sections: AlbumContextSection[] = [];
  const releaseYear = formatReleaseYear(input.releaseDate);

  if (releaseYear) {
    sections.push({
      label: "Release frame",
      text: `${input.title} was released in ${releaseYear}${input.primaryGenre ? ` and is currently categorized as ${input.primaryGenre}.` : "."}`,
    });
  }

  if (input.trackCount > 0) {
    sections.push({
      label: "Scale",
      text: `The live lookup currently returns ${input.trackCount} track${input.trackCount === 1 ? "" : "s"}, which helps place the album as a full project rather than a loose single-era reference.`,
    });
  }

  if (input.matchedTerms.length > 0) {
    sections.push({
      label: "Lane signal",
      text: `This album stayed in the ${input.laneTitle.toLowerCase()} refresh because it matched ${input.matchedTerms.join(", ")} during the current six-hour rotation window.`,
    });
  }

  if (input.artistInfo) {
    sections.push({
      label: "Artist lens",
      text: input.artistInfo,
    });
  }

  if (editorial?.sections?.length) {
    sections.push(...editorial.sections);
  }

  return sections.slice(0, 5);
}
