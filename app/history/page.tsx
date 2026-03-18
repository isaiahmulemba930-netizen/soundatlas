"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  formatListeningDuration,
  getAuthenticatedListeningUser,
  getListeningHistory,
  subscribeToListeningActivity,
  type ListeningEventRecord,
} from "@/lib/listening";

type RangeMode = "all" | "day" | "week" | "month" | "year";

function startOfWeek(weekValue: string) {
  if (!weekValue) {
    return null;
  }

  const [year, week] = weekValue.split("-W").map(Number);
  if (!year || !week) {
    return null;
  }

  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const day = januaryFourth.getUTCDay() || 7;
  const firstWeekStart = new Date(januaryFourth);
  firstWeekStart.setUTCDate(januaryFourth.getUTCDate() - day + 1);
  firstWeekStart.setUTCDate(firstWeekStart.getUTCDate() + (week - 1) * 7);
  return firstWeekStart;
}

function buildRange(rangeMode: RangeMode, values: Record<Exclude<RangeMode, "all">, string>) {
  if (rangeMode === "all") {
    return { startAt: null, endAt: null };
  }

  if (rangeMode === "day" && values.day) {
    const start = new Date(`${values.day}T00:00:00.000Z`);
    return {
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 1000 * 60 * 60 * 24).toISOString(),
    };
  }

  if (rangeMode === "week" && values.week) {
    const start = startOfWeek(values.week);
    if (!start) {
      return { startAt: null, endAt: null };
    }

    return {
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    };
  }

  if (rangeMode === "month" && values.month) {
    const start = new Date(`${values.month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    };
  }

  if (rangeMode === "year" && values.year) {
    const start = new Date(`${values.year}-01-01T00:00:00.000Z`);
    const end = new Date(`${Number(values.year) + 1}-01-01T00:00:00.000Z`);
    return {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    };
  }

  return { startAt: null, endAt: null };
}

function groupHistoryByDay(events: ListeningEventRecord[]) {
  return events.reduce<Array<{ date: string; events: ListeningEventRecord[] }>>((groups, event) => {
    const playedDay = event.played_day;
    const existing = groups.find((group) => group.date === playedDay);

    if (existing) {
      existing.events.push(event);
      return groups;
    }

    groups.push({ date: playedDay, events: [event] });
    return groups;
  }, []);
}

export default function ListeningHistoryPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [events, setEvents] = useState<ListeningEventRecord[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppending, setIsAppending] = useState(false);
  const [error, setError] = useState("");
  const [rangeMode, setRangeMode] = useState<RangeMode>("all");
  const [search, setSearch] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [song, setSong] = useState("");
  const [genre, setGenre] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState("");
  const [rangeValues, setRangeValues] = useState({
    day: "",
    week: "",
    month: "",
    year: String(new Date().getFullYear()),
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("search") ?? "");
    setArtist(params.get("artist") ?? "");
    setAlbum(params.get("album") ?? "");
    setSong(params.get("song") ?? "");
    setGenre(params.get("genre") ?? "");
    setSourcePlatform(params.get("source") ?? "");
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory(targetPage = 0, append = false) {
      if (append) {
        setIsAppending(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const user = await getAuthenticatedListeningUser();
        if (!isMounted) {
          return;
        }

        setIsAuthenticated(Boolean(user));

        if (!user) {
          setEvents([]);
          setCount(0);
          setIsLoading(false);
          setIsAppending(false);
          return;
        }

        const range = buildRange(rangeMode, rangeValues);
        const history = await getListeningHistory({
          page: targetPage,
          pageSize: 40,
          search,
          artist,
          album,
          song,
          genre,
          sourcePlatform,
          startAt: range.startAt,
          endAt: range.endAt,
        });

        if (!isMounted) {
          return;
        }

        setCount(history.count);
        setPage(targetPage);
        setEvents((current) => (append ? [...current, ...history.events] : history.events));
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your listening history right now."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsAppending(false);
        }
      }
    }

    const debounce = window.setTimeout(() => {
      void loadHistory(0, false);
    }, 220);

    const unsubscribe = subscribeToListeningActivity(() => {
      void loadHistory(0, false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      window.clearTimeout(debounce);
    };
  }, [album, artist, genre, rangeMode, rangeValues, search, song, sourcePlatform]);

  const groupedHistory = useMemo(() => groupHistoryByDay(events), [events]);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div id="history" className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Listening history</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
              Access your entire listening history anytime. Every song you&apos;ve listened to, all in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/stats" className="nav-link">
              Stats Overview
            </Link>
            <Link href="/profile" className="nav-link">
              Your Profile
            </Link>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="kicker">History timeline</p>
              <h2 className="mt-4 max-w-3xl text-5xl font-bold leading-[0.95] md:text-7xl">
                Relive specific days, search deep cuts, and rediscover forgotten favorites.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-soft)] md:text-lg">
                Scroll through all your plays, filter by date, artist, album, song, or genre, and jump back into the eras that defined your listening.
              </p>
            </div>

            <div className="app-panel p-6">
              <p className="kicker">History controls</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Search</label>
                  <input className="app-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your history instantly" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Range</label>
                  <select className="app-input" value={rangeMode} onChange={(event) => setRangeMode(event.target.value as RangeMode)}>
                    <option value="all">All time</option>
                    <option value="day">Specific day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Artist</label>
                  <input className="app-input" value={artist} onChange={(event) => setArtist(event.target.value)} placeholder="Artist filter" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Album</label>
                  <input className="app-input" value={album} onChange={(event) => setAlbum(event.target.value)} placeholder="Album filter" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Song</label>
                  <input className="app-input" value={song} onChange={(event) => setSong(event.target.value)} placeholder="Song filter" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Genre</label>
                  <input className="app-input" value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Genre filter" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Source</label>
                  <input className="app-input" value={sourcePlatform} onChange={(event) => setSourcePlatform(event.target.value)} placeholder="spotify, apple-music, soundatlas" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {rangeMode === "day" ? (
                  <input
                    type="date"
                    className="app-input"
                    value={rangeValues.day}
                    onChange={(event) => setRangeValues((current) => ({ ...current, day: event.target.value }))}
                  />
                ) : null}
                {rangeMode === "week" ? (
                  <input
                    type="week"
                    className="app-input"
                    value={rangeValues.week}
                    onChange={(event) => setRangeValues((current) => ({ ...current, week: event.target.value }))}
                  />
                ) : null}
                {rangeMode === "month" ? (
                  <input
                    type="month"
                    className="app-input"
                    value={rangeValues.month}
                    onChange={(event) => setRangeValues((current) => ({ ...current, month: event.target.value }))}
                  />
                ) : null}
                {rangeMode === "year" ? (
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    className="app-input"
                    value={rangeValues.year}
                    onChange={(event) => setRangeValues((current) => ({ ...current, year: event.target.value }))}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="app-panel mb-6 p-6">
            <p className="text-sm text-[#ff9f86]">{error}</p>
          </div>
        ) : null}

        {isAuthenticated === false ? (
          <section className="editorial-panel p-6 md:p-8">
            <p className="kicker">History unlock</p>
            <h2 className="section-heading mt-3 font-bold">This page fills in as soon as you start logging real plays.</h2>
            <p className="mt-4 max-w-2xl text-[var(--text-soft)]">
              Sign in and track songs from album pages to build a searchable, filterable history with timestamps and rediscovery moments.
            </p>
          </section>
        ) : null}

        {isAuthenticated && isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="listening-skeleton h-28 rounded-[1.5rem]" />
            ))}
          </div>
        ) : null}

        {isAuthenticated && !isLoading && count === 0 ? (
          <section className="editorial-panel p-6 md:p-8">
            <p className="kicker">Nothing here yet</p>
            <h2 className="section-heading mt-3 font-bold">Your history timeline is ready for its first memory.</h2>
            <p className="mt-4 max-w-2xl text-[var(--text-soft)]">
              Track a play from an album page and it will appear here with the timestamp, artist, album context, and all the filters this page supports.
            </p>
          </section>
        ) : null}

        {isAuthenticated && !isLoading && count > 0 ? (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="app-panel p-5">
                <p className="kicker">Results</p>
                <p className="mt-3 text-4xl font-bold">{count.toLocaleString()}</p>
                <p className="mt-3 text-sm text-[var(--text-soft)]">Tracked plays matching your current filters.</p>
              </div>
              <div className="app-panel p-5">
                <p className="kicker">Timeline mode</p>
                <p className="mt-3 text-4xl font-bold capitalize">{rangeMode === "all" ? "All" : rangeMode}</p>
                <p className="mt-3 text-sm text-[var(--text-soft)]">Switch between specific-day reliving and wider windows instantly.</p>
              </div>
              <div className="app-panel p-5">
                <p className="kicker">Rediscovery</p>
                <p className="mt-3 text-4xl font-bold">{groupedHistory.length.toLocaleString()}</p>
                <p className="mt-3 text-sm text-[var(--text-soft)]">Distinct listening days currently in view.</p>
              </div>
            </section>

            <section className="space-y-6">
              {groupedHistory.map((group) => {
                const totalSeconds = group.events.reduce(
                  (sum, event) => sum + (event.duration_played_seconds ?? 0),
                  0
                );

                return (
                  <div key={group.date} className="editorial-panel p-6">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="kicker">Listening day</p>
                        <h2 className="mt-3 text-3xl font-bold">
                          {new Date(`${group.date}T00:00:00`).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="pill">{group.events.length} plays</span>
                        <span className="pill">{formatListeningDuration(totalSeconds)}</span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {group.events.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-[1.2rem] border p-4"
                          style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-semibold">{event.track_name}</p>
                              <p className="mt-1 text-sm text-[var(--text-muted)]">
                                {event.artist_name}
                                {event.album_name ? ` on ${event.album_name}` : ""}
                                {event.genre ? ` · ${event.genre}` : ""}
                                {event.source_platform ? ` · ${event.source_platform}` : ""}
                              </p>
                            </div>
                            <div className="text-right text-sm text-[var(--text-soft)]">
                              <p>
                                {new Date(event.played_at).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p className="mt-1">
                                {event.duration_played_seconds
                                  ? formatListeningDuration(event.duration_played_seconds)
                                  : "Duration unavailable"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            {events.length < count ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  className="app-button"
                  disabled={isAppending}
                  onClick={() => {
                    void (async () => {
                      setIsAppending(true);
                      try {
                        const range = buildRange(rangeMode, rangeValues);
                        const history = await getListeningHistory({
                          page: page + 1,
                          pageSize: 40,
                          search,
                          artist,
                          album,
                          song,
                          genre,
                          sourcePlatform,
                          startAt: range.startAt,
                          endAt: range.endAt,
                        });
                        setEvents((current) => [...current, ...history.events]);
                        setPage(page + 1);
                      } catch (loadMoreError) {
                        setError(
                          loadMoreError instanceof Error
                            ? loadMoreError.message
                            : "Unable to load more listening history right now."
                        );
                      } finally {
                        setIsAppending(false);
                      }
                    })();
                  }}
                >
                  {isAppending ? "Loading more..." : "Load more history"}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
