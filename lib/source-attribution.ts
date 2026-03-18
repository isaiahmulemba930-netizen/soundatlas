export type SourceGroup = {
  label: string;
  sources: string[];
};

export const HOMEPAGE_SOURCE_GROUPS: SourceGroup[] = [
  {
    label: "Reviews",
    sources: ["SoundAtlas public reviews", "SoundAtlas profiles"],
  },
  {
    label: "Albums",
    sources: ["Apple Music / iTunes Search & Lookup", "MusicBrainz", "Wikipedia"],
  },
  {
    label: "Artists",
    sources: ["MusicBrainz", "Apple Music charts", "Wikipedia"],
  },
  {
    label: "Tracks",
    sources: ["Apple Music / iTunes Search & Lookup", "MusicBrainz", "Wikipedia", "Genius"],
  },
  {
    label: "Charts & Trending",
    sources: ["Apple Music RSS / Apple Marketing Tools"],
  },
  {
    label: "Lyrics / Meanings",
    sources: ["Genius", "Wikipedia"],
  },
  {
    label: "Genres",
    sources: ["Apple Music charts", "current genre search activity", "regional listening patterns"],
  },
];
