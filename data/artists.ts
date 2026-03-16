import { drake } from "./artists/drake";
import { kendrick } from "./artists/kendrick-lamar";
import { taylor } from "./artists/taylor-swift";

export const artists = [drake, kendrick, taylor];

export function getArtistBySlug(slug: string) {
  return artists.find((artist) => artist.slug === slug);
}