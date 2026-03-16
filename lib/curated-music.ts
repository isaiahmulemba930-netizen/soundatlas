export type CuratedAlbum = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  artistBio: string;
  year: string;
  imageUrl: string;
  tracks: string[];
  moods: string[];
};

export type CuratedMood = {
  slug: string;
  title: string;
  subtitle: string;
  albumIds: string[];
};

export const curatedAlbums: CuratedAlbum[] = [
  {
    id: "623f52ad-5f65-45c2-b6f7-12c2f1ab5c6c",
    slug: "blonde",
    title: "Blonde",
    artist: "Frank Ocean",
    artistBio:
      "Frank Ocean is an American singer-songwriter from Long Beach, California, who broke through as a writer and member of Odd Future before becoming one of the defining voices in modern R&B.",
    year: "2016",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg",
    tracks: [
      "Nikes",
      "Ivy",
      "Pink + White",
      "Be Yourself",
      "Solo",
      "Skyline To",
      "Self Control",
      "Good Guy",
      "Nights",
      "Solo (Reprise)",
      "Pretty Sweet",
      "Facebook Story",
      "Close to You",
      "White Ferrari",
      "Seigfried",
      "Godspeed",
      "Futura Free",
    ],
    moods: ["late-night-rap", "modern-rnb", "indie-canon", "pop-peaks"],
  },
  {
    id: "7857867a-9c03-3a7b-9317-1e7203d1f0ac",
    slug: "to-pimp-a-butterfly",
    title: "To Pimp a Butterfly",
    artist: "Kendrick Lamar",
    artistBio:
      "Kendrick Lamar is a rapper from Compton, California, who built momentum through self-released projects and critical acclaim before becoming one of the most influential artists of his generation.",
    year: "2015",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/96/To_Pimp_a_Butterfly.jpg",
    tracks: [
      "Wesley's Theory",
      "For Free? (Interlude)",
      "King Kunta",
      "Institutionalized",
      "These Walls",
      "u",
      "Alright",
      "For Sale? (Interlude)",
      "Momma",
      "Hood Politics",
      "How Much a Dollar Cost",
      "Complexion (A Zulu Love)",
      "The Blacker the Berry",
      "You Ain't Gotta Lie (Momma Said)",
      "i",
      "Mortal Man",
    ],
    moods: ["late-night-rap", "indie-canon", "pop-peaks"],
  },
  {
    id: "0e7548f5-b5c5-4c84-b723-fc6b7854c17a",
    slug: "currents",
    title: "Currents",
    artist: "Tame Impala",
    artistBio:
      "Tame Impala is the psychedelic music project led by Kevin Parker from Perth, Australia, whose home-recorded sound and festival acclaim helped turn the project into a global alternative staple.",
    year: "2015",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/9b/Tame_Impala_-_Currents.png",
    tracks: [
      "Let It Happen",
      "Nangs",
      "The Moment",
      "Yes I'm Changing",
      "Eventually",
      "Gossip",
      "The Less I Know the Better",
      "Past Life",
      "Disciples",
      "'Cause I'm a Man",
      "Reality in Motion",
      "Love/Paranoia",
      "New Person, Same Old Mistakes",
    ],
    moods: ["modern-rnb", "indie-canon", "pop-peaks"],
  },
  {
    id: "c28cff62-23a0-3b1d-b374-6f8d5647e9d1",
    slug: "after-hours",
    title: "After Hours",
    artist: "The Weeknd",
    artistBio:
      "The Weeknd is a singer-songwriter from Toronto whose mysterious early mixtapes, dark pop sensibility, and viral breakout helped turn him into one of the biggest global stars in music.",
    year: "2020",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c1/The_Weeknd_-_After_Hours.png",
    tracks: [
      "Alone Again",
      "Too Late",
      "Hardest to Love",
      "Scared to Live",
      "Snowchild",
      "Escape from LA",
      "Heartless",
      "Faith",
      "Blinding Lights",
      "In Your Eyes",
      "Save Your Tears",
      "Repeat After Me (Interlude)",
      "After Hours",
      "Until I Bleed Out",
    ],
    moods: ["modern-rnb", "pop-peaks", "late-night-rap"],
  },
];

export const curatedMoods: CuratedMood[] = [
  {
    slug: "late-night-rap",
    title: "Late Night Rap",
    subtitle: "Records with gravity, atmosphere, and the kind of writing people sit with after midnight.",
    albumIds: ["7857867a-9c03-3a7b-9317-1e7203d1f0ac", "623f52ad-5f65-45c2-b6f7-12c2f1ab5c6c", "c28cff62-23a0-3b1d-b374-6f8d5647e9d1"],
  },
  {
    slug: "modern-rnb",
    title: "Modern R&B",
    subtitle: "Albums built on intimacy, replay value, and a strong sense of atmosphere.",
    albumIds: ["623f52ad-5f65-45c2-b6f7-12c2f1ab5c6c", "c28cff62-23a0-3b1d-b374-6f8d5647e9d1", "0e7548f5-b5c5-4c84-b723-fc6b7854c17a"],
  },
  {
    slug: "indie-canon",
    title: "Indie Canon",
    subtitle: "Albums with a cultish pull, a clear point of view, and a long shelf life.",
    albumIds: ["0e7548f5-b5c5-4c84-b723-fc6b7854c17a", "623f52ad-5f65-45c2-b6f7-12c2f1ab5c6c", "7857867a-9c03-3a7b-9317-1e7203d1f0ac"],
  },
  {
    slug: "pop-peaks",
    title: "Pop Peaks",
    subtitle: "Big, polished records with huge moments and songs that stay in circulation for years.",
    albumIds: ["c28cff62-23a0-3b1d-b374-6f8d5647e9d1", "0e7548f5-b5c5-4c84-b723-fc6b7854c17a", "623f52ad-5f65-45c2-b6f7-12c2f1ab5c6c"],
  },
];

export function getCuratedAlbumById(id: string) {
  return curatedAlbums.find((album) => album.id === id) ?? null;
}

export function getCuratedMoodBySlug(slug: string) {
  return curatedMoods.find((mood) => mood.slug === slug) ?? null;
}
