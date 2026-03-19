import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { detectMarketFromHeaders } from "@/lib/market";
import { getUpcomingReleases, searchUpcomingReleases } from "@/lib/upcoming-releases";

export const revalidate = 1800;

export async function GET(request: NextRequest) {
  const headerStore = await headers();
  const market = detectMarketFromHeaders(headerStore);
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "5");
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  const payload = query
    ? await searchUpcomingReleases(query, market.country)
    : await getUpcomingReleases(market.country, Math.max(1, Math.min(limit, 20)));

  return NextResponse.json(payload);
}
