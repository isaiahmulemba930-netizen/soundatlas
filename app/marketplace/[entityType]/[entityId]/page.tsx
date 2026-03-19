import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { MarketQuoteCard } from "@/components/marketplace/MarketQuoteCard";
import { TradePanel } from "@/components/marketplace/TradePanel";
import { detectMarketFromHeaders } from "@/lib/market";
import {
  MARKET_QUOTE_REFRESH_MINUTES,
  MARKET_TIME_ZONE,
  getMarketQuoteWindow,
  getNextSongRotation,
} from "@/lib/music-market-config";
import { formatAtlasCredits } from "@/lib/music-market-format";
import { getMarketAssetDetail } from "@/lib/music-market";

type MarketAssetPageProps = {
  params: Promise<{
    entityType: "song" | "artist" | "album";
    entityId: string;
  }>;
};

export const revalidate = 600;

export default async function MarketAssetPage({ params }: MarketAssetPageProps) {
  const { entityType, entityId } = await params;
  if (entityType !== "song" && entityType !== "artist" && entityType !== "album") {
    notFound();
  }

  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const detail = await getMarketAssetDetail({
    entityType,
    entityId: decodeURIComponent(entityId),
    country: market.country,
    countryName: market.countryName,
  });

  if (!detail) {
    notFound();
  }

  const quote = detail.quote;
  const quoteWindow = getMarketQuoteWindow();
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const thesis =
    quote.entityType === "song"
      ? "Song positions move fastest when daily attention spikes."
      : quote.entityType === "artist"
        ? "Artist positions reward steadier growth across releases and audience expansion."
        : "Album positions sit between both, driven by track depth, release momentum, and sustained engagement.";
  const typeLabel = quote.entityType === "song" ? "Song" : quote.entityType === "artist" ? "Artist" : "Album";

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/marketplace" className="brand-mark">
              Back To Marketplace
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">{quote.entityName}</h1>
            <p className="mt-3 text-[var(--text-soft)]">{quote.entitySubtitle}</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">{thesis}</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
              This quote re-prices every {MARKET_QUOTE_REFRESH_MINUTES} minutes. The current window refreshes at {timeFormatter.format(new Date(quoteWindow.nextRefreshAt))}, and the song discovery mix rotates again at {timeFormatter.format(new Date(getNextSongRotation()))}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={quote.entityHref} className="nav-link">
              Open {quote.entityType} page
            </Link>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <div
              className="cover-frame aspect-square"
              style={{
                backgroundImage: quote.artworkUrl
                  ? `url(${quote.artworkUrl})`
                  : "linear-gradient(135deg, rgba(30,215,96,0.12), rgba(105,162,255,0.14))",
              }}
            >
              <div className="relative z-10 flex h-full items-end p-5">
                <span className="pill mr-2">{typeLabel}</span>
                <span className="pill">{quote.hypeLevel}</span>
              </div>
            </div>

            <div>
              <p className="kicker">Live quote</p>
              <div className="meta-grid mt-6">
                <div className="app-panel p-4">
                  <p className="kicker">Current price</p>
                  <p className="mt-2 text-2xl font-bold">{formatAtlasCredits(quote.currentPrice)}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">24h move</p>
                  <p className={`mt-2 text-2xl font-bold ${quote.changePercent >= 0 ? "text-[var(--accent-green)]" : "text-[#ff9f86]"}`}>
                    {quote.changePercent >= 0 ? "+" : ""}
                    {quote.changePercent.toFixed(1)}%
                  </p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Investors</p>
                  <p className="mt-2 text-2xl font-bold">{quote.investorCount}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Hype level</p>
                  <p className="mt-2 text-2xl font-bold">{quote.hypeLevel}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Reward lane</p>
                  <p className="mt-2 text-2xl font-bold">{quote.rewardProfile.label}</p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.4rem] border p-5" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                <p className="kicker">Why the price is moving</p>
                <div className="mt-4 space-y-2">
                  {quote.reasons.map((reason) => (
                    <p key={reason} className="text-sm leading-7 text-[var(--text-soft)]">{reason}</p>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{quote.rewardProfile.reason}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="app-panel p-6 md:p-7">
            <p className="kicker">Price chart</p>
            <h2 className="section-heading mt-3 font-bold">Recent AC curve</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-5">
              {quote.chartPoints.map((point) => (
                <div
                  key={point.label}
                  className="rounded-[1.2rem] border p-4 text-center"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{point.label}</p>
                  <p className="mt-3 text-lg font-semibold">{formatAtlasCredits(point.price)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                <p className="kicker">Signal mix</p>
                <p className="mt-3 text-sm text-[var(--text-soft)]">Streaming growth: {(quote.metrics.streamingGrowthRate * 100).toFixed(1)}%</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">New listeners: {(quote.metrics.newListenerGrowth * 100).toFixed(1)}%</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">Save-rate proxy: {(quote.metrics.saveRate * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                <p className="kicker">Acceleration</p>
                <p className="mt-3 text-sm text-[var(--text-soft)]">App engagement: {(quote.metrics.appEngagementScore * 100).toFixed(1)}%</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">Momentum factor: {(quote.metrics.momentumFactor * 100).toFixed(1)}%</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">Price score: {(quote.priceScore * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <TradePanel quote={quote} />
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <p className="kicker">Related plays</p>
            <h2 className="section-heading mt-2 font-bold">Other market movers</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {detail.relatedQuotes.length > 0 ? (
              detail.relatedQuotes.map((relatedQuote) => (
                <MarketQuoteCard key={`${relatedQuote.entityType}:${relatedQuote.entityId}`} quote={relatedQuote} />
              ))
            ) : (
              <div className="app-panel p-5 text-sm leading-7 text-[var(--text-soft)] md:col-span-2 xl:col-span-4">
                Nearby market comps are still being assembled for this asset. More related movers will appear as the market fills out.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
