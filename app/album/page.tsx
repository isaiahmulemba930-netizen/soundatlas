"use client";

import Link from "next/link";
import { useState } from "react";

type ArtistResult = {
  id: string;
  name: string;
  country?: string;
  disambiguation?: string;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchArtists(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResults([]);

    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/search-artist?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.artists ?? []);
    } catch {
      setError("Could not search artists.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-3">SoundAtlas</h1>
      <p className="text-gray-400 mb-6">
        Search any artist and load real music metadata.
      </p>

      <form onSubmit={searchArtists} className="max-w-2xl mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists... Drake, Frank Sinatra, Miles Davis"
            className="flex-1 rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-white outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-white text-black px-5 py-3 font-semibold"
          >
            Search
          </button>
        </div>
      </form>

      {loading && <p className="text-gray-400">Searching...</p>}
      {error && <p className="text-red-400">{error}</p>}

      <div className="space-y-4 max-w-2xl">
        {results.map((artist) => (
          <Link
            key={artist.id}
            href={`/artist-mb/${artist.id}`}
            className="block rounded-xl bg-zinc-900 p-4 border border-zinc-800 hover:bg-zinc-800"
          >
            <div className="text-xl font-semibold">{artist.name}</div>
            <div className="text-sm text-gray-400">
              {artist.country || "Unknown country"}
              {artist.disambiguation ? ` • ${artist.disambiguation}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}