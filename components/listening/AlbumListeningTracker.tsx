"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { AlbumLookupTrack } from "@/lib/itunes";
import {
  formatListeningDuration,
  getAuthenticatedListeningUser,
  trackListeningEvent,
} from "@/lib/listening";

type AlbumListeningTrackerProps = {
  albumId: string;
  albumTitle: string;
  artistId?: string | null;
  artistName: string;
  genre?: string;
  sourcePlatform?: string;
  tracklist: AlbumLookupTrack[];
};

function buildTrackId(albumId: string, track: AlbumLookupTrack, index: number) {
  return `${albumId}::${track.trackNumber ?? index + 1}::${track.title.toLowerCase()}`;
}

export function AlbumListeningTracker({
  albumId,
  albumTitle,
  artistId,
  artistName,
  genre,
  sourcePlatform = "soundatlas",
  tracklist,
}: AlbumListeningTrackerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingTrackId, setPendingTrackId] = useState("");
  const [trackedTrackIds, setTrackedTrackIds] = useState<string[]>([]);
  const [trackingError, setTrackingError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAuthState() {
      try {
        const user = await getAuthenticatedListeningUser();
        if (!isMounted) {
          return;
        }

        setIsAuthenticated(Boolean(user));
      } catch {
        if (!isMounted) {
          return;
        }

        setIsAuthenticated(false);
      }
    }

    void loadAuthState();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalRuntime = useMemo(() => {
    return tracklist.reduce((sum, track) => sum + Math.floor((track.durationMs ?? 0) / 1000), 0);
  }, [tracklist]);

  async function handleTrackPlay(track: AlbumLookupTrack, index: number) {
    const trackId = buildTrackId(albumId, track, index);
    setPendingTrackId(trackId);
    setTrackingError("");

    try {
      await trackListeningEvent({
        trackId,
        trackName: track.title,
        artistId,
        artistName,
        albumId,
        albumName: albumTitle,
        genre,
        durationPlayedSeconds: track.durationMs ? Math.round(track.durationMs / 1000) : null,
        sourcePlatform,
        sourceType: "in_app",
        metadata: {
          albumId,
          albumTitle,
          trackNumber: track.trackNumber ?? index + 1,
        },
      });

      setTrackedTrackIds((current) => [trackId, ...current.filter((value) => value !== trackId)]);
    } catch (error) {
      setTrackingError(
        error instanceof Error ? error.message : "Unable to track that play right now."
      );
    } finally {
      setPendingTrackId("");
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-[1.25rem] border p-4"
        style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="kicker">Live tracking</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              Log plays from this album to feed your weekly, monthly, yearly, and all-time stats in near real time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-[var(--text-soft)]">
            <span className="pill">{tracklist.length} tracks</span>
            {totalRuntime > 0 ? <span className="pill">{formatListeningDuration(totalRuntime)}</span> : null}
          </div>
        </div>

        {!isAuthenticated ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Log in to track plays and unlock your personal history.
          </p>
        ) : null}

        {trackingError ? (
          <p className="mt-4 text-sm text-[#ff9f86]">{trackingError}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/stats" className="ghost-button">
            Open Stats
          </Link>
          <Link href="/history" className="ghost-button">
            Open History
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {tracklist.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Track-level play logging is unavailable until this album has a tracklist from the current source.
          </p>
        ) : (
          tracklist.map((track, index) => {
            const trackId = buildTrackId(albumId, track, index);
            const isPending = pendingTrackId === trackId;
            const wasTracked = trackedTrackIds.includes(trackId);

            return (
              <div
                key={trackId}
                className="rounded-[1.2rem] border px-4 py-4 text-sm"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      <span className="mr-3 text-[var(--text-muted)]">{track.trackNumber ?? index + 1}.</span>
                      {track.title}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {track.durationMs ? formatListeningDuration(Math.round(track.durationMs / 1000)) : "Duration unavailable"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleTrackPlay(track, index)}
                    disabled={!isAuthenticated || isPending}
                    className={wasTracked ? "ghost-button" : "solid-button"}
                  >
                    {isPending ? "Logging..." : wasTracked ? "Logged" : "Log play"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
