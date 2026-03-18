import Link from "next/link";
import { headers } from "next/headers";

import { detectMarketFromHeaders } from "@/lib/market";
import { getTrendingAlbums, searchAlbums } from "@/lib/music-discovery";

type AlbumDiscoveryPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

function formatDate(value: string) {
  if (!value) {
    return "Release date unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function AlbumDiscoveryPage({ searchParams }: AlbumDiscoveryPageProps) {
  const { q = "" } = await searchParams;
  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const [trendingAlbums, searchResults] = await Promise.all([
    getTrendingAlbums(market.country),
    q.trim() ? searchAlbums(q, market.country) : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Search by album</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
              Five currently trending albums in {market.countryName}, then a full album search powered by live storefront metadata.
            </p>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <p className="kicker">Current chart pulse</p>
          <h2 className="section-heading mt-3 font-bold">Trending albums in {market.countryName}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {trendingAlbums.map((album) => (
              <Link key={album.href} href={album.href} className="editorial-panel p-4">
                <div className="cover-frame aspect-square" style={{ backgroundImage: `url(${album.coverArt})` }}>
                  <div className="relative z-10 flex h-full items-start justify-between p-4">
                    <span className="pill">#{album.rank}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-bold">{album.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{album.artist}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">
                    {album.chartLabel}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="editorial-panel p-6 md:p-8">
          <p className="kicker">Album search</p>
          <h2 className="section-heading mt-3 font-bold">Search any album</h2>
          <form className="field-shell mt-6" action="/discover/albums" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search albums by title, artist, or era..."
            />
            <button type="submit" className="solid-button px-5 py-3">
              Search
            </button>
          </form>

          <div className="mt-6 space-y-4">
            {q.trim() && searchResults.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No verified album results matched that search in the current storefront query.
              </p>
            ) : null}
            {searchResults.map((album) => (
              <Link
                key={album.id}
                href={album.href}
                className="flex items-center gap-4 rounded-[1.3rem] border p-4 transition hover:-translate-y-0.5"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <div className="cover-frame h-20 w-20 shrink-0" style={{ backgroundImage: `url(${album.coverArt})` }} />
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{album.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{album.artist}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">
                    {album.genre || "Genre unavailable"} · {formatDate(album.releaseDate)}
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
