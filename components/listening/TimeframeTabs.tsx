"use client";

import type { ListeningTimeframe } from "@/lib/listening";
import { getTimeframeLabel } from "@/lib/listening-recommendations";

const timeframeOrder: ListeningTimeframe[] = ["weekly", "monthly", "yearly", "all-time"];

type TimeframeTabsProps = {
  value: ListeningTimeframe;
  onChange: (value: ListeningTimeframe) => void;
};

export function TimeframeTabs({ value, onChange }: TimeframeTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {timeframeOrder.map((timeframe) => (
        <button
          key={timeframe}
          type="button"
          onClick={() => onChange(timeframe)}
          className={value === timeframe ? "app-button" : "ghost-button"}
        >
          {getTimeframeLabel(timeframe)}
        </button>
      ))}
    </div>
  );
}
