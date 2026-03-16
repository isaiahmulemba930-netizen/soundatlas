"use client";

export type ProfileData = {
  displayName: string;
  username: string;
  bio: string;
  favoriteGenres: string;
  favoriteArtist: string;
};

export type ReviewVisibility = "public" | "private";

type BaseReview = {
  id: string;
  albumId: string;
  albumTitle: string;
  reviewText: string;
  rating: number;
  createdAt: string;
  visibility: ReviewVisibility;
};

export type SavedAlbumReview = BaseReview & {
  kind: "album";
  albumDate: string;
};

export type SavedSongReview = BaseReview & {
  kind: "song";
  songId: string;
  songTitle: string;
  trackNumber: string;
};

export type SavedReview = SavedAlbumReview | SavedSongReview;

export type SocialGraph = {
  followers: string[];
  following: string[];
};

export const SOCIAL_STORAGE_EVENT = "soundatlas-social-updated";

export const defaultProfile: ProfileData = {
  displayName: "",
  username: "",
  bio: "",
  favoriteGenres: "",
  favoriteArtist: "",
};

const PROFILE_KEY = "soundatlas-profile";
const ALBUM_REVIEWS_KEY = "soundatlas-album-reviews";
const SONG_REVIEWS_KEY = "soundatlas-song-reviews";
const FOLLOWERS_KEY = "soundatlas-followers";
const FOLLOWING_KEY = "soundatlas-following";

function isBrowser() {
  return typeof window !== "undefined";
}

function emitSocialUpdate() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(SOCIAL_STORAGE_EVENT));
}

function sortReviews<T extends { createdAt: string }>(reviews: T[]) {
  return reviews.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function parseStoredItems<T>(storageKey: string) {
  if (!isBrowser()) return [] as T[];

  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return [] as T[];

  try {
    return JSON.parse(saved) as T[];
  } catch {
    return [] as T[];
  }
}

function normalizeVisibility(value?: string): ReviewVisibility {
  return value === "private" ? "private" : "public";
}

function normalizeReview<T extends SavedReview>(review: T): T {
  return {
    ...review,
    visibility: normalizeVisibility(review.visibility),
  };
}

function parseSocialNames(storageKey: string) {
  const names = parseStoredItems<string>(storageKey)
    .map((name) => name.trim())
    .filter(Boolean);

  return Array.from(new Set(names));
}

export function getProfile() {
  if (!isBrowser()) return defaultProfile;

  const saved = window.localStorage.getItem(PROFILE_KEY);
  if (!saved) return defaultProfile;

  try {
    return { ...defaultProfile, ...JSON.parse(saved) } as ProfileData;
  } catch {
    return defaultProfile;
  }
}

export function saveProfile(profile: ProfileData) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  emitSocialUpdate();
}

export function getAlbumReviews() {
  return sortReviews(parseStoredItems<SavedAlbumReview>(ALBUM_REVIEWS_KEY).map(normalizeReview));
}

export function saveAlbumReview(review: SavedAlbumReview) {
  if (!isBrowser()) return;

  const reviews = getAlbumReviews().filter((item) => item.albumId !== review.albumId);
  window.localStorage.setItem(
    ALBUM_REVIEWS_KEY,
    JSON.stringify([normalizeReview(review), ...reviews])
  );
  emitSocialUpdate();
}

export function getAlbumReview(albumId: string) {
  return getAlbumReviews().find((review) => review.albumId === albumId) ?? null;
}

export function getSongReviews() {
  return sortReviews(parseStoredItems<SavedSongReview>(SONG_REVIEWS_KEY).map(normalizeReview));
}

export function saveSongReview(review: SavedSongReview) {
  if (!isBrowser()) return;

  const reviews = getSongReviews().filter((item) => item.songId !== review.songId);
  window.localStorage.setItem(
    SONG_REVIEWS_KEY,
    JSON.stringify([normalizeReview(review), ...reviews])
  );
  emitSocialUpdate();
}

export function getSongReview(songId: string) {
  return getSongReviews().find((review) => review.songId === songId) ?? null;
}

export function getRecentReviews() {
  return sortReviews<SavedReview>([...getAlbumReviews(), ...getSongReviews()]);
}

export function getPublicRecentReviews() {
  return getRecentReviews().filter((review) => review.visibility === "public");
}

export function getSocialGraph(): SocialGraph {
  return {
    followers: parseSocialNames(FOLLOWERS_KEY),
    following: parseSocialNames(FOLLOWING_KEY),
  };
}

export function addSocialName(type: keyof SocialGraph, name: string) {
  if (!isBrowser()) return;

  const trimmed = name.trim();
  if (!trimmed) return;

  const storageKey = type === "followers" ? FOLLOWERS_KEY : FOLLOWING_KEY;
  const nextItems = Array.from(new Set([trimmed, ...parseSocialNames(storageKey)]));
  window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
  emitSocialUpdate();
}

export function removeSocialName(type: keyof SocialGraph, name: string) {
  if (!isBrowser()) return;

  const storageKey = type === "followers" ? FOLLOWERS_KEY : FOLLOWING_KEY;
  const nextItems = parseSocialNames(storageKey).filter((item) => item !== name);
  window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
  emitSocialUpdate();
}

export function getRatingStats() {
  if (!isBrowser()) {
    return { artist: 0, album: 0, song: 0, total: 0 };
  }

  let artist = 0;
  let album = 0;
  let song = 0;

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i) || "";
    if (key.startsWith("artist-rating-")) artist++;
    if (key.startsWith("album-rating-")) album++;
    if (key.startsWith("song-rating-")) song++;
  }

  return {
    artist,
    album,
    song,
    total: artist + album + song,
  };
}
