import Link from "next/link";
import { headers } from "next/headers";

import { detectMarketFromHeaders } from "@/lib/market";
import { getTrendingArtists, searchArtists } from "@/lib/music-discovery";

type ArtistDiscoveryPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function ArtistDiscoveryPage({ searchParams }: ArtistDiscoveryPageProps) {
  const { q = "" } = await searchParams;
  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const [trendingArtists, searchResults] = await Promise.all([
    getTrendingArtists(market.country),
    q.trim() ? searchArtists(q) : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Search by artist</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
              Five currently trending artists in {market.countryName}, then a full artist search from live music metadata.
            </p>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <p className="kicker">Current chart pulse</p>
          <h2 className="section-heading mt-3 font-bold">Trending artists in {market.countryName}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {trendingArtists.map((artist) => (
              <Link key={`${artist.rank}-${artist.name}`} href={artist.href} className="editorial-panel p-5">
                <div className="cover-frame aspect-square" style={{ backgroundImage: artist.coverArt ? `url(${artist.coverArt})` : "linear-gradient(135deg, rgba(30,215,96,0.16), rgba(232,176,75,0.12))" }}>
                  <div className="relative z-10 flex h-full items-start p-4">
                    <span className="pill">#{artist.rank}</span>
                  </div>
                </div>
                <h3 className="mt-4 text-2xl font-bold">{artist.name}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{artist.chartEvidence}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  {artist.sourceLabel}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="editorial-panel p-6 md:p-8">
          <p className="kicker">Artist search</p>
          <h2 className="section-heading mt-3 font-bold">Search any artist</h2>
          <form className="field-shell mt-6" action="/discover/artists" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search artists, bands, producers, or groups..."
            />
            <button type="submit" className="solid-button px-5 py-3">
              Search
            </button>
          </form>

          <div className="mt-6 space-y-4">
            {q.trim() && searchResults.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No verified artist results matched that search.
              </p>
            ) : null}
            {searchResults.map((artist) => (
              <Link
                key={artist.id}
                href={artist.href}
                className="rounded-[1.3rem] border p-4 transition hover:-translate-y-0.5"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{artist.name}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {artist.origin || "Origin unavailable"}
                    </p>
                  </div>
                  {artist.yearsActive ? <span className="pill">{artist.yearsActive}</span> : null}
                </div>
                <p className="mt-3 text-sm text-[var(--text-soft)]">
                  {artist.genres.length > 0 ? artist.genres.join(" · ") : "Genres unavailable"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
