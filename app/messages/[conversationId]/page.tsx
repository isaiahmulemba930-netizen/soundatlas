"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/follows";
import {
  canUsersMessageEachOther,
  getConversationById,
  getConversationMessages,
  getConversationPartner,
  sendDirectMessage,
  DirectConversation,
  DirectMessage,
} from "@/lib/messages";
import type { PublicProfile } from "@/lib/follows";

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId =
    typeof params?.conversationId === "string" ? decodeURIComponent(params.conversationId) : "";

  const [viewer, setViewer] = useState<User | null>(null);
  const [conversation, setConversation] = useState<DirectConversation | null>(null);
  const [otherUser, setOtherUser] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [canSend, setCanSend] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadConversation() {
      try {
        setIsLoading(true);

        const user = await getAuthenticatedUser();
        if (!isMounted) return;

        setViewer(user);

        if (!user) {
          setError("Log in to view messages.");
          setConversation(null);
          setMessages([]);
          setOtherUser(null);
          return;
        }

        const loadedConversation = await getConversationById(conversationId);
        if (!isMounted) return;

        if (!loadedConversation) {
          setError("That conversation could not be found.");
          setConversation(null);
          setMessages([]);
          setOtherUser(null);
          return;
        }

        setConversation(loadedConversation);

        const [partner, nextMessages] = await Promise.all([
          getConversationPartner(loadedConversation, user),
          getConversationMessages(loadedConversation.id),
        ]);

        if (!isMounted) return;

        setOtherUser(partner);
        setMessages(nextMessages);
        setCanSend(
          partner ? await canUsersMessageEachOther(user.id, partner.user_id) : false
        );
        setError("");
      } catch (loadError) {
        if (!isMounted) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load this conversation right now."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadConversation();

    pollRef.current = window.setInterval(() => {
      void loadConversation();
    }, 5000);

    return () => {
      isMounted = false;
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, [conversationId]);

  async function handleSendMessage() {
    if (!viewer || !conversation) return;

    setIsSending(true);
    setError("");

    try {
      await sendDirectMessage(viewer, conversation.id, draft);
      const nextMessages = await getConversationMessages(conversation.id);
      setMessages(nextMessages);
      setDraft("");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send your message right now."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/messages" className="brand-mark">
              Back To Inbox
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">
              {otherUser?.display_name || otherUser?.username || "Conversation"}
            </h1>
            <p className="mt-3 text-[var(--text-soft)]">
              @{otherUser?.username || "user"}
            </p>
          </div>
        </div>

        <section className="hero-panel p-6 md:p-8">
          {error ? (
            <p className="mb-4 text-sm text-[#ff9f86]">{error}</p>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading conversation...</p>
          ) : (
            <>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    No messages yet. Start the conversation.
                  </p>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = viewer?.id === message.sender_id;

                    return (
                      <div
                        key={message.id}
                        className={`max-w-[80%] rounded-[1.25rem] border p-4 text-sm leading-6 ${
                          isOwnMessage ? "ml-auto" : ""
                        }`}
                        style={{
                          borderColor: "var(--border-main)",
                          background: isOwnMessage
                            ? "rgba(30,215,96,0.14)"
                            : "rgba(255,255,255,0.03)",
                        }}
                      >
                        <p>{message.body}</p>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-6">
                {!canSend ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    New messages are blocked unless both users still follow each other.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write a message..."
                      className="app-input"
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={isSending}
                      className="solid-button"
                    >
                      {isSending ? "Sending..." : "Send"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
