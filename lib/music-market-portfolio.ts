import type {
  MarketAccount,
  MarketBadge,
  MarketEntityType,
  MarketPosition,
  MarketQuote,
  MarketTransaction,
  PortfolioHolding,
  PortfolioSummary,
} from "@/lib/music-market-types";

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getEntityLabel(entityType: MarketEntityType) {
  switch (entityType) {
    case "song":
      return "Songs";
    case "artist":
      return "Artists";
    case "album":
      return "Albums";
  }
}

export function buildPortfolioSummary(
  account: MarketAccount,
  positions: MarketPosition[],
  transactions: MarketTransaction[],
  badges: MarketBadge[],
  quotes: MarketQuote[]
) {
  const quoteByKey = new Map(quotes.map((quote) => [`${quote.entityType}:${quote.entityId}`, quote]));

  const holdings: PortfolioHolding[] = positions
    .map((position) => {
      const quote = quoteByKey.get(`${position.entityType}:${position.entityId}`);

      if (!quote) {
        return null;
      }

      const sharesOwned = position.shares;
      const costBasis = roundCurrency(position.averageCostPerShare * sharesOwned);
      const marketValue = roundCurrency(quote.currentPrice * sharesOwned);
      const unrealizedProfitLoss = roundCurrency(marketValue - costBasis);
      const unrealizedProfitLossPercent = costBasis > 0 ? roundCurrency((unrealizedProfitLoss / costBasis) * 100) : 0;

      return {
        ...quote,
        sharesOwned,
        averageCostPerShare: position.averageCostPerShare,
        costBasis,
        marketValue,
        unrealizedProfitLoss,
        unrealizedProfitLossPercent,
        realizedProfitLoss: position.realizedProfitLoss,
      } satisfies PortfolioHolding;
    })
    .filter((holding): holding is PortfolioHolding => holding !== null)
    .sort((left, right) => right.marketValue - left.marketValue);

  const holdingsValue = roundCurrency(holdings.reduce((sum, holding) => sum + holding.marketValue, 0));
  const totalPortfolioValue = roundCurrency(account.atlasCreditsBalance + holdingsValue);
  const totalProfitLoss = roundCurrency(totalPortfolioValue - 10000);
  const totalProfitLossPercent = roundCurrency((totalProfitLoss / 10000) * 100);
  const categoryBreakdown = (["song", "artist", "album"] as MarketEntityType[]).map((entityType) => {
    const categoryHoldings = holdings.filter((holding) => holding.entityType === entityType);
    const marketValue = roundCurrency(categoryHoldings.reduce((sum, holding) => sum + holding.marketValue, 0));
    const profitLoss = roundCurrency(categoryHoldings.reduce((sum, holding) => sum + holding.unrealizedProfitLoss, 0));
    const costBasis = roundCurrency(categoryHoldings.reduce((sum, holding) => sum + holding.costBasis, 0));

    return {
      entityType,
      label: getEntityLabel(entityType),
      holdingsCount: categoryHoldings.length,
      marketValue,
      profitLoss,
      profitLossPercent: costBasis > 0 ? roundCurrency((profitLoss / costBasis) * 100) : 0,
    };
  });

  return {
    cashBalance: account.atlasCreditsBalance,
    holdingsValue,
    totalPortfolioValue,
    totalProfitLoss,
    totalProfitLossPercent,
    categoryBreakdown,
    bestPerformingCategory:
      [...categoryBreakdown].sort((left, right) => right.profitLoss - left.profitLoss)[0]?.holdingsCount
        ? [...categoryBreakdown].sort((left, right) => right.profitLoss - left.profitLoss)[0]
        : null,
    highestReturnCategory:
      [...categoryBreakdown].sort((left, right) => right.profitLossPercent - left.profitLossPercent)[0]?.holdingsCount
        ? [...categoryBreakdown].sort((left, right) => right.profitLossPercent - left.profitLossPercent)[0]
        : null,
    bestInvestment: holdings[0] ?? null,
    worstInvestment: [...holdings].sort((left, right) => left.unrealizedProfitLossPercent - right.unrealizedProfitLossPercent)[0] ?? null,
    holdings,
    recentTransactions: transactions,
    badges,
  } satisfies PortfolioSummary;
}
