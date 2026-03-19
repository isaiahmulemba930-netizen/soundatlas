"use client";

import { useMemo, useState } from "react";

import { pinOwnBadges, type BadgeSnapshot } from "@/lib/badges";

type BadgeShowcaseProps = {
  snapshot: BadgeSnapshot;
  editable?: boolean;
};

function rarityClass(rarity: string) {
  if (rarity === "Legendary") return "text-[#f7c76b]";
  if (rarity === "Epic") return "text-[#8dc5ff]";
  if (rarity === "Rare") return "text-[#8ee0b8]";
  return "text-[var(--text-main)]";
}

export function BadgeShowcase({ snapshot, editable = false }: BadgeShowcaseProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(snapshot.pinnedBadges.map((badge) => badge.key));
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const pinnedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  async function handleTogglePin(badgeKey: string) {
    if (!editable) {
      return;
    }

    setMessage("");
    setSelectedKeys((current) => {
      if (current.includes(badgeKey)) {
        return current.filter((key) => key !== badgeKey);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, badgeKey];
    });
  }

  async function handleSavePins() {
    setIsSaving(true);
    setMessage("");

    try {
      await pinOwnBadges(selectedKeys);
      setMessage("Pinned badges updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update pinned badges right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="app-panel p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">Badges</p>
          <h2 className="section-heading mt-3 font-bold">Achievement showcase</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
            {snapshot.certified
              ? "Certified status is unlocked. Your profile now shows a verified taste signal and premium badge showcase for free."
              : `Earn 8 badges across at least 3 categories to become Certified. ${snapshot.certifiedProgress.neededBadges} badges and ${snapshot.certifiedProgress.neededCategories} categories left.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="pill">{snapshot.totalBadgeCount} badges</span>
          {snapshot.certified ? <span className="pill">Certified</span> : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {Object.entries(snapshot.rarityBreakdown).map(([rarity, count]) => (
          <div
            key={rarity}
            className="rounded-[1.2rem] border p-4"
            style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
          >
            <p className="kicker">{rarity}</p>
            <p className={`mt-2 text-2xl font-bold ${rarityClass(rarity)}`}>{count}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="kicker">Pinned</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {snapshot.badges.filter((badge) => pinnedSet.has(badge.key)).slice(0, 3).map((badge) => (
            <div
              key={badge.key}
              className="rounded-[1.2rem] border p-4"
              style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{badge.icon}</p>
              <p className="mt-2 font-semibold">{badge.name}</p>
              <p className={`mt-2 text-sm ${rarityClass(badge.rarity)}`}>{badge.rarity}</p>
            </div>
          ))}
          {snapshot.badges.filter((badge) => pinnedSet.has(badge.key)).length === 0 ? (
            <div className="rounded-[1.2rem] border p-4 text-sm text-[var(--text-soft)] md:col-span-3" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
              No pinned badges yet.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="kicker">All badges</p>
          {editable ? (
            <button type="button" className="ghost-button" onClick={() => void handleSavePins()} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save pinned badges"}
            </button>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.badges.map((badge) => (
            <button
              key={badge.key}
              type="button"
              onClick={() => void handleTogglePin(badge.key)}
              disabled={!editable}
              className="rounded-[1.2rem] border p-4 text-left"
              style={{ borderColor: pinnedSet.has(badge.key) ? "var(--accent-green)" : "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{badge.icon}</p>
              <p className="mt-2 font-semibold">{badge.name}</p>
              <p className="mt-2 text-sm text-[var(--text-soft)]">{badge.description}</p>
              <p className={`mt-3 text-sm ${rarityClass(badge.rarity)}`}>{badge.rarity}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{badge.category}</p>
            </button>
          ))}
          {snapshot.badges.length === 0 ? (
            <div className="rounded-[1.2rem] border p-4 text-sm text-[var(--text-soft)] md:col-span-2 xl:col-span-3" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
              No badges unlocked yet. Your first review, rating, follow, listening day, or investment can start the board.
            </div>
          ) : null}
        </div>
      </div>

      {snapshot.progress.length > 0 ? (
        <div className="mt-6">
          <p className="kicker">Progress</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {snapshot.progress.filter((item) => !item.unlocked).slice(0, 8).map((item) => (
              <div
                key={item.key}
                className="rounded-[1.2rem] border p-4"
                style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">{item.unlockRequirement}</p>
                  </div>
                  <p className={`text-sm ${rarityClass(item.rarity)}`}>{item.rarity}</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[var(--accent-green)]" style={{ width: `${item.percent}%` }} />
                </div>
                <p className="mt-2 text-sm text-[var(--text-soft)]">{item.progressLabel}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-[var(--text-soft)]">{message}</p> : null}
    </section>
  );
}
