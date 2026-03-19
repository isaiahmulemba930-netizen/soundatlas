"use client";

import { AppTopNav } from "@/components/AppTopNav";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { UpcomingReleaseCard } from "@/components/UpcomingReleaseCard";
import { SourcesFooter } from "@/components/SourcesFooter";
import { TrendingReviewsSection } from "@/components/TrendingReviewsSection";
import type { TrendingGenresPayload } from "@/lib/genre-trends";
import type { UpcomingReleasesPayload, UpcomingRelease } from "@/lib/upcoming-release-types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthProfile = {
  display_name: string | null;
  username: string | null;
};

const discoveryEntryPoints = [
  {
    title: "Marketplace",
    href: "/marketplace",
    description: "Trade Atlas Credits on songs, artists, and albums, then earn extra AC by rating, reviewing, and logging plays.",
  },
  {
    title: "Search by Album",
    href: "/discover/albums",
    description: "See the top albums moving right now in your market, then search any record with live metadata.",
  },
  {
    title: "Search by Artist",
    href: "/discover/artists",
    description: "Track the artists currently breaking through in your country and jump into sourced artist pages.",
  },
  {
    title: "Search by Track",
    href: "/discover/tracks",
    description: "Start from songs, not menus, with country-aware trending tracks and direct track search.",
  },
];

function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

type HomeGenreCard = {
  slug: string;
  title: string;
  subtitle: string;
  href: string;
  signal: string;
};

export default function Home() {
  const [headline, setHeadline] = useState("Good evening");
  const [showAuthCard, setShowAuthCard] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<Session["user"] | null>(null);
  const [currentProfile, setCurrentProfile] = useState<AuthProfile | null>(null);
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [rotatingGenres, setRotatingGenres] = useState<HomeGenreCard[]>([]);
  const [genrePulseSummary, setGenrePulseSummary] = useState("Refreshing the latest genre pulse now.");
  const [upcomingReleases, setUpcomingReleases] = useState<UpcomingRelease[]>([]);
  const [upcomingSummary, setUpcomingSummary] = useState("Refreshing upcoming releases now.");

  function getSupabaseClient() {
    if (!supabase || !isSupabaseConfigured) {
      setSignupError("Supabase is not configured for this deployment yet.");
      return null;
    }

    return supabase;
  }

  const loadAuthenticatedState = useCallback(async (sessionOverride?: Session | null) => {
    const client = getSupabaseClient();
    if (!client) {
      setLoggedInUser(null);
      setCurrentProfile(null);
      return;
    }

    const session = sessionOverride ?? (await client.auth.getSession()).data.session;
    const user = session?.user ?? null;
    setLoggedInUser(user);

    if (!user) {
      setCurrentProfile(null);
      return;
    }

    const { data, error } = await client
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setSignupError(error.message);
      setCurrentProfile(null);
      return;
    }

    setCurrentProfile(data);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoggedInUser(null);
      setCurrentProfile(null);
      return;
    }

    let isMounted = true;

    async function syncSession() {
      if (!isMounted) return;
      await loadAuthenticatedState();
    }

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      void loadAuthenticatedState(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadAuthenticatedState]);

  useEffect(() => {
    function syncHeadline() {
      const preferredName =
        currentProfile?.display_name?.trim() ||
        currentProfile?.username?.trim() ||
        loggedInUser?.email?.trim() ||
        "";
      const nextGreeting = getGreeting(new Date().getHours());
      setHeadline(preferredName ? `${nextGreeting} ${preferredName}` : nextGreeting);
    }

    syncHeadline();
    const intervalId = window.setInterval(syncHeadline, 1000 * 60 * 15);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentProfile, loggedInUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authIntent = params.get("auth");

    if (authIntent === "signin") {
      setAuthMode("login");
      setShowAuthCard(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadGenrePulse() {
      try {
        const response = await fetch("/api/genre-trends", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load genre pulse.");
        }

        const payload = (await response.json()) as TrendingGenresPayload;

        if (!isMounted) {
          return;
        }

        setRotatingGenres(payload.genres);
        setGenrePulseSummary(payload.sourceSummary);
      } catch {
        if (!isMounted) {
          return;
        }

        setRotatingGenres([]);
        setGenrePulseSummary("The latest verified genre pulse is still refreshing.");
      }
    }

    void loadGenrePulse();
    const intervalId = window.setInterval(() => {
      void loadGenrePulse();
    }, 1000 * 60 * 30);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadUpcomingReleases() {
      try {
        const response = await fetch("/api/upcoming-releases?limit=5", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load upcoming releases.");
        }

        const payload = (await response.json()) as UpcomingReleasesPayload;

        if (!isMounted) {
          return;
        }

        setUpcomingReleases(payload.releases);
        setUpcomingSummary(payload.sourceSummary);
      } catch {
        if (!isMounted) {
          return;
        }

        setUpcomingReleases([]);
        setUpcomingSummary("The latest upcoming release signals are still refreshing.");
      }
    }

    void loadUpcomingReleases();
    const intervalId = window.setInterval(() => {
      void loadUpcomingReleases();
    }, 1000 * 60 * 30);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function handleSupabaseSignup() {
    const client = getSupabaseClient();
    if (!client) return;

    setIsSigningUp(true);
    setSignupError("");

    try {
      const { error } = await client.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            display_name: signupName.trim() || null,
            username: signupUsername.trim() || null,
          },
        },
      });

      if (error) {
        setSignupError(error.message);
        return;
      }

      setShowAuthCard(false);
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : "Unable to sign up right now.");
    } finally {
      setIsSigningUp(false);
    }
  }

  async function handleSupabaseLogin() {
    const client = getSupabaseClient();
    if (!client) return;

    setIsLoggingIn(true);
    setSignupError("");

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: signupEmail,
        password: signupPassword,
      });

      if (error) {
        setSignupError(error.message);
        return;
      }

      await loadAuthenticatedState(data.session ?? null);
      setShowAuthCard(false);
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : "Unable to log in right now.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  const rotatingGenreSummary = useMemo(() => {
    return genrePulseSummary;
  }, [genrePulseSummary]);

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      {showAuthCard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,8,9,0.72)] px-4 backdrop-blur-md">
          <div className="hero-panel w-full max-w-xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="kicker">{authMode === "signup" ? "Create your account" : "Log in"}</p>
                <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                  {authMode === "signup" ? "Start building your music profile" : "Welcome back to SoundAtlas"}
                </h2>
              </div>
              <button type="button" aria-label="Close" onClick={() => setShowAuthCard(false)} className="ghost-button px-3 py-2">
                x
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {authMode === "signup" ? (
                <>
                  <input className="app-input" value={signupName} onChange={(event) => setSignupName(event.target.value)} placeholder="Display name" />
                  <input className="app-input" value={signupUsername} onChange={(event) => setSignupUsername(event.target.value)} placeholder="Username" />
                </>
              ) : null}
              <input className="app-input" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} placeholder="Email" />
              <input type="password" className="app-input" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} placeholder="Password" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {authMode === "signup" ? (
                <button type="button" onClick={handleSupabaseSignup} className="solid-button" disabled={isSigningUp || isLoggingIn}>
                  {isSigningUp ? "Creating account..." : "Create account"}
                </button>
              ) : (
                <button type="button" onClick={handleSupabaseLogin} className="solid-button" disabled={isLoggingIn || isSigningUp}>
                  {isLoggingIn ? "Logging in..." : "Log in"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "signup" ? "login" : "signup");
                  setSignupError("");
                }}
                className="ghost-button"
                disabled={isSigningUp || isLoggingIn}
              >
                {authMode === "signup" ? "Switch to Log in" : "Switch to Sign up"}
              </button>
            </div>

            {signupError ? <p className="mt-4 text-sm text-[#ff9f86]">{signupError}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="page-shell">
        <header className="topbar">
          <div>
            <p className="brand-mark">SoundAtlas</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-none md:text-6xl">{headline}</h1>
          </div>

          <AppTopNav />
        </header>

        <section className="hero-panel mb-6 p-6 md:mb-8 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="kicker">Search and discovery</p>
              <h2 className="mt-4 max-w-3xl text-5xl font-bold leading-[0.95] md:text-7xl">
                Discover what matters right now, then go deeper with verified music data.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-soft)] md:text-lg">
                Move straight into album, artist, or track discovery with country-aware trending picks, real search results, and detail pages that stay grounded in verified sources.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/marketplace" className="ghost-button">
                  Marketplace
                </Link>
                <Link href="/discover/albums" className="solid-button">
                  Search by Album
                </Link>
                <Link href="/discover/artists" className="ghost-button">
                  Search by Artist
                </Link>
                <Link href="/discover/tracks" className="ghost-button">
                  Search by Track
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {discoveryEntryPoints.map((entryPoint, index) => (
                <Link
                  key={entryPoint.title}
                  href={entryPoint.href}
                  className="editorial-panel p-5 transition hover:-translate-y-1"
                  style={{
                    background:
                      index === 0
                        ? "linear-gradient(180deg, rgba(214,84,58,0.18), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)"
                        : index === 1
                          ? "linear-gradient(180deg, rgba(185,41,41,0.16), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)"
                          : "linear-gradient(180deg, rgba(134,15,15,0.18), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)",
                  }}
                >
                  <p className="kicker">Entry point {index + 1}</p>
                  <h3 className="mt-3 text-3xl font-bold">{entryPoint.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{entryPoint.description}</p>
                  <p className="mt-5 text-sm font-semibold text-[var(--accent-green)]">Open discovery</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <TrendingReviewsSection />

        <section className="mb-6">
          <div className="mb-4">
            <p className="kicker">Discover by genre</p>
            <h3 className="section-heading mt-2 font-bold">Five genre pulses, refreshed every 30 minutes.</h3>
            <p className="mt-3 max-w-3xl text-[var(--text-soft)]">{rotatingGenreSummary}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {rotatingGenres.length === 0 ? (
              <div
                className="editorial-panel p-5 text-sm leading-7 text-[var(--text-soft)] md:col-span-2 xl:col-span-5"
                style={{ background: "linear-gradient(180deg, rgba(214,84,58,0.10), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)" }}
              >
                No current genre pulse is ready to display yet. This section repopulates as soon as verified chart signals come through.
              </div>
            ) : null}
            {rotatingGenres.map((genre, index) => (
              <Link
                key={genre.slug}
                href={genre.href}
                className="editorial-panel p-5"
                style={{
                  background:
                    index % 3 === 0
                      ? "linear-gradient(180deg, rgba(214,84,58,0.14), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)"
                      : index % 3 === 1
                        ? "linear-gradient(180deg, rgba(185,41,41,0.14), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)"
                        : "linear-gradient(180deg, rgba(134,15,15,0.16), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)",
                }}
              >
                <p className="kicker">Live genre pulse</p>
                <p className="mt-3 text-2xl font-bold">{genre.title}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{genre.subtitle}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {genre.signal}
                </p>
                <p className="mt-4 text-sm font-semibold text-[var(--accent-green)]">Open genre page</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">Upcoming</p>
              <h3 className="section-heading mt-2 font-bold">Upcoming Releases</h3>
              <p className="mt-3 max-w-3xl text-[var(--text-soft)]">{upcomingSummary}</p>
            </div>
            <Link href="/upcoming-releases" className="ghost-button">
              View Top Upcoming Releases
            </Link>
          </div>

          {upcomingReleases.length === 0 ? (
            <div
              className="editorial-panel p-5 text-sm leading-7 text-[var(--text-soft)]"
              style={{ background: "linear-gradient(180deg, rgba(185,41,41,0.12), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)" }}
            >
              No verified upcoming releases are ready to show yet. This section updates as soon as real announcement and teaser signals settle.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {upcomingReleases.map((release) => (
                <UpcomingReleaseCard key={release.id} release={release} />
              ))}
            </div>
          )}
        </section>

        <SourcesFooter />
      </div>
    </main>
  );
}
