"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeShowcase } from "@/components/badges/BadgeShowcase";
import { getBadgeSnapshotForUser, syncBadgeProgressForCurrentUser, type BadgeSnapshot } from "@/lib/badges";
import {
  defaultProfile,
  getRatingStats,
  ProfileData,
} from "@/lib/social";
import {
  followUser,
  getAuthenticatedUser,
  getFollowers,
  getFollowing,
  getProfileByUserId,
  profileRecordToProfileData,
  PublicProfile,
  searchProfiles,
  unfollowUser,
  updateOwnProfile,
} from "@/lib/follows";
import { getOwnRecentReviews, OwnedReview, REVIEWS_UPDATED_EVENT } from "@/lib/reviews";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [recentReviews, setRecentReviews] = useState<OwnedReview[]>([]);
  const [followers, setFollowers] = useState<PublicProfile[]>([]);
  const [following, setFollowing] = useState<PublicProfile[]>([]);
  const [authUserId, setAuthUserId] = useState("");
  const [authUser, setAuthUser] = useState<Awaited<ReturnType<typeof getAuthenticatedUser>>>(null);
  const [socialError, setSocialError] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState<PublicProfile[]>([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [activeFollowUserId, setActiveFollowUserId] = useState("");
  const [badgeSnapshot, setBadgeSnapshot] = useState<BadgeSnapshot | null>(null);
  const hasLoadedProfile = useRef(false);

  async function refreshSocialStateForUser(userId: string) {
    const [dbProfile, nextFollowers, nextFollowing] = await Promise.all([
      getProfileByUserId(userId),
      getFollowers(userId),
      getFollowing(userId),
    ]);

    setProfile(profileRecordToProfileData(dbProfile));
    hasLoadedProfile.current = true;
    setFollowers(nextFollowers);
    setFollowing(nextFollowing);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSocialState() {
      try {
        const user = await getAuthenticatedUser();
        if (!isMounted) return;

        if (!user) {
          setAuthUser(null);
          setAuthUserId("");
          setFollowers([]);
          setFollowing([]);
          setPeopleResults([]);
          setRecentReviews([]);
          return;
        }

        setAuthUser(user);
        setAuthUserId(user.id);

        if (!isMounted) return;

        await refreshSocialStateForUser(user.id);
        await syncBadgeProgressForCurrentUser();
        const [reviews, badges] = await Promise.all([
          getOwnRecentReviews(user.id, 10),
          getBadgeSnapshotForUser(user.id, { includeProgress: true }),
        ]);
        if (!isMounted) return;
        setRecentReviews(reviews);
        setBadgeSnapshot(badges);
        setSocialError("");
      } catch (error) {
        if (!isMounted) return;

        setSocialError(
          error instanceof Error ? error.message : "Unable to load your social graph right now."
        );
      }
    }

    loadSocialState();
    window.addEventListener(REVIEWS_UPDATED_EVENT, loadSocialState);

    return () => {
      isMounted = false;
      window.removeEventListener(REVIEWS_UPDATED_EVENT, loadSocialState);
    };
  }, []);

  function updateField(field: keyof ProfileData, value: string) {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
  }

  useEffect(() => {
    if (!authUserId || !hasLoadedProfile.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await updateOwnProfile(authUserId, profile);
        setSocialError("");
      } catch (error) {
        setSocialError(
          error instanceof Error ? error.message : "Unable to save your profile right now."
        );
      }
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authUserId, profile]);

  useEffect(() => {
    if (!authUserId) {
      setPeopleResults([]);
      return;
    }

    const trimmed = peopleQuery.trim();
    if (!trimmed) {
      setPeopleResults([]);
      return;
    }

    let isMounted = true;
    setIsSearchingPeople(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchProfiles(trimmed, authUserId);
        if (!isMounted) return;

        setPeopleResults(results);
      } catch (error) {
        if (!isMounted) return;

        setSocialError(
          error instanceof Error ? error.message : "Unable to search for people right now."
        );
      } finally {
        if (isMounted) {
          setIsSearchingPeople(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [authUserId, peopleQuery]);

  async function handleSearchFollowToggle(targetUserId: string, isCurrentlyFollowing: boolean) {
    if (!authUser) {
      setSocialError("Log in to follow people.");
      return;
    }

    setActiveFollowUserId(targetUserId);
    setSocialError("");

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(authUser, targetUserId);
      } else {
        await followUser(authUser, targetUserId);
      }

      await refreshSocialStateForUser(authUser.id);
    } catch (error) {
      setSocialError(
        error instanceof Error ? error.message : "Unable to update follow state right now."
      );
    } finally {
      setActiveFollowUserId("");
    }
  }

  const initials = useMemo(() => {
    const name = profile.displayName.trim();
    if (!name) return "SA";

    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [profile.displayName]);

  const ratingStats = getRatingStats();

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Your profile</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/connections" className="nav-link">
              Platforms
            </Link>
            <Link href="/stats" className="nav-link">
              Stats
            </Link>
            <Link href="/history" className="nav-link">
              History
            </Link>
            {authUserId ? (
              <Link href="/messages" className="nav-link">
                Messages
              </Link>
            ) : null}
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="kicker">Identity</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border-main)] bg-[rgba(255,255,255,0.04)] text-2xl font-bold">
                  {initials}
                </div>
                <div>
                  <h2 className="text-3xl font-bold">
                    {profile.displayName || "Your Name"}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[var(--text-soft)]">
                    <p>@{profile.username || "username"}</p>
                    {badgeSnapshot?.certified ? <span className="pill">Certified</span> : null}
                    {(badgeSnapshot?.pinnedBadges ?? []).slice(0, 3).map((badge) => (
                      <span key={badge.key} className="pill">{badge.icon}</span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--text-soft)]">
                {profile.bio ||
                  "Your profile should read like a music personality, not a settings page. Add a name, a point of view, and the artists you always come back to."}
              </p>

              <div className="meta-grid mt-6">
                <div className="app-panel p-4">
                  <p className="kicker">Favorite genres</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    {profile.favoriteGenres || "Not set yet"}
                  </p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Favorite artist</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    {profile.favoriteArtist || "Not set yet"}
                  </p>
                </div>
                <Link href="/stats" className="app-panel p-4">
                  <p className="kicker">Listening stats</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    Weekly, monthly, yearly, and all-time tracking.
                  </p>
                </Link>
                <Link href="/history" className="app-panel p-4">
                  <p className="kicker">Listening history</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    Every song you&apos;ve listened to, all in one place.
                  </p>
                </Link>
              </div>
            </div>

            <div className="app-panel p-6">
              <p className="kicker">Stats</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-3xl font-bold">{badgeSnapshot?.totalBadgeCount ?? 0}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">Badges earned</p>
                </div>
                <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-3xl font-bold">{followers.length}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">Followers</p>
                </div>
                <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-3xl font-bold">{following.length}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">Following</p>
                </div>
                <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                  <p className="text-3xl font-bold">{ratingStats.song}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">Songs rated</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            {badgeSnapshot ? <BadgeShowcase snapshot={badgeSnapshot} editable /> : null}

            <div className="app-panel p-6">
              <p className="kicker">Edit profile</p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Display name</label>
                  <input className="app-input" value={profile.displayName} onChange={(e) => updateField("displayName", e.target.value)} placeholder="Isaiah" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Username</label>
                  <input className="app-input" value={profile.username} onChange={(e) => updateField("username", e.target.value)} placeholder="isaiahmusic" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Bio</label>
                  <textarea className="app-textarea" rows={5} value={profile.bio} onChange={(e) => updateField("bio", e.target.value)} placeholder="The albums I revisit most say more about me than any playlist ever could." />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Favorite genres</label>
                  <input className="app-input" value={profile.favoriteGenres} onChange={(e) => updateField("favoriteGenres", e.target.value)} placeholder="Hip-Hop, R&B, Alternative" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[var(--text-soft)]">Favorite artist</label>
                  <input className="app-input" value={profile.favoriteArtist} onChange={(e) => updateField("favoriteArtist", e.target.value)} placeholder="Kendrick Lamar" />
                </div>
              </div>
            </div>

            <div className="app-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="kicker">Social graph</p>
                  <p className="mt-3 text-sm text-[var(--text-soft)]">
                    Real follower relationships now come from Supabase instead of local demo data.
                  </p>
                </div>
                {authUserId && profile.username ? (
                  <Link href={`/profile/${profile.username}`} className="ghost-button">
                    View public profile
                  </Link>
                ) : null}
              </div>

              {socialError ? (
                <p className="mt-4 text-sm text-[#ff9f86]">{socialError}</p>
              ) : null}

              <div className="mt-5">
                <h3 className="text-xl font-bold">Find people</h3>
                <div className="field-shell mt-3">
                  <input
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                    placeholder="Search by username or display name"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {isSearchingPeople ? (
                    <p className="text-sm text-[var(--text-muted)]">Searching...</p>
                  ) : peopleQuery.trim() && peopleResults.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No matching users found.</p>
                  ) : (
                    peopleResults.map((user) => {
                      const isCurrentlyFollowing = following.some(
                        (followedUser) => followedUser.user_id === user.user_id
                      );

                      return (
                        <div
                          key={user.user_id}
                          className="flex items-center justify-between gap-4 rounded-[1rem] border px-3 py-3"
                          style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                        >
                          <Link
                            href={user.username ? `/profile/${user.username}` : "/profile"}
                            className="min-w-0 flex-1"
                          >
                            <p className="truncate font-semibold">
                              {user.display_name || user.username || "Unknown user"}
                            </p>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                              @{user.username || "user"}
                            </p>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleSearchFollowToggle(user.user_id, isCurrentlyFollowing)}
                            disabled={activeFollowUserId === user.user_id}
                            className={isCurrentlyFollowing ? "ghost-button" : "solid-button"}
                          >
                            {activeFollowUserId === user.user_id
                              ? "Updating..."
                              : isCurrentlyFollowing
                                ? "Unfollow"
                                : "Follow"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-xl font-bold">Followers</h3>
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

                <div>
                  <h3 className="text-xl font-bold">Following</h3>
                  <div className="mt-4 space-y-2">
                    {following.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">You are not following anyone yet.</p>
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
              </div>
            </div>
          </div>

          <div className="editorial-panel p-6">
            <p className="kicker">Recent reviews</p>
            <h2 className="section-heading mt-3 font-bold">Your listening diary.</h2>

            <div className="mt-6 space-y-4">
              {recentReviews.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No reviews yet. Start with an album you know well and leave a track note if one song really carries the record.
                </p>
              ) : (
                recentReviews.slice(0, 10).map((review) => (
                  <div
                    key={review.id}
                    className="rounded-[1.25rem] border p-4"
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
                          <span className="pill">{review.visibility}</span>
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
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
