import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ReviewComposer } from "@/components/ReviewComposer";
import { detectMarketFromHeaders } from "@/lib/market";
import { getArtistDetail } from "@/lib/music-discovery";

type ArtistPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    country?: string;
  }>;
};

export default async function ArtistPage({ params, searchParams }: ArtistPageProps) {
  const { id } = await params;
  const { country: requestedCountry } = await searchParams;
  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const country = requestedCountry?.toLowerCase() || market.country;
  const artist = await getArtistDetail(id, country);

  if (!artist) {
    notFound();
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/discover/artists" className="brand-mark">
              Back To Artist Search
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">{artist.name}</h1>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="kicker">Verified biography</p>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
                {artist.biography || "No verified public biography was found from the current trusted sources, so this page is only showing confirmed metadata."}
              </p>
              {artist.sourceUrl ? (
                <a href={artist.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-green)]">
                  Open biography source
                </a>
              ) : null}
            </div>

            <div className="meta-grid">
              <div className="app-panel p-5">
                <p className="kicker">Origin</p>
                <p className="mt-2 text-lg text-[var(--text-soft)]">{artist.origin || "Origin unavailable"}</p>
              </div>
              <div className="app-panel p-5">
                <p className="kicker">Genres</p>
                <p className="mt-2 text-lg text-[var(--text-soft)]">
                  {artist.genres.length > 0 ? artist.genres.join(" · ") : "No verified genre data available."}
                </p>
              </div>
              <div className="app-panel p-5">
                <p className="kicker">Years active</p>
                <p className="mt-2 text-lg text-[var(--text-soft)]">{artist.yearsActive || "Years active unavailable"}</p>
              </div>
              <div className="app-panel p-5">
                <p className="kicker">Current relevance</p>
                <p className="mt-2 text-lg text-[var(--text-soft)]">
                  {artist.currentRelevance || "No verified current chart signal for this market right now."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="editorial-panel p-6 md:p-7">
          <p className="kicker">Catalog overview</p>
          <h2 className="section-heading mt-3 font-bold">Major albums from MusicBrainz</h2>

          <div className="mt-6 space-y-4">
            {artist.majorAlbums.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No verified album list was available from the current source.
              </p>
            ) : (
              artist.majorAlbums.map((album) => (
                <Link
                  key={album.id}
                  href={`/discover/albums?q=${encodeURIComponent(`${artist.name} ${album.title}`)}`}
                  className="flex items-center gap-4 rounded-[1.4rem] border p-4 transition hover:-translate-y-0.5"
                  style={{
                    borderColor: "var(--border-main)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div className="cover-frame h-20 w-20 shrink-0" />
                  <div>
                    <p className="text-lg font-semibold">{album.title}</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {album.releaseDate || "Release date unavailable"}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="mt-6">
          <ReviewComposer
            entityType="artist"
            entityId={id}
            entityName={artist.name}
            entitySubtitle={artist.origin}
            entityHref={`/artistmb/${id}${requestedCountry ? `?country=${requestedCountry}` : ""}`}
          />
        </section>
      </div>
    </main>
  );
}
