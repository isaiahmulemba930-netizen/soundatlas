"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createTasteGroup,
  getMyTasteGroups,
  getPendingTasteGroupInvites,
  respondToTasteGroupInvite,
} from "@/lib/taste-groups";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof getMyTasteGroups>>>([]);
  const [invites, setInvites] = useState<Awaited<ReturnType<typeof getPendingTasteGroupInvites>>>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  async function loadPage() {
    try {
      setIsLoading(true);
      const [nextGroups, nextInvites] = await Promise.all([getMyTasteGroups(), getPendingTasteGroupInvites()]);
      setGroups(nextGroups);
      setInvites(nextInvites);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load groups right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Taste Groups</h1>
            <p className="mt-3 text-[var(--text-soft)]">
              Build small music circles with people you match with.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/taste-matchmaking" className="nav-link">
              Taste Matchmaking
            </Link>
            <Link href="/messages" className="nav-link">
              Messages
            </Link>
          </div>
        </div>

        {error ? (
          <section className="app-panel mb-6 p-6">
            <p className="text-sm text-[#ff9f86]">{error}</p>
          </section>
        ) : null}

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="app-panel p-6">
              <p className="kicker">Create a group</p>
              <input
                className="app-input mt-4"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Late-night album club"
              />
              <textarea
                className="app-textarea mt-4"
                rows={4}
                value={groupDescription}
                onChange={(event) => setGroupDescription(event.target.value)}
                placeholder="What is this group for?"
              />
              <button
                type="button"
                className="solid-button mt-4"
                disabled={isCreating}
                onClick={async () => {
                  setIsCreating(true);
                  try {
                    await createTasteGroup(groupName, groupDescription);
                    setGroupName("");
                    setGroupDescription("");
                    await loadPage();
                  } catch (createError) {
                    setError(createError instanceof Error ? createError.message : "Unable to create the group.");
                  } finally {
                    setIsCreating(false);
                  }
                }}
              >
                {isCreating ? "Creating..." : "Create group"}
              </button>
            </div>

            <div className="editorial-panel p-6">
              <p className="kicker">Pending invites</p>
              <div className="mt-4 space-y-3">
                {invites.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No pending invites right now.</p>
                ) : (
                  invites.map((invite) => (
                    <div key={invite.id} className="rounded-[1rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                      <p className="font-semibold">{invite.groupName}</p>
                      <p className="mt-1 text-sm text-[var(--text-soft)]">
                        Invited by {invite.invitedByProfile?.display_name || invite.invitedByProfile?.username || "SoundAtlas user"}
                      </p>
                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          className="solid-button"
                          onClick={async () => {
                            await respondToTasteGroupInvite(invite.id, true);
                            await loadPage();
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={async () => {
                            await respondToTasteGroupInvite(invite.id, false);
                            await loadPage();
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="app-panel p-6">
          <p className="kicker">Your groups</p>
          {isLoading ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">Loading groups...</p>
          ) : groups.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">No groups yet. Create one or accept an invite to get started.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {groups.map((group) => (
                <div key={group.id} className="rounded-[1rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">{group.name}</p>
                      <p className="mt-1 text-sm text-[var(--text-soft)]">{group.description || "No group description yet."}</p>
                    </div>
                    <span className="pill">{group.members.length} members</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {group.members.map((member) => (
                      <span key={member.userId} className="pill">
                        {member.profile?.display_name || member.profile?.username || "SoundAtlas user"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
