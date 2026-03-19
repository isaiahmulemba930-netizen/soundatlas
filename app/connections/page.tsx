"use client";

import Link from "next/link";

export default function ConnectionsPage() {
  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="topbar">
          <div>
            <Link href="/" className="brand-mark">
              Back To Home
            </Link>
            <h1 className="mt-4 text-4xl font-bold md:text-6xl">Listening history setup</h1>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">
              External platform sign-in is turned off for now. SoundAtlas listening history grows from
              the plays you actively log inside the app.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/stats" className="nav-link">
              Stats
            </Link>
            <Link href="/history" className="nav-link">
              History
            </Link>
          </div>
        </div>

        <section className="hero-panel mb-6 p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="editorial-panel p-6 md:p-7">
              <p className="kicker">Manual tracking only</p>
              <h2 className="mt-3 text-3xl font-bold">Log plays to build your history.</h2>
              <p className="mt-3 text-[var(--text-soft)]">
                Spotify and Apple Music login are both paused for now. The only way to add new
                listening history is by logging real plays from album and song flows inside
                SoundAtlas.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/" className="solid-button">
                  Explore music
                </Link>
                <Link href="/history" className="ghost-button">
                  Open history
                </Link>
              </div>
            </div>

            <div className="app-panel p-6 md:p-7">
              <p className="kicker">How it works</p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--text-soft)]">
                <p>1. Open an album or track page.</p>
                <p>2. Log the play inside SoundAtlas.</p>
                <p>3. That play immediately starts shaping your stats, history, badges, and rewards.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="app-panel p-6 md:p-7">
          <p className="kicker">Current status</p>
          <h2 className="section-heading mt-3 font-bold">Platform connections are unavailable.</h2>
          <p className="mt-4 max-w-3xl text-[var(--text-soft)]">
            We are not offering Spotify login or Apple Music login right now. Listening history,
            streaks, and recommendations should be built from in-app tracked plays only until
            platform connections are revisited later.
          </p>
        </section>
      </div>
    </main>
  );
}
