"use client";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const BADGES_UPDATED_EVENT = "soundatlas-badges-updated";

export type BadgeCategory =
  | "Reviewing"
  | "Rating"
  | "Discovery"
  | "Social / Community"
  | "Streak / Activity"
  | "Marketplace";

export type BadgeRarity = "Common" | "Rare" | "Epic" | "Legendary";

export type BadgeDefinition = {
  key: string;
  name: string;
  icon: string;
  category: BadgeCategory;
  description: string;
  rarity: BadgeRarity;
  unlockRequirement: string;
};

export type UserBadge = BadgeDefinition & {
  unlockedAt: string;
  pinned: boolean;
};

export type BadgeProgressItem = BadgeDefinition & {
  current: number;
  target: number;
  progressLabel: string;
  percent: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type BadgeSnapshot = {
  badges: UserBadge[];
  pinnedBadges: UserBadge[];
  progress: BadgeProgressItem[];
  totalBadgeCount: number;
  rarityBreakdown: Record<BadgeRarity, number>;
  certified: boolean;
  certifiedProgress: {
    totalBadges: number;
    categoryCount: number;
    neededBadges: number;
    neededCategories: number;
  };
};

type BadgeMetricKey =
  | "qualifyingReviews"
  | "longReviews"
  | "maxReviewLikes"
  | "ratings"
  | "detailedRatings"
  | "earlyEar"
  | "undergroundScout"
  | "trendHunter"
  | "hiddenGem"
  | "followers"
  | "comments"
  | "communityVoice"
  | "trustedTaste"
  | "activeDays"
  | "currentStreak"
  | "firstInvestment"
  | "earlyInvestor"
  | "trendPredictor"
  | "portfolioBuilder"
  | "marketLeader";

type BadgeMetricDefinition = BadgeDefinition & {
  metric: BadgeMetricKey;
  target: number;
};

const BADGE_DEFINITIONS: BadgeMetricDefinition[] = [
  {
    key: "first-review",
    name: "First Review",
    icon: "Pen",
    category: "Reviewing",
    description: "Published your first real review.",
    rarity: "Common",
    unlockRequirement: "Write 1 review",
    metric: "qualifyingReviews",
    target: 1,
  },
  {
    key: "critic",
    name: "Critic",
    icon: "Mic",
    category: "Reviewing",
    description: "Built early review momentum.",
    rarity: "Common",
    unlockRequirement: "Write 5 reviews",
    metric: "qualifyingReviews",
    target: 5,
  },
  {
    key: "top-critic",
    name: "Top Critic",
    icon: "Quill",
    category: "Reviewing",
    description: "Turned reviewing into a real body of work.",
    rarity: "Rare",
    unlockRequirement: "Write 15 reviews",
    metric: "qualifyingReviews",
    target: 15,
  },
  {
    key: "essayist",
    name: "Essayist",
    icon: "Scroll",
    category: "Reviewing",
    description: "Wrote multiple long-form takes worth reading.",
    rarity: "Rare",
    unlockRequirement: "Write 5 long reviews",
    metric: "longReviews",
    target: 5,
  },
  {
    key: "crowd-favorite",
    name: "Crowd Favorite",
    icon: "Heart",
    category: "Reviewing",
    description: "One of your reviews earned a real wave of support.",
    rarity: "Epic",
    unlockRequirement: "Get 10 likes on one review",
    metric: "maxReviewLikes",
    target: 10,
  },
  {
    key: "first-rating",
    name: "First Rating",
    icon: "Star",
    category: "Rating",
    description: "Started scoring what you hear.",
    rarity: "Common",
    unlockRequirement: "Rate 1 item",
    metric: "ratings",
    target: 1,
  },
  {
    key: "taste-builder",
    name: "Taste Builder",
    icon: "Palette",
    category: "Rating",
    description: "Built a clear taste profile across the app.",
    rarity: "Common",
    unlockRequirement: "Rate 25 items",
    metric: "ratings",
    target: 25,
  },
  {
    key: "deep-listener",
    name: "Deep Listener",
    icon: "Headphones",
    category: "Rating",
    description: "Scored enough music to shape a real listening identity.",
    rarity: "Rare",
    unlockRequirement: "Rate 100 items",
    metric: "ratings",
    target: 100,
  },
  {
    key: "perfectionist",
    name: "Perfectionist",
    icon: "Meter",
    category: "Rating",
    description: "Paired ratings with enough detail to explain the score.",
    rarity: "Rare",
    unlockRequirement: "Add 10 detailed ratings",
    metric: "detailedRatings",
    target: 10,
  },
  {
    key: "early-ear",
    name: "Early Ear",
    icon: "Radar",
    category: "Discovery",
    description: "Touched a track while it was still obscure inside SoundAtlas.",
    rarity: "Common",
    unlockRequirement: "Interact with a low-popularity song",
    metric: "earlyEar",
    target: 1,
  },
  {
    key: "underground-scout",
    name: "Underground Scout",
    icon: "Compass",
    category: "Discovery",
    description: "Spent time with multiple artists before the crowd got there.",
    rarity: "Rare",
    unlockRequirement: "Interact with 10 small artists",
    metric: "undergroundScout",
    target: 10,
  },
  {
    key: "trend-hunter",
    name: "Trend Hunter",
    icon: "Signal",
    category: "Discovery",
    description: "Got there early on multiple songs or artists that later picked up traction in SoundAtlas.",
    rarity: "Epic",
    unlockRequirement: "Correctly predict 3 rising songs or artists",
    metric: "trendHunter",
    target: 3,
  },
  {
    key: "hidden-gem",
    name: "Hidden Gem",
    icon: "Gem",
    category: "Discovery",
    description: "Backed something early that later turned into a broader community pickup.",
    rarity: "Epic",
    unlockRequirement: "Interact with obscure music that later grows",
    metric: "hiddenGem",
    target: 1,
  },
  {
    key: "first-follower",
    name: "First Follower",
    icon: "Wave",
    category: "Social / Community",
    description: "Started building an audience.",
    rarity: "Common",
    unlockRequirement: "Gain 1 follower",
    metric: "followers",
    target: 1,
  },
  {
    key: "influencer",
    name: "Influencer",
    icon: "Antenna",
    category: "Social / Community",
    description: "People are showing up for your taste.",
    rarity: "Rare",
    unlockRequirement: "Gain 25 followers",
    metric: "followers",
    target: 25,
  },
  {
    key: "conversation-starter",
    name: "Conversation Starter",
    icon: "Chat",
    category: "Social / Community",
    description: "You help keep the review conversation alive.",
    rarity: "Common",
    unlockRequirement: "Write 10 replies or comments",
    metric: "comments",
    target: 10,
  },
  {
    key: "community-voice",
    name: "Community Voice",
    icon: "Megaphone",
    category: "Social / Community",
    description: "Your reviews and comments are showing up consistently.",
    rarity: "Rare",
    unlockRequirement: "Keep engaging consistently",
    metric: "communityVoice",
    target: 1,
  },
  {
    key: "trusted-taste",
    name: "Trusted Taste",
    icon: "Shield",
    category: "Social / Community",
    description: "Your published reviews are earning positive feedback.",
    rarity: "Epic",
    unlockRequirement: "Maintain positive feedback",
    metric: "trustedTaste",
    target: 1,
  },
  {
    key: "day-one",
    name: "Day One",
    icon: "Spark",
    category: "Streak / Activity",
    description: "Logged your first real listening day.",
    rarity: "Common",
    unlockRequirement: "Be active for 1 day",
    metric: "activeDays",
    target: 1,
  },
  {
    key: "on-a-roll",
    name: "On a Roll",
    icon: "Flame",
    category: "Streak / Activity",
    description: "Your listening streak is taking shape.",
    rarity: "Common",
    unlockRequirement: "Keep a 3-day streak",
    metric: "currentStreak",
    target: 3,
  },
  {
    key: "dedicated-listener",
    name: "Dedicated Listener",
    icon: "Pulse",
    category: "Streak / Activity",
    description: "Built a real week-long listening habit.",
    rarity: "Rare",
    unlockRequirement: "Keep a 7-day streak",
    metric: "currentStreak",
    target: 7,
  },
  {
    key: "atlas-regular",
    name: "Atlas Regular",
    icon: "Orbit",
    category: "Streak / Activity",
    description: "You come back enough to shape the app around your taste.",
    rarity: "Epic",
    unlockRequirement: "Keep a 14-day streak",
    metric: "currentStreak",
    target: 14,
  },
  {
    key: "first-investment",
    name: "First Investment",
    icon: "Coins",
    category: "Marketplace",
    description: "Placed your first music market buy.",
    rarity: "Common",
    unlockRequirement: "Make 1 investment",
    metric: "firstInvestment",
    target: 1,
  },
  {
    key: "early-investor",
    name: "Early Investor",
    icon: "Rocket",
    category: "Marketplace",
    description: "Bought in early enough to open up a real gain.",
    rarity: "Rare",
    unlockRequirement: "Invest before a growth spike",
    metric: "earlyInvestor",
    target: 1,
  },
  {
    key: "trend-predictor",
    name: "Trend Predictor",
    icon: "Chart",
    category: "Marketplace",
    description: "Closed multiple market positions in profit.",
    rarity: "Rare",
    unlockRequirement: "Profit from 2 investments",
    metric: "trendPredictor",
    target: 2,
  },
  {
    key: "portfolio-builder",
    name: "Portfolio Builder",
    icon: "Grid",
    category: "Marketplace",
    description: "Built a diversified active book.",
    rarity: "Common",
    unlockRequirement: "Hold 5 active investments",
    metric: "portfolioBuilder",
    target: 5,
  },
  {
    key: "market-leader",
    name: "Market Leader",
    icon: "Crown",
    category: "Marketplace",
    description: "Reached the top tier of public portfolios for the current user base.",
    rarity: "Legendary",
    unlockRequirement: "Reach the top percentile",
    metric: "marketLeader",
    target: 1,
  },
];

type BadgeMetrics = Record<BadgeMetricKey, number>;

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this deployment yet.");
  }

  return supabase;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function uniqueCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function toDateKey(value: string) {
  return value.slice(0, 10);
}

function computeStreaks(days: string[]) {
  const sorted = Array.from(new Set(days)).sort();
  if (sorted.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 1;
  let running = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(sorted[index - 1]);
    const current = new Date(sorted[index]);
    const diffDays = Math.round((current.getTime() - previous.getTime()) / 86400000);

    if (diffDays === 1) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  const daysSet = new Set(sorted);

  if (!daysSet.has(todayKey) && !daysSet.has(yesterdayKey)) {
    return { current: 0, longest };
  }

  let current = 0;
  let cursor = daysSet.has(todayKey) ? today : new Date(today.getTime() - 86400000);

  while (daysSet.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }

  return { current, longest };
}

function buildRarityBreakdown(badges: UserBadge[]): Record<BadgeRarity, number> {
  return badges.reduce<Record<BadgeRarity, number>>(
    (accumulator, badge) => {
      accumulator[badge.rarity] += 1;
      return accumulator;
    },
    { Common: 0, Rare: 0, Epic: 0, Legendary: 0 }
  );
}

function getCurrentBadgeUser() {
  const client = getSupabaseClient();
  return client.auth.getSession();
}

async function getAuthenticatedBadgeUserId() {
  const {
    data: { session },
    error,
  } = await getCurrentBadgeUser();

  if (error) {
    throw error;
  }

  return session?.user.id ?? null;
}

async function getBadgeMetrics(userId: string) {
  const client = getSupabaseClient();

  const [
    reviewsResult,
    reviewCommentsResult,
    reviewRowsForLikesResult,
    followerCountResult,
    listeningDaysResult,
    listeningEventsResult,
    artistReviewResult,
    marketPositionsResult,
    marketTransactionsResult,
    publicAccountsResult,
    publicPositionValuesResult,
    profileResult,
  ] = await Promise.all([
    client
      .from("reviews")
      .select("id, entity_type, entity_id, rating, review_text, visibility, created_at")
      .eq("user_id", userId)
      .neq("moderation_status", "removed"),
    client.from("review_comments").select("id, created_at").eq("user_id", userId),
    client.from("reviews").select("id").eq("user_id", userId).eq("visibility", "public").eq("moderation_status", "active"),
    client.from("follows").select("follower_id", { head: true, count: "exact" }).eq("following_id", userId),
    client.from("listening_daily_rollups").select("played_day").eq("user_id", userId).order("played_day", { ascending: true }),
    client.from("listening_events").select("track_id, artist_name, played_at").eq("user_id", userId).order("played_at", { ascending: false }).limit(1200),
    client
      .from("reviews")
      .select("entity_type, entity_name, created_at")
      .eq("user_id", userId)
      .neq("moderation_status", "removed")
      .eq("entity_type", "artist"),
    client.from("market_positions").select("shares, average_cost_per_share").eq("user_id", userId).gt("shares", 0),
    client.from("market_transactions").select("side, total_amount, realized_profit_loss").eq("user_id", userId),
    client.from("market_accounts").select("user_id, atlas_credits_balance").eq("is_public", true),
    client.from("market_positions").select("user_id, shares, average_cost_per_share").gt("shares", 0),
    client.from("profiles").select("pinned_badge_keys").eq("user_id", userId).maybeSingle(),
  ]);

  if (reviewsResult.error) throw reviewsResult.error;
  if (reviewCommentsResult.error) throw reviewCommentsResult.error;
  if (reviewRowsForLikesResult.error) throw reviewRowsForLikesResult.error;
  if (followerCountResult.error) throw followerCountResult.error;
  if (listeningDaysResult.error) throw listeningDaysResult.error;
  if (listeningEventsResult.error) throw listeningEventsResult.error;
  if (artistReviewResult.error) throw artistReviewResult.error;
  if (marketPositionsResult.error) throw marketPositionsResult.error;
  if (marketTransactionsResult.error) throw marketTransactionsResult.error;
  if (publicAccountsResult.error) throw publicAccountsResult.error;
  if (publicPositionValuesResult.error) throw publicPositionValuesResult.error;
  if (profileResult.error) throw profileResult.error;

  const reviews = reviewsResult.data ?? [];
  const publicReviewIds = (reviewRowsForLikesResult.data ?? []).map((row) => row.id);

  const reviewLikesResult =
    publicReviewIds.length > 0
      ? await client.from("review_likes").select("review_id").in("review_id", publicReviewIds)
      : { data: [], error: null as null };

  if (reviewLikesResult.error) {
    throw reviewLikesResult.error;
  }

  const likesByReview = new Map<string, number>();
  (reviewLikesResult.data ?? []).forEach((row) => {
    likesByReview.set(row.review_id, (likesByReview.get(row.review_id) ?? 0) + 1);
  });

  const listeningEvents = listeningEventsResult.data ?? [];
  const songReviewIds = reviews.filter((review) => review.entity_type === "song").map((review) => review.entity_id);
  const artistNames = Array.from(
    new Set([
      ...listeningEvents.map((event) => String(event.artist_name ?? "").trim()).filter(Boolean),
      ...(artistReviewResult.data ?? []).map((review) => String(review.entity_name ?? "").trim()).filter(Boolean),
    ])
  ).slice(0, 150);
  const trackIds = Array.from(
    new Set([
      ...listeningEvents.map((event) => String(event.track_id ?? "").trim()).filter(Boolean),
      ...songReviewIds.map((value) => String(value ?? "").trim()).filter(Boolean),
    ])
  ).slice(0, 200);

  const [globalTrackRowsResult, globalArtistRowsResult] = await Promise.all([
    trackIds.length > 0
      ? client.from("listening_events").select("track_id, user_id, played_at").in("track_id", trackIds)
      : Promise.resolve({ data: [], error: null as null }),
    artistNames.length > 0
      ? client.from("listening_events").select("artist_name, user_id").in("artist_name", artistNames)
      : Promise.resolve({ data: [], error: null as null }),
  ]);

  if (globalTrackRowsResult.error) throw globalTrackRowsResult.error;
  if (globalArtistRowsResult.error) throw globalArtistRowsResult.error;

  const trackUsers = new Map<string, Set<string>>();
  (globalTrackRowsResult.data ?? []).forEach((row) => {
    const trackId = String(row.track_id ?? "").trim();
    if (!trackId) return;
    const userIds = trackUsers.get(trackId) ?? new Set<string>();
    userIds.add(String(row.user_id));
    trackUsers.set(trackId, userIds);
  });

  const artistUsers = new Map<string, Set<string>>();
  (globalArtistRowsResult.data ?? []).forEach((row) => {
    const artistName = String(row.artist_name ?? "").trim();
    if (!artistName) return;
    const userIds = artistUsers.get(artistName) ?? new Set<string>();
    userIds.add(String(row.user_id));
    artistUsers.set(artistName, userIds);
  });

  const earliestTrackTouch = new Map<string, string>();
  listeningEvents.forEach((event) => {
    const trackId = String(event.track_id ?? "").trim();
    if (!trackId) return;
    const playedAt = String(event.played_at ?? "");
    const existing = earliestTrackTouch.get(trackId);
    if (!existing || playedAt < existing) {
      earliestTrackTouch.set(trackId, playedAt);
    }
  });
  reviews
    .filter((review) => review.entity_type === "song")
    .forEach((review) => {
      const trackId = String(review.entity_id ?? "").trim();
      if (!trackId) return;
      const createdAt = String(review.created_at ?? "");
      const existing = earliestTrackTouch.get(trackId);
      if (!existing || createdAt < existing) {
        earliestTrackTouch.set(trackId, createdAt);
      }
    });

  const now = Date.now();
  let earlyEar = 0;
  let trendHunter = 0;
  let hiddenGem = 0;

  earliestTrackTouch.forEach((firstTouchedAt, trackId) => {
    const listenerCount = trackUsers.get(trackId)?.size ?? 0;
    const ageDays = (now - new Date(firstTouchedAt).getTime()) / 86400000;

    if (listenerCount > 0 && listenerCount <= 5) {
      earlyEar = 1;
    }

    if (listenerCount >= 12 && ageDays >= 7) {
      trendHunter += 1;
    }

    if (listenerCount >= 20 && ageDays >= 14) {
      hiddenGem = 1;
    }
  });

  const undergroundScout = uniqueCount(
    artistNames.filter((artistName) => (artistUsers.get(artistName)?.size ?? 0) > 0 && (artistUsers.get(artistName)?.size ?? 0) <= 5)
  );

  const qualifyingReviews = reviews.filter((review) => String(review.review_text ?? "").trim().length >= 40).length;
  const longReviews = reviews.filter((review) => String(review.review_text ?? "").trim().length >= 280).length;
  const ratings = reviews.filter((review) => typeof review.rating === "number" && Number(review.rating) > 0).length;
  const detailedRatings = reviews.filter(
    (review) => typeof review.rating === "number" && Number(review.rating) > 0 && String(review.review_text ?? "").trim().length >= 120
  ).length;
  const maxReviewLikes = Math.max(0, ...publicReviewIds.map((reviewId) => likesByReview.get(reviewId) ?? 0));
  const totalReviewLikes = (reviewLikesResult.data ?? []).length;
  const comments = (reviewCommentsResult.data ?? []).length;
  const commentDayCount = uniqueCount((reviewCommentsResult.data ?? []).map((row) => toDateKey(String(row.created_at))));
  const followerCount = followerCountResult.count ?? 0;
  const playedDays = (listeningDaysResult.data ?? []).map((row) => String(row.played_day));
  const streaks = computeStreaks(playedDays);
  const activeInvestments = (marketPositionsResult.data ?? []).length;
  const marketTransactions = marketTransactionsResult.data ?? [];
  const buyCount = marketTransactions.filter((transaction) => transaction.side === "buy").length;
  const profitableSellCount = marketTransactions.filter(
    (transaction) => transaction.side === "sell" && Number(transaction.realized_profit_loss ?? 0) > 0
  ).length;
  const earlyInvestor = marketTransactions.some(
    (transaction) => transaction.side === "sell" && Number(transaction.realized_profit_loss ?? 0) >= Number(transaction.total_amount ?? 0) * 0.1
  )
    ? 1
    : 0;

  const publicPortfolioValues = new Map<string, number>();
  (publicAccountsResult.data ?? []).forEach((account) => {
    publicPortfolioValues.set(account.user_id, Number(account.atlas_credits_balance ?? 0));
  });
  (publicPositionValuesResult.data ?? []).forEach((position) => {
    const current = publicPortfolioValues.get(position.user_id) ?? 0;
    publicPortfolioValues.set(
      position.user_id,
      current + Number(position.shares ?? 0) * Number(position.average_cost_per_share ?? 0)
    );
  });

  const rankedUsers = Array.from(publicPortfolioValues.entries()).sort((left, right) => right[1] - left[1]);
  const marketLeaderCutoff =
    rankedUsers.length < 10 ? 1 : rankedUsers.length < 30 ? 3 : Math.max(1, Math.ceil(rankedUsers.length * 0.1));
  const userRank = rankedUsers.findIndex(([rankedUserId]) => rankedUserId === userId) + 1;

  const metrics: BadgeMetrics = {
    qualifyingReviews,
    longReviews,
    maxReviewLikes,
    ratings,
    detailedRatings,
    earlyEar,
    undergroundScout,
    trendHunter,
    hiddenGem,
    followers: followerCount,
    comments,
    communityVoice: qualifyingReviews >= 5 && comments >= 5 && commentDayCount >= 3 ? 1 : 0,
    trustedTaste: totalReviewLikes >= 20 ? 1 : 0,
    activeDays: playedDays.length,
    currentStreak: streaks.current,
    firstInvestment: buyCount,
    earlyInvestor,
    trendPredictor: profitableSellCount,
    portfolioBuilder: activeInvestments,
    marketLeader: userRank > 0 && userRank <= marketLeaderCutoff ? 1 : 0,
  };

  return {
    metrics,
    pinnedBadgeKeys: ((profileResult.data?.pinned_badge_keys as string[] | null) ?? []).slice(0, 3),
  };
}

function emitBadgesUpdated(newBadges: UserBadge[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(BADGES_UPDATED_EVENT, {
      detail: {
        badges: newBadges,
      },
    })
  );
}

function toUserBadge(
  row: {
    badge_key: string;
    badge_name: string;
    badge_icon: string;
    badge_category: BadgeCategory;
    badge_description: string;
    badge_rarity: BadgeRarity;
    unlock_requirement: string;
    unlocked_at: string;
  },
  pinnedBadgeKeys: string[]
) {
  return {
    key: row.badge_key,
    name: row.badge_name,
    icon: row.badge_icon,
    category: row.badge_category,
    description: row.badge_description,
    rarity: row.badge_rarity,
    unlockRequirement: row.unlock_requirement,
    unlockedAt: row.unlocked_at,
    pinned: pinnedBadgeKeys.includes(row.badge_key),
  } satisfies UserBadge;
}

async function getUnlockedRows(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("user_badges")
    .select("badge_key, badge_name, badge_icon, badge_category, badge_description, badge_rarity, unlock_requirement, unlocked_at")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function syncBadgeProgressForUser(userId: string) {
  const client = getSupabaseClient();
  const [{ metrics, pinnedBadgeKeys }, unlockedRows] = await Promise.all([getBadgeMetrics(userId), getUnlockedRows(userId)]);
  const unlockedByKey = new Map(unlockedRows.map((row) => [row.badge_key, row]));

  const earnedDefinitions = BADGE_DEFINITIONS.filter((definition) => metrics[definition.metric] >= definition.target);
  const freshDefinitions = earnedDefinitions.filter((definition) => !unlockedByKey.has(definition.key));

  if (freshDefinitions.length > 0) {
    const { error } = await client.from("user_badges").insert(
      freshDefinitions.map((definition) => ({
        user_id: userId,
        badge_key: definition.key,
        badge_name: definition.name,
        badge_icon: definition.icon,
        badge_category: definition.category,
        badge_description: definition.description,
        badge_rarity: definition.rarity,
        unlock_requirement: definition.unlockRequirement,
      }))
    );

    if (error) {
      throw error;
    }
  }

  const updatedRows = freshDefinitions.length > 0 ? await getUnlockedRows(userId) : unlockedRows;
  const badges = updatedRows.map((row) => toUserBadge(row, pinnedBadgeKeys));
  const newBadges = badges.filter((badge) => freshDefinitions.some((definition) => definition.key === badge.key));

  return {
    badges,
    newBadges,
    metrics,
    pinnedBadgeKeys,
  };
}

export async function syncBadgeProgressForCurrentUser() {
  const userId = await getAuthenticatedBadgeUserId();
  if (!userId) {
    return null;
  }

  const result = await syncBadgeProgressForUser(userId);
  if (result.newBadges.length > 0) {
    emitBadgesUpdated(result.newBadges);
  }

  return result;
}

export async function pinOwnBadges(badgeKeys: string[]) {
  const client = getSupabaseClient();
  const userId = await getAuthenticatedBadgeUserId();

  if (!userId) {
    throw new Error("Log in to pin badges.");
  }

  const sanitized = Array.from(new Set(badgeKeys.filter(Boolean))).slice(0, 3);
  const { data: unlockedRows, error: unlockedError } = await client
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", userId)
    .in("badge_key", sanitized);

  if (unlockedError) {
    throw unlockedError;
  }

  const unlockedKeys = new Set((unlockedRows ?? []).map((row) => row.badge_key));
  const validKeys = sanitized.filter((key) => unlockedKeys.has(key));

  const { error } = await client.from("profiles").upsert(
    {
      user_id: userId,
      pinned_badge_keys: validKeys,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw error;
  }

  emitBadgesUpdated([]);
  return validKeys;
}

export async function getBadgeSnapshotForUser(userId: string, options?: { includeProgress?: boolean }) {
  const includeProgress = options?.includeProgress ?? false;
  const [{ metrics, pinnedBadgeKeys }, unlockedRows] = await Promise.all([getBadgeMetrics(userId), getUnlockedRows(userId)]);
  const badges = unlockedRows.map((row) => toUserBadge(row, pinnedBadgeKeys));
  const unlockedCategories = new Set(badges.map((badge) => badge.category));
  const certified = badges.length >= 8 && unlockedCategories.size >= 3;

  return {
    badges,
    pinnedBadges: badges.filter((badge) => badge.pinned).slice(0, 3),
    progress: includeProgress
      ? BADGE_DEFINITIONS.map((definition) => {
          const unlockedRow = unlockedRows.find((row) => row.badge_key === definition.key);
          const current = metrics[definition.metric];
          return {
            ...definition,
            current,
            target: definition.target,
            progressLabel: `${Math.min(current, definition.target)} / ${definition.target}`,
            percent: clamp((current / definition.target) * 100, 0, 100),
            unlocked: Boolean(unlockedRow),
            unlockedAt: unlockedRow?.unlocked_at ?? null,
          } satisfies BadgeProgressItem;
        }).sort((left, right) => Number(left.unlocked) - Number(right.unlocked) || right.percent - left.percent)
      : [],
    totalBadgeCount: badges.length,
    rarityBreakdown: buildRarityBreakdown(badges),
    certified,
    certifiedProgress: {
      totalBadges: badges.length,
      categoryCount: unlockedCategories.size,
      neededBadges: Math.max(0, 8 - badges.length),
      neededCategories: Math.max(0, 3 - unlockedCategories.size),
    },
  } satisfies BadgeSnapshot;
}

export function subscribeToBadgeUpdates(callback: (badges: UserBadge[]) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ badges?: UserBadge[] }>;
    callback(customEvent.detail?.badges ?? []);
  };

  window.addEventListener(BADGES_UPDATED_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(BADGES_UPDATED_EVENT, handler as EventListener);
  };
}
