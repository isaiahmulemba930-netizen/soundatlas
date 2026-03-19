export type MarketEntityType = "song" | "artist" | "album";

export type MarketQuote = {
  entityType: MarketEntityType;
  entityId: string;
  entityName: string;
  entitySubtitle: string;
  entityHref: string;
  artworkUrl: string;
  country: string;
  countryName: string;
  basePrice: number;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  priceScore: number;
  investorCount: number;
  hypeLevel: "Low" | "Warm" | "Hot" | "Explosive";
  rewardProfile: {
    label: "Low" | "Moderate" | "High" | "Boom";
    multiplier: number;
    reason: string;
  };
  reasons: string[];
  metrics: {
    streamingGrowthRate: number;
    newListenerGrowth: number;
    saveRate: number;
    appEngagementScore: number;
    momentumFactor: number;
  };
  chartPoints: Array<{
    label: string;
    price: number;
  }>;
};

export type MarketPosition = {
  id: string;
  userId: string;
  entityType: MarketEntityType;
  entityId: string;
  entityName: string;
  entitySubtitle: string | null;
  entityHref: string;
  artworkUrl: string | null;
  shares: number;
  averageCostPerShare: number;
  realizedProfitLoss: number;
  updatedAt: string;
};

export type MarketTransaction = {
  id: string;
  userId: string;
  entityType: MarketEntityType;
  entityId: string;
  entityName: string;
  entitySubtitle: string | null;
  entityHref: string;
  artworkUrl: string | null;
  side: "buy" | "sell";
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  realizedProfitLoss: number;
  createdAt: string;
};

export type MarketBadge = {
  id: string;
  userId: string;
  badgeKey: string;
  badgeLabel: string;
  badgeDescription: string;
  awardedAt: string;
};

export type MarketAccount = {
  userId: string;
  atlasCreditsBalance: number;
  totalInvestedCredits: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioHolding = MarketQuote & {
  sharesOwned: number;
  averageCostPerShare: number;
  costBasis: number;
  marketValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossPercent: number;
  realizedProfitLoss: number;
};

export type PortfolioSummary = {
  cashBalance: number;
  holdingsValue: number;
  totalPortfolioValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  categoryBreakdown: Array<{
    entityType: MarketEntityType;
    label: string;
    holdingsCount: number;
    marketValue: number;
    profitLoss: number;
    profitLossPercent: number;
  }>;
  bestPerformingCategory: {
    entityType: MarketEntityType;
    label: string;
    holdingsCount: number;
    marketValue: number;
    profitLoss: number;
    profitLossPercent: number;
  } | null;
  highestReturnCategory: {
    entityType: MarketEntityType;
    label: string;
    holdingsCount: number;
    marketValue: number;
    profitLoss: number;
    profitLossPercent: number;
  } | null;
  bestInvestment: PortfolioHolding | null;
  worstInvestment: PortfolioHolding | null;
  holdings: PortfolioHolding[];
  recentTransactions: MarketTransaction[];
  badges: MarketBadge[];
};

export type MarketLeaderboardEntry = {
  userId: string;
  displayName: string;
  username: string;
  totalPortfolioValue: number;
  totalProfitLoss: number;
};

export type MarketActivityItem = {
  id: string;
  displayName: string;
  username: string;
  side: "buy" | "sell";
  entityName: string;
  entityType: MarketEntityType;
  totalAmount: number;
  realizedProfitLoss: number;
  createdAt: string;
};

export type MusicMarketDashboardData = {
  marketCountry: string;
  marketCountryName: string;
  refreshedAt: string;
  quoteWindowStartedAt: string;
  nextQuoteRefreshAt: string;
  rotationLabel: string;
  nextSongRotationAt: string;
  trendingSongs: MarketQuote[];
  risingArtists: MarketQuote[];
  breakoutAlbums: MarketQuote[];
  undergroundMovers: MarketQuote[];
  searchedAlbums: MarketAlbumSearchResult[];
  searchedAlbumQuery: string;
  leaderboard: MarketLeaderboardEntry[];
  activityFeed: MarketActivityItem[];
};

export type MarketAlbumSearchResult = {
  quote: MarketQuote;
  releaseDate: string | null;
  genre: string | null;
  streamingMomentum: string;
  popularitySignal: string;
  regionalMomentum: string | null;
  replayValue: string;
  platformTraction: string | null;
  artistGrowthTrend: string;
};

export type MarketAssetDetail = {
  quote: MarketQuote;
  relatedQuotes: MarketQuote[];
};
