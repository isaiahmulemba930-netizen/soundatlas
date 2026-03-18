"use client";

import { useMemo, useState } from "react";

type StarRatingProps = {
  storageKey: string;
  label?: string;
  size?: number;
  showValue?: boolean;
  onChange?: (value: number) => void;
  initialValue?: number;
};

function StarIcon({
  fillPercent,
  size,
}: {
  fillPercent: number;
  size: number;
}) {
  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0 text-zinc-700"
        width={size}
        height={size}
        fill="currentColor"
      >
        <path d="M12 2.5l2.93 5.94 6.56.95-4.74 4.62 1.12 6.53L12 17.77l-5.87 3.09 1.12-6.53L2.5 9.39l6.56-.95L12 2.5z" />
      </svg>

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${fillPercent}%` }}
      >
        <svg
          viewBox="0 0 24 24"
          className="text-amber-400 drop-shadow-[0_0_6px_rgba(245,197,66,0.25)]"
          width={size}
          height={size}
          fill="currentColor"
        >
          <path d="M12 2.5l2.93 5.94 6.56.95-4.74 4.62 1.12 6.53L12 17.77l-5.87 3.09 1.12-6.53L2.5 9.39l6.56-.95L12 2.5z" />
        </svg>
      </div>
    </div>
  );
}

export default function StarRating({
  storageKey,
  label = "Your rating",
  size = 26,
  showValue = true,
  onChange,
  initialValue = 0,
}: StarRatingProps) {
  const [rating, setRating] = useState(() => {
    if (typeof window === "undefined") return 0;

    const saved = window.localStorage.getItem(storageKey);
    const parsed = Number(saved);
    return Number.isNaN(parsed) ? initialValue : parsed;
  });
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const activeRating = hoverRating ?? rating;

  function saveRating(value: number) {
    setRating(value);
    window.localStorage.setItem(storageKey, String(value));
    onChange?.(value);
  }

  function clearRating() {
    setRating(0);
    window.localStorage.removeItem(storageKey);
    onChange?.(0);
  }

  const stars = useMemo(() => {
    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1;
      let fillPercent = 0;

      if (activeRating >= starNumber) {
        fillPercent = 100;
      } else if (activeRating >= starNumber - 0.5) {
        fillPercent = 50;
      }

      return { starNumber, fillPercent };
    });
  }, [activeRating]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-300">{label}</p>

        <button
          onClick={clearRating}
          className="text-xs text-zinc-500 hover:text-zinc-300"
          type="button"
        >
          Clear
        </button>
      </div>

      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHoverRating(null)}
      >
        {stars.map((star, index) => (
          <button
            key={star.starNumber}
            type="button"
            className="transition-transform hover:scale-105"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const isHalf = x < rect.width / 2;
              const value = index + (isHalf ? 0.5 : 1);
              setHoverRating(value);
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const isHalf = x < rect.width / 2;
              const value = index + (isHalf ? 0.5 : 1);
              saveRating(value);
            }}
            title={`Rate ${index + 1} star${index === 0 ? "" : "s"}`}
          >
            <StarIcon fillPercent={star.fillPercent} size={size} />
          </button>
        ))}
      </div>

      {showValue && (
        <p className="mt-2 text-sm text-zinc-400">
          {activeRating > 0 ? `${activeRating.toFixed(1)} / 5` : "Not rated yet"}
        </p>
      )}
    </div>
  );
}
