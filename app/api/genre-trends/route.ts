import { NextResponse } from "next/server";

import { getTrendingGenres } from "@/lib/genre-trends";

export const revalidate = 1800;

export async function GET() {
  const payload = await getTrendingGenres();
  return NextResponse.json(payload);
}
