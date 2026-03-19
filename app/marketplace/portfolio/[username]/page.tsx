import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { detectMarketFromHeaders } from "@/lib/market";
import { formatAtlasCredits } from "@/lib/music-market-format";
import { getPublicPortfolioByUsername } from "@/lib/music-market";

export const revalidate = 600;

type PublicPortfolioPageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function PublicPortfolioPage({ params }: PublicPortfolioPageProps) {
  const { username } = await params;
  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const portfolio = await getPublicPortfolioByUsername(username, market.country, market.countryName);

  if (!portfolio) {
    notFound();
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/marketplace" className="brand-mark">
              Back To Marketplace
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">{portfolio.profile.displayName}</h1>
            <p className="mt-3 text-[var(--text-soft)]">@{portfolio.profile.username}&apos;s public portfolio</p>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="meta-grid">
            <div className="app-panel p-4">
              <p className="kicker">Total value</p>
              <p className="mt-2 text-2xl font-bold">{formatAtlasCredits(portfolio.summary.totalPortfolioValue)}</p>
            </div>
            <div className="app-panel p-4">
              <p className="kicker">Profit / loss</p>
              <p className={`mt-2 text-2xl font-bold ${portfolio.summary.totalProfitLoss >= 0 ? "text-[var(--accent-green)]" : "text-[#ff9f86]"}`}>
                {formatAtlasCredits(portfolio.summary.totalProfitLoss)}
              </p>
            </div>
            <div className="app-panel p-4">
              <p className="kicker">Cash</p>
              <p className="mt-2 text-2xl font-bold">{formatAtlasCredits(portfolio.summary.cashBalance)}</p>
            </div>
            <div className="app-panel p-4">
              <p className="kicker">Holdings</p>
              <p className="mt-2 text-2xl font-bold">{portfolio.summary.holdings.length}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {portfolio.summary.categoryBreakdown.map((category) => (
              <div key={category.entityType} className="app-panel p-4">
                <p className="kicker">{category.label}</p>
                <p className="mt-2 text-xl font-bold">{formatAtlasCredits(category.marketValue)}</p>
                <p className={`mt-2 text-sm ${category.profitLoss >= 0 ? "text-[var(--accent-green)]" : "text-[#ff9f86]"}`}>
                  {formatAtlasCredits(category.profitLoss)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-panel p-6 md:p-7">
            <p className="kicker">Open positions</p>
            <h2 className="section-heading mt-3 font-bold">Current holdings</h2>
            <div className="mt-5 space-y-3">
              {portfolio.summary.holdings.length > 0 ? (
                portfolio.summary.holdings.map((holding) => (
                  <Link
                    key={`${holding.entityType}:${holding.entityId}`}
                    href={`/marketplace/${holding.entityType}/${encodeURIComponent(holding.entityId)}`}
                    className="flex items-center justify-between gap-4 rounded-[1.2rem] border p-4"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <div>
                      <p className="font-semibold">{holding.entityName}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {holding.entityType === "song" ? "Song" : holding.entityType === "artist" ? "Artist" : "Album"} | {holding.sharesOwned.toFixed(2)} shares
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
              ) : (
                <div className="rounded-[1.2rem] border p-4 text-sm leading-7 text-[var(--text-soft)]" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                  This public portfolio does not have any open music positions yet.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="app-panel p-6 md:p-7">
              <p className="kicker">Badges</p>
              <h2 className="section-heading mt-3 font-bold">Achievements</h2>
              <div className="mt-5 space-y-3">
                {portfolio.summary.badges.length > 0 ? (
                  portfolio.summary.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="rounded-[1.2rem] border p-4"
                      style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                    >
                      <p className="font-semibold">{badge.badgeLabel}</p>
                      <p className="mt-2 text-sm text-[var(--text-soft)]">{badge.badgeDescription}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border p-4 text-sm leading-7 text-[var(--text-soft)]" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                    No marketplace badges have been earned on this public profile yet.
                  </div>
                )}
              </div>
            </div>

            <div className="app-panel p-6 md:p-7">
              <p className="kicker">Recent tape</p>
              <h2 className="section-heading mt-3 font-bold">Transactions</h2>
              <div className="mt-5 space-y-3">
                {portfolio.summary.recentTransactions.length > 0 ? (
                  portfolio.summary.recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="rounded-[1.2rem] border p-4"
                      style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                    >
                      <p className="font-semibold">{transaction.side === "buy" ? "Bought" : "Sold"} {transaction.entityName}</p>
                      <p className="mt-2 text-sm text-[var(--text-soft)]">{formatAtlasCredits(transaction.totalAmount)}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border p-4 text-sm leading-7 text-[var(--text-soft)]" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                    No public trades have been recorded for this portfolio yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
