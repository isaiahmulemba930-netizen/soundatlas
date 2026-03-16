import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAlbumLookup } from "@/lib/itunes";
import { GenreAlbum, getGenreAlbumBySlug, getGenreCollectionBySlug } from "@/lib/genre-catalog";

type CatalogPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type CatalogCard = {
  album: GenreAlbum;
  artworkUrl: string;
  liveGenre: string;
};

export default async function CatalogPage({ params }: CatalogPageProps) {
  const { slug } = await params;
  const collection = getGenreCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  const albums = collection.albumSlugs
    .map((albumSlug) => getGenreAlbumBySlug(albumSlug))
    .filter((album): album is GenreAlbum => album !== null);

  const cards: CatalogCard[] = await Promise.all(
    albums.map(async (album) => {
      const live = await fetchAlbumLookup(album.artist, album.title);
      return {
        album,
        artworkUrl: live?.artworkUrl ?? "",
        liveGenre: live?.genre ?? album.genre,
      };
    })
  );

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">{collection.title}</h1>
            <p className="mt-3 max-w-2xl text-[var(--text-soft)]">{collection.subtitle}</p>
          </div>
        </div>

        <section className="grid gap-5">
          {cards.map(({ album, artworkUrl, liveGenre }) => (
            <Link key={album.slug} href={`/album/${album.slug}`} className="editorial-panel p-5 md:p-6">
              <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                <div
                  className="cover-frame aspect-square"
                  style={{
                    backgroundImage: artworkUrl
                      ? `url(${artworkUrl})`
                      : "linear-gradient(135deg, rgba(30,215,96,0.16), rgba(232,176,75,0.12))",
                  }}
                >
                  <div className="relative z-10 flex h-full items-end p-4">
                    <span className="pill">{album.year}</span>
                  </div>
                </div>

                <div>
                  <p className="kicker">{liveGenre || album.genre}</p>
                  <h2 className="mt-3 text-3xl font-bold">{album.title}</h2>
                  <p className="mt-2 text-lg text-[var(--text-soft)]">{album.artist}</p>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
                    {album.artistInfo}
                  </p>

                  <div
                    className="mt-5 rounded-[1.4rem] border p-4"
                    style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
                  >
                    <p className="kicker">Why it shows up</p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                      This is one of the most commonly cited albums in public best-of lists and fan discussions around {collection.title.toLowerCase()}.
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
