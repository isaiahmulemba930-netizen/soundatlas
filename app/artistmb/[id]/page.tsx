"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import StarRating from "@/components/StarRating";

type Artist = {
  id: string;
  name: string;
  type?: string;
  country?: string;
  origin?: string;
  disambiguation?: string;
  bioSummary?: string;
};

type Album = {
  id: string;
  title: string;
  date: string;
};

export default function ArtistPage() {
  const params = useParams();
  const id = params.id as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [artistRating, setArtistRating] = useState(0);

  useEffect(() => {
    async function loadArtist() {
      const res = await fetch(`/api/artist/${id}`);
      const data = await res.json();

      setArtist(data.artist);
      setAlbums(data.albums || []);

      const savedArtistRating = Number(window.localStorage.getItem(`artist-rating-${id}`) || 0);
      if (!Number.isNaN(savedArtistRating)) {
        setArtistRating(savedArtistRating);
      }

      setLoading(false);
    }

    loadArtist();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen p-8 text-[var(--text-main)]">
        Loading artist...
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="min-h-screen p-8 text-[var(--text-main)]">
        Artist not found.
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">{artist.name}</h1>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="kicker">Artist snapshot</p>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
                {artist.bioSummary || "No biography available yet."}
              </p>

              <div className="mt-6 max-w-md">
                <StarRating
                  storageKey={`artist-rating-${artist.id}`}
                  label="Your artist rating"
                  onChange={setArtistRating}
                />
              </div>
            </div>

            <div className="meta-grid">
              <div className="app-panel p-5">
                <p className="kicker">Origin</p>
                <p className="mt-2 text-xl font-semibold">
                  {artist.origin || artist.country || "Unknown"}
                </p>
              </div>
              <div className="app-panel p-5">
                <p className="kicker">Type</p>
                <p className="mt-2 text-xl font-semibold">{artist.type || "Unknown"}</p>
              </div>
              <div className="app-panel p-5">
                <p className="kicker">Notes</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                  {artist.disambiguation || "None"}
                </p>
              </div>
              <div className="app-panel p-5">
                <p className="kicker">Current rating</p>
                <p className="mt-2 text-xl font-semibold">
                  {artistRating > 0 ? `${artistRating.toFixed(1)} / 5` : "Not rated yet"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="editorial-panel p-6 md:p-7">
          <p className="kicker">Discography</p>
          <h2 className="section-heading mt-3 font-bold">Albums worth opening next.</h2>

          <div className="mt-6 space-y-4">
            {albums.map((album) => (
              <Link
                key={album.id}
                href={`/albummb/${album.id}`}
                className="flex items-center gap-4 rounded-[1.4rem] border p-4 transition hover:-translate-y-0.5"
                style={{
                  borderColor: "var(--border-main)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div
                  className="cover-frame h-20 w-20 shrink-0"
                  style={{
                    backgroundImage: `url(https://coverartarchive.org/release-group/${album.id}/front-250)`,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{album.title}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{album.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
