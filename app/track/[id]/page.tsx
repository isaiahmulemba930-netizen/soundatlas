import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ReviewComposer } from "@/components/ReviewComposer";
import { detectMarketFromHeaders } from "@/lib/market";
import { getTrackDetail } from "@/lib/music-discovery";

type TrackPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    country?: string;
  }>;
};

function formatReleaseDate(value: string | null) {
  if (!value) {
    return "Release date unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDuration(value: number | null) {
  if (!value) {
    return "Duration unavailable";
  }

  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
}

function renderList(values: string[], emptyLabel: string) {
  if (values.length === 0) {
    return emptyLabel;
  }

  return values.join(", ");
}

export default async function TrackPage({ params, searchParams }: TrackPageProps) {
  const { id } = await params;
  const { country: requestedCountry } = await searchParams;
  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const country = requestedCountry?.toLowerCase() || market.country;
  const track = await getTrackDetail(Number(id), country);

  if (!track) {
    notFound();
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/discover/tracks" className="brand-mark">
              Back To Track Search
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">{track.title}</h1>
            <p className="mt-3 text-[var(--text-soft)]">
              {track.artist}
              {track.album ? ` / ${track.album}` : ""}
            </p>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <div className="cover-frame aspect-square" style={{ backgroundImage: `url(${track.coverArt})` }}>
              <div className="relative z-10 flex h-full items-end p-5">
                <span className="pill">Track</span>
              </div>
            </div>

            <div>
              <p className="kicker">Verified track details</p>
              <div className="meta-grid mt-6">
                <div className="app-panel p-4">
                  <p className="kicker">Primary artist</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{track.primaryArtist}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Featured artists</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    {renderList(track.featuredArtists, "No verified featured artists available.")}
                  </p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Album</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{track.album || "Album information unavailable."}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Release date</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{formatReleaseDate(track.releaseDate)}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Duration</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{formatDuration(track.durationMs)}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Genres</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    {renderList(track.genres, "No verified genre data available.")}
                  </p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Label</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{track.label || "No verified label data available."}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Chart performance</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    {track.chartPerformance || "This track is not in the current Apple Music top-song window for this market."}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div
                  className="rounded-[1.4rem] border p-5"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="kicker">Producers</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                    {renderList(track.producers, "No verified producer data available yet.")}
                  </p>
                </div>
                <div
                  className="rounded-[1.4rem] border p-5"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="kicker">Songwriters / credits</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                    {renderList(track.songwriters, "No verified songwriter or work-credit data is available yet.")}
                  </p>
                </div>
              </div>

              <div
                className="mt-6 rounded-[1.4rem] border p-5"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="kicker">Sourced context</p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  {track.sourcedContext ||
                    "No verified public context was found for this track from the current trusted sources, so this page is only showing confirmed metadata."}
                </p>
                {track.sourceUrl ? (
                  <a
                    href={track.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--accent-green)]"
                  >
                    Open source
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6">
          {track.meaning ? (
            <div className="editorial-panel p-6 md:p-7">
              <p className="kicker">Meaning</p>
              <h2 className="section-heading mt-3 font-bold">Song meaning / lyric meaning</h2>
              <div
                className="mt-5 rounded-[1.2rem] border p-5"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {track.meaning.sourceType === "artist_source_backed"
                    ? "Verified artist/source-backed meaning"
                    : "Editorial or database-provided interpretation"}
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">{track.meaning.text}</p>
                {track.meaning.sourceUrl ? (
                  <a
                    href={track.meaning.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-semibold text-[var(--accent-green)]"
                  >
                    Open {track.meaning.sourceName}
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="app-panel p-6 md:p-7">
              <p className="kicker">Meaning</p>
              <h2 className="section-heading mt-3 font-bold">Song meaning / lyric meaning</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                No verified meaning available yet from the current trusted meaning sources.
              </p>
            </div>
          )}
        </section>

        <section className="editorial-panel p-6 md:p-7">
          <p className="kicker">Related listening</p>
          <h2 className="section-heading mt-3 font-bold">Similar songs by {track.primaryArtist}</h2>
          {track.similarSongs.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {track.similarSongs.map((similarSong) => (
                <Link
                  key={similarSong.id}
                  href={similarSong.href}
                  className="rounded-[1.4rem] border p-4 transition hover:-translate-y-1"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <div
                    className="aspect-square rounded-[1rem] bg-cover bg-center"
                    style={{ backgroundImage: `url(${similarSong.coverArt})` }}
                  />
                  <p className="mt-4 text-xl font-semibold">{similarSong.title}</p>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">
                    {similarSong.album} / {formatReleaseDate(similarSong.releaseDate)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{similarSong.reason}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div
              className="mt-6 rounded-[1.4rem] border p-5"
              style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
            >
              <p className="text-sm leading-7 text-[var(--text-soft)]">
                No verified same-artist related songs are available from the current catalog sources for this market yet.
              </p>
            </div>
          )}
        </section>

        <section className="mt-6">
          <ReviewComposer
            entityType="song"
            entityId={id}
            entityName={track.title}
            entitySubtitle={track.artist}
            entityHref={`/track/${id}${requestedCountry ? `?country=${requestedCountry}` : ""}`}
            artworkUrl={track.coverArt}
          />
        </section>
      </div>
    </main>
  );
}
