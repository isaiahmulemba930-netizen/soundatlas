"use client";

import { useEffect, useMemo, useState } from "react";

import StarRating from "@/components/StarRating";
import {
  getAuthenticatedReviewUser,
  getCurrentUserReview,
  saveOwnReview,
  type ReviewEntityType,
  type ReviewVisibility,
} from "@/lib/reviews";

type ReviewComposerProps = {
  entityType: ReviewEntityType;
  entityId: string;
  entityName: string;
  entitySubtitle?: string | null;
  entityHref: string;
  artworkUrl?: string | null;
};

export function ReviewComposer({
  entityType,
  entityId,
  entityName,
  entitySubtitle,
  entityHref,
  artworkUrl,
}: ReviewComposerProps) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<ReviewVisibility>("public");
  const [isLoadingReview, setIsLoadingReview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const entityLabel = useMemo(() => {
    if (entityType === "song") return "track";
    if (entityType === "album") return "album";
    return "artist";
  }, [entityType]);

  const ratingStorageKey = useMemo(() => {
    if (entityType === "song") return `song-rating-${entityId}`;
    if (entityType === "album") return `album-rating-${entityId}`;
    return `artist-rating-${entityId}`;
  }, [entityId, entityType]);

  useEffect(() => {
    let isMounted = true;

    async function loadReviewState() {
      try {
        const user = await getAuthenticatedReviewUser();
        if (!isMounted) return;

        setIsSignedIn(Boolean(user));
        setAuthChecked(true);

        if (!user) {
          setIsLoadingReview(false);
          return;
        }

        const existing = await getCurrentUserReview(entityType, entityId);
        if (!isMounted) return;

        if (existing) {
          setReviewTitle(existing.review_title ?? "");
          setReviewText(existing.review_text);
          setRating(existing.rating ?? null);
          setVisibility(existing.visibility);
        }
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load your review right now.");
      } finally {
        if (isMounted) {
          setIsLoadingReview(false);
        }
      }
    }

    void loadReviewState();

    return () => {
      isMounted = false;
    };
  }, [entityId, entityType]);

  async function handleSave() {
    const trimmedReview = reviewText.trim();
    if (!trimmedReview) {
      setError("Write a review before saving.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      await saveOwnReview({
        entityType,
        entityId,
        entityName,
        entitySubtitle,
        entityHref,
        artworkUrl,
        reviewTitle,
        reviewText: trimmedReview,
        rating,
        visibility,
      });

      setMessage(visibility === "public" ? "Your public review is live." : "Your private review was saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your review right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="app-panel p-6 md:p-7">
      <p className="kicker">Reviews</p>
      <h2 className="section-heading mt-3 font-bold">Write your take</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
        Publish a public review for this {entityLabel} or keep it private for your own listening diary.
      </p>

      {!authChecked || isLoadingReview ? (
        <div className="mt-6 animate-pulse space-y-3">
          <div className="h-12 rounded-[1rem] bg-white/8" />
          <div className="h-28 rounded-[1rem] bg-white/8" />
          <div className="h-12 rounded-[1rem] bg-white/8" />
        </div>
      ) : !isSignedIn ? (
        <div
          className="mt-6 rounded-[1.4rem] border p-5"
          style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-sm leading-7 text-[var(--text-soft)]">
            Log in from the homepage to publish reviews and surface them in Trending Reviews.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            <input
              className="app-input"
              value={reviewTitle}
              onChange={(event) => setReviewTitle(event.target.value)}
              placeholder="Review title (optional)"
            />
            <textarea
              className="app-textarea min-h-[180px]"
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              placeholder={`What stands out about this ${entityLabel}? Keep it specific and worth reading.`}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div
              className="rounded-[1.2rem] border p-4"
              style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
            >
              <StarRating
                key={`${ratingStorageKey}-${rating ?? 0}`}
                storageKey={ratingStorageKey}
                label="Your star rating"
                initialValue={rating ?? 0}
                onChange={(value) => setRating(value > 0 ? value : null)}
              />
            </div>

            <div
              className="rounded-[1.2rem] border p-4"
              style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
            >
              <p className="kicker">Visibility</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={visibility === "public" ? "solid-button px-4 py-2" : "ghost-button px-4 py-2"}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={visibility === "private" ? "solid-button px-4 py-2" : "ghost-button px-4 py-2"}
                >
                  Private
                </button>
              </div>
              <p className="mt-3 text-sm text-[var(--text-soft)]">
                {visibility === "public"
                  ? "Eligible for discovery modules like Trending Reviews."
                  : "Saved to your account without public discovery exposure."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleSave} className="solid-button" disabled={isSaving}>
              {isSaving ? "Saving review..." : "Save review"}
            </button>
            {message ? <p className="text-sm text-[var(--accent-green)]">{message}</p> : null}
            {error ? <p className="text-sm text-[#ffb09d]">{error}</p> : null}
          </div>
        </>
      )}
    </div>
  );
}
