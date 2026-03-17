import Link from "next/link";
import { notFound } from "next/navigation";

import { buildAlbumContextSections, buildAlbumWhyItShowsUp } from "@/lib/album-context";
import { getGenreAlbumBySlug } from "@/lib/genre-catalog";
import { getGenreLaneBySlug } from "@/lib/genre-lanes";
import { fetchAlbumLookup, fetchAlbumLookupByCollectionId } from "@/lib/itunes";

export const revalidate = 21600;

type AlbumPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    lane?: string;
    signals?: string;
  }>;
};

function formatReleaseDate(releaseDate: string, fallbackYear = "") {
  if (!releaseDate) {
    return fallbackYear || "Unknown release date";
  }

  const parsed = new Date(releaseDate);

  if (Number.isNaN(parsed.getTime())) {
    return releaseDate;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function parseCollectionId(slug: string) {
  if (!slug.startsWith("itunes-")) {
    return null;
  }

  const parsed = Number(slug.replace("itunes-", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function AlbumDetailPage({ params, searchParams }: AlbumPageProps) {
  const { slug } = await params;
  const { lane: laneSlug, signals } = await searchParams;
  const lane = laneSlug ? getGenreLaneBySlug(laneSlug) : null;
  const matchedTerms = signals ? signals.split("|").filter(Boolean) : lane ? [lane.title] : [];
  const localAlbum = getGenreAlbumBySlug(slug);
  const collectionId = parseCollectionId(slug);

  const liveAlbum = collectionId
    ? await fetchAlbumLookupByCollectionId(collectionId)
    : localAlbum
      ? await fetchAlbumLookup(localAlbum.artist, localAlbum.title)
      : null;

  if (!localAlbum && !liveAlbum) {
    notFound();
  }

  const title = liveAlbum?.title ?? localAlbum?.title ?? "Unknown album";
  const artist = liveAlbum?.artist ?? localAlbum?.artist ?? "Unknown artist";
  const primaryGenre = liveAlbum?.genre || localAlbum?.genre || lane?.title || "";
  const tracklist = liveAlbum?.tracks ?? [];
  const trackCount = tracklist.length;
  const releaseDate = formatReleaseDate(liveAlbum?.releaseDate ?? "", localAlbum?.year ?? "");
  const whyItShowsUp = buildAlbumWhyItShowsUp({
    title,
    artist,
    laneTitle: lane?.title ?? primaryGenre ?? "catalog",
    primaryGenre,
    releaseDate: liveAlbum?.releaseDate ?? localAlbum?.year ?? "",
    trackCount,
    matchedTerms: matchedTerms.length > 0 ? matchedTerms : [primaryGenre || "album lookup"],
    source: collectionId ? "live" : "editorial",
    artistInfo: localAlbum?.artistInfo ?? null,
  });
  const contextSections = buildAlbumContextSections({
    title,
    artist,
    laneTitle: lane?.title ?? primaryGenre ?? "catalog",
    primaryGenre,
    releaseDate: liveAlbum?.releaseDate ?? localAlbum?.year ?? "",
    trackCount,
    matchedTerms: matchedTerms.length > 0 ? matchedTerms : [primaryGenre || "album lookup"],
    source: collectionId ? "live" : "editorial",
    artistInfo: localAlbum?.artistInfo ?? null,
  });

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href={lane ? `/catalog/${lane.slug}` : "/"} className="brand-mark">
              {lane ? `Back To ${lane.title}` : "Back To Home"}
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">{title}</h1>
            <p className="mt-3 text-[var(--text-soft)]">
              {artist} · {primaryGenre || "Genre unavailable"} · {releaseDate}
            </p>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <div
              className="cover-frame aspect-square"
              style={{
                backgroundImage: liveAlbum?.artworkUrl
                  ? `url(${liveAlbum.artworkUrl})`
                  : "linear-gradient(135deg, rgba(30,215,96,0.16), rgba(232,176,75,0.12))",
              }}
            >
              <div className="relative z-10 flex h-full items-end p-5">
                <span className="pill">{lane?.title ?? primaryGenre ?? "Album"}</span>
              </div>
            </div>

            <div>
              <p className="kicker">Why it shows up</p>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
                {whyItShowsUp}
              </p>

              <div className="meta-grid mt-6">
                <div
                  className="rounded-[1.2rem] border p-4"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="kicker">Genre lane</p>
                  <p className="mt-2 text-2xl font-bold">{lane?.title ?? primaryGenre ?? "Unknown"}</p>
                </div>
                <div
                  className="rounded-[1.2rem] border p-4"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="kicker">Release</p>
                  <p className="mt-2 text-2xl font-bold">{releaseDate}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="editorial-panel p-6 md:p-7">
            <p className="kicker">Tracklist</p>
            <h2 className="section-heading mt-3 font-bold">Songs on the record.</h2>

            <div className="mt-6 space-y-3">
              {tracklist.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Tracklist is unavailable from the current lookup, so this page is only showing verified album-level metadata.
                </p>
              ) : (
                tracklist.map((track, index) => (
                  <div
                    key={`${slug}-${track}-${index}`}
                    className="rounded-[1.2rem] border px-4 py-4 text-sm"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <span className="mr-3 text-[var(--text-muted)]">{index + 1}.</span>
                    <span>{track}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="app-panel p-6 md:p-7">
            <p className="kicker">Album context</p>
            <h2 className="section-heading mt-3 font-bold">What gives this album its place.</h2>

            <div className="mt-6 space-y-4">
              {contextSections.map((section) => (
                <div
                  key={`${slug}-${section.label}`}
                  className="rounded-[1.2rem] border p-4"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="kicker">{section.label}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{section.text}</p>
                </div>
              ))}
              {contextSections.length === 0 ? (
                <div
                  className="rounded-[1.2rem] border p-4"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="kicker">Verified metadata only</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                    This page could only confirm release and genre metadata from the live lookup, so it is intentionally avoiding filler beyond those verified details.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
