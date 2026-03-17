"use client";

import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { areUsersMutualFollowers, getProfileByUserId, PublicProfile } from "@/lib/follows";

export type DirectConversation = {
  id: string;
  participant_low_id: string;
  participant_high_id: string;
  created_at: string;
  latest_message_at: string;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type InboxConversation = {
  conversation: DirectConversation;
  otherUser: PublicProfile | null;
  latestMessage: DirectMessage | null;
};

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this deployment yet.");
  }

  return supabase;
}

function getOtherParticipantId(conversation: DirectConversation, currentUserId: string) {
  return conversation.participant_low_id === currentUserId
    ? conversation.participant_high_id
    : conversation.participant_low_id;
}

export async function getOrCreateDirectConversation(otherUserId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("get_or_create_direct_conversation", {
    other_user_id: otherUserId,
  });

  if (error) {
    throw error;
  }

  return data as DirectConversation;
}

export async function getConversationById(conversationId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("direct_conversations")
    .select("id, participant_low_id, participant_high_id, created_at, latest_message_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as DirectConversation | null;
}

export async function getConversationMessages(conversationId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("direct_messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DirectMessage[];
}

export async function sendDirectMessage(currentUser: User, conversationId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Write a message before sending.");
  }

  const client = getSupabaseClient();
  const { error } = await client.from("direct_messages").insert({
    conversation_id: conversationId,
    sender_id: currentUser.id,
    body: trimmed,
  });

  if (error) {
    throw error;
  }
}

export async function getInboxConversations(currentUser: User) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("direct_conversations")
    .select("id, participant_low_id, participant_high_id, created_at, latest_message_at")
    .or(`participant_low_id.eq.${currentUser.id},participant_high_id.eq.${currentUser.id}`)
    .order("latest_message_at", { ascending: false });

  if (error) {
    throw error;
  }

  const conversations = (data ?? []) as DirectConversation[];

  const inboxItems = await Promise.all(
    conversations.map(async (conversation) => {
      const otherUserId = getOtherParticipantId(conversation, currentUser.id);
      const [otherUser, latestMessage] = await Promise.all([
        getProfileByUserId(otherUserId),
        getLatestMessageForConversation(conversation.id),
      ]);

      return {
        conversation,
        otherUser,
        latestMessage,
      } satisfies InboxConversation;
    })
  );

  return inboxItems;
}

export async function getLatestMessageForConversation(conversationId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("direct_messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as DirectMessage | null;
}

export async function getConversationPartner(conversation: DirectConversation, currentUser: User) {
  return getProfileByUserId(getOtherParticipantId(conversation, currentUser.id));
}

export async function canUsersMessageEachOther(currentUserId: string, otherUserId: string) {
  return areUsersMutualFollowers(currentUserId, otherUserId);
}
