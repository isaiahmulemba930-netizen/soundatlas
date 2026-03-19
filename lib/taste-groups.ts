"use client";

import { areUsersMutualFollowers, getProfileByUserId, type PublicProfile } from "@/lib/follows";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type TasteGroup = {
  id: string;
  createdByUserId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    userId: string;
    role: "owner" | "member";
    joinedAt: string;
    profile: PublicProfile | null;
  }>;
};

export type TasteGroupInvite = {
  id: string;
  groupId: string;
  invitedByUserId: string;
  invitedUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt: string | null;
  groupName: string;
  invitedByProfile: PublicProfile | null;
};

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this deployment yet.");
  }

  return supabase;
}

async function getAuthenticatedUser() {
  const client = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return session?.user ?? null;
}

export async function createTasteGroup(name: string, description?: string | null) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Log in to create a group.");
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 3) {
    throw new Error("Group names should be at least 3 characters.");
  }

  const { data: group, error } = await client
    .from("taste_groups")
    .insert({
      created_by_user_id: user.id,
      name: trimmedName,
      description: description?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: memberError } = await client.from("taste_group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    throw memberError;
  }

  return group.id as string;
}

export async function getMyTasteGroups() {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [] as TasteGroup[];
  }

  const { data: memberships, error } = await client
    .from("taste_group_members")
    .select("group_id")
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  const groupIds = (memberships ?? []).map((item) => item.group_id);
  if (groupIds.length === 0) {
    return [] as TasteGroup[];
  }

  const [{ data: groups, error: groupsError }, { data: members, error: membersError }] = await Promise.all([
    client.from("taste_groups").select("*").in("id", groupIds).order("updated_at", { ascending: false }),
    client.from("taste_group_members").select("*").in("group_id", groupIds).order("joined_at", { ascending: true }),
  ]);

  if (groupsError) {
    throw groupsError;
  }

  if (membersError) {
    throw membersError;
  }

  const userIds = Array.from(new Set((members ?? []).map((member) => member.user_id)));
  const profiles = await Promise.all(userIds.map((userId) => getProfileByUserId(userId)));
  const profileById = new Map(
    profiles.filter((profile): profile is PublicProfile => Boolean(profile)).map((profile) => [profile.user_id, profile])
  );

  return (groups ?? []).map((group) => ({
    id: group.id,
    createdByUserId: group.created_by_user_id,
    name: group.name,
    description: group.description,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    members: (members ?? [])
      .filter((member) => member.group_id === group.id)
      .map((member) => ({
        userId: member.user_id,
        role: member.role,
        joinedAt: member.joined_at,
        profile: profileById.get(member.user_id) ?? null,
      })),
  }));
}

export async function inviteUserToTasteGroup(groupId: string, invitedUserId: string) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Log in to invite someone to a group.");
  }

  const mutual = await areUsersMutualFollowers(user.id, invitedUserId);
  if (!mutual) {
    throw new Error("Group invites only unlock after mutual follows.");
  }

  const { error } = await client.from("taste_group_invites").upsert(
    {
      group_id: groupId,
      invited_by_user_id: user.id,
      invited_user_id: invitedUserId,
      status: "pending",
      responded_at: null,
    },
    { onConflict: "group_id,invited_user_id" }
  );

  if (error) {
    throw error;
  }
}

export async function createSharedTasteGroupInvite(otherUserId: string, otherName: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("Log in to create a shared group.");
  }

  const groupId = await createTasteGroup(`${otherName} + ${user.email?.split("@")[0] || "SoundAtlas"} taste group`, "Built from a taste match.");
  await inviteUserToTasteGroup(groupId, otherUserId);
  return groupId;
}

export async function getPendingTasteGroupInvites() {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [] as TasteGroupInvite[];
  }

  const { data, error } = await client
    .from("taste_group_invites")
    .select("*")
    .eq("invited_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const groupIds = Array.from(new Set((data ?? []).map((invite) => invite.group_id)));
  const inviterIds = Array.from(new Set((data ?? []).map((invite) => invite.invited_by_user_id)));

  const [{ data: groups }, inviters] = await Promise.all([
    groupIds.length ? client.from("taste_groups").select("id, name").in("id", groupIds) : Promise.resolve({ data: [] }),
    Promise.all(inviterIds.map((userId) => getProfileByUserId(userId))),
  ]);

  const groupById = new Map((groups ?? []).map((group) => [group.id, group.name]));
  const inviterById = new Map(
    inviters.filter((profile): profile is PublicProfile => Boolean(profile)).map((profile) => [profile.user_id, profile])
  );

  return (data ?? []).map((invite) => ({
    id: invite.id,
    groupId: invite.group_id,
    invitedByUserId: invite.invited_by_user_id,
    invitedUserId: invite.invited_user_id,
    status: invite.status,
    createdAt: invite.created_at,
    respondedAt: invite.responded_at,
    groupName: groupById.get(invite.group_id) ?? "Taste group",
    invitedByProfile: inviterById.get(invite.invited_by_user_id) ?? null,
  }));
}

export async function respondToTasteGroupInvite(inviteId: string, accept: boolean) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Log in to respond to a group invite.");
  }

  const { data: invite, error: inviteError } = await client
    .from("taste_group_invites")
    .select("*")
    .eq("id", inviteId)
    .eq("invited_user_id", user.id)
    .single();

  if (inviteError) {
    throw inviteError;
  }

  const nextStatus = accept ? "accepted" : "declined";
  const { error: updateError } = await client
    .from("taste_group_invites")
    .update({
      status: nextStatus,
      responded_at: new Date().toISOString(),
    })
    .eq("id", inviteId);

  if (updateError) {
    throw updateError;
  }

  if (accept) {
    const { error: memberError } = await client.from("taste_group_members").upsert(
      {
        group_id: invite.group_id,
        user_id: user.id,
        role: "member",
      },
      { onConflict: "group_id,user_id" }
    );

    if (memberError) {
      throw memberError;
    }
  }
}

