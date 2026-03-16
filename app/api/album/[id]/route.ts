import { NextResponse } from "next/server";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

type ReleaseSummary = {
  id: string;
};

type ReleasesResponse = {
  releases?: ReleaseSummary[];
};

type Track = {
  number?: string;
  title: string;
};

type Medium = {
  tracks?: Track[];
};

type ReleaseDetailsResponse = {
  title: string;
  date?: string;
  media?: Medium[];
};

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;

  const releasesRes = await fetch(
    `https://musicbrainz.org/ws/2/release?release-group=${id}&fmt=json&limit=10`,
    {
      headers: {
        "User-Agent": "SoundAtlasApp/1.0 (learning project)",
      },
      cache: "no-store",
    }
  );

  if (!releasesRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch releases" },
      { status: 500 }
    );
  }

  const releasesData = (await releasesRes.json()) as ReleasesResponse;
  const firstRelease = releasesData.releases?.[0];

  if (!firstRelease) {
    return NextResponse.json({ album: null, tracks: [] });
  }

  const releaseRes = await fetch(
    `https://musicbrainz.org/ws/2/release/${firstRelease.id}?inc=recordings&fmt=json`,
    {
      headers: {
        "User-Agent": "SoundAtlasApp/1.0 (learning project)",
      },
      cache: "no-store",
    }
  );

  if (!releaseRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch release details" },
      { status: 500 }
    );
  }

  const releaseData = (await releaseRes.json()) as ReleaseDetailsResponse;

  const tracks =
    releaseData.media?.flatMap((medium) =>
      (medium.tracks || []).map((track) => ({
        number: track.number,
        title: track.title,
      }))
    ) || [];

  return NextResponse.json({
    album: {
      title: releaseData.title,
      date: releaseData.date || "Unknown",
    },
    tracks,
  });
}
