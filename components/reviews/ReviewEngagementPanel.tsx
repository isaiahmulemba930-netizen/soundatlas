"use client";

import { useEffect, useState } from "react";

import {
  addReviewComment,
  getReviewEngagement,
  toggleReviewLike,
  type ReviewEngagement,
} from "@/lib/reviews";

type ReviewEngagementPanelProps = {
  reviewId: string;
  reviewOwnerUserId: string;
};

export function ReviewEngagementPanel({ reviewId, reviewOwnerUserId }: ReviewEngagementPanelProps) {
  const [engagement, setEngagement] = useState<ReviewEngagement | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEngagement() {
      try {
        const nextEngagement = await getReviewEngagement(reviewId);
        if (!isMounted) {
          return;
        }

        setEngagement(nextEngagement);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(error instanceof Error ? error.message : "Unable to load review engagement right now.");
      }
    }

    void loadEngagement();

    return () => {
      isMounted = false;
    };
  }, [reviewId]);

  async function handleLikeToggle() {
    if (!engagement) {
      return;
    }

    setIsLiking(true);
    setMessage("");

    try {
      const nextEngagement = await toggleReviewLike(reviewId, reviewOwnerUserId, !engagement.viewerHasLiked);
      setEngagement(nextEngagement);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update review like right now.");
    } finally {
      setIsLiking(false);
    }
  }

  async function handleCommentSubmit() {
    setIsCommenting(true);
    setMessage("");

    try {
      const nextEngagement = await addReviewComment({
        reviewId,
        reviewOwnerUserId,
        commentText,
      });
      setEngagement(nextEngagement);
      setCommentText("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add that comment right now.");
    } finally {
      setIsCommenting(false);
    }
  }

  return (
    <section className="app-panel mt-6 p-6 md:p-7">
      <p className="kicker">Community</p>
      <h2 className="section-heading mt-3 font-bold">Likes and comments</h2>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className={engagement?.viewerHasLiked ? "solid-button" : "ghost-button"} onClick={() => void handleLikeToggle()} disabled={isLiking}>
          {isLiking ? "Updating..." : engagement?.viewerHasLiked ? "Liked" : "Like review"}
        </button>
        <p className="text-sm text-[var(--text-soft)]">{engagement?.likeCount ?? 0} likes</p>
      </div>

      <div className="mt-5">
        <textarea
          className="app-textarea min-h-[120px]"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Add a thoughtful reply to this review."
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="solid-button" onClick={() => void handleCommentSubmit()} disabled={isCommenting}>
            {isCommenting ? "Posting..." : "Post comment"}
          </button>
          <p className="text-sm text-[var(--text-soft)]">
            Comments with real effort count toward community badges.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {(engagement?.comments ?? []).length === 0 ? (
          <p className="text-sm text-[var(--text-soft)]">No comments yet.</p>
        ) : (
          engagement?.comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-[1.2rem] border p-4"
              style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
            >
              <p className="font-semibold">{comment.commenter_display_name || comment.commenter_username || "SoundAtlas member"}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {new Date(comment.created_at).toLocaleDateString()}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-soft)]">{comment.comment_text}</p>
            </div>
          ))
        )}
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--text-soft)]">{message}</p> : null}
    </section>
  );
}
