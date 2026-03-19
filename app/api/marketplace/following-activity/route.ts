import { NextRequest, NextResponse } from "next/server";

import { getMarketActivityFeed } from "@/lib/music-market";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const userIds = (request.nextUrl.searchParams.get("userIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const activity = await getMarketActivityFeed(userIds.length > 0 ? userIds : undefined);
  return NextResponse.json({ activity });
}
