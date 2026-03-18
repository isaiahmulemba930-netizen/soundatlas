"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  beginSpotifyLogin,
  completeSpotifyConnection,
  syncConnectedPlatforms,
} from "@/lib/music-platforms";
import {
  getAuthenticatedListeningUser,
  getMusicPlatformConnections,
  type MusicPlatformConnection,
} from "@/lib/listening";

const supportedPlatforms = [
  {
    id: "spotify",
    title: "Spotify",
    detail:
      "Log in with Spotify to connect recent listening and let SoundAtlas refresh it automatically every Sunday at 6:00 PM Eastern when you return.",
    action: "Log in with Spotify",
  },
] as const;

function formatConnectionStatus(connection: MusicPlatformConnection) {
  const metadata = connection.metadata ?? {};
  const lastSyncedAt = typeof metadata.lastSyncedAt === "string" ? metadata.lastSyncedAt : "";

  if (!lastSyncedAt) {
    return "Connected and waiting for first sync";
  }

  return `Connected · Last synced ${new Date(lastSyncedAt).toLocaleString()}`;
}

export default function ConnectionsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [connections, setConnections] = useState<MusicPlatformConnection[]>([]);
  const [isWorking, setIsWorking] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadState() {
      try {
        const user = await getAuthenticatedListeningUser();
        if (!isMounted) {
          return;
        }

        setIsAuthenticated(Boolean(user));

        if (!user) {
          setConnections([]);
          return;
        }

        const initialConnections = await getMusicPlatformConnections();
        if (!isMounted) {
          return;
        }

        setConnections(initialConnections);

        const params = new URLSearchParams(window.location.search);
        const spotifyCode = params.get("code");
        const spotifyState = params.get("state");
        const platform = params.get("platform");

        let nextConnections = initialConnections;

        if (platform === "spotify" && spotifyCode) {
          setIsWorking("spotify");
          const connection = await completeSpotifyConnection(spotifyCode, spotifyState);
          nextConnections = await getMusicPlatformConnections();
          if (!isMounted) {
            return;
          }
          setConnections(nextConnections);
          setSuccess(`Spotify connected as ${connection.external_account_label || "your account"}.`);
          window.history.replaceState({}, "", "/connections");
        }

        const syncedConnections = await syncConnectedPlatforms(nextConnections);
        if (!isMounted) {
          return;
        }

        setConnections(syncedConnections);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your platform connections right now."
        );
      } finally {
        if (isMounted) {
          setIsWorking("");
        }
      }
    }

    void loadState();
    return () => {
      isMounted = false;
    };
  }, []);

  const linkedByPlatform = useMemo(() => {
    return new Map(connections.map((connection) => [connection.platform, connection]));
  }, [connections]);

  async function handleConnect(platformId: string) {
    setError("");
    setSuccess("");
    setIsWorking(platformId);

    try {
      if (platformId === "spotify") {
        await beginSpotifyLogin();
        return;
      }

    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to start that platform connection."
      );
    } finally {
      setIsWorking("");
    }
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Music platforms</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
              Connect Spotify directly. Once linked, SoundAtlas records connected listening under its own category and refreshes platform sync on the weekly Sunday 6:00 PM Eastern cadence whenever you come back.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/stats" className="nav-link">
              Stats
            </Link>
            <Link href="/history" className="nav-link">
              History
            </Link>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {supportedPlatforms.map((platform) => {
              const linked = linkedByPlatform.get(platform.id);

              return (
                <div key={platform.id} className="editorial-panel p-6 md:p-7">
                  <p className="kicker">{platform.title}</p>
                  <h2 className="mt-3 text-3xl font-bold">{platform.title}</h2>
                  <p className="mt-3 text-[var(--text-soft)]">{platform.detail}</p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleConnect(platform.id)}
                      disabled={!isAuthenticated || isWorking === platform.id}
                      className="solid-button"
                    >
                      {isWorking === platform.id ? "Connecting..." : platform.action}
                    </button>
                    {linked ? (
                      <Link href={`/history?source=${encodeURIComponent(platform.id)}`} className="ghost-button">
                        View {platform.title} history
                      </Link>
                    ) : null}
                  </div>

                  <p className="mt-4 text-sm text-[var(--text-muted)]">
                    {linked ? formatConnectionStatus(linked) : "Not linked yet"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {!isAuthenticated ? (
          <section className="app-panel p-6 md:p-8">
            <p className="kicker">Sign in required</p>
            <h2 className="section-heading mt-3 font-bold">Log in before linking a music platform.</h2>
            <p className="mt-4 text-[var(--text-soft)]">
              In-app tracking still works without a connected platform, but account linking needs a signed-in SoundAtlas profile.
            </p>
          </section>
        ) : null}

        {error ? (
          <section className="app-panel mb-6 p-6">
            <p className="text-sm text-[#ff9f86]">{error}</p>
          </section>
        ) : null}

        {success ? (
          <section className="app-panel mb-6 p-6">
            <p className="text-sm text-[var(--accent-green)]">{success}</p>
          </section>
        ) : null}

        {isAuthenticated ? (
          <section className="app-panel p-6 md:p-7">
            <p className="kicker">Connected accounts</p>
            <h2 className="section-heading mt-3 font-bold">What is linked right now.</h2>
            <div className="mt-6 space-y-3">
              {connections.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Nothing is linked yet. Users can still build stats from plays tracked inside SoundAtlas.
                </p>
              ) : (
                connections.map((connection) => (
                  <Link
                    key={connection.id}
                    href={`/history?source=${encodeURIComponent(connection.platform)}`}
                    className="block rounded-[1.2rem] border p-4 transition hover:-translate-y-0.5"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{connection.external_account_label || connection.platform}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{formatConnectionStatus(connection)}</p>
                      </div>
                      <span className="pill">{connection.platform}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
