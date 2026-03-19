import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { rewardReviewContribution } from "@/lib/music-market-client";

export type ReviewEntityType = "song" | "album" | "artist";
export type ReviewVisibility = "public" | "private";

export const REVIEWS_UPDATED_EVENT = "soundatlas-reviews-updated";

export type PublicReview = {
  id: string;
  entity_type: ReviewEntityType;
  entity_id: string;
  entity_name: string;
  entity_subtitle: string | null;
  entity_href: string;
  artwork_url: string | null;
  review_title: string | null;
  review_text: string;
  rating: number | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  reviewer_user_id: string;
  reviewer_display_name: string | null;
  reviewer_username: string | null;
};

export type OwnedReview = {
  id: string;
  entity_type: ReviewEntityType;
  entity_id: string;
  entity_name: string;
  entity_subtitle: string | null;
  entity_href: string;
  artwork_url: string | null;
  review_title: string | null;
  review_text: string;
  rating: number | null;
  visibility: ReviewVisibility;
  moderation_status: "active" | "hidden" | "removed";
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type ReviewDraftInput = {
  entityType: ReviewEntityType;
  entityId: string;
  entityName: string;
  entitySubtitle?: string | null;
  entityHref: string;
  artworkUrl?: string | null;
  reviewTitle?: string | null;
  reviewText: string;
  rating?: number | null;
  visibility: ReviewVisibility;
};

export type SavedReviewResult = {
  review: OwnedReview;
  rewardCredits: number;
};

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this deployment yet.");
  }

  return supabase;
}

function emitReviewsUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(REVIEWS_UPDATED_EVENT));
}

export function getReviewViewerToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = "soundatlas-review-viewer-token";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const created = globalThis.crypto?.randomUUID?.() ?? `viewer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(storageKey, created);
  return created;
}

export async function getTrendingReviews(limit = 5) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_trending_reviews", { limit_count: limit });

  if (error) {
    throw error;
  }

  return (data ?? []) as PublicReview[];
}

export async function getPublicReviewDetail(reviewId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_public_review_detail", { target_review_id: reviewId });

  if (error) {
    throw error;
  }

  return ((data ?? [])[0] ?? null) as PublicReview | null;
}

export async function recordReviewView(reviewId: string) {
  const client = getSupabaseClient();
  const viewerToken = getReviewViewerToken();
  const { data, error } = await client.rpc("record_review_view", {
    target_review_id: reviewId,
    viewer_token: viewerToken,
  });

  if (error) {
    throw error;
  }

  return Number(data ?? 0);
}

export async function getAuthenticatedReviewUser() {
  const client = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return session?.user ?? null;
}

export async function getCurrentUserReview(entityType: ReviewEntityType, entityId: string) {
  const user = await getAuthenticatedReviewUser();
  if (!user) {
    return null;
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("reviews")
    .select(
      "id, entity_type, entity_id, entity_name, entity_subtitle, entity_href, artwork_url, review_title, review_text, rating, visibility, moderation_status, view_count, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as OwnedReview | null;
}

export async function getOwnRecentReviews(userId: string, limit = 10) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("reviews")
    .select(
      "id, entity_type, entity_id, entity_name, entity_subtitle, entity_href, artwork_url, review_title, review_text, rating, visibility, moderation_status, view_count, created_at, updated_at"
    )
    .eq("user_id", userId)
    .neq("moderation_status", "removed")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as OwnedReview[];
}

export async function getPublicReviewsByUser(userId: string, limit = 10) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("reviews")
    .select(
      "id, entity_type, entity_id, entity_name, entity_subtitle, entity_href, artwork_url, review_title, review_text, rating, visibility, moderation_status, view_count, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("visibility", "public")
    .eq("moderation_status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as OwnedReview[];
}

export async function saveOwnReview(input: ReviewDraftInput) {
  const user = await getAuthenticatedReviewUser();
  if (!user) {
    throw new Error("Log in to publish a review.");
  }

  const client = getSupabaseClient();
  const existing = await getCurrentUserReview(input.entityType, input.entityId);

  const payload = {
    user_id: user.id,
    entity_type: input.entityType,
    entity_id: input.entityId,
    entity_name: input.entityName.trim(),
    entity_subtitle: input.entitySubtitle?.trim() || null,
    entity_href: input.entityHref.trim(),
    artwork_url: input.artworkUrl?.trim() || null,
    review_title: input.reviewTitle?.trim() || null,
    review_text: input.reviewText.trim(),
    rating: input.rating ?? null,
    visibility: input.visibility,
    moderation_status: "active" as const,
  };

  const request = existing
    ? client.from("reviews").update(payload).eq("id", existing.id).select().single()
    : client.from("reviews").insert(payload).select().single();

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  const rewardCredits = await rewardReviewContribution({
    isFirstReview: !existing,
    hasRating: typeof input.rating === "number" && input.rating > 0,
    reviewText: input.reviewText,
    visibility: input.visibility,
    entityType: input.entityType,
    entityId: input.entityId,
  });

  emitReviewsUpdated();
  return {
    review: data as OwnedReview,
    rewardCredits,
  } satisfies SavedReviewResult;
}
