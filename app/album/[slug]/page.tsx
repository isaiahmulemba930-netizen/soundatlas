import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { AlbumListeningTracker } from "@/components/listening/AlbumListeningTracker";
import { ReviewComposer } from "@/components/ReviewComposer";
import { detectMarketFromHeaders } from "@/lib/market";
import { getAlbumDetail } from "@/lib/music-discovery";

export const revalidate = 1800;

type AlbumPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    country?: string;
  }>;
};

function parseCollectionId(slug: string) {
  if (!slug.startsWith("itunes-")) {
    return null;
  }

  const parsed = Number(slug.replace("itunes-", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatReleaseDate(value: string) {
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

function buildTrackHref(trackId: number | null, country: string) {
  if (!trackId) {
    return null;
  }

  return `/track/${trackId}?country=${country}`;
}

export default async function AlbumPage({ params, searchParams }: AlbumPageProps) {
  const { slug } = await params;
  const { country: requestedCountry } = await searchParams;
  const collectionId = parseCollectionId(slug);

  if (!collectionId) {
    notFound();
  }

  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const country = requestedCountry?.toLowerCase() || market.country;
  const album = await getAlbumDetail(collectionId, country);

  if (!album) {
    notFound();
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/discover/albums" className="brand-mark">
              Back To Album Search
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">{album.title}</h1>
            <p className="mt-3 text-[var(--text-soft)]">
              {album.artist} · {formatReleaseDate(album.releaseDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/stats" className="nav-link">
              Stats
            </Link>
            <Link href="/history" className="nav-link">
              History
            </Link>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <div className="cover-frame aspect-square" style={{ backgroundImage: `url(${album.coverArt})` }}>
              <div className="relative z-10 flex h-full items-end p-5">
                <span className="pill">Album</span>
              </div>
            </div>

            <div>
              <p className="kicker">Verified album details</p>
              <div className="meta-grid mt-6">
                <div className="app-panel p-4">
                  <p className="kicker">Genre</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    {album.genres.length > 0 ? album.genres.join(" · ") : "Genre unavailable"}
                  </p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Label</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{album.label || "Label unavailable"}</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Tracklist</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{album.tracklist.length} tracks</p>
                </div>
                <div className="app-panel p-4">
                  <p className="kicker">Chart performance</p>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">
                    {album.chartPerformance || "No current Apple Music chart rank was verified for this market."}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.4rem] border p-5" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
                <p className="kicker">Sourced context</p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  {album.sourcedContext || "No verified public background or reception summary was found from the current trusted sources, so this page is only showing confirmed metadata."}
                </p>
                {album.sourceUrl ? (
                  <a href={album.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent-green)]">
                    Open source
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="editorial-panel p-6 md:p-7">
            <p className="kicker">Tracklist</p>
            <h2 className="section-heading mt-3 font-bold">Verified track list</h2>
            <div className="mt-6 space-y-3">
              {album.tracklist.map((track, index) => (
                <div
                  key={`${track.title}-${index}`}
                  className="rounded-[1.2rem] border px-4 py-4 text-sm"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  {buildTrackHref(track.id, country) ? (
                    <Link
                      href={buildTrackHref(track.id, country) as string}
                      className="block transition hover:text-[var(--accent-green)]"
                    >
                      <span className="mr-3 text-[var(--text-muted)]">{track.trackNumber ?? index + 1}.</span>
                      <span className="font-semibold">{track.title}</span>
                      <span className="ml-3 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Open song page
                      </span>
                    </Link>
                  ) : (
                    <>
                      <span className="mr-3 text-[var(--text-muted)]">{track.trackNumber ?? index + 1}.</span>
                      <span>{track.title}</span>
                      <span className="ml-3 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Song page unavailable
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="app-panel p-6 md:p-7">
            <p className="kicker">Listening history</p>
            <h2 className="section-heading mt-3 font-bold">Track plays from this album</h2>
            <div className="mt-6">
              <AlbumListeningTracker
                albumId={slug}
                albumTitle={album.title}
                artistName={album.artist}
                genre={album.genres[0] ?? null}
                sourcePlatform="itunes"
                tracklist={album.tracklist}
              />
            </div>
          </div>
        </section>

        <section className="mt-6">
          <ReviewComposer
            entityType="album"
            entityId={slug}
            entityName={album.title}
            entitySubtitle={album.artist}
            entityHref={`/album/${slug}${requestedCountry ? `?country=${requestedCountry}` : ""}`}
            artworkUrl={album.coverArt}
          />
        </section>
      </div>
    </main>
  );
}
