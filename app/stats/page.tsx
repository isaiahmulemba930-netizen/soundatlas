"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TimeframeTabs } from "@/components/listening/TimeframeTabs";
import {
  buildOnThisDayMemory,
  buildRecommendationSections,
  getTimeframeLabel,
} from "@/lib/listening-recommendations";
import {
  formatListeningDuration,
  formatTrend,
  getAuthenticatedListeningUser,
  getMusicPlatformConnections,
  getListeningStats,
  getRecentListeningEvents,
  subscribeToListeningActivity,
  type ListeningStatsEntity,
  type ListeningStatsResponse,
  type ListeningTimeframe,
} from "@/lib/listening";

function formatDateRange(stats: ListeningStatsResponse | null) {
  if (!stats) {
    return "";
  }

  const start = new Date(stats.periodStart);
  const end = new Date(stats.periodEnd);
  const inclusiveEnd = new Date(end.getTime() - 1000 * 60 * 60 * 24);

  if (stats.timeframe === "all-time") {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} to now`;
  }

  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${inclusiveEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function StatList({
  title,
  subtitle,
  items,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  items: ListeningStatsEntity[];
  emptyLabel: string;
}) {
  return (
    <div className="app-panel p-6">
      <p className="kicker">{title}</p>
      <p className="mt-3 text-sm text-[var(--text-soft)]">{subtitle}</p>
      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{emptyLabel}</p>
        ) : (
          items.map((item, index) => (
            <div
              key={`${title}-${item.trackId ?? item.artistId ?? item.albumId ?? item.artistName}-${index}`}
              className="rounded-[1.15rem] border p-4"
              style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{item.trackName ?? item.albumName ?? item.artistName}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {item.trackName ? `${item.artistName}${item.albumName ? ` on ${item.albumName}` : ""}` : item.artistName}
                  </p>
                </div>
                <div className="text-right text-sm text-[var(--text-soft)]">
                  <p>{item.playCount} plays</p>
                  <p className="mt-1">{formatListeningDuration(item.listenSeconds)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="listening-skeleton h-36 rounded-[1.5rem]" />
      ))}
    </div>
  );
}

export default function StatsPage() {
  const [timeframe, setTimeframe] = useState<ListeningTimeframe>("weekly");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [stats, setStats] = useState<ListeningStatsResponse | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<ListeningStatsResponse | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<ListeningStatsResponse | null>(null);
  const [recentEvents, setRecentEvents] = useState<Awaited<ReturnType<typeof getRecentListeningEvents>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const user = await getAuthenticatedListeningUser();
        if (!isMounted) {
          return;
        }

        setIsAuthenticated(Boolean(user));

        if (!user) {
          setStats(null);
          setWeeklyStats(null);
          setAllTimeStats(null);
          setRecentEvents([]);
          setIsLoading(false);
          return;
        }

        const requests = [
          getListeningStats(timeframe),
          timeframe === "weekly" ? Promise.resolve(null) : getListeningStats("weekly"),
          timeframe === "all-time" ? Promise.resolve(null) : getListeningStats("all-time"),
          getRecentListeningEvents(800),
        ] as const;

        const [selectedStats, fallbackWeeklyStats, fallbackAllTimeStats, nextRecentEvents] =
          await Promise.all(requests);

        if (!isMounted) {
          return;
        }

        setStats(selectedStats);
        setWeeklyStats(timeframe === "weekly" ? selectedStats : fallbackWeeklyStats);
        setAllTimeStats(timeframe === "all-time" ? selectedStats : fallbackAllTimeStats);
        setRecentEvents(nextRecentEvents);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your listening dashboard right now."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    const unsubscribe = subscribeToListeningActivity(() => {
      void loadDashboard();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [timeframe]);

  const onThisDayMemory = useMemo(() => buildOnThisDayMemory(recentEvents), [recentEvents]);
  const recommendationSections = useMemo(() => {
    if (!weeklyStats || !allTimeStats) {
      return [];
    }

    return buildRecommendationSections(
      recentEvents,
      recentEvents.filter((event) => {
        const playedAt = new Date(event.played_at).getTime();
        return playedAt >= Date.now() - 1000 * 60 * 60 * 24 * 30;
      }),
      weeklyStats,
      allTimeStats
    );
  }, [allTimeStats, recentEvents, weeklyStats]);

  const maxDailySeconds = Math.max(
    ...(stats?.dailySeries.map((point) => point.listenSeconds) ?? [0]),
    1
  );

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Live listening stats</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
              Relive specific days, view your all-time stats, and rediscover forgotten favorites.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/connections" className="nav-link">
              Platforms
            </Link>
            <Link href="/history" className="nav-link">
              Listening History
            </Link>
            <Link href="/profile" className="nav-link">
              Your Profile
            </Link>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="kicker">Stats overview</p>
              <h2 className="mt-4 max-w-3xl text-5xl font-bold leading-[0.95] md:text-7xl">
                Every song you&apos;ve listened to, all in one place.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-soft)] md:text-lg">
                Access your entire listening history anytime. Your listening history, turned into personalized recommendations.
              </p>
              <div className="mt-8">
                <TimeframeTabs value={timeframe} onChange={setTimeframe} />
              </div>
              {stats ? (
                <p className="mt-4 text-sm uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {getTimeframeLabel(stats.timeframe)} · {formatDateRange(stats)}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/connections" className="ghost-button">
                  Listening setup
                </Link>
                <Link href="/history" className="ghost-button">
                  Open full history
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="app-panel p-5">
                <p className="kicker">Trend pulse</p>
                <p className="mt-3 text-3xl font-bold">
                  {stats ? formatTrend(stats.trends.listeningTimeSecondsChange) : "Waiting for data"}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                  Smooth timeframe switching keeps the dashboard current whenever fresh listening activity lands.
                </p>
              </div>
              <div className="app-panel p-5">
                <p className="kicker">Streaks</p>
                <div className="mt-3 flex items-end gap-4">
                  <p className="text-4xl font-bold">{stats?.streaks.current ?? 0}</p>
                  <p className="pb-2 text-sm text-[var(--text-soft)]">day current streak</p>
                </div>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Longest streak: {stats?.streaks.longest ?? 0} days
                </p>
              </div>
            </div>
          </div>
        </section>

        {isLoading ? <LoadingSkeleton /> : null}

        {error ? (
          <div className="app-panel mb-6 p-6">
            <p className="text-sm text-[#ff9f86]">{error}</p>
          </div>
        ) : null}

        {isAuthenticated === false ? (
          <section className="editorial-panel p-6 md:p-8">
            <p className="kicker">Start tracking</p>
            <h2 className="section-heading mt-3 font-bold">This dashboard unlocks once you log plays.</h2>
            <p className="mt-4 max-w-2xl text-[var(--text-soft)]">
              Sign in, log songs from album pages, and SoundAtlas will build your weekly, monthly, yearly, and all-time listening picture from real tracked activity.
            </p>
          </section>
        ) : null}

        {isAuthenticated && !isLoading && stats && stats.totals.songsPlayed === 0 ? (
          <section className="editorial-panel p-6 md:p-8">
            <p className="kicker">Fresh slate</p>
            <h2 className="section-heading mt-3 font-bold">Your listening stats will start moving with your first tracked play.</h2>
            <p className="mt-4 max-w-2xl text-[var(--text-soft)]">
              Log a song from any album page to unlock live weekly and all-time stats, rediscovery cues, and history search.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="solid-button">
                Explore albums
              </Link>
              <Link href="/history" className="ghost-button">
                Open history page
              </Link>
            </div>
          </section>
        ) : null}

        {isAuthenticated && stats && stats.totals.songsPlayed > 0 ? (
          <>
            <section className="mb-6 mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  label: "Total listening time",
                  value: formatListeningDuration(stats.totals.listeningTimeSeconds),
                  detail: formatTrend(stats.trends.listeningTimeSecondsChange),
                },
                {
                  label: "Songs played",
                  value: stats.totals.songsPlayed.toLocaleString(),
                  detail: formatTrend(stats.trends.songsPlayedChange),
                },
                {
                  label: "Artists played",
                  value: stats.totals.artistsPlayed.toLocaleString(),
                  detail: `${stats.totals.albumsPlayed.toLocaleString()} albums touched`,
                },
                {
                  label: "Unique songs",
                  value: stats.totals.uniqueSongs.toLocaleString(),
                  detail: `${stats.totals.activeDays.toLocaleString()} active days`,
                },
                {
                  label: "Average per day",
                  value: formatListeningDuration(stats.totals.averageListeningTimePerDaySeconds),
                  detail: "Across the full selected timeframe",
                },
                {
                  label: "Most active days",
                  value: stats.mostActiveDays.length.toLocaleString(),
                  detail: "Ranked by total listening time",
                },
              ].map((card) => (
                <div key={card.label} className="app-panel p-5">
                  <p className="kicker">{card.label}</p>
                  <p className="mt-3 text-4xl font-bold">{card.value}</p>
                  <p className="mt-3 text-sm text-[var(--text-soft)]">{card.detail}</p>
                </div>
              ))}
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="editorial-panel p-6 md:p-7">
                <p className="kicker">Daily shape</p>
                <h2 className="section-heading mt-3 font-bold">{getTimeframeLabel(timeframe)} at a glance.</h2>
                <p className="mt-3 text-[var(--text-soft)]">
                  See how your listening time rises and falls across the selected window.
                </p>

                <div className="listening-bars mt-8">
                  {stats.dailySeries.map((point) => (
                    <div key={point.date} className="listening-bar-column">
                      <div
                        className="listening-bar"
                        style={{
                          height: `${Math.max(10, (point.listenSeconds / maxDailySeconds) * 100)}%`,
                        }}
                        title={`${new Date(point.date).toLocaleDateString()} · ${formatListeningDuration(point.listenSeconds)}`}
                      />
                      <span>{new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="app-panel p-6 md:p-7">
                <p className="kicker">Most active days</p>
                <h2 className="section-heading mt-3 font-bold">The days you really locked in.</h2>
                <div className="mt-6 space-y-3">
                  {stats.mostActiveDays.map((day) => (
                    <div
                      key={day.date}
                      className="rounded-[1.2rem] border p-4"
                      style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {day.uniqueTracks} unique songs across {day.playCount} plays
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--accent-cream)]">
                          {formatListeningDuration(day.listenSeconds)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="app-panel p-6 md:p-7">
                <p className="kicker">Source categories</p>
                <h2 className="section-heading mt-3 font-bold">Where this listening came from.</h2>
                <p className="mt-3 text-[var(--text-soft)]">
                  SoundAtlas stats now grow from the plays you log inside the app, with each tracked
                  session flowing straight into your totals.
                </p>
                <div className="mt-6 space-y-3">
                  {stats.sourceBreakdown.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No source categories yet.</p>
                  ) : (
                    stats.sourceBreakdown.map((source) => (
                      <Link
                        key={`${source.sourcePlatform}-${source.sourceType}`}
                        href={`/history?source=${encodeURIComponent(source.sourcePlatform)}`}
                        className="block rounded-[1.2rem] border p-4 transition hover:-translate-y-0.5"
                        style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold">{source.sourcePlatform}</p>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">{source.sourceType}</p>
                          </div>
                          <div className="text-right text-sm text-[var(--text-soft)]">
                            <p>{source.playCount} plays</p>
                            <p className="mt-1">{formatListeningDuration(source.listenSeconds)}</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="editorial-panel p-6 md:p-7">
                <p className="kicker">Tracking model</p>
                <h2 className="section-heading mt-3 font-bold">How listening history works right now</h2>
                <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--text-soft)]">
                  <p>SoundAtlas stats work from plays you track inside the app.</p>
                  <p>Spotify and Apple Music sign-in are both turned off for now.</p>
                  <p>That means your history, streaks, and recommendations build from real in-app listening activity only.</p>
                  <p>Once you log plays regularly, the dashboard updates automatically across weekly and all-time views.</p>
                </div>
              </div>
            </section>

            <section className="mb-6 grid gap-6 xl:grid-cols-3">
              <StatList
                title="Most played songs"
                subtitle="The tracks carrying this window."
                items={stats.topSongs}
                emptyLabel="Track-level rankings appear after your first logged songs."
              />
              <StatList
                title="Most played artists"
                subtitle="Who owns the current timeframe."
                items={stats.topArtists}
                emptyLabel="Artist rankings appear as soon as your history has range."
              />
              <StatList
                title="Most played albums"
                subtitle="Records shaping the mood."
                items={stats.topAlbums}
                emptyLabel="Album rankings show once your plays include album context."
              />
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="app-panel p-6">
                <p className="kicker">Throwback</p>
                <h2 className="section-heading mt-3 font-bold">On this day</h2>
                {onThisDayMemory ? (
                  <>
                    <p className="mt-3 text-[var(--text-soft)]">{onThisDayMemory.summary}</p>
                    <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      {onThisDayMemory.dateLabel}
                    </p>
                    <div className="mt-5 space-y-3">
                      {onThisDayMemory.items.map((item) => (
                        <div
                          key={`${item.title}-${item.playedAt}`}
                          className="rounded-[1.1rem] border p-4"
                          style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                        >
                          <p className="font-semibold">{item.title}</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">{item.artist}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-[var(--text-muted)]">
                    Once your history spans more dates, this space will surface the eras and days worth revisiting.
                  </p>
                )}
              </div>

              <div id="recommendations" className="editorial-panel p-6">
                <p className="kicker">Recommendations</p>
                <h2 className="section-heading mt-3 font-bold">Your listening history, turned into personalized recommendations.</h2>
                <p className="mt-3 text-[var(--text-soft)]">
                  Built from favorite genres, repeated songs, listening-time habits, and the parts of your taste that have gone quiet.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {recommendationSections.slice(0, 2).map((section) => (
                    <div
                      key={section.id}
                      className="rounded-[1.25rem] border p-5"
                      style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                    >
                      <p className="text-xl font-bold">{section.title}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{section.description}</p>
                      <div className="mt-4 space-y-3">
                        {section.items.slice(0, 2).map((item) => (
                          <Link key={item.id} href={item.href} className="block rounded-[1rem] border p-4 transition hover:-translate-y-0.5" style={{ borderColor: "var(--border-main)" }}>
                            <p className="font-semibold">{item.title}</p>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">{item.artist}</p>
                            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{item.reason}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mb-6">
              <div className="mb-4">
                <p className="kicker">More for you</p>
                <h2 className="section-heading mt-2 font-bold">Recommendation lanes</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {recommendationSections.slice(2).map((section) => (
                  <div key={section.id} className="app-panel p-5">
                    <p className="text-2xl font-bold">{section.title}</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{section.description}</p>
                    <div className="mt-4 space-y-3">
                      {section.items.slice(0, 2).map((item) => (
                        <Link key={item.id} href={item.href} className="block rounded-[1rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                          <p className="font-semibold">{item.title}</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">{item.artist}</p>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{item.reason}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
