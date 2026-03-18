"use client";

export type ProfileData = {
  displayName: string;
  username: string;
  bio: string;
  favoriteGenres: string;
  favoriteArtist: string;
};

export const defaultProfile: ProfileData = {
  displayName: "",
  username: "",
  bio: "",
  favoriteGenres: "",
  favoriteArtist: "",
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function getRatingStats() {
  if (!isBrowser()) {
    return { artist: 0, album: 0, song: 0, total: 0 };
  }

  let artist = 0;
  let album = 0;
  let song = 0;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index) || "";
    if (key.startsWith("artist-rating-")) artist += 1;
    if (key.startsWith("album-rating-")) album += 1;
    if (key.startsWith("song-rating-")) song += 1;
  }

  return {
    artist,
    album,
    song,
    total: artist + album + song,
  };
}
