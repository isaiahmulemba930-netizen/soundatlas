"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  areUsersMutualFollowers,
  followUser,
  getAuthenticatedUser,
  getProfileByUsername,
  isFollowingUser,
  unfollowUser,
} from "@/lib/follows";
import { getOrCreateDirectConversation } from "@/lib/messages";
import {
  getTasteComparisonByUsername,
  type TasteComparison,
} from "@/lib/taste-matchmaking";
import {
  addCollaborativePlaylistTrack,
  addTasteDebateMessage,
  buildDebatePromptFromComparison,
  canTasteUsersCollaborate,
  createCollaborativePlaylist,
  createTasteDebate,
  getCollaborativePlaylistsForUserPair,
  getTasteDebatesForUserPair,
  moveCollaborativePlaylistTrack,
  removeCollaborativePlaylistTrack,
  reportTasteDebate,
  voteTasteDebate,
  type CollaborativePlaylistType,
  type TasteDebate,
} from "@/lib/taste-social";
import { createSharedTasteGroupInvite } from "@/lib/taste-groups";

export default function TasteComparisonPage() {
  const params = useParams<{ username: string }>();
  const username = typeof params?.username === "string" ? decodeURIComponent(params.username) : "";

  const [comparison, setComparison] = useState<TasteComparison | null>(null);
  const [viewer, setViewer] = useState<Awaited<ReturnType<typeof getAuthenticatedUser>>>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [canMessage, setCanMessage] = useState(false);
  const [playlists, setPlaylists] = useState<Awaited<ReturnType<typeof getCollaborativePlaylistsForUserPair>>>([]);
  const [debates, setDebates] = useState<TasteDebate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState("");
  const [isInvitingGroup, setIsInvitingGroup] = useState(false);
  const [debateReply, setDebateReply] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function loadPage() {
    try {
      setIsLoading(true);
      const [currentViewer, nextComparison, targetProfile] = await Promise.all([
        getAuthenticatedUser(),
        getTasteComparisonByUsername(username),
        getProfileByUsername(username),
      ]);

      setViewer(currentViewer);
      setComparison(nextComparison);

      if (!currentViewer || !targetProfile) {
        setIsFollowing(false);
        setCanMessage(false);
        setPlaylists([]);
        setDebates([]);
        setError("");
        return;
      }

      const [viewerFollows, mutualFollow, canCollaborate] = await Promise.all([
        isFollowingUser(currentViewer.id, targetProfile.user_id),
        areUsersMutualFollowers(currentViewer.id, targetProfile.user_id),
        canTasteUsersCollaborate(targetProfile.user_id),
      ]);

      setIsFollowing(viewerFollows);
      setCanMessage(mutualFollow);

      if (canCollaborate) {
        const [nextPlaylists, nextDebates] = await Promise.all([
          getCollaborativePlaylistsForUserPair(targetProfile.user_id),
          getTasteDebatesForUserPair(targetProfile.user_id),
        ]);
        setPlaylists(nextPlaylists);
        setDebates(nextDebates);
      } else {
        setPlaylists([]);
        setDebates([]);
      }

      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to compare taste right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, [username]);

  const debatePrompt = useMemo(() => (comparison ? buildDebatePromptFromComparison(comparison) : null), [comparison]);

  async function handleFollowToggle() {
    if (!viewer || !comparison?.otherUser) {
      return;
    }

    try {
      if (isFollowing) {
        await unfollowUser(viewer, comparison.otherUser.user_id);
        setIsFollowing(false);
        setCanMessage(false);
      } else {
        await followUser(viewer, comparison.otherUser.user_id);
        setIsFollowing(true);
        setCanMessage(await areUsersMutualFollowers(viewer.id, comparison.otherUser.user_id));
      }
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : "Unable to update follow state.");
    }
  }

  async function handleOpenMessage() {
    if (!comparison?.otherUser) {
      return;
    }

    try {
      const conversation = await getOrCreateDirectConversation(comparison.otherUser.user_id);
      window.location.href = `/messages/${conversation.id}`;
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : "Unable to open messages.");
    }
  }

  async function handleCreatePlaylist(type: CollaborativePlaylistType) {
    if (!comparison) {
      return;
    }

    setIsCreatingPlaylist(type);
    try {
      await createCollaborativePlaylist(
        comparison.otherUser.user_id,
        comparison.otherUser.display_name || comparison.otherUser.username || "this user",
        comparison,
        type
      );
      await loadPage();
    } catch (playlistError) {
      setError(playlistError instanceof Error ? playlistError.message : "Unable to create the playlist.");
    } finally {
      setIsCreatingPlaylist("");
    }
  }

  async function handleStartDebate() {
    if (!comparison || !debatePrompt) {
      return;
    }

    try {
      await createTasteDebate({
        otherUserId: comparison.otherUser.user_id,
        prompt: debatePrompt.prompt,
        subjectType: debatePrompt.subjectType,
        subjectName: debatePrompt.subjectName,
        openingBody: debatePrompt.openingBody,
      });
      await loadPage();
    } catch (debateError) {
      setError(debateError instanceof Error ? debateError.message : "Unable to start the debate.");
    }
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/taste-matchmaking" className="brand-mark">
              Back To Matchmaking
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">
              {comparison?.otherUser.display_name || comparison?.otherUser.username || "Taste comparison"}
            </h1>
            <p className="mt-3 text-[var(--text-soft)]">
              {comparison ? `${comparison.compatibilityScore}% compatibility · ${comparison.matchType}` : "Loading match..."}
            </p>
          </div>
          {comparison?.otherUser ? (
            <div className="flex flex-wrap gap-3">
              <button type="button" className="solid-button" onClick={() => void handleFollowToggle()}>
                {isFollowing ? "Unfollow" : "Follow"}
              </button>
              {canMessage ? (
                <button type="button" className="ghost-button" onClick={() => void handleOpenMessage()}>
                  Message
                </button>
              ) : null}
              {canMessage ? (
                <button
                  type="button"
                  className="ghost-button"
                  disabled={isInvitingGroup}
                  onClick={async () => {
                    if (!comparison) {
                      return;
                    }

                    setIsInvitingGroup(true);
                    try {
                      await createSharedTasteGroupInvite(
                        comparison.otherUser.user_id,
                        comparison.otherUser.display_name || comparison.otherUser.username || "Taste match"
                      );
                      window.location.href = "/groups";
                    } catch (inviteError) {
                      setError(inviteError instanceof Error ? inviteError.message : "Unable to send the group invite.");
                    } finally {
                      setIsInvitingGroup(false);
                    }
                  }}
                >
                  {isInvitingGroup ? "Inviting..." : "Invite to group"}
                </button>
              ) : null}
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  void navigator.clipboard.writeText(window.location.href);
                }}
              >
                Share match
              </button>
            </div>
          ) : null}
        </div>

        {error ? (
          <section className="app-panel mb-6 p-6">
            <p className="text-sm text-[#ff9f86]">{error}</p>
          </section>
        ) : null}

        {isLoading ? (
          <section className="app-panel p-6">
            <p className="text-sm text-[var(--text-muted)]">Breaking down your music identity overlap...</p>
          </section>
        ) : null}

        {comparison ? (
          <>
            <section className="hero-panel mb-6 p-6 md:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <p className="kicker">Compatibility</p>
                  <h2 className="mt-4 text-6xl font-bold">{comparison.compatibilityScore}%</h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-soft)]">{comparison.explanation}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="app-panel p-5">
                    <p className="kicker">Shared artists</p>
                    <p className="mt-3 text-3xl font-bold">{comparison.sharedArtists.length}</p>
                  </div>
                  <div className="app-panel p-5">
                    <p className="kicker">Shared albums</p>
                    <p className="mt-3 text-3xl font-bold">{comparison.sharedAlbums.length}</p>
                  </div>
                  <div className="app-panel p-5">
                    <p className="kicker">Rating agreements</p>
                    <p className="mt-3 text-3xl font-bold">{comparison.ratingsAgree.length}</p>
                  </div>
                  <div className="app-panel p-5">
                    <p className="kicker">Big disagreements</p>
                    <p className="mt-3 text-3xl font-bold">{comparison.ratingsDisagree.length}</p>
                  </div>
                </div>
              </div>
              {canMessage ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/groups" className="ghost-button">
                    Open groups
                  </Link>
                  <button
                    type="button"
                    className="solid-button"
                    disabled={isInvitingGroup}
                    onClick={async () => {
                      setIsInvitingGroup(true);
                      try {
                        await createSharedTasteGroupInvite(
                          comparison.otherUser.user_id,
                          comparison.otherUser.display_name || comparison.otherUser.username || "Taste match"
                        );
                        window.location.href = "/groups";
                      } catch (inviteError) {
                        setError(inviteError instanceof Error ? inviteError.message : "Unable to send the group invite.");
                      } finally {
                        setIsInvitingGroup(false);
                      }
                    }}
                  >
                    {isInvitingGroup ? "Sending invite..." : "Create shared group + invite"}
                  </button>
                </div>
              ) : null}
            </section>

            <section className="mb-6 grid gap-6 xl:grid-cols-2">
              <div className="app-panel p-6">
                <p className="kicker">Shared favorites</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Artists</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {comparison.sharedArtists.map((artist) => <span key={artist.name} className="pill">{artist.name}</span>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Albums</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {comparison.sharedAlbums.map((album) => <span key={album.name} className="pill">{album.name}</span>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Genres</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {comparison.sharedGenres.map((genre) => <span key={genre.name} className="pill">{genre.name}</span>)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="editorial-panel p-6">
                <p className="kicker">Difference map</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-soft)]">
                  {comparison.differenceNotes.length === 0 ? (
                    <p>Your taste profiles are unusually aligned right now.</p>
                  ) : (
                    comparison.differenceNotes.map((note) => <p key={note}>{note}</p>)
                  )}
                </div>
                <div className="mt-5">
                  <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">They like, you might not know yet</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {comparison.recommendationsFromThem.map((item) => <span key={item.name} className="pill">{item.name}</span>)}
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-6 grid gap-6 xl:grid-cols-2">
              <div className="app-panel p-6">
                <p className="kicker">Ratings you agree on</p>
                <div className="mt-4 space-y-3">
                  {comparison.ratingsAgree.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No strong rating overlap yet.</p>
                  ) : (
                    comparison.ratingsAgree.map((item) => (
                      <div key={item.entityName} className="rounded-[1rem] border px-4 py-3" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                        <p className="font-semibold">{item.entityName}</p>
                        <p className="mt-1 text-sm text-[var(--text-soft)]">
                          You: {item.yourRating.toFixed(1)} · Them: {item.theirRating.toFixed(1)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="app-panel p-6">
                <p className="kicker">Ratings you disagree on</p>
                <div className="mt-4 space-y-3">
                  {comparison.ratingsDisagree.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">No big rating split yet.</p>
                  ) : (
                    comparison.ratingsDisagree.map((item) => (
                      <div key={item.entityName} className="rounded-[1rem] border px-4 py-3" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                        <p className="font-semibold">{item.entityName}</p>
                        <p className="mt-1 text-sm text-[var(--text-soft)]">
                          You: {item.yourRating.toFixed(1)} · Them: {item.theirRating.toFixed(1)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="mb-6 grid gap-6 xl:grid-cols-2">
              <div className="app-panel p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="kicker">Collaborative playlists</p>
                    <h2 className="section-heading mt-3 font-bold">Built from your shared taste</h2>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {(["shared-favorites", "discover-from-each-other", "best-blend", "debate-playlist"] as CollaborativePlaylistType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className="ghost-button"
                      disabled={!canMessage || isCreatingPlaylist === type}
                      onClick={() => void handleCreatePlaylist(type)}
                    >
                      {isCreatingPlaylist === type ? "Creating..." : type.replaceAll("-", " ")}
                    </button>
                  ))}
                </div>
                {!canMessage ? (
                  <p className="mt-4 text-sm text-[var(--text-muted)]">
                    Mutual follows unlock collaborative playlists and debates.
                  </p>
                ) : null}
                <div className="mt-5 space-y-4">
                  {playlists.map((playlist) => (
                    <div key={playlist.id} className="rounded-[1rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                      <p className="font-semibold">{playlist.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-soft)]">{playlist.description}</p>
                      <div className="mt-4 space-y-2">
                        {playlist.tracks.map((track, index) => (
                          <div key={track.id} className="flex items-center justify-between gap-3 rounded-[0.9rem] border px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{track.trackName}</p>
                              <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{track.artistName}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="pill"
                                onClick={async () => {
                                  await moveCollaborativePlaylistTrack(track.id, playlist.id, Math.max(0, index - 1));
                                  await loadPage();
                                }}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                className="pill"
                                onClick={async () => {
                                  await moveCollaborativePlaylistTrack(track.id, playlist.id, index + 1);
                                  await loadPage();
                                }}
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                className="pill"
                                onClick={async () => {
                                  await removeCollaborativePlaylistTrack(track.id);
                                  await loadPage();
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {comparison.recommendationsFromThem[0] ? (
                        <button
                          type="button"
                          className="ghost-button mt-4"
                          onClick={async () => {
                            await addCollaborativePlaylistTrack(playlist.id, {
                              trackId: comparison.recommendationsFromThem[0]?.id ?? `${playlist.id}-extra`,
                              trackName: comparison.recommendationsFromThem[0]?.name ?? "Suggested track",
                              artistName: comparison.recommendationsFromThem[0]?.artistName ?? "Unknown artist",
                            });
                            await loadPage();
                          }}
                        >
                          Add one recommendation
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="editorial-panel p-6">
                <p className="kicker">Music debates</p>
                <h2 className="section-heading mt-3 font-bold">Turn overlap and disagreement into conversation</h2>
                {debatePrompt ? (
                  <button type="button" className="solid-button mt-4" disabled={!canMessage} onClick={() => void handleStartDebate()}>
                    Start debate
                  </button>
                ) : null}
                <div className="mt-5 space-y-4">
                  {debates.map((debate) => (
                    <div key={debate.id} className="rounded-[1rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{debate.prompt}</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">{debate.moodLabel}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="pill"
                            onClick={async () => {
                              await voteTasteDebate(debate.id, "agree");
                              await loadPage();
                            }}
                          >
                            Agree {debate.agreeCount}
                          </button>
                          <button
                            type="button"
                            className="pill"
                            onClick={async () => {
                              await voteTasteDebate(debate.id, "disagree");
                              await loadPage();
                            }}
                          >
                            Disagree {debate.disagreeCount}
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {debate.messages.map((message) => (
                          <div key={message.id} className="rounded-[0.9rem] border px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                            <p className="text-sm leading-6 text-[var(--text-soft)]">{message.body}</p>
                          </div>
                        ))}
                      </div>
                      <textarea
                        className="app-textarea mt-4"
                        rows={3}
                        value={debateReply[debate.id] ?? ""}
                        onChange={(event) => setDebateReply((current) => ({ ...current, [debate.id]: event.target.value }))}
                        placeholder="Respond with your take"
                      />
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={async () => {
                            await addTasteDebateMessage(debate.id, debateReply[debate.id] ?? "");
                            setDebateReply((current) => ({ ...current, [debate.id]: "" }));
                            await loadPage();
                          }}
                        >
                          Reply
                        </button>
                        <button type="button" className="pill" onClick={() => void reportTasteDebate(debate.id, "Needs a moderation check.")}>
                          Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
