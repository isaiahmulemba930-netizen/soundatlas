import { NextResponse } from "next/server";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type ArtistRelation = {
  type?: string;
  url?: {
    resource?: string;
  };
};

type ArtistResponse = {
  id: string;
  name: string;
  country?: string;
  disambiguation?: string;
  "begin-area"?: {
    name?: string;
  };
  area?: {
    name?: string;
  };
  relations?: ArtistRelation[];
};

type ReleaseGroup = {
  id: string;
  title: string;
  "first-release-date"?: string;
};

type AlbumsResponse = {
  "release-groups"?: ReleaseGroup[];
};

type WikipediaSummaryResponse = {
  extract?: string;
  description?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
};

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{
      title?: string;
    }>;
  };
};

function getWikipediaTitleFromRelations(relations?: ArtistRelation[]) {
  const wikipediaUrl = relations?.find((relation) => relation.type === "wikipedia")?.url?.resource;
  if (!wikipediaUrl) return null;

  try {
    const url = new URL(wikipediaUrl);
    const parts = url.pathname.split("/wiki/");
    if (!parts[1]) return null;
    return decodeURIComponent(parts[1]);
  } catch {
    return null;
  }
}

function getShortBio(summary: string) {
  const sentences = summary
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  return sentences.slice(0, 4).join(" ");
}

function buildFallbackBio(artist: ArtistResponse) {
  const location = artist["begin-area"]?.name || artist.area?.name || artist.country || "an unknown location";
  return `${artist.name} is a recording artist from ${location}. A fuller source-backed biography is not available for this page yet.`;
}

async function findWikipediaTitleBySearch(artist: ArtistResponse) {
  const searchParams = new URLSearchParams({
    action: "query",
    list: "search",
    format: "json",
    srlimit: "5",
    srsearch: `${artist.name} musician ${artist.country || ""} ${artist.disambiguation || ""}`.trim(),
  });

  const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?${searchParams.toString()}`, {
    headers: {
      "User-Agent": "SoundAtlasApp/1.0 (learning project)",
    },
    cache: "no-store",
  });

  if (!searchRes.ok) {
    return null;
  }

  const searchData = (await searchRes.json()) as WikipediaSearchResponse;
  const results = searchData.query?.search ?? [];
  const match = results.find((result) => {
    const title = (result.title || "").toLowerCase();
    return title.includes(artist.name.toLowerCase()) && !title.includes("disambiguation");
  });

  return match?.title ?? results[0]?.title ?? null;
}

async function fetchWikipediaSummary(artist: ArtistResponse) {
  const relatedTitle = getWikipediaTitleFromRelations(artist.relations);
  const searchTitle = relatedTitle || (await findWikipediaTitleBySearch(artist));
  if (!searchTitle) return null;

  const wikiRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTitle)}`,
    {
      headers: {
        "User-Agent": "SoundAtlasApp/1.0 (learning project)",
      },
      cache: "no-store",
    }
  );

  if (!wikiRes.ok) {
    return null;
  }

  const wikiData = (await wikiRes.json()) as WikipediaSummaryResponse;
  if (!wikiData.extract) {
    return null;
  }

  return {
    bioSummary: getShortBio(wikiData.extract),
    description: wikiData.description ?? "",
    sourceUrl: wikiData.content_urls?.desktop?.page ?? "",
  };
}

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;

  const artistRes = await fetch(
    `https://musicbrainz.org/ws/2/artist/${id}?inc=url-rels+area-rels&fmt=json`,
    {
      headers: {
        "User-Agent": "SoundAtlasApp/1.0 (learning project)",
      },
      cache: "no-store",
    }
  );

  if (!artistRes.ok) {
    return NextResponse.json({ error: "Failed to fetch artist" }, { status: 500 });
  }

  const artist = (await artistRes.json()) as ArtistResponse;

  const albumsRes = await fetch(
    `https://musicbrainz.org/ws/2/release-group?artist=${id}&type=album&fmt=json&limit=50`,
    {
      headers: {
        "User-Agent": "SoundAtlasApp/1.0 (learning project)",
      },
      cache: "no-store",
    }
  );

  if (!albumsRes.ok) {
    return NextResponse.json({ error: "Failed to fetch albums" }, { status: 500 });
  }

  const albumsData = (await albumsRes.json()) as AlbumsResponse;
  const wikiSummary = await fetchWikipediaSummary(artist);

  return NextResponse.json({
    artist: {
      id: artist.id,
      name: artist.name,
      country: artist.country,
      origin: artist["begin-area"]?.name || artist.area?.name || artist.country,
      description: wikiSummary?.description ?? "",
      bioSummary: wikiSummary?.bioSummary ?? buildFallbackBio(artist),
      sourceUrl: wikiSummary?.sourceUrl ?? "",
    },
    albums: (albumsData["release-groups"] || []).map((album) => ({
      id: album.id,
      title: album.title,
      date: album["first-release-date"] || "Unknown",
    })),
  });
}
