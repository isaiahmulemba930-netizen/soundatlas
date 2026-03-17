import Link from "next/link";
import { notFound } from "next/navigation";

import { getGenreLaneAlbums, getGenreLaneBySlug } from "@/lib/genre-lanes";

export const revalidate = 21600;

type CatalogPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatReleaseLine(releaseDate: string) {
  if (!releaseDate) {
    return "Release date unavailable";
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

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { slug } = await params;
  const lane = getGenreLaneBySlug(slug);

  if (!lane) {
    notFound();
  }

  const albums = await getGenreLaneAlbums(lane);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">{lane.title}</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">{lane.subtitle}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
              Refreshes every 6 hours using live album search signals when available
            </p>
          </div>
        </div>

        <section className="grid gap-5">
          {albums.length === 0 ? (
            <div
              className="rounded-[1.4rem] border p-6 text-sm leading-7 text-[var(--text-soft)]"
              style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
            >
              No verified albums could be loaded for this genre lane in the current refresh window. The route is still correct, but the live lookup came back empty this cycle.
            </div>
          ) : null}
          {albums.map((album) => (
            <Link
              key={`${lane.slug}-${album.slug}`}
              href={`${album.href}&signals=${encodeURIComponent(album.matchedTerms.join("|"))}`}
              className="editorial-panel p-5 md:p-6"
            >
              <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                <div
                  className="cover-frame aspect-square"
                  style={{
                    backgroundImage: album.artworkUrl
                      ? `url(${album.artworkUrl})`
                      : "linear-gradient(135deg, rgba(30,215,96,0.16), rgba(232,176,75,0.12))",
                  }}
                >
                  <div className="relative z-10 flex h-full items-end p-4">
                    <span className="pill">{album.source === "live" ? "Live lane" : "Editorial fallback"}</span>
                  </div>
                </div>

                <div>
                  <p className="kicker">{album.genre || lane.title}</p>
                  <h2 className="mt-3 text-3xl font-bold">{album.title}</h2>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{album.artist}</p>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
                    {formatReleaseLine(album.releaseDate)}
                    {album.trackCount ? ` · ${album.trackCount} tracks in the current storefront listing.` : ""}
                  </p>

                  <div
                    className="mt-5 rounded-[1.4rem] border p-4"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <p className="kicker">Why it shows up</p>
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
