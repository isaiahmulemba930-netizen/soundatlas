"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MatchCard } from "@/components/taste/MatchCard";
import { getAuthenticatedUser, searchProfiles, type PublicProfile } from "@/lib/follows";
import {
  getTasteMatchHistory,
  getTasteMatches,
  syncTasteProfileForCurrentUser,
  type TasteMatch,
  type TasteMatchFilters,
} from "@/lib/taste-matchmaking";

export default function TasteMatchmakingPage() {
  const [matches, setMatches] = useState<TasteMatch[]>([]);
  const [history, setHistory] = useState<Array<{ user: PublicProfile; compatibilityScore: number; matchType: string; createdAt: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [filters, setFilters] = useState<TasteMatchFilters>({
    similarity: "all",
    discoveryStyle: "all",
    activeOnly: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewerLoaded, setViewerLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        setIsLoading(true);
        const user = await getAuthenticatedUser();
        if (!isMounted) return;

        if (!user) {
          setViewerLoaded(true);
          setMatches([]);
          setHistory([]);
          setIsLoading(false);
          return;
        }

        await syncTasteProfileForCurrentUser();
        const [nextMatches, nextHistory] = await Promise.all([getTasteMatches(filters), getTasteMatchHistory()]);
        if (!isMounted) return;

        setMatches(nextMatches);
        setHistory(nextHistory);
        setViewerLoaded(true);
        setError("");
      } catch (loadError) {
        if (!isMounted) return;

        setError(loadError instanceof Error ? loadError.message : "Unable to load taste matchmaking right now.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPage();
    return () => {
      isMounted = false;
    };
  }, [filters]);

  useEffect(() => {
    let isMounted = true;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchProfiles(trimmed);
        if (!isMounted) return;
        setSearchResults(results);
      } catch {
        if (!isMounted) return;
        setSearchResults([]);
      }
    }, 220);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const bestMatches = useMemo(() => matches.slice(0, 6), [matches]);
  const suggestions = useMemo(() => matches.slice(0, 4), [matches]);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Taste Matchmaking</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
              Find people whose listening, reviews, and music instincts genuinely line up with yours.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/profile" className="nav-link">
              Your Profile
            </Link>
            <Link href="/messages" className="nav-link">
              Messages
            </Link>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="kicker">Music chemistry</p>
              <h2 className="mt-4 max-w-3xl text-5xl font-bold leading-[0.95] md:text-7xl">
                Discover people through the shape of their taste.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-soft)] md:text-lg">
                SoundAtlas looks at your top artists, albums, songs, genre overlap, review alignment,
                and market behavior to find people who feel like a real fit.
              </p>
            </div>

            <div className="app-panel p-6">
              <p className="kicker">Filter matches</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  className="app-input"
                  value={filters.genre ?? ""}
                  onChange={(event) => setFilters((current) => ({ ...current, genre: event.target.value }))}
                  placeholder="Filter by genre"
                />
                <select
                  className="app-input"
                  value={filters.similarity ?? "all"}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, similarity: event.target.value as TasteMatchFilters["similarity"] }))
                  }
                >
                  <option value="all">All match levels</option>
                  <option value="high">High overlap</option>
                  <option value="medium">Medium overlap</option>
                  <option value="expanding">Expands your taste</option>
                </select>
                <select
                  className="app-input"
                  value={filters.discoveryStyle ?? "all"}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      discoveryStyle: event.target.value as TasteMatchFilters["discoveryStyle"],
                    }))
                  }
                >
                  <option value="all">All discovery styles</option>
                  <option value="underground">Underground leaning</option>
                  <option value="balanced">Balanced</option>
                  <option value="mainstream">Mainstream leaning</option>
                </select>
                <label className="flex items-center gap-2 rounded-[1rem] border px-4 py-3 text-sm text-[var(--text-soft)]" style={{ borderColor: "var(--border-main)" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(filters.activeOnly)}
                    onChange={(event) => setFilters((current) => ({ ...current, activeOnly: event.target.checked }))}
                  />
                  Active users only
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="app-panel p-6">
            <p className="kicker">Compare a user</p>
            <input
              className="app-input mt-4"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by username or display name"
            />
            <div className="mt-4 space-y-2">
              {searchResults.slice(0, 6).map((user) => (
                <Link
                  key={user.user_id}
                  href={user.username ? `/taste-matchmaking/${encodeURIComponent(user.username)}` : "/taste-matchmaking"}
                  className="flex items-center justify-between rounded-[1rem] border px-4 py-3"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <span>{user.display_name || user.username || "SoundAtlas user"}</span>
                  <span className="text-sm text-[var(--text-muted)]">@{user.username || "user"}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="editorial-panel p-6">
            <p className="kicker">Recent comparisons</p>
            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Compare with a profile and it will show up here so you can revisit the match later.
                </p>
              ) : (
                history.map((item) => (
                  <Link
                    key={item.user.user_id}
                    href={item.user.username ? `/taste-matchmaking/${encodeURIComponent(item.user.username)}` : "/taste-matchmaking"}
                    className="flex items-center justify-between rounded-[1rem] border px-4 py-3"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <div>
                      <p className="font-semibold">{item.user.display_name || item.user.username || "SoundAtlas user"}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{item.matchType}</p>
                    </div>
                    <p className="text-2xl font-bold">{item.compatibilityScore}%</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        {error ? (
          <section className="app-panel mb-6 p-6">
            <p className="text-sm text-[#ff9f86]">{error}</p>
          </section>
        ) : null}

        {!viewerLoaded && isLoading ? (
          <section className="app-panel p-6">
            <p className="text-sm text-[var(--text-muted)]">Calculating your music chemistry...</p>
          </section>
        ) : null}

        {viewerLoaded && matches.length === 0 && !isLoading ? (
          <section className="editorial-panel p-6 md:p-8">
            <p className="kicker">Need more signal</p>
            <h2 className="section-heading mt-3 font-bold">Log plays, review music, and make a few market moves.</h2>
            <p className="mt-4 max-w-2xl text-[var(--text-soft)]">
              Taste matchmaking gets stronger once SoundAtlas has enough real listening, review, and marketplace activity to work from.
            </p>
          </section>
        ) : null}

        {bestMatches.length > 0 ? (
          <>
            <section className="mb-6">
              <div className="mb-4">
                <p className="kicker">Top matches</p>
                <h2 className="section-heading mt-2 font-bold">People most likely to click with your taste</h2>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {bestMatches.map((match) => (
                  <MatchCard key={match.user.user_id} match={match} />
                ))}
              </div>
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-2">
              <div className="app-panel p-6">
                <p className="kicker">Friend suggestions</p>
                <h2 className="section-heading mt-3 font-bold">Follow people through shared taste</h2>
                <div className="mt-4 space-y-3">
                  {suggestions.map((match) => (
                    <Link
                      key={match.user.user_id}
                      href={match.user.username ? `/profile/${encodeURIComponent(match.user.username)}` : "/profile"}
                      className="block rounded-[1rem] border px-4 py-4"
                      style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{match.user.display_name || match.user.username || "SoundAtlas user"}</p>
                          <p className="mt-1 text-sm text-[var(--text-soft)]">{match.explanation}</p>
                        </div>
                        <p className="text-2xl font-bold">{match.compatibilityScore}%</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="editorial-panel p-6">
                <p className="kicker">Why it works</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-soft)]">
                  <p>Matches are driven by real top artists, albums, songs, genres, ratings, and market behavior.</p>
                  <p>The system avoids weak one-artist matches by looking for overlap across multiple taste layers.</p>
                  <p>As you log plays, review more music, and evolve your profile, your match pool refreshes with you.</p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
