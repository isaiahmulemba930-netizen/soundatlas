"use client";

import {
  getListeningEventsWithinRange,
  importListeningHistory,
  type ListeningEventInput,
  type MusicPlatformConnection,
  upsertMusicPlatformConnection,
} from "@/lib/listening";

const SPOTIFY_SCOPES = ["user-read-recently-played", "user-read-email"];
const SPOTIFY_VERIFIER_KEY = "soundatlas-spotify-code-verifier";
const SPOTIFY_STATE_KEY = "soundatlas-spotify-state";
const APPLE_MUSIC_SCRIPT_SRC = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
const NEW_YORK_TIMEZONE = "America/New_York";

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

type SpotifyProfile = {
  id: string;
  display_name?: string;
  email?: string;
};

type SpotifyRecentlyPlayedResponse = {
  items?: Array<{
    played_at: string;
    track?: {
      id?: string;
      name?: string;
      duration_ms?: number;
      album?: {
        id?: string;
        name?: string;
      };
      artists?: Array<{
        id?: string;
        name?: string;
      }>;
    };
  }>;
  cursors?: {
    after?: string;
  };
};

type AppleMusicTrackAttributes = {
  name?: string;
  artistName?: string;
  albumName?: string;
  durationInMillis?: number;
  genreNames?: string[];
  playParams?: {
    id?: string;
  };
};

type AppleMusicRecentResponse = {
  data?: Array<{
    id?: string;
    type?: string;
    attributes?: AppleMusicTrackAttributes;
  }>;
};

declare global {
  interface Window {
    MusicKit?: {
      configure: (options: Record<string, unknown>) => void;
      getInstance: () => {
        authorize: () => Promise<string>;
        isAuthorized?: boolean;
        musicUserToken?: string;
      };
    };
  }
}

function getSpotifyClientId() {
  return process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? "";
}

function getAppleMusicDeveloperToken() {
  return process.env.NEXT_PUBLIC_APPLE_MUSIC_DEVELOPER_TOKEN ?? "";
}

function getSpotifyRedirectUri() {
  const url = new URL(window.location.href);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
  }
  return `${url.origin}/connections?platform=spotify`;
}

function getAppleMusicReturnUrl() {
  return `${window.location.origin}/connections?platform=apple-music`;
}

function randomString(length: number) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((value) => characters[value % characters.length])
    .join("");
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

function base64UrlEncode(input: Uint8Array) {
  return btoa(String.fromCharCode(...input))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function getWeeklySyncWindowKey(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: NEW_YORK_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value])
  );

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekday = weekdayMap[parts.weekday] ?? 0;
  const hour = Number(parts.hour ?? "0");
  const localDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  const daysBack = weekday === 0 && hour >= 18 ? 0 : weekday === 0 ? 7 : weekday;
  localDate.setUTCDate(localDate.getUTCDate() - daysBack);

  const year = localDate.getUTCFullYear();
  const month = `${localDate.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${localDate.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}-18-00-${NEW_YORK_TIMEZONE}`;
}

function isWeeklySyncDue(connection: MusicPlatformConnection) {
  const metadata = connection.metadata ?? {};
  const lastSyncWindow = typeof metadata.lastSyncWindow === "string" ? metadata.lastSyncWindow : "";
  return lastSyncWindow !== getWeeklySyncWindowKey();
}

function spotifyMetadata(connection: MusicPlatformConnection) {
  return (connection.metadata ?? {}) as {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    afterCursor?: string;
    lastSyncWindow?: string;
  };
}

function appleMetadata(connection: MusicPlatformConnection) {
  return (connection.metadata ?? {}) as {
    musicUserToken?: string;
    lastSyncWindow?: string;
  };
}

async function filterExistingEvents(events: ListeningEventInput[]) {
  if (events.length === 0) {
    return [];
  }

  const playedAts = events
    .map((event) => event.playedAt)
    .filter((value): value is string => Boolean(value))
    .sort();

  const existing = await getListeningEventsWithinRange(playedAts[0], playedAts[playedAts.length - 1], 1000);
  const existingKeys = new Set(
    existing.map((event) => `${event.source_platform}::${event.track_id}::${event.played_at}`)
  );

  return events.filter((event) => {
    const key = `${event.sourcePlatform ?? ""}::${event.trackId}::${event.playedAt ?? ""}`;
    return !existingKeys.has(key);
  });
}

export async function beginSpotifyLogin() {
  const clientId = getSpotifyClientId();
  if (!clientId) {
    throw new Error("Add NEXT_PUBLIC_SPOTIFY_CLIENT_ID to connect Spotify.");
  }

  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = randomString(24);

  window.sessionStorage.setItem(SPOTIFY_VERIFIER_KEY, verifier);
  window.sessionStorage.setItem(SPOTIFY_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getSpotifyRedirectUri(),
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES.join(" "),
    state,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function exchangeSpotifyCode(code: string) {
  const verifier = window.sessionStorage.getItem(SPOTIFY_VERIFIER_KEY);
  if (!verifier) {
    throw new Error("Spotify login session expired. Try connecting again.");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: getSpotifyClientId(),
      grant_type: "authorization_code",
      code,
      redirect_uri: getSpotifyRedirectUri(),
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    throw new Error("Spotify authorization could not be completed.");
  }

  return (await response.json()) as SpotifyTokenResponse;
}

async function refreshSpotifyToken(connection: MusicPlatformConnection) {
  const metadata = spotifyMetadata(connection);
  if (!metadata.refreshToken) {
    throw new Error("Spotify refresh token is missing. Reconnect Spotify.");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: getSpotifyClientId(),
      grant_type: "refresh_token",
      refresh_token: metadata.refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Spotify token refresh failed. Reconnect Spotify.");
  }

  const payload = (await response.json()) as SpotifyTokenResponse;
  const updated = await upsertMusicPlatformConnection({
    platform: "spotify",
    connectionType: "oauth",
    status: "connected",
    externalAccountId: connection.external_account_id,
    externalAccountLabel: connection.external_account_label,
    metadata: {
      ...metadata,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? metadata.refreshToken,
      expiresAt: new Date(Date.now() + payload.expires_in * 1000).toISOString(),
    },
  });

  return updated;
}

async function getSpotifyAccessToken(connection: MusicPlatformConnection) {
  const metadata = spotifyMetadata(connection);
  if (!metadata.accessToken || !metadata.expiresAt) {
    return refreshSpotifyToken(connection);
  }

  if (new Date(metadata.expiresAt).getTime() - Date.now() < 60_000) {
    return refreshSpotifyToken(connection);
  }

  return connection;
}

async function fetchSpotifyProfile(accessToken: string) {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Spotify profile request failed.");
  }

  return (await response.json()) as SpotifyProfile;
}

async function fetchSpotifyRecentPlays(accessToken: string, afterCursor?: string) {
  const params = new URLSearchParams({
    limit: "50",
  });

  if (afterCursor) {
    params.set("after", afterCursor);
  }

  const response = await fetch(`https://api.spotify.com/v1/me/player/recently-played?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Spotify recently played request failed.");
  }

  return (await response.json()) as SpotifyRecentlyPlayedResponse;
}

function mapSpotifyEvents(payload: SpotifyRecentlyPlayedResponse) {
  return (payload.items ?? [])
    .filter((item) => item.track?.id && item.track.name && item.played_at)
    .map<ListeningEventInput>((item) => ({
      trackId: item.track?.id ?? "",
      trackName: item.track?.name ?? "Unknown track",
      artistId: item.track?.artists?.[0]?.id ?? null,
      artistName: item.track?.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || "Unknown artist",
      albumId: item.track?.album?.id ?? null,
      albumName: item.track?.album?.name ?? null,
      playedAt: item.played_at,
      durationPlayedSeconds: item.track?.duration_ms ? Math.round(item.track.duration_ms / 1000) : null,
      sourcePlatform: "spotify",
      sourceType: "connected_account",
      metadata: {
        platformPlayId: `${item.track?.id}:${item.played_at}`,
      },
    }));
}

export async function completeSpotifyConnection(code: string, state: string | null) {
  const expectedState = window.sessionStorage.getItem(SPOTIFY_STATE_KEY);
  if (!state || !expectedState || state !== expectedState) {
    throw new Error("Spotify login state did not match. Try connecting again.");
  }

  const token = await exchangeSpotifyCode(code);
  const profile = await fetchSpotifyProfile(token.access_token);

  const connection = await upsertMusicPlatformConnection({
    platform: "spotify",
    connectionType: "oauth",
    status: "connected",
    externalAccountId: profile.id,
    externalAccountLabel: profile.display_name || profile.email || "Spotify account",
    metadata: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? "",
      expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    },
  });

  window.sessionStorage.removeItem(SPOTIFY_VERIFIER_KEY);
  window.sessionStorage.removeItem(SPOTIFY_STATE_KEY);

  await syncSpotifyConnection(connection, true);
  return connection;
}

export async function syncSpotifyConnection(connection: MusicPlatformConnection, force = false) {
  if (!force && !isWeeklySyncDue(connection)) {
    return connection;
  }

  const hydratedConnection = await getSpotifyAccessToken(connection);
  const metadata = spotifyMetadata(hydratedConnection);
  const payload = await fetchSpotifyRecentPlays(metadata.accessToken ?? "", metadata.afterCursor);
  const freshEvents = await filterExistingEvents(mapSpotifyEvents(payload));

  if (freshEvents.length > 0) {
    await importListeningHistory(freshEvents);
  }

  return upsertMusicPlatformConnection({
    platform: "spotify",
    connectionType: "oauth",
    status: "connected",
    externalAccountId: hydratedConnection.external_account_id,
    externalAccountLabel: hydratedConnection.external_account_label,
    metadata: {
      ...metadata,
      afterCursor: payload.cursors?.after ?? metadata.afterCursor ?? "",
      lastSyncWindow: getWeeklySyncWindowKey(),
      lastSyncedAt: new Date().toISOString(),
    },
  });
}

function loadAppleMusicScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.MusicKit) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${APPLE_MUSIC_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Apple Music script failed to load.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = APPLE_MUSIC_SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Apple Music script failed to load.")), {
      once: true,
    });
    document.body.appendChild(script);
  });
}

async function getAppleMusicInstance() {
  const developerToken = getAppleMusicDeveloperToken();
  if (!developerToken) {
    throw new Error("Add NEXT_PUBLIC_APPLE_MUSIC_DEVELOPER_TOKEN to connect Apple Music.");
  }

  await loadAppleMusicScript();
  window.MusicKit?.configure({
    developerToken,
    app: {
      name: "SoundAtlas",
      build: "1.0.0",
    },
  });

  const instance = window.MusicKit?.getInstance();
  if (!instance) {
    throw new Error("Apple Music could not initialize.");
  }

  return instance;
}

async function fetchAppleRecentTracks(musicUserToken: string) {
  const response = await fetch("https://api.music.apple.com/v1/me/recent/played/tracks", {
    headers: {
      Authorization: `Bearer ${getAppleMusicDeveloperToken()}`,
      "Music-User-Token": musicUserToken,
    },
  });

  if (!response.ok) {
    throw new Error("Apple Music recently played request failed.");
  }

  return (await response.json()) as AppleMusicRecentResponse;
}

function mapAppleEvents(payload: AppleMusicRecentResponse) {
  return (payload.data ?? [])
    .filter((item) => item.attributes?.name && item.attributes.artistName)
    .map<ListeningEventInput>((item, index) => ({
      trackId: item.id || item.attributes?.playParams?.id || `apple-track-${index}`,
      trackName: item.attributes?.name ?? "Unknown track",
      artistName: item.attributes?.artistName ?? "Unknown artist",
      albumName: item.attributes?.albumName ?? null,
      genre: item.attributes?.genreNames?.[0] ?? null,
      durationPlayedSeconds: item.attributes?.durationInMillis
        ? Math.round(item.attributes.durationInMillis / 1000)
        : null,
      playedAt: new Date().toISOString(),
      sourcePlatform: "apple-music",
      sourceType: "connected_account",
    }));
}

export async function beginAppleMusicLogin() {
  const instance = await getAppleMusicInstance();
  const musicUserToken = await instance.authorize();

  const connection = await upsertMusicPlatformConnection({
    platform: "apple-music",
    connectionType: "oauth",
    status: "connected",
    externalAccountId: "apple-music-user",
    externalAccountLabel: "Apple Music account",
    metadata: {
      musicUserToken,
      returnUrl: getAppleMusicReturnUrl(),
    },
  });

  await syncAppleMusicConnection(connection, true);
  return connection;
}

export async function syncAppleMusicConnection(connection: MusicPlatformConnection, force = false) {
  if (!force && !isWeeklySyncDue(connection)) {
    return connection;
  }

  const metadata = appleMetadata(connection);
  if (!metadata.musicUserToken) {
    throw new Error("Apple Music user token is missing. Reconnect Apple Music.");
  }

  const payload = await fetchAppleRecentTracks(metadata.musicUserToken);
  const freshEvents = await filterExistingEvents(mapAppleEvents(payload));

  if (freshEvents.length > 0) {
    await importListeningHistory(freshEvents);
  }

  return upsertMusicPlatformConnection({
    platform: "apple-music",
    connectionType: "oauth",
    status: "connected",
    externalAccountId: connection.external_account_id,
    externalAccountLabel: connection.external_account_label,
    metadata: {
      ...metadata,
      lastSyncWindow: getWeeklySyncWindowKey(),
      lastSyncedAt: new Date().toISOString(),
    },
  });
}

export async function syncConnectedPlatforms(connections: MusicPlatformConnection[]) {
  const nextConnections: MusicPlatformConnection[] = [];

  for (const connection of connections) {
    if (connection.status !== "connected" || connection.connection_type !== "oauth") {
      nextConnections.push(connection);
      continue;
    }

    if (connection.platform === "spotify") {
      nextConnections.push(await syncSpotifyConnection(connection));
      continue;
    }

    if (connection.platform === "apple-music") {
      nextConnections.push(await syncAppleMusicConnection(connection));
      continue;
    }

    nextConnections.push(connection);
  }

  return nextConnections;
}
