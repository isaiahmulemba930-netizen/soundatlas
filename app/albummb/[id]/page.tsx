"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import StarRating from "@/components/StarRating";
import { getCuratedAlbumById } from "@/lib/curated-music";
import {
  getAlbumReview,
  getSongReview,
  ReviewVisibility,
  saveAlbumReview,
  saveSongReview,
} from "@/lib/social";

type AlbumData = {
  title: string;
  date: string;
  artistName?: string;
  artistBio?: string;
  imageUrl?: string;
};

type Track = {
  number: string;
  title: string;
};

type SongDraft = {
  rating: number;
  reviewText: string;
  savedMessage: string;
  visibility: ReviewVisibility;
};

function getSongId(albumId: string, track: Track) {
  return `${albumId}::${track.number || "track"}::${track.title}`;
}

export default function AlbumPage() {
  const params = useParams();
  const id = params.id as string;
  const ratingStorageKey = `album-rating-${id}`;

  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(0);
  const [visibility, setVisibility] = useState<ReviewVisibility>("public");
  const [songDrafts, setSongDrafts] = useState<Record<string, SongDraft>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAlbum() {
      setError("");

      try {
        const curatedAlbum = getCuratedAlbumById(id);
        const res = await fetch(`/api/album/${id}`);
        const data = res.ok ? await res.json() : null;

        if (cancelled) return;

        const apiAlbum = (data?.album as { title?: string; date?: string } | null) ?? null;
        const apiTracks = ((data?.tracks ?? []) as Track[]).filter((track) => track.title);
        const fallbackTracks =
          curatedAlbum?.tracks.map((title, index) => ({
            number: String(index + 1),
            title,
          })) ?? [];

        const nextAlbum =
          apiAlbum || curatedAlbum
            ? {
                title: apiAlbum?.title || curatedAlbum?.title || "Unknown album",
                date: apiAlbum?.date || curatedAlbum?.year || "Unknown release date",
                artistName: curatedAlbum?.artist,
                artistBio: curatedAlbum?.artistBio,
                imageUrl: curatedAlbum?.imageUrl,
              }
            : null;

        setAlbum(nextAlbum);
        setTracks(apiTracks.length > 0 ? apiTracks : fallbackTracks);

        const savedReview = getAlbumReview(id);
        const savedAlbumRating = Number(window.localStorage.getItem(ratingStorageKey) || 0);

        if (savedReview) {
          setReviewText(savedReview.reviewText);
          setRating(savedReview.rating);
          setVisibility(savedReview.visibility);
        } else if (!Number.isNaN(savedAlbumRating)) {
          setRating(savedAlbumRating);
        }

        const sourceTracks = apiTracks.length > 0 ? apiTracks : fallbackTracks;
        const nextSongDrafts = sourceTracks.reduce<Record<string, SongDraft>>((acc, track) => {
          const songId = getSongId(id, track);
          const savedSongReview = getSongReview(songId);
          const savedSongRating = Number(window.localStorage.getItem(`song-rating-${songId}`) || 0);

          acc[songId] = {
            rating: savedSongReview?.rating ?? (Number.isNaN(savedSongRating) ? 0 : savedSongRating),
            reviewText: savedSongReview?.reviewText ?? "",
            savedMessage: "",
            visibility: savedSongReview?.visibility ?? "public",
          };

          return acc;
        }, {});

        setSongDrafts(nextSongDrafts);
      } catch {
        if (!cancelled) {
          const curatedAlbum = getCuratedAlbumById(id);

          if (curatedAlbum) {
            setAlbum({
              title: curatedAlbum.title,
              date: curatedAlbum.year,
              artistName: curatedAlbum.artist,
              artistBio: curatedAlbum.artistBio,
              imageUrl: curatedAlbum.imageUrl,
            });
            setTracks(
              curatedAlbum.tracks.map((title, index) => ({
                number: String(index + 1),
                title,
              }))
            );
          } else {
            setError("Could not load album details.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    loadAlbum();

    return () => {
      cancelled = true;
    };
  }, [id, ratingStorageKey]);

  function handleSaveReview() {
    if (!album) return;

    setSaving(true);

    const nextRating =
      rating > 0 ? rating : Number(window.localStorage.getItem(ratingStorageKey) || 0);

    saveAlbumReview({
      id: `album-review-${id}`,
      kind: "album",
      albumId: id,
      albumTitle: album.title,
      albumDate: album.date,
      reviewText: reviewText.trim(),
      rating: nextRating,
      createdAt: new Date().toISOString(),
      visibility,
    });

    setRating(nextRating);
    setSaveMessage("Album review saved to your profile and homepage activity.");
    setSaving(false);
  }

  function updateSongDraft(songId: string, nextDraft: Partial<SongDraft>) {
    setSongDrafts((current) => ({
      ...current,
      [songId]: {
        rating: current[songId]?.rating ?? 0,
        reviewText: current[songId]?.reviewText ?? "",
        savedMessage: current[songId]?.savedMessage ?? "",
        visibility: current[songId]?.visibility ?? "public",
        ...nextDraft,
      },
    }));
  }

  function handleSaveSongReview(track: Track) {
    if (!album) return;

    const songId = getSongId(id, track);
    const draft = songDrafts[songId];
    const nextRating =
      draft?.rating ?? Number(window.localStorage.getItem(`song-rating-${songId}`) || 0);

    saveSongReview({
      id: `song-review-${songId}`,
      kind: "song",
      albumId: id,
      albumTitle: album.title,
      songId,
      songTitle: track.title,
      trackNumber: track.number || "",
      reviewText: draft?.reviewText.trim() || "",
      rating: nextRating,
      createdAt: new Date().toISOString(),
      visibility: draft?.visibility ?? "public",
    });

    updateSongDraft(songId, {
      rating: nextRating,
      savedMessage: `${track.title} saved to recent reviews.`,
    });
  }

  if (!loaded) {
    return <main className="min-h-screen p-8 text-[var(--text-main)]">Loading album...</main>;
  }

  if (error) {
    return (
      <main className="min-h-screen p-8 text-[var(--text-main)]">
        <p>{error}</p>
      </main>
    );
  }

  if (!album) {
    return (
      <main className="min-h-screen p-8 text-[var(--text-main)]">
        <p>Album not found.</p>
      </main>
    );
  }

  const tracksReviewed = Object.values(songDrafts).filter((draft) => {
    return draft.rating > 0 || draft.reviewText.trim().length > 0;
  }).length;

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">{album.title}</h1>
            <p className="mt-3 text-[var(--text-soft)]">
              {album.artistName ? `${album.artistName} · ` : ""}First release: {album.date}
            </p>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <div
              className="cover-frame aspect-square"
              style={{
                backgroundImage: `url(${album.imageUrl || `https://coverartarchive.org/release-group/${id}/front-500`})`,
              }}
            >
              <div className="relative z-10 flex h-full items-end p-5">
                <span className="pill">Album</span>
              </div>
            </div>

            <div>
              <p className="kicker">Album review</p>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
                Save the big-picture take here, then scroll down to leave specific thoughts on the songs that make the record stick.
              </p>

              {album.artistBio ? (
                <div
                  className="mt-5 rounded-[1.4rem] border p-4 text-sm leading-7 text-[var(--text-soft)]"
                  style={{
                    borderColor: "var(--border-main)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <p className="font-semibold text-[var(--text-main)]">
                    {album.artistName || "Artist"} overview
                  </p>
                  <p className="mt-2">{album.artistBio}</p>
                </div>
              ) : null}

              <div className="mt-6 max-w-md">
                <StarRating
                  storageKey={ratingStorageKey}
                  label="Your album rating"
                  onChange={setRating}
                />
              </div>

              <div className="mt-5 max-w-xs">
                <label className="mb-2 block text-sm text-[var(--text-soft)]">
                  Review visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as ReviewVisibility)}
                  className="app-input"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={8}
                placeholder="What did you think about the sequencing, standout tracks, production, and replay value?"
                className="app-textarea mt-6"
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={handleSaveReview} disabled={saving} className="solid-button">
                  {saving ? "Saving..." : "Save Album Review"}
                </button>
                {saveMessage ? (
                  <p className="text-sm text-[var(--accent-green)]">{saveMessage}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="editorial-panel p-6 md:p-7">
            <p className="kicker">Track reviews</p>
            <h2 className="section-heading mt-3 font-bold">Song-by-song reactions.</h2>

            <div className="mt-6 space-y-4">
              {tracks.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No tracks available.</p>
              ) : (
                tracks.map((track, index) => {
                  const songId = getSongId(id, track);
                  const draft = songDrafts[songId] ?? {
                    rating: 0,
                    reviewText: "",
                    savedMessage: "",
                    visibility: "public" as ReviewVisibility,
                  };

                  return (
                    <div
                      key={`${track.number}-${track.title}-${index}`}
                      className="rounded-[1.4rem] border p-4"
                      style={{
                        borderColor: "var(--border-main)",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="kicker">Track {track.number || index + 1}</p>
                          <h3 className="mt-2 text-xl font-bold">{track.title}</h3>
                        </div>

                        <div className="w-full max-w-xs">
                          <StarRating
                            storageKey={`song-rating-${songId}`}
                            label="Song rating"
                            size={22}
                            onChange={(value) => updateSongDraft(songId, { rating: value })}
                          />
                        </div>
                      </div>

                      <textarea
                        value={draft.reviewText}
                        onChange={(e) =>
                          updateSongDraft(songId, {
                            reviewText: e.target.value,
                            savedMessage: "",
                          })
                        }
                        rows={3}
                        placeholder="Quick thoughts on the hook, verse, beat switch, bridge, or replay factor."
                        className="app-textarea mt-4"
                      />

                      <div className="mt-3 max-w-[220px]">
                        <label className="mb-2 block text-sm text-[var(--text-soft)]">
                          Song review visibility
                        </label>
                        <select
                          value={draft.visibility}
                          onChange={(e) =>
                            updateSongDraft(songId, {
                              visibility: e.target.value as ReviewVisibility,
                              savedMessage: "",
                            })
                          }
                          className="app-input"
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[var(--text-soft)]">
                          {draft.rating > 0 ? `${draft.rating.toFixed(1)} / 5` : "No song rating yet"}{" "}
                          <span className="text-[var(--text-muted)]">· {draft.visibility}</span>
                        </p>
                        <button type="button" onClick={() => handleSaveSongReview(track)} className="ghost-button">
                          Save Song Review
                        </button>
                      </div>

                      {draft.savedMessage ? (
                        <p className="mt-2 text-sm text-[var(--accent-green)]">{draft.savedMessage}</p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="app-panel p-6 md:p-7">
            <p className="kicker">Album info</p>
            <h2 className="section-heading mt-3 font-bold">What lives on this page.</h2>

            <div className="mt-6 space-y-4">
              <div
                className="rounded-[1.2rem] border p-4"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="kicker">Artist</p>
                <p className="mt-2 text-2xl font-bold">{album.artistName || "Unknown artist"}</p>
              </div>
              <div
                className="rounded-[1.2rem] border p-4"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="kicker">Tracklist</p>
                <p className="mt-2 text-2xl font-bold">{tracks.length} tracks</p>
              </div>
              <div
                className="rounded-[1.2rem] border p-4"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="kicker">Album score</p>
                <p className="mt-2 text-2xl font-bold">
                  {rating > 0 ? `${rating.toFixed(1)} / 5` : "Not rated yet"}
                </p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">{visibility} review</p>
              </div>
              <div
                className="rounded-[1.2rem] border p-4"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <p className="kicker">Tracks reviewed</p>
                <p className="mt-2 text-2xl font-bold">{tracksReviewed}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
