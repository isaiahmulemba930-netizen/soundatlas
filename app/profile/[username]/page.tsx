"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  areUsersMutualFollowers,
  followUser,
  getAuthenticatedUser,
  getFollowCounts,
  getFollowers,
  getFollowing,
  getProfileByUsername,
  isFollowingUser,
  PublicProfile,
  unfollowUser,
} from "@/lib/follows";
import { getOrCreateDirectConversation } from "@/lib/messages";
import { getPublicReviewsByUser, OwnedReview } from "@/lib/reviews";

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = typeof params?.username === "string" ? decodeURIComponent(params.username) : "";

  const [viewer, setViewer] = useState<User | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<PublicProfile[]>([]);
  const [following, setFollowing] = useState<PublicProfile[]>([]);
  const [publicReviews, setPublicReviews] = useState<OwnedReview[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [canMessage, setCanMessage] = useState(false);
  const [isOpeningMessage, setIsOpeningMessage] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!username) {
        if (!isMounted) return;
        setError("That profile could not be found.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [currentViewer, targetProfile] = await Promise.all([
          getAuthenticatedUser(),
          getProfileByUsername(username),
        ]);

        if (!isMounted) return;

        setViewer(currentViewer);

        if (!targetProfile) {
          setProfile(null);
          setError("That profile could not be found.");
          setIsLoading(false);
          return;
        }

        setProfile(targetProfile);

        const [counts, nextFollowers, nextFollowing, viewerFollows, mutualFollow, reviews] = await Promise.all([
          getFollowCounts(targetProfile.user_id),
          getFollowers(targetProfile.user_id),
          getFollowing(targetProfile.user_id),
          currentViewer ? isFollowingUser(currentViewer.id, targetProfile.user_id) : Promise.resolve(false),
          currentViewer
            ? areUsersMutualFollowers(currentViewer.id, targetProfile.user_id)
            : Promise.resolve(false),
          getPublicReviewsByUser(targetProfile.user_id, 10),
        ]);

        if (!isMounted) return;

        setFollowerCount(counts.followerCount);
        setFollowingCount(counts.followingCount);
        setFollowers(nextFollowers);
        setFollowing(nextFollowing);
        setPublicReviews(reviews);
        setIsFollowing(viewerFollows);
        setCanMessage(mutualFollow);
        setError("");
      } catch (loadError) {
        if (!isMounted) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this profile right now."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [username]);

  const isOwnProfile = Boolean(viewer && profile && viewer.id === profile.user_id);

  const initials = useMemo(() => {
    const source = profile?.display_name?.trim() || profile?.username?.trim() || "SA";
    const parts = source.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [profile]);

  const publicRatingSummary = useMemo(() => {
    const ratedReviews = publicReviews.filter((review) => typeof review.rating === "number" && review.rating > 0);
    const averageRating =
      ratedReviews.length > 0
        ? ratedReviews.reduce((total, review) => total + (review.rating ?? 0), 0) / ratedReviews.length
        : null;

    return {
      averageRating,
      ratedCount: ratedReviews.length,
      songCount: ratedReviews.filter((review) => review.entity_type === "song").length,
      albumCount: ratedReviews.filter((review) => review.entity_type === "album").length,
      artistCount: ratedReviews.filter((review) => review.entity_type === "artist").length,
    };
  }, [publicReviews]);

  async function handleFollowToggle() {
    if (!profile) return;

    if (!viewer) {
      setError("Log in to follow people.");
      return;
    }

    if (viewer.id === profile.user_id) {
      return;
    }

    setIsUpdatingFollow(true);
    setError("");

    const nextIsFollowing = !isFollowing;
    setIsFollowing(nextIsFollowing);
    setFollowerCount((count) => Math.max(0, count + (nextIsFollowing ? 1 : -1)));

    try {
      if (nextIsFollowing) {
        await followUser(viewer, profile.user_id);
      } else {
        await unfollowUser(viewer, profile.user_id);
      }

      const [counts, nextFollowers] = await Promise.all([
        getFollowCounts(profile.user_id),
        getFollowers(profile.user_id),
      ]);

      setFollowerCount(counts.followerCount);
      setFollowingCount(counts.followingCount);
      setFollowers(nextFollowers);
      setCanMessage(await areUsersMutualFollowers(viewer.id, profile.user_id));
    } catch (followError) {
      setIsFollowing(!nextIsFollowing);
      setFollowerCount((count) => Math.max(0, count + (nextIsFollowing ? -1 : 1)));
      setError(
        followError instanceof Error
          ? followError.message
          : "Unable to update follow state right now."
      );
    } finally {
      setIsUpdatingFollow(false);
    }
  }

  async function handleMessageClick() {
    if (!viewer || !profile) return;

    setIsOpeningMessage(true);
    setError("");

    try {
      const conversation = await getOrCreateDirectConversation(profile.user_id);
      window.location.href = `/messages/${conversation.id}`;
    } catch (messageError) {
      setError(
        messageError instanceof Error
          ? messageError.message
          : "Unable to open this conversation right now."
      );
    } finally {
      setIsOpeningMessage(false);
    }
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">
              {profile?.display_name || profile?.username || "Profile"}
            </h1>
            <p className="mt-3 text-[var(--text-soft)]">
              @{profile?.username || username || "unknown"}
            </p>
          </div>
          {profile && !isOwnProfile ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={isUpdatingFollow}
                className="solid-button"
              >
                {isUpdatingFollow ? "Updating..." : isFollowing ? "Unfollow" : "Follow"}
              </button>
              {viewer && canMessage ? (
                <button
                  type="button"
                  onClick={handleMessageClick}
                  disabled={isOpeningMessage}
                  className="ghost-button"
                >
                  {isOpeningMessage ? "Opening..." : "Message"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="kicker">Profile</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border-main)] bg-[rgba(255,255,255,0.04)] text-2xl font-bold">
                  {initials}
                </div>
                <div>
                  <h2 className="text-3xl font-bold">
                    {profile?.display_name || profile?.username || "Unknown user"}
                  </h2>
                  <p className="mt-1 text-[var(--text-soft)]">
                    @{profile?.username || "unknown"}
                  </p>
                </div>
              </div>

              <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--text-soft)]">
                {isLoading
                  ? "Loading profile..."
                  : profile?.bio ||
                    "Follow this profile to keep track of the people shaping the conversation around music on SoundAtlas."}
              </p>

              {error ? (
                <p className="mt-4 text-sm text-[#ff9f86]">{error}</p>
              ) : null}

              <div className="meta-grid mt-6">
                <div className="app-panel p-4">
                  <p className="kicker">Favorite genres</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    {profile?.favorite_genres || "Not set yet"}
                  </p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Favorite artist</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    {profile?.favorite_artist || "Not set yet"}
                  </p>
                </div>
              </div>
            </div>

            <div className="app-panel p-6">
              <p className="kicker">Social</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-3xl font-bold">{followerCount}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">Followers</p>
                </div>
                <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-3xl font-bold">{followingCount}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">Following</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="app-panel p-6">
            <h2 className="text-2xl font-bold">Followers</h2>
            <div className="mt-4 space-y-2">
              {followers.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No followers yet.</p>
              ) : (
                followers.map((user) => (
                  <Link
                    key={user.user_id}
                    href={user.username ? `/profile/${user.username}` : "/profile"}
                    className="flex items-center justify-between rounded-[1rem] border px-3 py-3"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <span>{user.display_name || user.username || "Unknown user"}</span>
                    <span className="text-sm text-[var(--text-muted)]">
                      @{user.username || "user"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="app-panel p-6">
            <h2 className="text-2xl font-bold">Following</h2>
            <div className="mt-4 space-y-2">
              {following.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Not following anyone yet.</p>
              ) : (
                following.map((user) => (
                  <Link
                    key={user.user_id}
                    href={user.username ? `/profile/${user.username}` : "/profile"}
                    className="flex items-center justify-between rounded-[1rem] border px-3 py-3"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <span>{user.display_name || user.username || "Unknown user"}</span>
                    <span className="text-sm text-[var(--text-muted)]">
                      @{user.username || "user"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="editorial-panel p-6">
            <p className="kicker">Public reviews</p>
            <h2 className="section-heading mt-3 font-bold">Shared ratings and reviews</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                <p className="kicker">Average rating</p>
                <p className="mt-2 text-3xl font-bold">
                  {publicRatingSummary.averageRating ? publicRatingSummary.averageRating.toFixed(1) : "--"}
                </p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">Across public rated reviews</p>
              </div>
              <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                <p className="kicker">Songs rated</p>
                <p className="mt-2 text-3xl font-bold">{publicRatingSummary.songCount}</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">Public song ratings</p>
              </div>
              <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                <p className="kicker">Albums rated</p>
                <p className="mt-2 text-3xl font-bold">{publicRatingSummary.albumCount}</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">Public album ratings</p>
              </div>
              <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                <p className="kicker">Artists rated</p>
                <p className="mt-2 text-3xl font-bold">{publicRatingSummary.artistCount}</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  {publicRatingSummary.ratedCount} public ratings total
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {publicReviews.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No public reviews yet.
                </p>
              ) : (
                publicReviews.map((review) => (
                  <Link
                    key={review.id}
                    href={`/reviews/${review.id}`}
                    className="block rounded-[1.25rem] border p-4 transition hover:-translate-y-0.5"
                    style={{
                      borderColor: "var(--border-main)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {review.review_title || review.entity_name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm text-[var(--text-muted)]">
                            {review.entity_type === "song"
                              ? `Song review${review.entity_subtitle ? ` on ${review.entity_subtitle}` : ""}`
                              : review.entity_type === "album"
                                ? review.entity_subtitle || "Album review"
                                : review.entity_subtitle || "Artist review"}
                          </p>
                          <span className="pill">public</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-[var(--text-muted)]">
                        <p>{review.rating ? `${review.rating.toFixed(1)} / 5` : "No score"}</p>
                        <p className="mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-soft)]">
                      {review.review_text || "No review text."}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
