import Link from "next/link";

import type { UpcomingRelease } from "@/lib/upcoming-release-types";

type UpcomingReleaseCardProps = {
  release: UpcomingRelease;
};

export function UpcomingReleaseCard({ release }: UpcomingReleaseCardProps) {
  return (
    <div className="editorial-panel p-4 transition hover:-translate-y-1">
      <div
        className="cover-frame aspect-square"
        style={{
          backgroundImage: release.artworkUrl
            ? `url(${release.artworkUrl})`
            : "linear-gradient(135deg, rgba(232,176,75,0.14), rgba(105,162,255,0.12))",
        }}
      >
        <div className="relative z-10 flex h-full items-start justify-between p-4">
          <span className="pill">{release.releaseType}</span>
          <span className="pill">{release.statusLabel}</span>
        </div>
      </div>

      <div className="mt-4">
        <p className="kicker">{release.artistName}</p>
        <h3 className="mt-2 text-2xl font-bold">{release.releaseTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{release.reason}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{release.sourceLabel}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <span>{release.statusLabel}</span>
          <span>{release.dateLabel}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {release.href ? (
            <Link href={release.href} className="ghost-button">
              Open release
            </Link>
          ) : null}
          {release.sourceUrl ? (
            <a href={release.sourceUrl} target="_blank" rel="noreferrer" className="ghost-button">
              Open source
            </a>
          ) : null}
          <Link href={release.artistHref} className="ghost-button">
            Visit artist
          </Link>
        </div>
      </div>
    </div>
  );
}
