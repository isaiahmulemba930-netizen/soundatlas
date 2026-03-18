import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getDiscoveryGenreBySlug } from "@/lib/genre-discovery";
import { detectMarketFromHeaders } from "@/lib/market";
import { getGenreFeatureCards } from "@/lib/music-discovery";

type CatalogPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 1800;

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { slug } = await params;
  const genre = getDiscoveryGenreBySlug(slug);

  if (!genre) {
    notFound();
  }

  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const cards = await getGenreFeatureCards(slug, market.country);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">{genre.title}</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">{genre.description}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
              Live genre discovery for {market.countryName}
            </p>
          </div>
        </div>

        <section className="grid gap-5">
          {cards.length === 0 ? (
            <div
              className="rounded-[1.4rem] border p-6 text-sm leading-7 text-[var(--text-soft)]"
              style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
            >
              No verified live results are available for this genre right now. This page is intentionally staying empty rather than inventing filler.
            </div>
          ) : null}

          {cards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="editorial-panel p-5 md:p-6"
            >
              <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                <div
                  className="cover-frame aspect-square"
                  style={{
                    backgroundImage: card.artworkUrl
                      ? `url(${card.artworkUrl})`
                      : "linear-gradient(135deg, rgba(30,215,96,0.16), rgba(232,176,75,0.12))",
                  }}
                >
                  <div className="relative z-10 flex h-full items-end p-4">
                    <span className="pill">{card.type}</span>
                  </div>
                </div>

                <div>
                  <p className="kicker">{card.sourceLabel}</p>
                  <h2 className="mt-3 text-3xl font-bold">{card.title}</h2>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{card.subtitle}</p>

                  <div
                    className="mt-5 rounded-[1.4rem] border p-4"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <p className="kicker">Why this shows up</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                      {card.whyItShowsUp}
                    </p>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-[var(--accent-green)]">
                    Open {card.type} page
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
