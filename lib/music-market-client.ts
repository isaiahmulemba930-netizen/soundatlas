"use client";

import { syncBadgeProgressForCurrentUser } from "@/lib/badges";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { buildPortfolioSummary } from "@/lib/music-market-portfolio";
import type {
  MarketAccount,
  MarketBadge,
  MarketEntityType,
  MarketPosition,
  MarketQuote,
  MarketTransaction,
  PortfolioSummary,
} from "@/lib/music-market-types";

export const ATLAS_CREDIT_REWARDS = {
  playLog: 2,
  playLogDailyCap: 40,
  reviewRating: 25,
  reviewWriteup: 150,
  publicReviewBonus: 25,
} as const;

function parseRewardLookupId(entityType: MarketEntityType, entityId: string) {
  if (entityType === "album") {
    const match = entityId.match(/itunes-(\d+)/);
    return match?.[1] ?? null;
  }

  return entityId;
}

function getReleaseRewardMultiplier(dateValue?: string | null) {
  if (!dateValue) {
    return 1;
  }

  const timestamp = new Date(dateValue).getTime();
  if (!Number.isFinite(timestamp)) {
    return 1;
  }

  const ageDays = Math.max((Date.now() - timestamp) / (1000 * 60 * 60 * 24), 0);

  if (ageDays <= 30) return 2.4;
  if (ageDays <= 120) return 1.9;
  if (ageDays <= 365) return 1.35;
  if (ageDays <= 365 * 5) return 0.55;
  if (ageDays <= 365 * 20) return 0.18;
  return 0.005;
}

async function lookupReleaseDate(entityType: MarketEntityType, entityId: string) {
  const lookupId = parseRewardLookupId(entityType, entityId);

  if (!lookupId) {
    return null;
  }

  if (entityType === "artist") {
    return null;
  }

  const url = entityType === "song"
    ? `https://itunes.apple.com/lookup?id=${encodeURIComponent(lookupId)}`
    : `https://itunes.apple.com/lookup?id=${encodeURIComponent(lookupId)}&entity=album`;

  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => ({ results: [] }))) as {
    results?: Array<{ releaseDate?: string }>;
  };

  return payload.results?.[0]?.releaseDate ?? null;
}

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this deployment yet.");
  }

  return supabase;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function newErrorFromSupabase(error: unknown, fallbackMessage = "Unable to process that marketplace action.") {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return new Error((error as { message: string }).message);
  }

  return new Error(fallbackMessage);
}

function toMarketAccount(row: {
  user_id: string;
  atlas_credits_balance: number | string | null;
  total_invested_credits: number | string | null;
  is_public: boolean | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    userId: row.user_id,
    atlasCreditsBalance: Number(row.atlas_credits_balance ?? 0),
    totalInvestedCredits: Number(row.total_invested_credits ?? 0),
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies MarketAccount;
}

async function restoreAccountBalance(userId: string, atlasCreditsBalance: number, totalInvestedCredits: number) {
  const client = getSupabaseClient();

  await client
    .from("market_accounts")
    .update({
      atlas_credits_balance: roundCurrency(atlasCreditsBalance),
      total_invested_credits: roundCurrency(totalInvestedCredits),
    })
    .eq("user_id", userId);
}

async function addAtlasCredits(userId: string, amount: number) {
  if (amount <= 0) {
    return 0;
  }

  const account = await ensureMarketAccount();
  const client = getSupabaseClient();
  const nextBalance = roundCurrency(account.atlasCreditsBalance + amount);

  const { error } = await client
    .from("market_accounts")
    .update({
      atlas_credits_balance: nextBalance,
    })
    .eq("user_id", userId);

  if (error) {
    throw newErrorFromSupabase(error, "Unable to update your Atlas Credits balance.");
  }

  return amount;
}

async function restorePositionSnapshot(
  userId: string,
  entityType: MarketEntityType,
  entityId: string,
  previousPosition: {
    entity_type: MarketEntityType;
    entity_id: string;
    entity_name: string;
    entity_subtitle: string | null;
    entity_href: string;
    artwork_url: string | null;
    shares: number;
    average_cost_per_share: number;
    realized_profit_loss: number;
  } | null
) {
  const client = getSupabaseClient();

  if (!previousPosition) {
    await client
      .from("market_positions")
      .delete()
      .eq("user_id", userId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);
    return;
  }

  await client
    .from("market_positions")
    .upsert(
      {
        user_id: userId,
        entity_type: previousPosition.entity_type,
        entity_id: previousPosition.entity_id,
        entity_name: previousPosition.entity_name,
        entity_subtitle: previousPosition.entity_subtitle,
        entity_href: previousPosition.entity_href,
        artwork_url: previousPosition.artwork_url,
        shares: previousPosition.shares,
        average_cost_per_share: previousPosition.average_cost_per_share,
        realized_profit_loss: previousPosition.realized_profit_loss,
      },
      { onConflict: "user_id,entity_type,entity_id" }
    );
}

export async function getAuthenticatedMarketUser() {
  const client = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    throw newErrorFromSupabase(error, "Unable to load your marketplace session.");
  }

  return session?.user ?? null;
}

export async function ensureMarketAccount() {
  const client = getSupabaseClient();
  const user = await getAuthenticatedMarketUser();

  if (!user) {
    throw new Error("Log in to access the marketplace.");
  }

  const payload = {
    user_id: user.id,
    atlas_credits_balance: 10000,
    total_invested_credits: 0,
    is_public: true,
  };

  const { data: existing, error: existingError } = await client
    .from("market_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    throw newErrorFromSupabase(existingError, "Unable to load your marketplace account.");
  }

  if (existing) {
    return toMarketAccount(existing);
  }

  const { data: created, error: createError } = await client
    .from("market_accounts")
    .insert(payload)
    .select("*")
    .single();

  if (!createError && created) {
    return toMarketAccount(created);
  }

  if (createError && createError.code !== "23505") {
    throw newErrorFromSupabase(createError, "Unable to create your marketplace account.");
  }

  const { data: retryExisting, error: retryError } = await client
    .from("market_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (retryError) {
    throw newErrorFromSupabase(retryError, "Unable to load your marketplace account.");
  }

  if (!retryExisting) {
    throw new Error("Unable to initialize your marketplace account right now.");
  }

  return toMarketAccount(retryExisting);
}

export async function getOwnMarketPositions() {
  const client = getSupabaseClient();
  const user = await getAuthenticatedMarketUser();

  if (!user) {
    return [] as MarketPosition[];
  }

  const { data, error } = await client
    .from("market_positions")
    .select("*")
    .eq("user_id", user.id)
    .gt("shares", 0)
    .order("updated_at", { ascending: false });

  if (error) {
    throw newErrorFromSupabase(error, "Unable to load your current positions.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    entitySubtitle: row.entity_subtitle,
    entityHref: row.entity_href,
    artworkUrl: row.artwork_url,
    shares: Number(row.shares ?? 0),
    averageCostPerShare: Number(row.average_cost_per_share ?? 0),
    realizedProfitLoss: Number(row.realized_profit_loss ?? 0),
    updatedAt: row.updated_at,
  })) as MarketPosition[];
}

export async function getOwnMarketTransactions(limit = 20) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedMarketUser();

  if (!user) {
    return [] as MarketTransaction[];
  }

  const { data, error } = await client
    .from("market_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw newErrorFromSupabase(error, "Unable to load your transaction history.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    entitySubtitle: row.entity_subtitle,
    entityHref: row.entity_href,
    artworkUrl: row.artwork_url,
    side: row.side,
    shares: Number(row.shares ?? 0),
    pricePerShare: Number(row.price_per_share ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    realizedProfitLoss: Number(row.realized_profit_loss ?? 0),
    createdAt: row.created_at,
  })) as MarketTransaction[];
}

export async function getOwnMarketBadges() {
  const client = getSupabaseClient();
  const user = await getAuthenticatedMarketUser();

  if (!user) {
    return [] as MarketBadge[];
  }

  const { data, error } = await client
    .from("user_badges")
    .select("id, user_id, badge_key, badge_name, badge_description, unlocked_at")
    .eq("user_id", user.id)
    .eq("badge_category", "Marketplace")
    .order("unlocked_at", { ascending: false });

  if (error) {
    throw newErrorFromSupabase(error, "Unable to load your marketplace badges.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    badgeKey: row.badge_key,
    badgeLabel: row.badge_name,
    badgeDescription: row.badge_description,
    awardedAt: row.unlocked_at,
  })) as MarketBadge[];
}

export async function rewardReviewContribution(input: {
  isFirstReview: boolean;
  hasRating: boolean;
  reviewText: string;
  visibility: "public" | "private";
  entityType: MarketEntityType;
  entityId: string;
}) {
  const user = await getAuthenticatedMarketUser();

  if (!user || !input.isFirstReview) {
    return 0;
  }

  let reward = 0;

  if (input.hasRating) {
    reward += ATLAS_CREDIT_REWARDS.reviewRating;
  }

  if (input.reviewText.trim().length >= 40) {
    reward += ATLAS_CREDIT_REWARDS.reviewWriteup;
  }

  if (input.visibility === "public") {
    reward += ATLAS_CREDIT_REWARDS.publicReviewBonus;
  }

  const releaseDate = await lookupReleaseDate(input.entityType, input.entityId);
  const multiplier = getReleaseRewardMultiplier(releaseDate);
  return addAtlasCredits(user.id, Math.round(reward * multiplier));
}

export async function rewardListeningPlay(input?: {
  entityType?: MarketEntityType;
  entityId?: string | null;
}) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedMarketUser();

  if (!user) {
    return 0;
  }

  const today = new Date().toISOString().slice(0, 10);
  const dailyRewardedPlayCap = Math.floor(ATLAS_CREDIT_REWARDS.playLogDailyCap / ATLAS_CREDIT_REWARDS.playLog);
  const { count, error } = await client
    .from("listening_events")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", user.id)
    .eq("played_day", today);

  if (error) {
    throw newErrorFromSupabase(error, "Unable to load your play rewards.");
  }

  if ((count ?? 0) > dailyRewardedPlayCap) {
    return 0;
  }

  const releaseDate =
    input?.entityType && input?.entityId ? await lookupReleaseDate(input.entityType, input.entityId) : null;
  const multiplier = getReleaseRewardMultiplier(releaseDate);
  return addAtlasCredits(user.id, Math.round(ATLAS_CREDIT_REWARDS.playLog * multiplier));
}

async function upsertBadge(userId: string, badgeKey: string, badgeLabel: string, badgeDescription: string) {
  const client = getSupabaseClient();

  await client.from("market_badges").upsert(
    {
      user_id: userId,
      badge_key: badgeKey,
      badge_label: badgeLabel,
      badge_description: badgeDescription,
    },
    { onConflict: "user_id,badge_key", ignoreDuplicates: true }
  );
}

async function assertTradeCooldown(userId: string, entityType: MarketEntityType, entityId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("market_transactions")
    .select("created_at")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw newErrorFromSupabase(error, "Unable to validate the marketplace cooldown.");
  }

  if (!data?.created_at) {
    return;
  }

  const elapsedMs = Date.now() - new Date(data.created_at).getTime();
  if (elapsedMs < 30_000) {
    throw new Error("That asset is on a brief cooldown. Try again in a few seconds.");
  }
}

async function awardMarketBadges(userId: string, positions: MarketPosition[], transactions: MarketTransaction[]) {
  const profitableSales = transactions.filter((transaction) => transaction.side === "sell" && transaction.realizedProfitLoss > 0);

  if (transactions.some((transaction) => transaction.side === "buy")) {
    await upsertBadge(userId, "early-investor", "Early Investor", "Placed your first marketplace buy.");
  }

  if (profitableSales.length > 0) {
    await upsertBadge(userId, "trend-predictor", "Trend Predictor", "Closed a position for profit.");
  }

  if (positions.length >= 5) {
    await upsertBadge(userId, "market-leader", "Market Leader", "Built a diversified marketplace portfolio.");
  }
}

export async function buyMarketAsset(quote: MarketQuote, shares: number) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedMarketUser();

  if (!user) {
    throw new Error("Log in to buy with Atlas Credits.");
  }

  if (shares <= 0) {
    throw new Error("Choose a valid share amount.");
  }

  await assertTradeCooldown(user.id, quote.entityType, quote.entityId);

  const account = await ensureMarketAccount();
  const totalAmount = roundCurrency(quote.currentPrice * shares);

  if (account.atlasCreditsBalance < totalAmount) {
    throw new Error("Not enough Atlas Credits for that buy.");
  }

  const { data: existingPosition, error: existingPositionError } = await client
    .from("market_positions")
    .select("*")
    .eq("user_id", user.id)
    .eq("entity_type", quote.entityType)
    .eq("entity_id", quote.entityId)
    .maybeSingle();

  if (existingPositionError) {
    throw newErrorFromSupabase(existingPositionError, "Unable to load your existing position.");
  }

  const currentShares = Number(existingPosition?.shares ?? 0);
  const currentAverage = Number(existingPosition?.average_cost_per_share ?? 0);
  const nextShares = currentShares + shares;
  const nextAverage = nextShares > 0 ? ((currentShares * currentAverage) + totalAmount) / nextShares : quote.currentPrice;
  const previousPositionSnapshot = existingPosition
    ? {
        entity_type: existingPosition.entity_type as MarketEntityType,
        entity_id: existingPosition.entity_id as string,
        entity_name: existingPosition.entity_name as string,
        entity_subtitle: (existingPosition.entity_subtitle ?? null) as string | null,
        entity_href: existingPosition.entity_href as string,
        artwork_url: (existingPosition.artwork_url ?? null) as string | null,
        shares: Number(existingPosition.shares ?? 0),
        average_cost_per_share: Number(existingPosition.average_cost_per_share ?? 0),
        realized_profit_loss: Number(existingPosition.realized_profit_loss ?? 0),
      }
    : null;

  const { error: accountError } = await client
    .from("market_accounts")
    .update({
      atlas_credits_balance: roundCurrency(account.atlasCreditsBalance - totalAmount),
      total_invested_credits: roundCurrency(account.totalInvestedCredits + totalAmount),
    })
    .eq("user_id", user.id);

  if (accountError) {
    throw newErrorFromSupabase(accountError, "Failed to update marketplace account.");
  }

  const { error: positionError } = await client
    .from("market_positions")
    .upsert(
      {
        user_id: user.id,
        entity_type: quote.entityType,
        entity_id: quote.entityId,
        entity_name: quote.entityName,
        entity_subtitle: quote.entitySubtitle,
        entity_href: quote.entityHref,
        artwork_url: quote.artworkUrl || null,
        shares: nextShares,
        average_cost_per_share: nextAverage,
        realized_profit_loss: Number(existingPosition?.realized_profit_loss ?? 0),
      },
      { onConflict: "user_id,entity_type,entity_id" }
    );

  if (positionError) {
    await restoreAccountBalance(user.id, account.atlasCreditsBalance, account.totalInvestedCredits);
    throw newErrorFromSupabase(positionError, "Failed to update position snapshot.");
  }

  const { error: transactionError } = await client.from("market_transactions").insert({
    user_id: user.id,
    entity_type: quote.entityType,
    entity_id: quote.entityId,
    entity_name: quote.entityName,
    entity_subtitle: quote.entitySubtitle,
    entity_href: quote.entityHref,
    artwork_url: quote.artworkUrl || null,
    side: "buy",
    shares,
    price_per_share: quote.currentPrice,
    total_amount: totalAmount,
    realized_profit_loss: 0,
  });

  if (transactionError) {
    await restorePositionSnapshot(user.id, quote.entityType, quote.entityId, previousPositionSnapshot);
    await restoreAccountBalance(user.id, account.atlasCreditsBalance, account.totalInvestedCredits);
    throw newErrorFromSupabase(transactionError, "Failed to record buy transaction.");
  }

  const [positions, transactions] = await Promise.all([getOwnMarketPositions(), getOwnMarketTransactions()]);
  await awardMarketBadges(user.id, positions, transactions);
  await syncBadgeProgressForCurrentUser();
}

export async function sellMarketAsset(quote: MarketQuote, shares: number) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedMarketUser();

  if (!user) {
    throw new Error("Log in to sell from the marketplace.");
  }

  if (shares <= 0) {
    throw new Error("Choose a valid share amount.");
  }

  await assertTradeCooldown(user.id, quote.entityType, quote.entityId);

  const account = await ensureMarketAccount();
  const { data: existingPosition, error: positionLookupError } = await client
    .from("market_positions")
    .select("*")
    .eq("user_id", user.id)
    .eq("entity_type", quote.entityType)
    .eq("entity_id", quote.entityId)
    .single();

  if (positionLookupError) {
    throw newErrorFromSupabase(positionLookupError, "Unable to load your current position.");
  }

  const currentShares = Number(existingPosition?.shares ?? 0);

  if (currentShares < shares) {
    throw new Error("You do not own that many shares.");
  }

  const averageCost = Number(existingPosition?.average_cost_per_share ?? 0);
  const totalAmount = roundCurrency(quote.currentPrice * shares);
  const realizedProfitLoss = roundCurrency((quote.currentPrice - averageCost) * shares);
  const nextShares = currentShares - shares;
  const previousPositionSnapshot = {
    entity_type: existingPosition.entity_type as MarketEntityType,
    entity_id: existingPosition.entity_id as string,
    entity_name: existingPosition.entity_name as string,
    entity_subtitle: (existingPosition.entity_subtitle ?? null) as string | null,
    entity_href: existingPosition.entity_href as string,
    artwork_url: (existingPosition.artwork_url ?? null) as string | null,
    shares: Number(existingPosition.shares ?? 0),
    average_cost_per_share: Number(existingPosition.average_cost_per_share ?? 0),
    realized_profit_loss: Number(existingPosition.realized_profit_loss ?? 0),
  };

  const { error: accountError } = await client
    .from("market_accounts")
    .update({
      atlas_credits_balance: roundCurrency(account.atlasCreditsBalance + totalAmount),
      total_invested_credits: Math.max(0, roundCurrency(account.totalInvestedCredits - averageCost * shares)),
    })
    .eq("user_id", user.id);

  if (accountError) {
    throw newErrorFromSupabase(accountError, "Failed to update marketplace account.");
  }

  if (nextShares > 0) {
    const { error: positionError } = await client
      .from("market_positions")
      .update({
        shares: nextShares,
        realized_profit_loss: roundCurrency(Number(existingPosition.realized_profit_loss ?? 0) + realizedProfitLoss),
      })
      .eq("id", existingPosition.id);

    if (positionError) {
      await restoreAccountBalance(user.id, account.atlasCreditsBalance, account.totalInvestedCredits);
      throw newErrorFromSupabase(positionError, "Failed to update your position.");
    }
  } else {
    const { error: deleteError } = await client.from("market_positions").delete().eq("id", existingPosition.id);

    if (deleteError) {
      await restoreAccountBalance(user.id, account.atlasCreditsBalance, account.totalInvestedCredits);
      throw newErrorFromSupabase(deleteError, "Failed to delete closed position.");
    }
  }

  const { error: transactionError } = await client.from("market_transactions").insert({
    user_id: user.id,
    entity_type: quote.entityType,
    entity_id: quote.entityId,
    entity_name: quote.entityName,
    entity_subtitle: quote.entitySubtitle,
    entity_href: quote.entityHref,
    artwork_url: quote.artworkUrl || null,
    side: "sell",
    shares,
    price_per_share: quote.currentPrice,
    total_amount: totalAmount,
    realized_profit_loss: realizedProfitLoss,
  });

  if (transactionError) {
    await restorePositionSnapshot(user.id, quote.entityType, quote.entityId, previousPositionSnapshot);
    await restoreAccountBalance(user.id, account.atlasCreditsBalance, account.totalInvestedCredits);
    throw newErrorFromSupabase(transactionError, "Failed to record sell transaction.");
  }

  const [positions, transactions] = await Promise.all([getOwnMarketPositions(), getOwnMarketTransactions()]);
  await awardMarketBadges(user.id, positions, transactions);
  await syncBadgeProgressForCurrentUser();
}
