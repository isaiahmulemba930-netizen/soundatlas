"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { genreCollections } from "@/lib/genre-catalog";
import { supabase } from "@/lib/supabase";
import {
  getPublicRecentReviews,
  SavedReview,
  SOCIAL_STORAGE_EVENT,
} from "@/lib/social";

type ArtistResult = {
  id: string;
  name: string;
  country?: string;
};

type FeaturedAlbum = {
  title: string;
  artist: string;
  href: string;
  imageUrl: string;
  tag: string;
};

type FeaturedGroup = {
  title: string;
  subtitle: string;
  albums: FeaturedAlbum[];
};

type AuthProfile = {
  display_name: string | null;
  username: string | null;
};

const featuredGroups: FeaturedGroup[] = [
  {
    title: "Most Revisited This week",
    subtitle: "Albums that keep ending up back in rotation, whether people mean to or not.",
    albums: [
      {
        title: "Blonde",
        artist: "Frank Ocean",
        href: "/albummb/623f52ad-5f65-45c2-b6f7-12c2f1ab5c6c",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg",
        tag: "Endlessly revisited",
      },
      {
        title: "To Pimp a Butterfly",
        artist: "Kendrick Lamar",
        href: "/albummb/7857867a-9c03-3a7b-9317-1e7203d1f0ac",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/96/To_Pimp_a_Butterfly.jpg",
        tag: "Community canon",
      },
      {
        title: "Currents",
        artist: "Tame Impala",
        href: "/albummb/0e7548f5-b5c5-4c84-b723-fc6b7854c17a",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/9b/Tame_Impala_-_Currents.png",
        tag: "Headphone favorite",
      },
      {
        title: "After Hours",
        artist: "The Weeknd",
        href: "/albummb/c28cff62-23a0-3b1d-b374-6f8d5647e9d1",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c1/The_Weeknd_-_After_Hours.png",
        tag: "Replay magnet",
      },
    ],
  },
  {
    title: "Late-Night Confessional",
    subtitle: "The records people put on when they want atmosphere, vulnerability, and no interruptions.",
    albums: [
      {
        title: "Blonde",
        artist: "Frank Ocean",
        href: "/albummb/623f52ad-5f65-45c2-b6f7-12c2f1ab5c6c",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg",
        tag: "Quiet devastation",
      },
      {
        title: "After Hours",
        artist: "The Weeknd",
        href: "/albummb/c28cff62-23a0-3b1d-b374-6f8d5647e9d1",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c1/The_Weeknd_-_After_Hours.png",
        tag: "After-dark pull",
      },
      {
        title: "Currents",
        artist: "Tame Impala",
        href: "/albummb/0e7548f5-b5c5-4c84-b723-fc6b7854c17a",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/9b/Tame_Impala_-_Currents.png",
        tag: "Floating favorite",
      },
      {
        title: "To Pimp a Butterfly",
        artist: "Kendrick Lamar",
        href: "/albummb/7857867a-9c03-3a7b-9317-1e7203d1f0ac",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/96/To_Pimp_a_Butterfly.jpg",
        tag: "Dense and personal",
      },
    ],
  },
  {
    title: "Big Personality Records",
    subtitle: "Albums with a sharp point of view, huge identity, and a fanbase ready to debate every track.",
    albums: [
      {
        title: "To Pimp a Butterfly",
        artist: "Kendrick Lamar",
        href: "/albummb/7857867a-9c03-3a7b-9317-1e7203d1f0ac",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/96/To_Pimp_a_Butterfly.jpg",
        tag: "Statement record",
      },
      {
        title: "After Hours",
        artist: "The Weeknd",
        href: "/albummb/c28cff62-23a0-3b1d-b374-6f8d5647e9d1",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c1/The_Weeknd_-_After_Hours.png",
        tag: "Big-world pop",
      },
      {
        title: "Blonde",
        artist: "Frank Ocean",
        href: "/albummb/623f52ad-5f65-45c2-b6f7-12c2f1ab5c6c",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg",
        tag: "Mythic aura",
      },
      {
        title: "Currents",
        artist: "Tame Impala",
        href: "/albummb/0e7548f5-b5c5-4c84-b723-fc6b7854c17a",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/9b/Tame_Impala_-_Currents.png",
        tag: "Immediate identity",
      },
    ],
  },
  {
    title: "Albums That Build Fandom",
    subtitle: "The kind of records that make people start lists, write long reviews, and stay up too late arguing.",
    albums: [
      {
        title: "After Hours",
        artist: "The Weeknd",
        href: "/albummb/c28cff62-23a0-3b1d-b374-6f8d5647e9d1",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c1/The_Weeknd_-_After_Hours.png",
        tag: "High replay value",
      },
      {
        title: "To Pimp a Butterfly",
        artist: "Kendrick Lamar",
        href: "/albummb/7857867a-9c03-3a7b-9317-1e7203d1f0ac",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/96/To_Pimp_a_Butterfly.jpg",
        tag: "Always discussed",
      },
      {
        title: "Blonde",
        artist: "Frank Ocean",
        href: "/albummb/623f52ad-5f65-45c2-b6f7-12c2f1ab5c6c",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg",
        tag: "Instantly personal",
      },
      {
        title: "Currents",
        artist: "Tame Impala",
        href: "/albummb/0e7548f5-b5c5-4c84-b723-fc6b7854c17a",
        imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/9b/Tame_Impala_-_Currents.png",
        tag: "Mood-setting giant",
      },
    ],
  },
];

function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good evening";
  return "Good evening";
}
export default function Home() {
  async function loadAuthenticatedState(sessionOverride?: Session | null) {
    const session =
      sessionOverride ??
      (await supabase.auth.getSession()).data.session;

    const user = session?.user ?? null;
    setLoggedInUser(user);

    if (!user) {
      setCurrentProfile(null);
      return;
    }

    const { data, error } = await supabase
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
  }

  async function handleSupabaseSignup() {
    setIsSigningUp(true);
    setSignupError("");

    if (!signupEmail.trim() || !signupPassword.trim()) {
      setSignupError("Enter an email and password to create your account.");
      setIsSigningUp(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      });

      if (error) {
        setSignupError(error.message);
        return;
      }

      if (!data.user) {
        setSignupError("Account created, but no user was returned.");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: data.user.id,
          username: signupUsername.trim() || null,
          display_name: signupName.trim() || null,
        },
        { onConflict: "user_id" }
      );

      if (profileError) {
        setSignupError(profileError.message);
        return;
      }

      setShowSignupPrompt(true);
      setShowEmailConfirmation(true);
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : "Unable to sign up right now.");
    } finally {
      setIsSigningUp(false);
    }
  }

  async function handleSupabaseLogin() {
    setIsLoggingIn(true);
    setSignupError("");

    if (!signupEmail.trim() || !signupPassword.trim()) {
      setSignupError("Enter your email and password to log in.");
      setIsLoggingIn(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signupEmail,
        password: signupPassword,
      });

      if (error) {
        setSignupError(error.message);
        return;
      }

      await loadAuthenticatedState(data.session ?? null);
      setShowEmailConfirmation(false);
      setShowSignupPrompt(false);
      setShowWelcomeModal(false);
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : "Unable to log in right now.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setSignupError(error.message);
    } else {
      setLoggedInUser(null);
      setCurrentProfile(null);
      setShowEmailConfirmation(false);
      setShowWelcomeModal(true);
      setShowSignupPrompt(false);
      setAuthMode("signup");
      setSignupError("");
      setSignupName("");
      setSignupUsername("");
      setSignupEmail("");
      setSignupPassword("");
      window.localStorage.removeItem("soundatlas-profile");
      window.sessionStorage.removeItem("soundatlas-explore-first");
    }
  }

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistResult[]>([]);
  const [recentActivity, setRecentActivity] = useState<SavedReview[]>([]);
  const [featuredGroupIndex, setFeaturedGroupIndex] = useState(0);
  const [genreStartIndex, setGenreStartIndex] = useState(0);
  const [headline, setHeadline] = useState("Good evening");
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<Session["user"] | null>(null);
  const [currentProfile, setCurrentProfile] = useState<AuthProfile | null>(null);
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");

  async function searchArtist() {
    if (!query.trim()) return;

    const res = await fetch(`/api/search-artist?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.artists || []);
  }

  useEffect(() => {
    function syncActivity() {
      setRecentActivity(getPublicRecentReviews().slice(0, 6));
    }

    syncActivity();
    window.addEventListener(SOCIAL_STORAGE_EVENT, syncActivity);

    return () => {
      window.removeEventListener(SOCIAL_STORAGE_EVENT, syncActivity);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function syncSession() {
      if (!isMounted) return;

      await loadAuthenticatedState();

      if (!isMounted) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setShowWelcomeModal(false);
        setShowSignupPrompt(false);
        setShowEmailConfirmation(false);
      }
    }

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setShowWelcomeModal(false);
        setShowSignupPrompt(false);
        setShowEmailConfirmation(false);
      } else {
        setCurrentProfile(null);
      }

      void loadAuthenticatedState(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function syncGreeting() {
      const preferredName =
        currentProfile?.display_name?.trim() ||
        currentProfile?.username?.trim() ||
        loggedInUser?.email?.trim() ||
        "";
      const nextGreeting = getGreeting(new Date().getHours());
      setHeadline(preferredName ? `${nextGreeting} ${preferredName}` : nextGreeting);

      const exploreFirst = window.sessionStorage.getItem("soundatlas-explore-first");
      const shouldPrompt = !loggedInUser && !showEmailConfirmation && exploreFirst !== "true";
      setShowSignupPrompt(shouldPrompt);
    }

    syncGreeting();
    window.addEventListener(SOCIAL_STORAGE_EVENT, syncGreeting);
    const intervalId = window.setInterval(syncGreeting, 1000 * 60 * 15);

    return () => {
      window.removeEventListener(SOCIAL_STORAGE_EVENT, syncGreeting);
      window.clearInterval(intervalId);
    };
  }, [currentProfile, loggedInUser, showEmailConfirmation]);

  useEffect(() => {
    function syncFeaturedGroup() {
      const twoHourBucket = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 2));
      setFeaturedGroupIndex(twoHourBucket % featuredGroups.length);
      setGenreStartIndex(twoHourBucket % genreCollections.length);
    }

    syncFeaturedGroup();
    const intervalId = window.setInterval(syncFeaturedGroup, 1000 * 60 * 15);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const currentFeaturedGroup = featuredGroups[featuredGroupIndex];
  const visibleGenres = Array.from({ length: 4 }, (_, offset) => {
    return genreCollections[(genreStartIndex + offset) % genreCollections.length];
  });

  function handleExploreFirst() {
    window.sessionStorage.setItem("soundatlas-explore-first", "true");
    setShowSignupPrompt(false);
  }

  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      {showWelcomeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,8,9,0.72)] px-4 backdrop-blur-md">
          <div className="hero-panel w-full max-w-xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="kicker">Welcome to SoundAtlas</p>
                <h2 className="mt-3 text-3xl font-bold md:text-4xl">Discover music with your friends</h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowWelcomeModal(false)}
                className="ghost-button px-3 py-2"
              >
                x
              </button>
            </div>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--text-soft)] md:text-base">
              Join SoundAtlas to rate music, build your profile, and connect with others.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowWelcomeModal(false);
                  setAuthMode("signup");
                  setShowEmailConfirmation(false);
                  setSignupError("");
                  setShowSignupPrompt(true);
                }}
                className="app-button"
                disabled={isSigningUp || isLoggingIn}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWelcomeModal(false);
                  setAuthMode("login");
                  setShowEmailConfirmation(false);
                  setSignupError("");
                  setShowSignupPrompt(true);
                }}
                className="ghost-button"
                disabled={isSigningUp || isLoggingIn}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setShowWelcomeModal(false)}
                className="text-sm text-[var(--text-soft)] underline hover:text-[var(--text-main)]"
              >
                Explore first
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSignupPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,8,9,0.72)] px-4 backdrop-blur-md">
          <div className="hero-panel w-full max-w-xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="kicker">
                  {showEmailConfirmation
                    ? "Almost there"
                    : authMode === "login"
                      ? "Welcome back"
                      : "Join SoundAtlas"}
                </p>
                <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                  {showEmailConfirmation
                    ? "Check your email to confirm your account."
                    : authMode === "login"
                      ? "Log in to keep listening with your account."
                      : "Start your profile before you dive in."}
                </h2>
              </div>
              <button type="button" onClick={handleExploreFirst} className="ghost-button px-4 py-2">
                x Explore first
              </button>
            </div>

            <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--text-soft)] md:text-base">
              {showEmailConfirmation
                ? "We sent a confirmation link to your email. After confirming, come back here and log in."
                : authMode === "login"
                  ? "Use the same email and password you signed up with to pick up where you left off."
                  : "Pick a display name or username so your ratings, reviews, and follows feel like they belong to you from the start."}
            </p>

            {showEmailConfirmation ? null : (
              <div className="mt-6 grid gap-4">
                <input
                  value={signupName}
                  onChange={(e) => {
                    setSignupName(e.target.value);
                    setSignupError("");
                  }}
                  placeholder="Display name"
                  className="app-input"
                />
                <input
                  value={signupUsername}
                  onChange={(e) => {
                    setSignupUsername(e.target.value);
                    setSignupError("");
                  }}
                  placeholder="Username"
                  className="app-input"
                />
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    setSignupError("");
                  }}
                  placeholder="Email"
                  className="app-input"
                />
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => {
                    setSignupPassword(e.target.value);
                    setSignupError("");
                  }}
                  placeholder="Password"
                  className="app-input"
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {showEmailConfirmation ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setShowEmailConfirmation(false);
                    setSignupError("");
                  }}
                  className="app-button"
                  disabled={isLoggingIn}
                >
                  Go to Log in
                </button>
              ) : authMode === "login" ? (
                <button
                  type="button"
                  onClick={handleSupabaseLogin}
                  className="app-button"
                  disabled={isLoggingIn || isSigningUp}
                >
                  {isLoggingIn ? "Logging in..." : "Log in"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSupabaseSignup}
                  className="app-button"
                  disabled={isSigningUp || isLoggingIn}
                >
                  {isSigningUp ? "Creating account..." : "Create account"}
                </button>
              )}
              {!showEmailConfirmation ? (
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
              ) : null}
              <button type="button" onClick={handleExploreFirst} className="ghost-button">
                Explore first
              </button>
            </div>

            {signupError ? (
              <p className="mt-3 text-sm text-[#ff9f86]">{signupError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="page-shell">
        <header className="topbar">
          <div>
            <p className="brand-mark">SoundAtlas</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-none md:text-6xl">
              {headline}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {loggedInUser ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="app-button"
              >
                Sign out
              </button>
            ) : null}
            <Link href="/profile" className="nav-link">
              Your Profile
            </Link>
          </div>
        </header>

        <section className="hero-panel mb-6 p-6 md:mb-8 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="kicker">Review, rate, discover</p>
              <h2 className="mt-4 max-w-3xl text-5xl font-bold leading-[0.95] md:text-7xl">
                Make your listening history feel curated, social, and unmistakably yours.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-soft)] md:text-lg">
                Search real artists, write album takes, save track reactions, and build a profile
                that feels less like a spreadsheet and more like a point of view.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/profile" className="solid-button">
                  Start Building Your Profile
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("search-box");
                    input?.scrollIntoView({ behavior: "smooth", block: "center" });
                    (document.getElementById("search-input") as HTMLInputElement | null)?.focus();
                  }}
                  className="ghost-button"
                >
                  Find an Artist
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="app-panel p-4">
                <p className="text-3xl font-bold">Albums</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  Big-picture reviews and diary-style ratings.
                </p>
              </div>
              <div className="app-panel p-4">
                <p className="text-3xl font-bold">Tracks</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  The specific song takes people actually want to read.
                </p>
              </div>
              <div className="app-panel p-4">
                <p className="text-3xl font-bold">Artists</p>
                <p className="mt-2 text-sm text-[var(--text-soft)]">
                  Bios, context, and a bigger picture of their catalog.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="search-box" className="mb-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="editorial-panel p-6 md:p-7">
            <p className="kicker">Search artists</p>
            <h3 className="section-heading mt-3 font-bold">Jump into a catalog fast.</h3>
            <p className="mt-3 max-w-xl text-[var(--text-soft)]">
              Pull real artist data, open album pages, and start rating without digging through a cold interface.
            </p>

            <div className="field-shell mt-6">
              <input
                id="search-input"
                placeholder="Search artists, bands, producers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" onClick={searchArtist} className="solid-button px-5 py-3">
                Search
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {results.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Try searching for Kendrick Lamar, SZA, The Weeknd, Frank Ocean, or Radiohead.
                </p>
              ) : (
                results.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artistmb/${artist.id}`}
                    className="flex items-center justify-between rounded-[1.2rem] border px-4 py-4 transition hover:-translate-y-0.5"
                    style={{
                      borderColor: "var(--border-main)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div>
                      <p className="font-semibold">{artist.name}</p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {artist.country || "Unknown country"}
                      </p>
                    </div>
                    <span className="pill">Open</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="app-panel p-6 md:p-7">
            <p className="kicker">Public activity</p>
            <h3 className="section-heading mt-3 font-bold">What people can actually see.</h3>
            <p className="mt-3 text-[var(--text-soft)]">
              Only reviews marked public show up here, so the homepage feed feels intentional instead of exposing drafts.
            </p>

            <div className="mt-6 space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No public activity yet. Save an album or song review as public and it will appear here.
                </p>
              ) : (
                recentActivity.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-[1.25rem] border p-4"
                    style={{
                      borderColor: "var(--border-main)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {review.kind === "song" ? review.songTitle : review.albumTitle}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {review.kind === "song" ? `Song on ${review.albumTitle}` : "Album review"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-[var(--text-muted)]">
                        <p>{review.rating > 0 ? `${review.rating.toFixed(1)} / 5` : "No score"}</p>
                        <p className="mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-soft)]">
                      {review.reviewText || "No written review yet."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="kicker">Discovery lanes</p>
              <h3 className="section-heading mt-2 font-bold">Browse by genre, not by menu.</h3>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visibleGenres.map((genre, index) => (
              <Link
                key={genre.slug}
                href={`/catalog/${genre.slug}`}
                className="editorial-panel p-5"
                style={{
                  background:
                    index % 2 === 0
                      ? "linear-gradient(180deg, rgba(30,215,96,0.08), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)"
                      : "linear-gradient(180deg, rgba(232,176,75,0.08), rgba(255,255,255,0.02)), rgba(20,23,24,0.92)",
                }}
              >
                <p className="text-2xl font-bold">{genre.title}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{genre.subtitle}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  5 essential albums
                </p>
                <p className="mt-4 text-sm font-semibold text-[var(--accent-green)]">Open catalog</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4">
            <p className="kicker">On rotation</p>
            <h3 className="section-heading mt-2 font-bold">Albums we keep on repeat</h3>
            <p className="mt-2 max-w-3xl text-[var(--text-soft)]">
              {currentFeaturedGroup.subtitle}
            </p>
            <p
              className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]"
              style={{ borderColor: "var(--border-main)" }}
            >
              {currentFeaturedGroup.title}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
              Refreshes every 2 hours
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {currentFeaturedGroup.albums.map((album) => (
              <Link
                key={`${album.title}-${album.artist}`}
                href={album.href}
                className="editorial-panel p-4"
              >
                <div
                  className="cover-frame aspect-[4/5] p-4"
                  style={{
                    backgroundImage: `url(${album.imageUrl})`,
                  }}
                >
                  <div className="relative z-10 flex h-full items-start justify-between">
                    <span className="pill">{album.tag}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="text-xl font-bold">{album.title}</h4>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{album.artist}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
