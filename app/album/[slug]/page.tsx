import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAlbumLookup } from "@/lib/itunes";
import { getGenreAlbumBySlug } from "@/lib/genre-catalog";

type AlbumPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AlbumDetailPage({ params }: AlbumPageProps) {
  const { slug } = await params;
  const album = getGenreAlbumBySlug(slug);

  if (!album) {
    notFound();
  }

  const live = await fetchAlbumLookup(album.artist, album.title);
  const tracklist = live?.tracks ?? [];
  const releaseDate = live?.releaseDate
    ? new Date(live.releaseDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : album.year;

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">{live?.title ?? album.title}</h1>
            <p className="mt-3 text-[var(--text-soft)]">
              {live?.artist ?? album.artist} · {live?.genre || album.genre} · {releaseDate}
            </p>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <div
              className="cover-frame aspect-square"
              style={{
                backgroundImage: live?.artworkUrl
                  ? `url(${live.artworkUrl})`
                  : "linear-gradient(135deg, rgba(30,215,96,0.16), rgba(232,176,75,0.12))",
              }}
            >
              <div className="relative z-10 flex h-full items-end p-5">
                <span className="pill">{album.genre}</span>
              </div>
            </div>

            <div>
              <p className="kicker">Artist overview</p>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
                {album.artistInfo}
              </p>

              <div className="meta-grid mt-6">
                <div
                  className="rounded-[1.2rem] border p-4"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="kicker">Genre</p>
                  <p className="mt-2 text-2xl font-bold">{live?.genre || album.genre}</p>
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
                  Tracklist is unavailable right now, but the album metadata is still live.
                </p>
              ) : (
                tracklist.map((track, index) => (
                  <div
                    key={`${album.slug}-${track}`}
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
            <h2 className="section-heading mt-3 font-bold">Why people keep returning to it.</h2>

            <div className="mt-6 space-y-4">
              <div
                className="rounded-[1.2rem] border p-4"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="kicker">Reputation</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">
                  This album is part of a genre shelf built from records that repeatedly surface in public greatest-albums coverage and long-running fan discussions.
                </p>
              </div>
              <div
                className="rounded-[1.2rem] border p-4"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="kicker">Artist</p>
                <p className="mt-2 text-2xl font-bold">{album.artist}</p>
              </div>
              <div
                className="rounded-[1.2rem] border p-4"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="kicker">Tracks loaded</p>
                <p className="mt-2 text-2xl font-bold">{tracklist.length || "Live lookup needed"}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
