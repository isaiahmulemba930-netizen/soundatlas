import Link from "next/link";
import { headers } from "next/headers";

import { AlbumInvestmentSearchCard } from "@/components/marketplace/AlbumInvestmentSearchCard";
import { MarketQuoteCard } from "@/components/marketplace/MarketQuoteCard";
import { PortfolioPanel } from "@/components/marketplace/PortfolioPanel";
import { detectMarketFromHeaders } from "@/lib/market";
import {
  MARKET_QUOTE_REFRESH_MINUTES,
  MARKET_TIME_ZONE,
} from "@/lib/music-market-config";
import { formatAtlasCredits } from "@/lib/music-market-format";
import { getMusicMarketDashboard } from "@/lib/music-market";

export const revalidate = 600;

type MarketplacePageProps = {
  searchParams?: Promise<{
    albumq?: string;
  }>;
};

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const resolvedSearchParams = (await searchParams) ?? {};
  const albumQuery = resolvedSearchParams.albumq?.trim() ?? "";
  const dashboard = await getMusicMarketDashboard(market.country, market.countryName, albumQuery);
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const seedQuotes = [
    ...dashboard.trendingSongs,
    ...dashboard.risingArtists,
    ...dashboard.breakoutAlbums,
    ...dashboard.undergroundMovers,
    ...dashboard.searchedAlbums.map((result) => result.quote),
  ];

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Music Stock Market</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
              Build a diversified music portfolio in {dashboard.marketCountryName} by investing in songs, artists, and albums you believe will grow in popularity.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/discover/albums" className="nav-link">Albums</Link>
            <Link href="/discover/artists" className="nav-link">Artists</Link>
            <Link href="/discover/tracks" className="nav-link">Tracks</Link>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <p className="kicker">Pricing model</p>
          <h2 className="section-heading mt-3 font-bold">Prices refresh every {MARKET_QUOTE_REFRESH_MINUTES} minutes</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
            Quotes are weighted from live chart strength, release freshness, catalog depth, editorial context, and momentum signals, then smoothed and capped to avoid wild manipulation.
          </p>
          <p className="mt-3 text-sm text-[var(--text-soft)]">
            This quote window opened at {timeFormatter.format(new Date(dashboard.quoteWindowStartedAt))} and refreshes again at {timeFormatter.format(new Date(dashboard.nextQuoteRefreshAt))}. Song discovery rotates again at {timeFormatter.format(new Date(dashboard.nextSongRotationAt))}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--text-soft)]">
            <span className="pill">Invest early in rising songs</span>
            <span className="pill">Back artists you think will blow up</span>
            <span className="pill">Predict the next hit</span>
            <span className="pill">Earn AC by rating, reviewing, and logging plays</span>
            <span className="pill">Newer albums carry the strongest AC upside</span>
          </div>
        </section>

        <section className="mb-6 app-panel p-6 md:p-7">
          <p className="kicker">Album search</p>
          <h2 className="section-heading mt-3 font-bold">Search albums before you invest</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
            Fresh albums tend to carry the best AC upside. Older records can still be traded, but the oldest catalog usually has much lower reward potential unless it catches new momentum.
          </p>
          <form className="mt-5 flex flex-col gap-3 md:flex-row" action="/marketplace" method="get">
            <input
              type="text"
              name="albumq"
              defaultValue={dashboard.searchedAlbumQuery}
              placeholder="Search an album you want to invest in"
              className="app-input flex-1"
            />
            <button type="submit" className="solid-button">Search albums</button>
          </form>
          {dashboard.searchedAlbumQuery ? (
            <div className="mt-6">
              <p className="text-sm text-[var(--text-soft)]">
                Showing investable album results for <span className="font-semibold text-[var(--text-main)]">{dashboard.searchedAlbumQuery}</span>.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {dashboard.searchedAlbums.length > 0 ? (
                  dashboard.searchedAlbums.map((result) => (
                    <AlbumInvestmentSearchCard key={`${result.quote.entityType}:${result.quote.entityId}`} result={result} />
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border p-4 text-sm leading-7 text-[var(--text-soft)] md:col-span-2 xl:col-span-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                    No investable album results were verified for that search yet.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>

        <section className="mb-6">
          <div className="mb-4">
            <p className="kicker">Biggest gainers</p>
            <h2 className="section-heading mt-2 font-bold">Trending songs</h2>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Rotates every 2 hours from {dashboard.rotationLabel}, mixing chart movers with regional breakout candidates. The next regional refresh lands at {timeFormatter.format(new Date(dashboard.nextSongRotationAt))}.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboard.trendingSongs.length > 0 ? (
              dashboard.trendingSongs.map((quote, index) => (
                <MarketQuoteCard key={`${quote.entityType}:${quote.entityId}`} quote={quote} emphasis={`Song mover ${index + 1}`} />
              ))
            ) : (
              <div className="app-panel p-5 text-sm leading-7 text-[var(--text-soft)] md:col-span-2 xl:col-span-5">
                Live song movers are still populating for this market. Check back shortly as the next signal refresh lands.
              </div>
            )}
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4">
            <p className="kicker">Artist equities</p>
            <h2 className="section-heading mt-2 font-bold">Top rising artists</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboard.risingArtists.length > 0 ? (
              dashboard.risingArtists.map((quote, index) => (
                <MarketQuoteCard key={`${quote.entityType}:${quote.entityId}`} quote={quote} emphasis={`Artist mover ${index + 1}`} />
              ))
            ) : (
              <div className="app-panel p-5 text-sm leading-7 text-[var(--text-soft)] md:col-span-2 xl:col-span-5">
                Rising artist quotes are not ready yet for this market window. They will appear as soon as enough signals are available.
              </div>
            )}
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4">
            <p className="kicker">Album momentum</p>
            <h2 className="section-heading mt-2 font-bold">Breakout albums</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboard.breakoutAlbums.length > 0 ? (
              dashboard.breakoutAlbums.map((quote, index) => (
                <MarketQuoteCard key={`${quote.entityType}:${quote.entityId}`} quote={quote} emphasis={`Album play ${index + 1}`} />
              ))
            ) : (
              <div className="app-panel p-5 text-sm leading-7 text-[var(--text-soft)] md:col-span-2 xl:col-span-5">
                Breakout album pricing is waiting on enough release and momentum context to rank the field confidently.
              </div>
            )}
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4">
            <p className="kicker">Discovery plays</p>
            <h2 className="section-heading mt-2 font-bold">Underground movers</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboard.undergroundMovers.length > 0 ? (
              dashboard.undergroundMovers.map((quote) => (
                <MarketQuoteCard key={`${quote.entityType}:${quote.entityId}`} quote={quote} emphasis="Low streams | high growth" />
              ))
            ) : (
              <div className="app-panel p-5 text-sm leading-7 text-[var(--text-soft)] md:col-span-2 xl:col-span-4">
                Emerging picks are being curated conservatively right now. More external breakout candidates will appear here as the market signal set expands.
              </div>
            )}
          </div>
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="app-panel p-6 md:p-7">
            <p className="kicker">Leaderboard</p>
            <h2 className="section-heading mt-3 font-bold">Top investors</h2>
            <div className="mt-5 space-y-3">
              {dashboard.leaderboard.length > 0 ? (
                dashboard.leaderboard.map((entry, index) => (
                  <Link
                    key={entry.userId}
                    href={`/marketplace/portfolio/${encodeURIComponent(entry.username)}`}
                    className="block rounded-[1.2rem] border p-4 transition hover:-translate-y-0.5"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">#{index + 1} {entry.displayName}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">@{entry.username}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatAtlasCredits(entry.totalPortfolioValue)}</p>
                        <p className={`mt-1 text-sm ${entry.totalProfitLoss >= 0 ? "text-[var(--accent-green)]" : "text-[#ff9f86]"}`}>
                          {formatAtlasCredits(entry.totalProfitLoss)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[1.2rem] border p-4 text-sm leading-7 text-[var(--text-soft)]" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                  No public investor leaderboard data is available yet. Once users start trading, the top portfolios will appear here.
                </div>
              )}
            </div>
          </div>

          <div className="app-panel p-6 md:p-7">
            <p className="kicker">Public tape</p>
            <h2 className="section-heading mt-3 font-bold">Activity feed</h2>
            <div className="mt-5 space-y-3">
              {dashboard.activityFeed.length > 0 ? (
                dashboard.activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.2rem] border p-4"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <p className="font-semibold">
                      {item.displayName} {item.side === "buy" ? "invested in" : "trimmed"} {item.entityName}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">{formatAtlasCredits(item.totalAmount)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.2rem] border p-4 text-sm leading-7 text-[var(--text-soft)]" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                  No public trades have landed in the tape yet. New buys and sells will start showing here as soon as users trade.
                </div>
              )}
            </div>
          </div>
        </section>

        <PortfolioPanel seedQuotes={seedQuotes} />
      </div>
    </main>
  );
}
