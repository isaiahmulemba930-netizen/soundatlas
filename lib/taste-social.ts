"use client";

import { areUsersMutualFollowers } from "@/lib/follows";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { TasteComparison, TasteEntityEntry, TasteMatchType } from "@/lib/taste-matchmaking";

export type CollaborativePlaylistType =
  | "shared-favorites"
  | "discover-from-each-other"
  | "best-blend"
  | "debate-playlist";

export type CollaborativePlaylist = {
  id: string;
  createdByUserId: string;
  userAId: string;
  userBId: string;
  playlistType: CollaborativePlaylistType;
  title: string;
  description: string | null;
  sourceMatchScore: number | null;
  sourceMatchType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CollaborativePlaylistTrack = {
  id: string;
  playlistId: string;
  addedByUserId: string;
  trackId: string;
  trackName: string;
  artistName: string;
  albumName: string | null;
  artworkUrl: string | null;
  note: string | null;
  sourceReason: string | null;
  positionIndex: number;
  createdAt: string;
};

export type TasteDebate = {
  id: string;
  createdByUserId: string;
  otherUserId: string;
  prompt: string;
  subjectType: "song" | "album" | "artist" | "general";
  subjectId: string | null;
  subjectName: string;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  messages: TasteDebateMessage[];
  agreeCount: number;
  disagreeCount: number;
  moodLabel: "Hot take" | "Popular opinion" | "Split decision";
  viewerReaction: "agree" | "disagree" | null;
};

export type TasteDebateMessage = {
  id: string;
  debateId: string;
  userId: string;
  body: string;
  createdAt: string;
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

function normalizeUserPair(firstUserId: string, secondUserId: string) {
  return firstUserId < secondUserId
    ? { userAId: firstUserId, userBId: secondUserId }
    : { userAId: secondUserId, userBId: firstUserId };
}

function getPlaylistSeedTracks(type: CollaborativePlaylistType, comparison: TasteComparison) {
  const shared = comparison.sharedSongs.slice(0, 4);
  const fromThem = comparison.recommendationsFromThem.slice(0, 4);
  const forThem = comparison.recommendationsForThem.slice(0, 4);

  if (type === "shared-favorites") {
    return shared.map((track) => ({ ...track, sourceReason: "Built from your shared taste" }));
  }

  if (type === "discover-from-each-other") {
    return [...fromThem, ...forThem].map((track) => ({
      ...track,
      sourceReason: "Generated from your compatibility",
    }));
  }

  if (type === "debate-playlist") {
    return [...shared.slice(0, 2), ...fromThem.slice(0, 2), ...forThem.slice(0, 2)].map((track) => ({
      ...track,
      sourceReason: "Pulled together for your debate lane",
    }));
  }

  return [...shared.slice(0, 3), ...fromThem.slice(0, 2), ...forThem.slice(0, 2)].map((track) => ({
    ...track,
    sourceReason: "Best blend of both users' taste",
  }));
}

function playlistTitle(type: CollaborativePlaylistType, otherName: string) {
  if (type === "shared-favorites") return `Shared Favorites with ${otherName}`;
  if (type === "discover-from-each-other") return `Discover From Each Other`;
  if (type === "debate-playlist") return `Debate Playlist`;
  return `Best Blend with ${otherName}`;
}

function debateMoodLabel(agreeCount: number, disagreeCount: number) {
  if (Math.abs(agreeCount - disagreeCount) <= 1) {
    return "Split decision";
  }

  if (disagreeCount > agreeCount) {
    return "Hot take";
  }

  return "Popular opinion";
}

export async function canTasteUsersCollaborate(otherUserId: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return false;
  }

  return areUsersMutualFollowers(user.id, otherUserId);
}

export async function getCollaborativePlaylistsForUserPair(otherUserId: string) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [] as Array<CollaborativePlaylist & { tracks: CollaborativePlaylistTrack[] }>;
  }

  const pair = normalizeUserPair(user.id, otherUserId);
  const { data: playlists, error } = await client
    .from("collaborative_playlists")
    .select("*")
    .eq("user_a_id", pair.userAId)
    .eq("user_b_id", pair.userBId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const playlistIds = (playlists ?? []).map((playlist) => playlist.id);
  const { data: tracks, error: tracksError } = playlistIds.length
    ? await client
        .from("collaborative_playlist_tracks")
        .select("*")
        .in("playlist_id", playlistIds)
        .order("position_index", { ascending: true })
    : { data: [], error: null as null };

  if (tracksError) {
    throw tracksError;
  }

  const tracksByPlaylist = new Map<string, CollaborativePlaylistTrack[]>();
  (tracks ?? []).forEach((track) => {
    const next = tracksByPlaylist.get(track.playlist_id) ?? [];
    next.push({
      id: track.id,
      playlistId: track.playlist_id,
      addedByUserId: track.added_by_user_id,
      trackId: track.track_id,
      trackName: track.track_name,
      artistName: track.artist_name,
      albumName: track.album_name,
      artworkUrl: track.artwork_url,
      note: track.note,
      sourceReason: track.source_reason,
      positionIndex: track.position_index,
      createdAt: track.created_at,
    });
    tracksByPlaylist.set(track.playlist_id, next);
  });

  return (playlists ?? []).map((playlist) => ({
    id: playlist.id,
    createdByUserId: playlist.created_by_user_id,
    userAId: playlist.user_a_id,
    userBId: playlist.user_b_id,
    playlistType: playlist.playlist_type,
    title: playlist.title,
    description: playlist.description,
    sourceMatchScore: playlist.source_match_score,
    sourceMatchType: playlist.source_match_type,
    createdAt: playlist.created_at,
    updatedAt: playlist.updated_at,
    tracks: tracksByPlaylist.get(playlist.id) ?? [],
  }));
}

export async function createCollaborativePlaylist(
  otherUserId: string,
  otherName: string,
  comparison: TasteComparison,
  playlistType: CollaborativePlaylistType
) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Log in to create a collaborative playlist.");
  }

  const mutual = await areUsersMutualFollowers(user.id, otherUserId);
  if (!mutual) {
    throw new Error("Collaborative playlists unlock once you mutually follow each other.");
  }

  const pair = normalizeUserPair(user.id, otherUserId);
  const { data: playlist, error } = await client
    .from("collaborative_playlists")
    .insert({
      created_by_user_id: user.id,
      user_a_id: pair.userAId,
      user_b_id: pair.userBId,
      playlist_type: playlistType,
      title: playlistTitle(playlistType, otherName),
      description:
        playlistType === "shared-favorites"
          ? "Built from your shared taste."
          : playlistType === "discover-from-each-other"
            ? "Generated from your compatibility."
            : playlistType === "debate-playlist"
              ? "Pulled together from the overlap and friction in your taste."
              : "A blend of the songs you both keep orbiting.",
      source_match_score: comparison.compatibilityScore,
      source_match_type: comparison.matchType,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const seedTracks = getPlaylistSeedTracks(playlistType, comparison);
  if (seedTracks.length > 0) {
    const { error: tracksError } = await client.from("collaborative_playlist_tracks").insert(
      seedTracks.map((track, index) => ({
        playlist_id: playlist.id,
        added_by_user_id: user.id,
        track_id: track.id ?? `${playlistType}-${index}`,
        track_name: track.name,
        artist_name: track.artistName ?? "Unknown artist",
        album_name: null,
        artwork_url: track.artworkUrl ?? null,
        source_reason: track.sourceReason ?? "Generated from your compatibility",
        position_index: index,
      }))
    );

    if (tracksError) {
      throw tracksError;
    }
  }

  return playlist.id as string;
}

export async function addCollaborativePlaylistTrack(
  playlistId: string,
  track: { trackId: string; trackName: string; artistName: string; albumName?: string | null; artworkUrl?: string | null; note?: string | null }
) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Log in to edit a collaborative playlist.");
  }

  const { count } = await client
    .from("collaborative_playlist_tracks")
    .select("*", { head: true, count: "exact" })
    .eq("playlist_id", playlistId);

  const { error } = await client.from("collaborative_playlist_tracks").insert({
    playlist_id: playlistId,
    added_by_user_id: user.id,
    track_id: track.trackId,
    track_name: track.trackName,
    artist_name: track.artistName,
    album_name: track.albumName ?? null,
    artwork_url: track.artworkUrl ?? null,
    note: track.note ?? null,
    position_index: count ?? 0,
  });

  if (error) {
    throw error;
  }
}

export async function removeCollaborativePlaylistTrack(trackId: string) {
  const client = getSupabaseClient();
  const { error } = await client.from("collaborative_playlist_tracks").delete().eq("id", trackId);

  if (error) {
    throw error;
  }
}

export async function moveCollaborativePlaylistTrack(trackId: string, playlistId: string, nextPosition: number) {
  const client = getSupabaseClient();
  const { data: tracks, error } = await client
    .from("collaborative_playlist_tracks")
    .select("id")
    .eq("playlist_id", playlistId)
    .order("position_index", { ascending: true });

  if (error) {
    throw error;
  }

  const reordered = (tracks ?? []).map((track) => track.id);
  const currentIndex = reordered.indexOf(trackId);
  if (currentIndex === -1) {
    return;
  }

  reordered.splice(currentIndex, 1);
  reordered.splice(Math.max(0, Math.min(nextPosition, reordered.length)), 0, trackId);

  await Promise.all(
    reordered.map((id, index) =>
      client.from("collaborative_playlist_tracks").update({ position_index: index }).eq("id", id)
    )
  );
}

export async function getTasteDebatesForUserPair(otherUserId: string) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    return [] as TasteDebate[];
  }

  const { data: debates, error } = await client
    .from("taste_debates")
    .select("*")
    .or(`and(created_by_user_id.eq.${user.id},other_user_id.eq.${otherUserId}),and(created_by_user_id.eq.${otherUserId},other_user_id.eq.${user.id})`)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const debateIds = (debates ?? []).map((debate) => debate.id);
  const [{ data: messages }, { data: votes }] = await Promise.all([
    debateIds.length
      ? client.from("taste_debate_messages").select("*").in("debate_id", debateIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    debateIds.length
      ? client.from("taste_debate_votes").select("*").in("debate_id", debateIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const messagesByDebate = new Map<string, TasteDebateMessage[]>();
  (messages ?? []).forEach((message) => {
    const next = messagesByDebate.get(message.debate_id) ?? [];
    next.push({
      id: message.id,
      debateId: message.debate_id,
      userId: message.user_id,
      body: message.body,
      createdAt: message.created_at,
    });
    messagesByDebate.set(message.debate_id, next);
  });

  const votesByDebate = new Map<string, Array<{ user_id: string; reaction: "agree" | "disagree" }>>();
  (votes ?? []).forEach((vote) => {
    const next = votesByDebate.get(vote.debate_id) ?? [];
    next.push({ user_id: vote.user_id, reaction: vote.reaction });
    votesByDebate.set(vote.debate_id, next);
  });

  return (debates ?? []).map((debate) => {
    const debateVotes = votesByDebate.get(debate.id) ?? [];
    const agreeCount = debateVotes.filter((vote) => vote.reaction === "agree").length;
    const disagreeCount = debateVotes.filter((vote) => vote.reaction === "disagree").length;

    return {
      id: debate.id,
      createdByUserId: debate.created_by_user_id,
      otherUserId: debate.other_user_id,
      prompt: debate.prompt,
      subjectType: debate.subject_type,
      subjectId: debate.subject_id,
      subjectName: debate.subject_name,
      status: debate.status,
      createdAt: debate.created_at,
      updatedAt: debate.updated_at,
      messages: messagesByDebate.get(debate.id) ?? [],
      agreeCount,
      disagreeCount,
      moodLabel: debateMoodLabel(agreeCount, disagreeCount),
      viewerReaction: debateVotes.find((vote) => vote.user_id === user.id)?.reaction ?? null,
    } satisfies TasteDebate;
  });
}

export async function createTasteDebate(input: {
  otherUserId: string;
  prompt: string;
  subjectType: "song" | "album" | "artist" | "general";
  subjectId?: string | null;
  subjectName: string;
  openingBody: string;
}) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Log in to start a debate.");
  }

  const mutual = await areUsersMutualFollowers(user.id, input.otherUserId);
  if (!mutual) {
    throw new Error("Debates unlock once you mutually follow each other.");
  }

  const { data: debate, error } = await client
    .from("taste_debates")
    .insert({
      created_by_user_id: user.id,
      other_user_id: input.otherUserId,
      prompt: input.prompt.trim(),
      subject_type: input.subjectType,
      subject_id: input.subjectId ?? null,
      subject_name: input.subjectName.trim(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: messageError } = await client.from("taste_debate_messages").insert({
    debate_id: debate.id,
    user_id: user.id,
    body: input.openingBody.trim(),
  });

  if (messageError) {
    throw messageError;
  }

  return debate.id as string;
}

export async function addTasteDebateMessage(debateId: string, body: string) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Log in to join the debate.");
  }

  const trimmed = body.trim();
  if (trimmed.length < 12) {
    throw new Error("Write at least 12 characters so the response feels real.");
  }

  const { error } = await client.from("taste_debate_messages").insert({
    debate_id: debateId,
    user_id: user.id,
    body: trimmed,
  });

  if (error) {
    throw error;
  }
}

export async function voteTasteDebate(debateId: string, reaction: "agree" | "disagree") {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Log in to react to the debate.");
  }

  const { error } = await client.from("taste_debate_votes").upsert(
    {
      debate_id: debateId,
      user_id: user.id,
      reaction,
    },
    { onConflict: "debate_id,user_id" }
  );

  if (error) {
    throw error;
  }
}

export async function reportTasteDebate(debateId: string, reason: string) {
  const client = getSupabaseClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Log in to report a debate.");
  }

  const trimmed = reason.trim();
  if (trimmed.length < 8) {
    throw new Error("Add a short reason so the report is useful.");
  }

  const { error } = await client.from("taste_debate_reports").upsert(
    {
      debate_id: debateId,
      reporter_user_id: user.id,
      reason: trimmed,
    },
    { onConflict: "debate_id,reporter_user_id" }
  );

  if (error) {
    throw error;
  }
}

export function buildDebatePromptFromComparison(comparison: TasteComparison) {
  const disagreement = comparison.ratingsDisagree[0];
  if (disagreement) {
    return {
      prompt: `You disagree on ${disagreement.entityName}`,
      subjectType: disagreement.entityType as "song" | "album" | "artist",
      subjectName: disagreement.entityName,
      openingBody: `I keep coming back to ${disagreement.entityName} because it hits harder for me than my score alone suggests. Here's why I stand by it.`,
    };
  }

  const sharedArtist = comparison.sharedArtists[0];
  if (sharedArtist) {
    return {
      prompt: `Best project from ${sharedArtist.name}?`,
      subjectType: "artist" as const,
      subjectName: sharedArtist.name,
      openingBody: `${sharedArtist.name} is clearly in both of our worlds, but I think the conversation around their best work still deserves a real debate.`,
    };
  }

  return {
    prompt: "What is the strongest bridge between your tastes?",
    subjectType: "general" as const,
    subjectName: "Taste bridge",
    openingBody: "We overlap enough to have a real conversation, but our differences are exactly what make this debate interesting.",
  };
}

