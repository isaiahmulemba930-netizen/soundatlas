"use client";

import type { ListeningEventInput } from "@/lib/listening";

export type SupportedImportPlatform = "spotify" | "apple-music";

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function safeTrackId(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join("::")
    .toLowerCase();
}

type SpotifyStreamingRow = {
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  master_metadata_album_album_name?: string | null;
  ms_played?: number | null;
  ts?: string | null;
  platform?: string | null;
};

export function parseSpotifyHistoryJson(content: string) {
  const parsed = JSON.parse(content) as SpotifyStreamingRow[];
  if (!Array.isArray(parsed)) {
    throw new Error("Spotify import must be a JSON array from Extended Streaming History.");
  }

  const events = parsed
    .filter((row) => row.master_metadata_track_name && row.master_metadata_album_artist_name && row.ts)
    .map<ListeningEventInput>((row, index) => ({
      trackId: safeTrackId([
        "spotify",
        row.master_metadata_album_artist_name,
        row.master_metadata_album_album_name,
        row.master_metadata_track_name,
        index,
      ]),
      trackName: row.master_metadata_track_name ?? "Unknown track",
      artistName: row.master_metadata_album_artist_name ?? "Unknown artist",
      albumName: row.master_metadata_album_album_name ?? null,
      playedAt: parseDate(row.ts ?? "") ?? new Date().toISOString(),
      durationPlayedSeconds: row.ms_played ? Math.round(row.ms_played / 1000) : null,
      sourcePlatform: "spotify",
      sourceType: "imported_history",
      metadata: {
        importPlatform: row.platform ?? "spotify_export",
      },
    }));

  return events;
}

export function parseAppleMusicCsv(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Apple Music import needs a CSV with a header row and at least one play.");
  }

  const headers = lines[0]
    .split(",")
    .map((header) => header.trim().replace(/^"|"$/g, "").toLowerCase());

  const events = lines.slice(1).map<ListeningEventInput | null>((line, index) => {
    const columns = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map((value) => value.replace(/^"|"$/g, "")) ?? [];
    const row = Object.fromEntries(headers.map((header, columnIndex) => [header, columns[columnIndex] ?? ""]));

    const trackName = row["track description"] || row["song name"] || row["track name"];
    const artistName = row["artist"] || row["artist name"];
    const albumName = row["container description"] || row["album name"] || row["album"];
    const playedAt = row["event start timestamp"] || row["played at"] || row["date played"];
    const duration = row["media duration in millis"] || row["duration in millis"] || row["duration"];

    if (!trackName || !artistName || !playedAt) {
      return null;
    }

    const parsedDuration = Number(duration);

    return {
      trackId: safeTrackId(["apple-music", artistName, albumName, trackName, index]),
      trackName,
      artistName,
      albumName: albumName || null,
      playedAt: parseDate(playedAt) ?? new Date().toISOString(),
      durationPlayedSeconds: Number.isFinite(parsedDuration) ? Math.round(parsedDuration / 1000) : null,
      sourcePlatform: "apple-music",
      sourceType: "imported_history",
      metadata: {
        importFormat: "apple_music_csv",
      },
    } satisfies ListeningEventInput;
  });

  return events.filter((event): event is ListeningEventInput => Boolean(event));
}

export function detectImportPlatform(fileName: string, content: string): SupportedImportPlatform | null {
  const loweredName = fileName.toLowerCase();
  const loweredContent = content.slice(0, 500).toLowerCase();

  if (loweredName.endsWith(".json") && loweredContent.includes("master_metadata_track_name")) {
    return "spotify";
  }

  if (loweredName.endsWith(".csv") && (loweredContent.includes("event start timestamp") || loweredContent.includes("track description"))) {
    return "apple-music";
  }

  return null;
}

export function parseImportedListeningFile(
  fileName: string,
  content: string
): {
  platform: SupportedImportPlatform;
  events: ListeningEventInput[];
  sourceLabel: string;
} {
  const platform = detectImportPlatform(fileName, content);

  if (platform === "spotify") {
    return {
      platform,
      events: parseSpotifyHistoryJson(content),
      sourceLabel: "Spotify imported history",
    };
  }

  if (platform === "apple-music") {
    return {
      platform,
      events: parseAppleMusicCsv(content),
      sourceLabel: "Apple Music imported history",
    };
  }

  throw new Error(
    "Unsupported import file. Upload Spotify Extended Streaming History JSON or Apple Music Play Activity CSV."
  );
}
