"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getTrendingReviews, type PublicReview } from "@/lib/reviews";

function formatEntityType(value: PublicReview["entity_type"]) {
  if (value === "song") return "Song";
  if (value === "album") return "Album";
  return "Artist";
}

function formatReviewer(review: PublicReview) {
  return review.reviewer_display_name?.trim() || review.reviewer_username?.trim() || "SoundAtlas member";
}

function formatSnippet(text: string) {
  const trimmed = text.trim();
  if (trimmed.length <= 180) {
    return trimmed;
  }

  return `${trimmed.slice(0, 177).trimEnd()}...`;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TrendingReviewsSection() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTrendingReviews() {
      try {
        const nextReviews = await getTrendingReviews(5);
        if (!isMounted) return;
        setReviews(nextReviews);
        setError("");
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load trending reviews right now.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTrendingReviews();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="mb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Community discovery</p>
          <h3 className="section-heading mt-2 font-bold">Trending Reviews</h3>
          <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
            The most-opened public reviews across songs, albums, and artists, with recent public writing backfilling the feed when data is still sparse.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="listening-skeleton rounded-[1.8rem] p-5">
              <div className="h-48 rounded-[1.2rem] bg-white/6" />
              <div className="mt-4 h-4 w-20 rounded bg-white/8" />
              <div className="mt-3 h-7 w-3/4 rounded bg-white/8" />
              <div className="mt-4 h-16 rounded bg-white/8" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="app-panel p-6">
          <p className="text-sm leading-7 text-[#ffb09d]">{error}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="editorial-panel p-6 md:p-7">
          <p className="kicker">No public reviews yet</p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
            Public reviews will start appearing here once signed-in members publish song, album, or artist reviews.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {reviews.map((review, index) => (
            <Link
              key={review.id}
              href={`/reviews/${review.id}`}
              className="editorial-panel flex h-full flex-col p-5 transition hover:-translate-y-1"
              style={{
                background:
                  index === 0
                    ? "linear-gradient(180deg, rgba(232,176,75,0.11), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)), rgba(20,23,24,0.92)",
              }}
            >
              <div
                className="aspect-[0.92] rounded-[1.2rem] border bg-cover bg-center"
                style={{
                  borderColor: "var(--border-main)",
                  backgroundImage: review.artwork_url ? `url(${review.artwork_url})` : undefined,
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}
              />
              <div className="mt-4 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <span>{formatEntityType(review.entity_type)}</span>
                <span>{review.view_count} reads</span>
              </div>
              {review.review_title ? <p className="mt-3 text-xl font-bold">{review.review_title}</p> : null}
              <p className="mt-2 text-lg font-semibold">{review.entity_name}</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                {review.entity_subtitle || formatReviewer(review)}
              </p>
              <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{formatSnippet(review.review_text)}</p>
              <div className="mt-auto pt-5 text-sm text-[var(--text-muted)]">
                <p>
                  By {formatReviewer(review)}
                  {review.rating ? ` / ${review.rating.toFixed(1)} out of 5` : ""}
                </p>
                <p className="mt-1">{formatDate(review.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
