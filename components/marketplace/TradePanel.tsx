"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatAtlasCredits } from "@/lib/music-market-format";
import { buyMarketAsset, sellMarketAsset } from "@/lib/music-market-client";
import type { MarketQuote } from "@/lib/music-market-types";

type TradePanelProps = {
  quote: MarketQuote;
};

export function TradePanel({ quote }: TradePanelProps) {
  const router = useRouter();
  const [shares, setShares] = useState("1");
  const [pendingSide, setPendingSide] = useState<"buy" | "sell" | "">("");
  const [status, setStatus] = useState("");
  const shareCount = Math.max(Number(shares) || 0, 0);
  const orderValue = quote.currentPrice * shareCount;
  const thesis =
    quote.entityType === "song"
      ? "Invest early in rising songs before the next daily spike."
      : quote.entityType === "artist"
        ? "Back artists you think will blow up across multiple releases."
        : "Predict the next hit album before release momentum peaks.";

  function getMessageFromError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string") {
      return (error as { message: string }).message;
    }

    return "Unable to process that trade right now.";
  }

  async function handleTrade(side: "buy" | "sell") {
    setPendingSide(side);
    setStatus("");

    try {
      if (side === "buy") {
        await buyMarketAsset(quote, shareCount);
        setStatus(`Bought ${shareCount} shares of ${quote.entityName} for ${formatAtlasCredits(orderValue)}.`);
      } else {
        await sellMarketAsset(quote, shareCount);
        setStatus(`Sold ${shareCount} shares of ${quote.entityName} for ${formatAtlasCredits(orderValue)}.`);
      }

      router.refresh();
    } catch (error) {
      const message = getMessageFromError(error);
      console.error("Marketplace trade error", error);
      setStatus(message);
    } finally {
      setPendingSide("");
    }
  }

  return (
    <div className="app-panel p-6 md:p-7">
      <p className="kicker">Trade</p>
      <h2 className="section-heading mt-3 font-bold">Invest with Atlas Credits</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{thesis}</p>
      <div className="mt-5 rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.03)" }}>
        <p className="text-sm text-[var(--text-soft)]">Current price</p>
        <p className="mt-2 text-3xl font-bold">{formatAtlasCredits(quote.currentPrice)}</p>
        <p className="mt-3 text-sm text-[var(--text-soft)]">
          Reward lane: <span className="font-semibold text-[var(--text-main)]">{quote.rewardProfile.label} upside</span>
        </p>
        <p className="mt-2 text-sm text-[var(--text-soft)]">{quote.rewardProfile.reason}</p>
      </div>

      <div className="mt-5">
        <label className="text-sm text-[var(--text-soft)]" htmlFor="market-shares">Shares</label>
        <input
          id="market-shares"
          className="app-input mt-2"
          value={shares}
          onChange={(event) => setShares(event.target.value)}
          inputMode="decimal"
        />
        <p className="mt-2 text-sm text-[var(--text-muted)]">Order value: {formatAtlasCredits(orderValue)}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleTrade("buy")}
          disabled={pendingSide !== "" || shareCount <= 0}
          className="solid-button"
        >
          {pendingSide === "buy" ? "Buying..." : "Buy"}
        </button>
        <button
          type="button"
          onClick={() => void handleTrade("sell")}
          disabled={pendingSide !== "" || shareCount <= 0}
          className="ghost-button"
        >
          {pendingSide === "sell" ? "Selling..." : "Sell"}
        </button>
      </div>

      {status ? <p className="mt-4 text-sm text-[var(--text-soft)]">{status}</p> : null}
    </div>
  );
}
