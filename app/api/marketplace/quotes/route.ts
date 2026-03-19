import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { detectMarketFromHeaders } from "@/lib/market";
import { getQuotesForAssets } from "@/lib/music-market";

export const revalidate = 600;

export async function POST(request: NextRequest) {
  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const body = (await request.json().catch(() => ({ refs: [] }))) as {
    refs?: Array<{ entityType: "song" | "artist" | "album"; entityId: string }>;
  };

  const refs = (body.refs ?? []).map((ref) => ({
    entityType: ref.entityType,
    entityId: ref.entityId,
    country: market.country,
    countryName: market.countryName,
  }));

  const quotes = await getQuotesForAssets(refs);
  return NextResponse.json({ quotes });
}
