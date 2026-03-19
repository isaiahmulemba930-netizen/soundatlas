"use client";

import { useEffect, useState } from "react";

import { subscribeToBadgeUpdates, type UserBadge } from "@/lib/badges";

export function BadgeUnlockedToast() {
  const [queue, setQueue] = useState<UserBadge[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToBadgeUpdates((badges) => {
      if (badges.length === 0) {
        return;
      }

      setQueue((current) => [...current, ...badges]);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (queue.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setQueue((current) => current.slice(1));
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [queue]);

  const activeBadge = queue[0];
  if (!activeBadge) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[90] max-w-sm rounded-[1.4rem] border p-4 shadow-2xl backdrop-blur-md" style={{ borderColor: "var(--border-main)", background: "rgba(10,12,18,0.88)" }}>
      <p className="kicker">Badge unlocked</p>
      <div className="mt-3 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border text-xs font-semibold uppercase tracking-[0.14em]" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.05)" }}>
          {activeBadge.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{activeBadge.name}</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">{activeBadge.description}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {activeBadge.category} · {activeBadge.rarity}
          </p>
        </div>
      </div>
    </div>
  );
}
