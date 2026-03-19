import Link from "next/link";

import { formatAtlasCredits } from "@/lib/music-market-format";
import type { MarketAlbumSearchResult } from "@/lib/music-market-types";

type AlbumInvestmentSearchCardProps = {
  result: MarketAlbumSearchResult;
};

function formatReleaseDate(value: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AlbumInvestmentSearchCard({ result }: AlbumInvestmentSearchCardProps) {
  const { quote } = result;

  return (
    <Link
      href={`/marketplace/${quote.entityType}/${encodeURIComponent(quote.entityId)}`}
      className="editorial-panel p-5 transition hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="kicker">Album search result</p>
          <h3 className="mt-2 text-2xl font-bold">{quote.entityName}</h3>
          <p className="mt-2 text-sm text-[var(--text-soft)]">{quote.entitySubtitle}</p>
        </div>
        <div className="text-right">
          <span className="pill">{quote.rewardProfile.label} upside</span>
          <p className="mt-3 text-lg font-bold">{formatAtlasCredits(quote.currentPrice)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-[var(--text-soft)] md:grid-cols-2">
        <p>Release date: <span className="text-[var(--text-main)]">{formatReleaseDate(result.releaseDate)}</span></p>
        <p>Genre: <span className="text-[var(--text-main)]">{result.genre ?? "Unknown"}</span></p>
        <p>Streaming momentum: <span className="text-[var(--text-main)]">{result.streamingMomentum}</span></p>
        <p>Popularity signal: <span className="text-[var(--text-main)]">{result.popularitySignal}</span></p>
        <p>Replay value: <span className="text-[var(--text-main)]">{result.replayValue}</span></p>
        <p>Artist growth: <span className="text-[var(--text-main)]">{result.artistGrowthTrend}</span></p>
        <p>Regional momentum: <span className="text-[var(--text-main)]">{result.regionalMomentum ?? "No strong regional breakout verified yet"}</span></p>
        <p>Platform traction: <span className="text-[var(--text-main)]">{result.platformTraction ?? "No major platform traction verified yet"}</span></p>
      </div>

      <p className="mt-5 text-sm leading-6 text-[var(--text-soft)]">{quote.rewardProfile.reason}</p>
    </Link>
  );
}
