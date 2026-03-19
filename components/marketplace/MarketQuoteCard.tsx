import Link from "next/link";

import { formatAtlasCredits } from "@/lib/music-market-format";
import type { MarketQuote } from "@/lib/music-market-types";

type MarketQuoteCardProps = {
  quote: MarketQuote;
  emphasis?: string;
};

export function MarketQuoteCard({ quote, emphasis }: MarketQuoteCardProps) {
  const tone = quote.changePercent >= 0 ? "text-[var(--accent-green)]" : "text-[#ff9f86]";
  const typeLabel = quote.entityType === "song" ? "Song" : quote.entityType === "artist" ? "Artist" : "Album";

  return (
    <Link
      href={`/marketplace/${quote.entityType}/${encodeURIComponent(quote.entityId)}`}
      className="editorial-panel p-4 transition hover:-translate-y-1"
    >
      <div
        className="cover-frame aspect-square"
        style={{
          backgroundImage: quote.artworkUrl
            ? `url(${quote.artworkUrl})`
            : "linear-gradient(135deg, rgba(30,215,96,0.12), rgba(105,162,255,0.14))",
        }}
      >
        <div className="relative z-10 flex h-full items-start justify-between p-4">
          <span className="pill">{typeLabel}</span>
          <div className="flex flex-col items-end gap-2">
            <span className="pill">{quote.hypeLevel}</span>
            <span className="pill">{quote.rewardProfile.label} upside</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {emphasis ? <p className="kicker">{emphasis}</p> : null}
        <h3 className="mt-2 text-2xl font-bold">{quote.entityName}</h3>
        <p className="mt-2 text-sm text-[var(--text-soft)]">{quote.entitySubtitle}</p>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <p className="text-2xl font-bold">{formatAtlasCredits(quote.currentPrice)}</p>
          <p className={`text-sm font-semibold ${tone}`}>
            {quote.changePercent >= 0 ? "+" : ""}
            {quote.changePercent.toFixed(1)}%
          </p>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{quote.reasons[0]}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{quote.rewardProfile.reason}</p>
        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {quote.investorCount} investors
        </p>
      </div>
    </Link>
  );
}
