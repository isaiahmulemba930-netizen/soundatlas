"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getAuthenticatedUser } from "@/lib/follows";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AppTopNavProps = {
  active?: "marketplace" | "profile" | "messages" | "";
};

export function AppTopNav({ active = "" }: AppTopNavProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const user = await getAuthenticatedUser();
        if (!isMounted) {
          return;
        }

        setIsSignedIn(Boolean(user));
      } catch {
        if (!isMounted) {
          return;
        }

        setIsSignedIn(false);
      }
    }

    void loadUser();

    if (!supabase || !isSupabaseConfigured) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setIsSignedIn(Boolean(session?.user));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    if (!supabase || !isSupabaseConfigured) {
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/messages" className={active === "messages" ? "solid-button" : "nav-link"}>
        Messages
      </Link>
      <Link href="/profile" className={active === "profile" ? "solid-button" : "nav-link"}>
        Your Profile
      </Link>
      <Link href="/marketplace" className={active === "marketplace" ? "solid-button" : "nav-link"}>
        Marketplace
      </Link>
      {isSignedIn ? (
        <button type="button" onClick={() => void handleSignOut()} className="app-button">
          Sign Out
        </button>
      ) : (
        <button type="button" onClick={() => { window.location.href = "/?auth=signin"; }} className="app-button">
          Sign In
        </button>
      )}
    </div>
  );
}
