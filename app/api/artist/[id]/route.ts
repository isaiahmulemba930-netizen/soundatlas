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
  type?: string;
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
};

function getWikipediaTitle(relations?: ArtistRelation[]) {
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

  return sentences.slice(0, 3).join(" ");
}

function buildFallbackBio(artist: ArtistResponse) {
  const location = artist["begin-area"]?.name || artist.area?.name || artist.country || "an unknown location";
  const typeLabel = artist.type ? artist.type.toLowerCase() : "music artist";
  const note = artist.disambiguation ? ` ${artist.disambiguation}.` : "";

  return `${artist.name} is a ${typeLabel} from ${location}.${note} They built traction through releases, performances, and recognition captured in the MusicBrainz catalog.`;
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
    return NextResponse.json(
      { error: "Failed to fetch artist" },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    );
  }

  const albumsData = (await albumsRes.json()) as AlbumsResponse;

  let bioSummary = buildFallbackBio(artist);
  const wikipediaTitle = getWikipediaTitle(artist.relations);

  if (wikipediaTitle) {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikipediaTitle)}`,
      {
        headers: {
          "User-Agent": "SoundAtlasApp/1.0 (learning project)",
        },
        cache: "no-store",
      }
    );

    if (wikiRes.ok) {
      const wikiData = (await wikiRes.json()) as WikipediaSummaryResponse;
      if (wikiData.extract) {
        bioSummary = getShortBio(wikiData.extract);
      }
    }
  }

  return NextResponse.json({
    artist: {
      id: artist.id,
      name: artist.name,
      type: artist.type,
      country: artist.country,
      origin: artist["begin-area"]?.name || artist.area?.name || artist.country,
      disambiguation: artist.disambiguation,
      bioSummary,
    },
    albums: (albumsData["release-groups"] || []).map((album) => ({
      id: album.id,
      title: album.title,
      date: album["first-release-date"] || "Unknown",
    })),
  });
}
