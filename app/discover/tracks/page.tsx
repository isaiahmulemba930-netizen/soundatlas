import Link from "next/link";
import { headers } from "next/headers";

import { detectMarketFromHeaders } from "@/lib/market";
import { getTrendingTracks, searchTracks } from "@/lib/music-discovery";

type TrackDiscoveryPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

function formatDuration(durationMs: number | null) {
  if (!durationMs) {
    return "Duration unavailable";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
}

export default async function TrackDiscoveryPage({ searchParams }: TrackDiscoveryPageProps) {
  const { q = "" } = await searchParams;
  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const [trendingTracks, searchResults] = await Promise.all([
    getTrendingTracks(market.country),
    q.trim() ? searchTracks(q, market.country) : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Search by track</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
              Five currently trending tracks in {market.countryName}, then a full track search from live storefront data.
            </p>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <p className="kicker">Current chart pulse</p>
          <h2 className="section-heading mt-3 font-bold">Trending tracks in {market.countryName}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {trendingTracks.map((track) => (
              <Link key={track.href} href={track.href} className="editorial-panel p-4">
                <div className="cover-frame aspect-square" style={{ backgroundImage: `url(${track.coverArt})` }}>
                  <div className="relative z-10 flex h-full items-start justify-between p-4">
                    <span className="pill">#{track.rank}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-bold">{track.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{track.artist}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">
                    {track.chartLabel}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="editorial-panel p-6 md:p-8">
          <p className="kicker">Track search</p>
          <h2 className="section-heading mt-3 font-bold">Search any track</h2>
          <form className="field-shell mt-6" action="/discover/tracks" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search tracks by title, artist, or album..."
            />
            <button type="submit" className="solid-button px-5 py-3">
              Search
            </button>
          </form>

          <div className="mt-6 space-y-4">
            {q.trim() && searchResults.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No verified track results matched that search in the current storefront query.
              </p>
            ) : null}
            {searchResults.map((track) => (
              <Link
                key={track.id}
                href={track.href}
                className="flex items-center gap-4 rounded-[1.3rem] border p-4 transition hover:-translate-y-0.5"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <div className="cover-frame h-20 w-20 shrink-0" style={{ backgroundImage: `url(${track.coverArt})` }} />
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{track.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {track.artist}{track.album ? ` · ${track.album}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">
                    {track.genre || "Genre unavailable"} · {formatDuration(track.durationMs)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
