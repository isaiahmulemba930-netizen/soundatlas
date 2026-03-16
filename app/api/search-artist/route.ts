import { NextRequest, NextResponse } from "next/server";

type MusicBrainzArtist = {
  id: string;
  name: string;
  country?: string;
};

type MusicBrainzSearchResponse = {
  artists?: MusicBrainzArtist[];
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");

  if (!q) {
    return NextResponse.json({ artists: [] });
  }

  const res = await fetch(
    `https://musicbrainz.org/ws/2/artist?query=${q}&fmt=json&limit=10`,
    {
      headers: {
        "User-Agent": "SoundAtlasApp/1.0 (learning project)",
      },
    }
  );

  const data = (await res.json()) as MusicBrainzSearchResponse;

  const artists = (data.artists || []).map((artist) => ({
    id: artist.id,
    name: artist.name,
    country: artist.country,
  }));

  return NextResponse.json({ artists });
}
