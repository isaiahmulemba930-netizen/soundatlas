import Link from "next/link";
import { headers } from "next/headers";

import { UpcomingReleaseCard } from "@/components/UpcomingReleaseCard";
import { detectMarketFromHeaders } from "@/lib/market";
import { getUpcomingReleases, searchUpcomingReleases } from "@/lib/upcoming-releases";

type UpcomingReleasesPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export const revalidate = 1800;

export default async function UpcomingReleasesPage({ searchParams }: UpcomingReleasesPageProps) {
  const { q = "" } = await searchParams;
  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const [topReleases, searchResults] = await Promise.all([
    getUpcomingReleases(market.country, 10),
    q.trim() ? searchUpcomingReleases(q, market.country) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Upcoming Releases</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
              The most anticipated upcoming projects in {market.countryName}, limited to releases that were still upcoming as of March 17, 2026.
            </p>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <p className="kicker">Artist search</p>
          <h2 className="section-heading mt-3 font-bold">Search for upcoming releases by artist</h2>
          <form className="field-shell mt-6" action="/upcoming-releases" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search for an artist with upcoming or teased releases..."
            />
            <button type="submit" className="solid-button px-5 py-3">
              Search
            </button>
          </form>

          {q.trim() ? (
            <div className="mt-6">
              <p className="text-sm text-[var(--text-soft)]">
                {searchResults?.sourceSummary}
              </p>
              {searchResults && searchResults.releases.length > 0 ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {searchResults.releases.map((release) => (
                    <UpcomingReleaseCard key={release.id} release={release} />
                  ))}
                </div>
              ) : (
                <div
                  className="mt-6 rounded-[1.4rem] border p-5 text-sm leading-7 text-[var(--text-soft)]"
                  style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                >
                  No verified upcoming releases found.
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="mb-6">
          <div className="mb-4">
            <p className="kicker">Top 10</p>
            <h2 className="section-heading mt-2 font-bold">Most anticipated in {market.countryName}</h2>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">{topReleases.sourceSummary}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {topReleases.releases.map((release) => (
              <UpcomingReleaseCard key={release.id} release={release} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
