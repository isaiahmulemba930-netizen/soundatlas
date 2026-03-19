export type UpcomingReleaseStatus = "confirmed" | "expected" | "teased";

export type UpcomingRelease = {
  id: string;
  artistName: string;
  artistHref: string;
  releaseTitle: string;
  releaseType: string;
  status: UpcomingReleaseStatus;
  statusLabel: string;
  dateLabel: string;
  releaseDate: string | null;
  artworkUrl: string;
  reason: string;
  href: string | null;
  sourceUrl: string | null;
  sourceLabel: string;
  country: string;
  countryName: string;
  score: number;
};

export type UpcomingReleasesPayload = {
  releases: UpcomingRelease[];
  country: string;
  countryName: string;
  sourceSummary: string;
  refreshedAt: string;
};
