"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getFollowing } from "@/lib/follows";
import { MARKET_QUOTE_REFRESH_MINUTES } from "@/lib/music-market-config";
import { formatAtlasCredits } from "@/lib/music-market-format";
import { buildPortfolioSummary } from "@/lib/music-market-portfolio";
import {
  ensureMarketAccount,
  getAuthenticatedMarketUser,
  getOwnMarketBadges,
  getOwnMarketPositions,
  getOwnMarketTransactions,
} from "@/lib/music-market-client";
import type { MarketActivityItem, MarketQuote, PortfolioSummary } from "@/lib/music-market-types";

type PortfolioPanelProps = {
  seedQuotes: MarketQuote[];
};

export function PortfolioPanel({ seedQuotes }: PortfolioPanelProps) {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [followingActivity, setFollowingActivity] = useState<MarketActivityItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPortfolio() {
      try {
        const user = await getAuthenticatedMarketUser();

        if (!user || !isMounted) {
          setSummary(null);
          return;
        }

        const [account, positions, transactions, badges] = await Promise.all([
          ensureMarketAccount(),
          getOwnMarketPositions(),
          getOwnMarketTransactions(),
          getOwnMarketBadges(),
        ]);

        const quoteResponse = await fetch("/api/marketplace/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refs: positions.map((position) => ({
              entityType: position.entityType,
              entityId: position.entityId,
            })),
          }),
        });

        if (!quoteResponse.ok) {
          throw new Error("Unable to refresh live market prices for your holdings right now.");
        }

        const quotePayload = (await quoteResponse.json()) as { quotes: MarketQuote[] };
        const mergedQuotes = [...seedQuotes, ...(quotePayload.quotes ?? [])];

        if (!isMounted) {
          return;
        }

        setSummary(buildPortfolioSummary(account, positions, transactions, badges, mergedQuotes));

        const following = await getFollowing(user.id);
        if (!isMounted) {
          return;
        }

        if (following.length > 0) {
          const activityResponse = await fetch(`/api/marketplace/following-activity?userIds=${following.map((profile) => profile.user_id).join(",")}`);
          if (!activityResponse.ok) {
            throw new Error("Unable to load following activity right now.");
          }
          const activityPayload = (await activityResponse.json()) as { activity: MarketActivityItem[] };
          if (!isMounted) {
            return;
          }
          setFollowingActivity(activityPayload.activity ?? []);
        } else {
          setFollowingActivity([]);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load your marketplace portfolio right now.");
      }
    }

    void loadPortfolio();
    const refreshTimer = window.setInterval(() => {
      void loadPortfolio();
    }, MARKET_QUOTE_REFRESH_MINUTES * 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [seedQuotes]);

  if (!summary) {
    return (
      <div className="app-panel p-6 md:p-7">
        <p className="kicker">Portfolio</p>
        <h2 className="section-heading mt-3 font-bold">Your AC portfolio</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
          Log in to start with 10,000 AC and build positions across songs, artists, and albums.
        </p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Portfolio values re-mark to the current market window every {MARKET_QUOTE_REFRESH_MINUTES} minutes.
        </p>
        {error ? <p className="mt-4 text-sm text-[#ff9f86]">{error}</p> : null}
      </div>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="app-panel p-6 md:p-7">
        <p className="kicker">Portfolio</p>
        <h2 className="section-heading mt-3 font-bold">Your AC portfolio</h2>
        <p className="mt-3 text-sm text-[var(--text-soft)]">
          Cash balance updates immediately after each trade. Holdings re-price every {MARKET_QUOTE_REFRESH_MINUTES} minutes as the live market window refreshes.
        </p>
        <div className="meta-grid mt-6">
          <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
            <p className="kicker">Total value</p>
            <p className="mt-2 text-2xl font-bold">{formatAtlasCredits(summary.totalPortfolioValue)}</p>
          </div>
          <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
            <p className="kicker">Cash balance</p>
            <p className="mt-2 text-2xl font-bold">{formatAtlasCredits(summary.cashBalance)}</p>
          </div>
          <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
            <p className="kicker">Profit / loss</p>
            <p className={`mt-2 text-2xl font-bold ${summary.totalProfitLoss >= 0 ? "text-[var(--accent-green)]" : "text-[#ff9f86]"}`}>
              {formatAtlasCredits(summary.totalProfitLoss)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {summary.totalProfitLoss >= 0 ? "+" : ""}
              {summary.totalProfitLossPercent.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
            <p className="kicker">Badges</p>
            <p className="mt-2 text-2xl font-bold">{summary.badges.length}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            {summary.categoryBreakdown.map((category) => (
              <div
                key={category.entityType}
                className="rounded-[1.2rem] border p-4"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="kicker">{category.label}</p>
                <p className="mt-2 text-xl font-bold">{formatAtlasCredits(category.marketValue)}</p>
                <p className={`mt-2 text-sm ${category.profitLoss >= 0 ? "text-[var(--accent-green)]" : "text-[#ff9f86]"}`}>
                  {formatAtlasCredits(category.profitLoss)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{category.holdingsCount} holdings</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
            <p className="text-sm text-[var(--text-soft)]">
              Your best performing category: <span className="font-semibold text-[var(--text-main)]">{summary.bestPerformingCategory?.label ?? "None yet"}</span>
            </p>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Highest return: <span className="font-semibold text-[var(--text-main)]">{summary.highestReturnCategory?.label ?? "None yet"}</span>
            </p>
          </div>

          {summary.holdings.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No positions yet. Buy your first song, artist, or album to start building your portfolio.</p>
          ) : (
            summary.holdings.map((holding) => (
              <Link
                key={`${holding.entityType}:${holding.entityId}`}
                href={`/marketplace/${holding.entityType}/${encodeURIComponent(holding.entityId)}`}
                className="flex items-center justify-between gap-4 rounded-[1.2rem] border px-4 py-4"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <div>
                  <p className="font-semibold">{holding.entityName}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {holding.entityType === "song" ? "Song" : holding.entityType === "artist" ? "Artist" : "Album"} | {holding.sharesOwned.toFixed(2)} shares | avg {formatAtlasCredits(holding.averageCostPerShare)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatAtlasCredits(holding.marketValue)}</p>
                  <p className={`mt-1 text-sm ${holding.unrealizedProfitLoss >= 0 ? "text-[var(--accent-green)]" : "text-[#ff9f86]"}`}>
                    {formatAtlasCredits(holding.unrealizedProfitLoss)}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="app-panel p-6 md:p-7">
          <p className="kicker">Badges</p>
          <h2 className="section-heading mt-3 font-bold">Achievements</h2>
          <div className="mt-5 space-y-3">
            {summary.badges.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No badges yet. Your first buy unlocks Early Investor.</p>
            ) : (
              summary.badges.map((badge) => (
                <div
                  key={badge.id}
                  className="rounded-[1.2rem] border p-4"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="font-semibold">{badge.badgeLabel}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">{badge.badgeDescription}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="app-panel p-6 md:p-7">
          <p className="kicker">Following activity</p>
          <h2 className="section-heading mt-3 font-bold">Friend investments</h2>
          <div className="mt-5 space-y-3">
            {followingActivity.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Follow more people to see their public market activity here.</p>
            ) : (
              followingActivity.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.2rem] border p-4"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="font-semibold">{item.displayName} {item.side === "buy" ? "bought" : "sold"} {item.entityName}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">{formatAtlasCredits(item.totalAmount)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
