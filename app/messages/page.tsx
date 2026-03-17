"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/follows";
import { getInboxConversations, InboxConversation } from "@/lib/messages";

export default function MessagesInboxPage() {
  const [viewer, setViewer] = useState<User | null>(null);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadInbox() {
      try {
        setIsLoading(true);
        const user = await getAuthenticatedUser();

        if (!isMounted) return;

        setViewer(user);

        if (!user) {
          setConversations([]);
          setError("Log in to view your messages.");
          return;
        }

        const inbox = await getInboxConversations(user);

        if (!isMounted) return;

        setConversations(inbox);
        setError("");
      } catch (loadError) {
        if (!isMounted) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your messages right now."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInbox();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Messages</h1>
            <p className="mt-3 text-[var(--text-soft)]">
              Private conversations with people you mutually follow.
            </p>
          </div>
        </div>

        <section className="hero-panel p-6 md:p-8">
          {error ? (
            <p className="text-sm text-[#ff9f86]">{error}</p>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading conversations...</p>
          ) : !viewer ? null : conversations.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No conversations yet. Once you and another user follow each other, you can message from their profile.
            </p>
          ) : (
            <div className="space-y-3">
              {conversations.map(({ conversation, otherUser, latestMessage }) => (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="flex items-center justify-between gap-4 rounded-[1.25rem] border p-4"
                  style={{
                    borderColor: "var(--border-main)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {otherUser?.display_name || otherUser?.username || "Unknown user"}
                    </p>
                    <p className="mt-1 truncate text-sm text-[var(--text-soft)]">
                      {latestMessage?.body || "No messages yet."}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[var(--text-muted)]">
                    <p>@{otherUser?.username || "user"}</p>
                    <p className="mt-1">
                      {latestMessage
                        ? new Date(latestMessage.created_at).toLocaleString()
                        : new Date(conversation.created_at).toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
