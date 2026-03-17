"use client";

import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ProfileData } from "@/lib/social";

export type PublicProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio?: string | null;
  favorite_genres?: string | null;
  favorite_artist?: string | null;
};

export type FollowCounts = {
  followerCount: number;
  followingCount: number;
};

function getSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured for this deployment yet.");
  }

  return supabase;
}

export async function getAuthenticatedUser() {
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

export async function getProfileByUsername(username: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("user_id, username, display_name, bio, favorite_genres, favorite_artist")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PublicProfile | null;
}

export async function getProfileByUserId(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("user_id, username, display_name, bio, favorite_genres, favorite_artist")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PublicProfile | null;
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const client = getSupabaseClient();
  const [{ count: followerCount, error: followersError }, { count: followingCount, error: followingError }] =
    await Promise.all([
      client.from("follows").select("*", { head: true, count: "exact" }).eq("following_id", userId),
      client.from("follows").select("*", { head: true, count: "exact" }).eq("follower_id", userId),
    ]);

  if (followersError) {
    throw followersError;
  }

  if (followingError) {
    throw followingError;
  }

  return {
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

export async function isFollowingUser(viewerId: string, targetUserId: string) {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return false;
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("follows")
    .select("follower_id")
    .eq("follower_id", viewerId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function getProfilesForUserIds(userIds: string[]) {
  if (userIds.length === 0) return [] as PublicProfile[];

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("user_id, username, display_name")
    .in("user_id", userIds);

  if (error) {
    throw error;
  }

  const profiles = (data ?? []) as PublicProfile[];
  const byId = new Map(profiles.map((profile) => [profile.user_id, profile]));

  return userIds
    .map((userId) => byId.get(userId))
    .filter((profile): profile is PublicProfile => Boolean(profile));
}

export async function getFollowers(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return getProfilesForUserIds((data ?? []).map((item) => item.follower_id));
}

export async function getFollowing(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return getProfilesForUserIds((data ?? []).map((item) => item.following_id));
}

export async function followUser(currentUser: User, targetUserId: string) {
  if (currentUser.id === targetUserId) {
    throw new Error("You cannot follow yourself.");
  }

  const client = getSupabaseClient();
  const { error } = await client.from("follows").upsert(
    {
      follower_id: currentUser.id,
      following_id: targetUserId,
    },
    {
      onConflict: "follower_id,following_id",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw error;
  }
}

export async function unfollowUser(currentUser: User, targetUserId: string) {
  const client = getSupabaseClient();
  const { error } = await client
    .from("follows")
    .delete()
    .eq("follower_id", currentUser.id)
    .eq("following_id", targetUserId);

  if (error) {
    throw error;
  }
}

export function profileRecordToProfileData(profile: PublicProfile | null): ProfileData {
  return {
    displayName: profile?.display_name ?? "",
    username: profile?.username ?? "",
    bio: profile?.bio ?? "",
    favoriteGenres: profile?.favorite_genres ?? "",
    favoriteArtist: profile?.favorite_artist ?? "",
  };
}

export async function updateOwnProfile(userId: string, profile: ProfileData) {
  const client = getSupabaseClient();
  const { error } = await client.from("profiles").upsert(
    {
      user_id: userId,
      display_name: profile.displayName.trim() || null,
      username: profile.username.trim() || null,
      bio: profile.bio.trim() || null,
      favorite_genres: profile.favoriteGenres.trim() || null,
      favorite_artist: profile.favoriteArtist.trim() || null,
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    throw error;
  }
}
