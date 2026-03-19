import Link from "next/link";
import { notFound } from "next/navigation";

import { formatGenreAlbumRelease, getGenreLaneData } from "@/lib/genre-signals";

type CatalogPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 1800;

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { slug } = await params;
  const lane = await getGenreLaneData(slug);

  if (!lane) {
    notFound();
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">{lane.genre.title}</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">{lane.genre.description}</p>
            {lane.signalLine ? (
              <p className="mt-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">{lane.signalLine}</p>
            ) : null}
          </div>
        </div>

        <section className="grid gap-5">
          {lane.albums.length === 0 ? (
            <div
              className="rounded-[1.4rem] border p-6 text-sm leading-7 text-[var(--text-soft)]"
              style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
            >
              The latest verified signals for this genre are still refreshing, so there is nothing current enough to surface right now.
            </div>
          ) : null}

          {lane.albums.map((album) => (
            <Link
              key={album.slug}
              href={`${album.href}&signals=${encodeURIComponent(album.matchedTerms.join("|"))}`}
              className="editorial-panel p-5 md:p-6"
            >
              <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                <div
                  className="cover-frame aspect-square"
                  style={{
                    backgroundImage: album.artworkUrl
                      ? `url(${album.artworkUrl})`
                      : "linear-gradient(135deg, rgba(185,41,41,0.2), rgba(89,9,9,0.14))",
                  }}
                >
                  <div className="relative z-10 flex h-full items-end p-4">
                    <span className="pill">{album.genre || lane.genre.title}</span>
                  </div>
                </div>

                <div>
                  <p className="kicker">{album.sourceLabel}</p>
                  <h2 className="mt-3 text-3xl font-bold">{album.title}</h2>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{album.artist}</p>
                  <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                    {formatGenreAlbumRelease(album.releaseDate)}
                    {album.trackCount ? ` · ${album.trackCount} tracks in the current album listing.` : ""}
                  </p>

                  <div
                    className="mt-5 rounded-[1.4rem] border p-4"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <p className="kicker">Why this shows up</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                      {album.whyItShowsUp}
                    </p>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-[var(--accent-green)]">
                    Open album page
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
