"use client";

import Link from "next/link";
import type { TasteMatch } from "@/lib/taste-matchmaking";

export function MatchCard({ match }: { match: TasteMatch }) {
  const initialsSource = match.user.display_name?.trim() || match.user.username?.trim() || "SA";
  const initials = initialsSource
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="app-panel p-5"
      style={{
        background:
          "linear-gradient(180deg, rgba(185,28,28,0.18) 0%, rgba(12,10,10,0.88) 58%, rgba(5,5,5,0.98) 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border-main)] bg-[rgba(255,255,255,0.04)] text-lg font-bold">
            {initials || "SA"}
          </div>
          <div>
            <p className="text-lg font-bold">{match.user.display_name || match.user.username || "SoundAtlas user"}</p>
            <p className="text-sm text-[var(--text-muted)]">@{match.user.username || "user"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{match.compatibilityScore}%</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{match.matchType}</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--text-soft)]">{match.explanation}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {match.sharedArtists.slice(0, 2).map((artist) => (
          <span key={artist} className="pill">
            {artist}
          </span>
        ))}
        {match.sharedGenres.slice(0, 2).map((genre) => (
          <span key={genre} className="pill">
            {genre}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/taste-matchmaking/${encodeURIComponent(match.user.username || "")}`} className="solid-button">
          Compare taste
        </Link>
        <Link href={match.user.username ? `/profile/${encodeURIComponent(match.user.username)}` : "/profile"} className="ghost-button">
          View profile
        </Link>
      </div>
    </div>
  );
}
