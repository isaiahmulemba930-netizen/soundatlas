import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewViewTracker } from "@/components/ReviewViewTracker";
import { getPublicReviewDetail } from "@/lib/reviews";

type ReviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatEntityType(value: "song" | "album" | "artist") {
  if (value === "song") return "Song";
  if (value === "album") return "Album";
  return "Artist";
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const review = await getPublicReviewDetail(id);

  if (!review) {
    notFound();
  }

  const reviewerName = review.reviewer_display_name?.trim() || review.reviewer_username?.trim() || "SoundAtlas member";

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <ReviewViewTracker reviewId={review.id} />
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">
              {review.review_title || review.entity_name}
            </h1>
            <p className="mt-3 text-[var(--text-soft)]">
              {formatEntityType(review.entity_type)} review by {reviewerName}
            </p>
          </div>
        </div>

        <section className="hero-panel p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <div
              className="cover-frame aspect-square"
              style={{ backgroundImage: review.artwork_url ? `url(${review.artwork_url})` : undefined }}
            >
              <div className="relative z-10 flex h-full items-end p-5">
                <span className="pill">{formatEntityType(review.entity_type)}</span>
              </div>
            </div>

            <div>
              <p className="kicker">Public review</p>
              <h2 className="mt-4 text-3xl font-bold">{review.entity_name}</h2>
              {review.entity_subtitle ? <p className="mt-2 text-[var(--text-soft)]">{review.entity_subtitle}</p> : null}

              <div className="meta-grid mt-6">
                <div className="app-panel p-4">
                  <p className="kicker">Reviewer</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{reviewerName}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Reads</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{review.view_count}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Published</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{formatDate(review.created_at)}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Rating</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    {review.rating ? `${review.rating.toFixed(1)} / 5` : "No rating attached"}
                  </p>
                </div>
              </div>

              <div
                className="mt-6 rounded-[1.4rem] border p-5"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="kicker">Review</p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[var(--text-soft)]">{review.review_text}</p>
              </div>

              <div className="mt-6">
                <Link href={review.entity_href} className="solid-button">
                  Open {review.entity_name}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
