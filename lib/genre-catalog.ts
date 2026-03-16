export type GenreAlbum = {
  slug: string;
  title: string;
  artist: string;
  year: string;
  genre: string;
  artistInfo: string;
};

export type GenreCollection = {
  slug: string;
  title: string;
  subtitle: string;
  albumSlugs: string[];
};

export const genreAlbums: GenreAlbum[] = [
  { slug: "abbey-road", title: "Abbey Road", artist: "The Beatles", year: "1969", genre: "Rock", artistInfo: "The Beatles were a Liverpool group whose songwriting leap and studio experimentation helped define the modern album canon." },
  { slug: "the-dark-side-of-the-moon", title: "The Dark Side of the Moon", artist: "Pink Floyd", year: "1973", genre: "Rock", artistInfo: "Pink Floyd came out of London psychedelia and became one of rock's most expansive and sonically ambitious bands." },
  { slug: "led-zeppelin-iv", title: "Led Zeppelin IV", artist: "Led Zeppelin", year: "1971", genre: "Rock", artistInfo: "Led Zeppelin fused British hard rock, blues, and folk into a larger-than-life sound that became arena-rock shorthand." },
  { slug: "exile-on-main-street", title: "Exile on Main St.", artist: "The Rolling Stones", year: "1972", genre: "Rock", artistInfo: "The Rolling Stones turned swaggering blues-rock into one of the most durable and influential catalogs in popular music." },
  { slug: "born-to-run", title: "Born to Run", artist: "Bruce Springsteen", year: "1975", genre: "Rock", artistInfo: "Bruce Springsteen built his reputation on cinematic songwriting, bar-band intensity, and stories that made rock feel lived in." },

  { slug: "red-headed-stranger", title: "Red Headed Stranger", artist: "Willie Nelson", year: "1975", genre: "Country", artistInfo: "Willie Nelson helped reshape outlaw country with loose, personal records that pushed against Nashville expectations." },
  { slug: "coat-of-many-colors", title: "Coat of Many Colors", artist: "Dolly Parton", year: "1971", genre: "Country", artistInfo: "Dolly Parton wrote sharp, deeply human country songs and became one of the genre's most beloved voices." },
  { slug: "at-folsom-prison", title: "At Folsom Prison", artist: "Johnny Cash", year: "1968", genre: "Country", artistInfo: "Johnny Cash's plainspoken delivery and outlaw aura made him one of country's most iconic crossover figures." },
  { slug: "golden-hour", title: "Golden Hour", artist: "Kacey Musgraves", year: "2018", genre: "Country", artistInfo: "Kacey Musgraves brought conversational writing and airy production into modern country's mainstream." },
  { slug: "metamodern-sounds-in-country-music", title: "Metamodern Sounds in Country Music", artist: "Sturgill Simpson", year: "2014", genre: "Country", artistInfo: "Sturgill Simpson blended classic country instincts with cosmic themes and a wider rock-minded palette." },

  { slug: "ok-computer", title: "OK Computer", artist: "Radiohead", year: "1997", genre: "Alternative", artistInfo: "Radiohead evolved from Britpop outsiders into one of the defining alternative bands by pairing anxiety, ambition, and experimentation." },
  { slug: "doolittle", title: "Doolittle", artist: "Pixies", year: "1989", genre: "Alternative", artistInfo: "Pixies' loud-quiet dynamics and surreal songwriting became foundational to alternative rock in the decades that followed." },
  { slug: "disintegration", title: "Disintegration", artist: "The Cure", year: "1989", genre: "Alternative", artistInfo: "The Cure turned post-punk gloom into something grand, romantic, and hugely influential across alternative music." },
  { slug: "siamese-dream", title: "Siamese Dream", artist: "The Smashing Pumpkins", year: "1993", genre: "Alternative", artistInfo: "The Smashing Pumpkins mixed shoegaze texture, metal heft, and emo vulnerability into alt-rock blockbusters." },
  { slug: "grace", title: "Grace", artist: "Jeff Buckley", year: "1994", genre: "Alternative", artistInfo: "Jeff Buckley's voice and dramatic songwriting turned a brief catalog into one of alternative music's enduring touchstones." },

  { slug: "is-this-it", title: "Is This It", artist: "The Strokes", year: "2001", genre: "Indie", artistInfo: "The Strokes' stripped-back cool and downtown mythology helped kick off a new wave of indie rock in the 2000s." },
  { slug: "funeral", title: "Funeral", artist: "Arcade Fire", year: "2004", genre: "Indie", artistInfo: "Arcade Fire broke out with emotionally maximal indie rock that made community and catharsis feel huge." },
  { slug: "yankee-hotel-foxtrot", title: "Yankee Hotel Foxtrot", artist: "Wilco", year: "2002", genre: "Indie", artistInfo: "Wilco's blend of roots songwriting and adventurous studio detail made them a cornerstone of American indie music." },
  { slug: "for-emma-forever-ago", title: "For Emma, Forever Ago", artist: "Bon Iver", year: "2007", genre: "Indie", artistInfo: "Bon Iver emerged from intimate folk recordings into one of indie's most influential and emotionally resonant projects." },
  { slug: "illinois", title: "Illinois", artist: "Sufjan Stevens", year: "2005", genre: "Indie", artistInfo: "Sufjan Stevens built a devoted following through ornate arrangements, literary songwriting, and deeply personal world-building." },

  { slug: "discovery", title: "Discovery", artist: "Daft Punk", year: "2001", genre: "Dance", artistInfo: "Daft Punk turned French house into global pop architecture with gleaming hooks and meticulous production." },
  { slug: "renaissance", title: "Renaissance", artist: "Beyonce", year: "2022", genre: "Dance", artistInfo: "Beyonce has repeatedly reset pop's center of gravity, and this era foregrounded club history with mainstream scale." },
  { slug: "confessions-on-a-dance-floor", title: "Confessions on a Dance Floor", artist: "Madonna", year: "2005", genre: "Dance", artistInfo: "Madonna built an unmatched run of reinventions by staying ahead of pop and club music's shifting language." },
  { slug: "future-nostalgia", title: "Future Nostalgia", artist: "Dua Lipa", year: "2020", genre: "Dance", artistInfo: "Dua Lipa helped bring sleek disco-pop back to the center of radio with a sharper, more physical sense of groove." },
  { slug: "whats-your-pleasure", title: "What's Your Pleasure?", artist: "Jessie Ware", year: "2020", genre: "Dance", artistInfo: "Jessie Ware's warm, sophisticated dance-pop drew on club lineage while sounding crisp and modern." },

  { slug: "siembra", title: "Siembra", artist: "Willie Colon & Ruben Blades", year: "1978", genre: "Latin", artistInfo: "Willie Colon and Ruben Blades helped turn salsa records into major cultural events with storytelling and political bite." },
  { slug: "el-mal-querer", title: "El Mal Querer", artist: "Rosalia", year: "2018", genre: "Latin", artistInfo: "Rosalia fused flamenco roots, pop instincts, and bold visual identity into one of Latin music's most discussed modern breakthroughs." },
  { slug: "un-verano-sin-ti", title: "Un Verano Sin Ti", artist: "Bad Bunny", year: "2022", genre: "Latin", artistInfo: "Bad Bunny became a global force by making Latin music feel both massive and stylistically fearless." },
  { slug: "bocanada", title: "Bocanada", artist: "Gustavo Cerati", year: "1999", genre: "Latin", artistInfo: "Gustavo Cerati brought art-rock ambition and melodic clarity into Latin alternative at a generational level." },
  { slug: "buena-vista-social-club", title: "Buena Vista Social Club", artist: "Buena Vista Social Club", year: "1997", genre: "Latin", artistInfo: "Buena Vista Social Club reintroduced classic Cuban performance traditions to a global audience with warmth and elegance." },

  { slug: "african-giant", title: "African Giant", artist: "Burna Boy", year: "2019", genre: "Afrobeats", artistInfo: "Burna Boy scaled Afrobeats globally by pairing charismatic songwriting with a sound big enough for every market." },
  { slug: "made-in-lagos", title: "Made in Lagos", artist: "Wizkid", year: "2020", genre: "Afrobeats", artistInfo: "Wizkid's melodic ease and crossover instincts helped make Afrobeats a core part of global pop listening." },
  { slug: "timeless", title: "Timeless", artist: "Davido", year: "2023", genre: "Afrobeats", artistInfo: "Davido built superstar momentum through hitmaking consistency and an instinct for songs that travel across scenes." },
  { slug: "mr-money-with-the-vibe", title: "Mr. Money with the Vibe", artist: "Asake", year: "2022", genre: "Afrobeats", artistInfo: "Asake rose quickly with street-pop energy, sticky melodies, and a style that felt instantly communal." },
  { slug: "boy-alone", title: "Boy Alone", artist: "Omah Lay", year: "2022", genre: "Afrobeats", artistInfo: "Omah Lay brought introspective writing and a softer emotional register into the Afrobeats mainstream." },

  { slug: "pink-tape", title: "Pink Tape", artist: "f(x)", year: "2013", genre: "K-Pop", artistInfo: "f(x) pushed K-pop toward stranger, artier territory while keeping the music bright and accessible." },
  { slug: "modern-times", title: "Modern Times", artist: "IU", year: "2013", genre: "K-Pop", artistInfo: "IU became one of Korea's defining singer-songwriters through vocal clarity, range, and unusually strong album craft." },
  { slug: "the-perfect-red-velvet", title: "The Perfect Red Velvet", artist: "Red Velvet", year: "2018", genre: "K-Pop", artistInfo: "Red Velvet built a reputation for adventurous singles and albums that balance hooks with unusual production ideas." },
  { slug: "made", title: "MADE", artist: "BIGBANG", year: "2016", genre: "K-Pop", artistInfo: "BIGBANG helped define idol-group scale and swagger, turning K-pop releases into event-level pop culture moments." },
  { slug: "love-yourself-tear", title: "Love Yourself 轉 'Tear'", artist: "BTS", year: "2018", genre: "K-Pop", artistInfo: "BTS translated a deeply engaged fan community and emotionally direct songwriting into worldwide pop dominance." },

  { slug: "selected-ambient-works-85-92", title: "Selected Ambient Works 85-92", artist: "Aphex Twin", year: "1992", genre: "Electronic", artistInfo: "Aphex Twin became an electronic touchstone by balancing accessibility with weirdness, melody, and technical imagination." },
  { slug: "music-has-the-right-to-children", title: "Music Has the Right to Children", artist: "Boards of Canada", year: "1998", genre: "Electronic", artistInfo: "Boards of Canada made nostalgic, off-kilter electronic music that influenced ambient, hip-hop, and indie producers alike." },
  { slug: "untrue", title: "Untrue", artist: "Burial", year: "2007", genre: "Electronic", artistInfo: "Burial's ghostly take on UK club music became one of electronic music's most beloved and imitated modern records." },
  { slug: "moon-safari", title: "Moon Safari", artist: "Air", year: "1998", genre: "Electronic", artistInfo: "Air translated downtempo elegance and retro-futurist polish into one of the genre's most replayable albums." },
  { slug: "immunity", title: "Immunity", artist: "Jon Hopkins", year: "2013", genre: "Electronic", artistInfo: "Jon Hopkins merged club energy with cinematic build and detail, making electronic music feel both intimate and expansive." },

  { slug: "whats-going-on", title: "What's Going On", artist: "Marvin Gaye", year: "1971", genre: "Soul", artistInfo: "Marvin Gaye turned silky phrasing and social conscience into one of soul music's most admired bodies of work." },
  { slug: "songs-in-the-key-of-life", title: "Songs in the Key of Life", artist: "Stevie Wonder", year: "1976", genre: "Soul", artistInfo: "Stevie Wonder's run of 1970s albums raised the bar for how ambitious, joyful, and musically rich soul records could be." },
  { slug: "i-never-loved-a-man", title: "I Never Loved a Man the Way I Love You", artist: "Aretha Franklin", year: "1967", genre: "Soul", artistInfo: "Aretha Franklin's command, phrasing, and emotional force made her the benchmark for modern soul singing." },
  { slug: "voodoo", title: "Voodoo", artist: "D'Angelo", year: "2000", genre: "Soul", artistInfo: "D'Angelo helped define neo-soul by making groove-heavy, deeply felt records that reshaped R&B's texture." },
  { slug: "call-me", title: "Call Me", artist: "Al Green", year: "1973", genre: "Soul", artistInfo: "Al Green's feather-light voice and Southern soul classics remain some of the most instantly recognizable recordings in the genre." },

  { slug: "master-of-puppets", title: "Master of Puppets", artist: "Metallica", year: "1986", genre: "Metal", artistInfo: "Metallica pushed thrash into a grander and more technical shape without losing its velocity or force." },
  { slug: "paranoid", title: "Paranoid", artist: "Black Sabbath", year: "1970", genre: "Metal", artistInfo: "Black Sabbath's riff-heavy darkness effectively wrote the first chapter of heavy metal." },
  { slug: "reign-in-blood", title: "Reign in Blood", artist: "Slayer", year: "1986", genre: "Metal", artistInfo: "Slayer made extremity feel streamlined and terrifying, setting a pace countless metal bands chased after." },
  { slug: "rust-in-peace", title: "Rust in Peace", artist: "Megadeth", year: "1990", genre: "Metal", artistInfo: "Megadeth specialized in technical precision, speed, and guitar work that became a standard for progressive thrash." },
  { slug: "blackwater-park", title: "Blackwater Park", artist: "Opeth", year: "2001", genre: "Metal", artistInfo: "Opeth expanded metal's emotional and structural range by blending brutality with prog, folk, and atmosphere." },
];

export const genreCollections: GenreCollection[] = [
  { slug: "rock", title: "Rock", subtitle: "Five foundational albums that still anchor all-time discussions.", albumSlugs: ["abbey-road", "the-dark-side-of-the-moon", "led-zeppelin-iv", "exile-on-main-street", "born-to-run"] },
  { slug: "country", title: "Country", subtitle: "Classic and modern records that regularly show up in best-of-country conversations.", albumSlugs: ["red-headed-stranger", "coat-of-many-colors", "at-folsom-prison", "golden-hour", "metamodern-sounds-in-country-music"] },
  { slug: "alternative", title: "Alternative", subtitle: "Big-shaping records from alternative music's loud, moody, and artful center.", albumSlugs: ["ok-computer", "doolittle", "disintegration", "siamese-dream", "grace"] },
  { slug: "indie", title: "Indie", subtitle: "Albums that helped define the 2000s and 2010s indie canon.", albumSlugs: ["is-this-it", "funeral", "yankee-hotel-foxtrot", "for-emma-forever-ago", "illinois"] },
  { slug: "dance", title: "Dance", subtitle: "Club-minded albums that critics and listeners keep returning to.", albumSlugs: ["discovery", "renaissance", "confessions-on-a-dance-floor", "future-nostalgia", "whats-your-pleasure"] },
  { slug: "latin", title: "Latin", subtitle: "Widely celebrated Latin albums spanning salsa, alternative, reggaeton, and beyond.", albumSlugs: ["siembra", "el-mal-querer", "un-verano-sin-ti", "bocanada", "buena-vista-social-club"] },
  { slug: "afrobeats", title: "Afrobeats", subtitle: "Key modern albums from artists who helped push Afrobeats worldwide.", albumSlugs: ["african-giant", "made-in-lagos", "timeless", "mr-money-with-the-vibe", "boy-alone"] },
  { slug: "k-pop", title: "K-Pop", subtitle: "Albums frequently cited as landmark full-length K-pop releases.", albumSlugs: ["pink-tape", "modern-times", "the-perfect-red-velvet", "made", "love-yourself-tear"] },
  { slug: "electronic", title: "Electronic", subtitle: "Seminal electronic albums that shaped ambient, IDM, downtempo, and club listening.", albumSlugs: ["selected-ambient-works-85-92", "music-has-the-right-to-children", "untrue", "moon-safari", "immunity"] },
  { slug: "soul", title: "Soul", subtitle: "Canonical soul records that still sit near the top of public all-time lists.", albumSlugs: ["whats-going-on", "songs-in-the-key-of-life", "i-never-loved-a-man", "voodoo", "call-me"] },
  { slug: "metal", title: "Metal", subtitle: "Essential heavy records that come up again and again in greatest-metal debates.", albumSlugs: ["master-of-puppets", "paranoid", "reign-in-blood", "rust-in-peace", "blackwater-park"] },
];

export function getGenreCollectionBySlug(slug: string) {
  return genreCollections.find((collection) => collection.slug === slug) ?? null;
}

export function getGenreAlbumBySlug(slug: string) {
  return genreAlbums.find((album) => album.slug === slug) ?? null;
}
