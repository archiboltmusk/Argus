export type BengaliCinemaEntry = {
  id: string;
  imdbId: string;
  title: string;
  nativeTitle: string;
  year: number;
  universe?: "feluda" | "byomkesh" | "kakababu" | "shabor" | "sonada" | "classics" | "modern_thriller";
  director: string;
  genre: string;
  description: string;
};

export const BENGALI_CINEMA_CATALOG: BengaliCinemaEntry[] = [
  // Feluda Universe
  {
    id: "feluda-sonar-kella",
    imdbId: "tt0072186",
    title: "Sonar Kella (The Golden Fortress)",
    nativeTitle: "সোনার কেল্লা",
    year: 1974,
    universe: "feluda",
    director: "Satyajit Ray",
    genre: "Mystery / Adventure",
    description: "Satyajit Ray's timeless adaptation of Feluda investigating parapsychology and hidden treasures in Rajasthan.",
  },
  {
    id: "feluda-joy-baba-felunath",
    imdbId: "tt0079375",
    title: "Joy Baba Felunath (The Elephant God)",
    nativeTitle: "জয় বাবা ফেলুনাথ",
    year: 1979,
    universe: "feluda",
    director: "Satyajit Ray",
    genre: "Mystery / Thriller",
    description: "Feluda, Topshe, and Lalmohan Ganguly travel to Varanasi to recover a stolen Ganesha statue.",
  },
  {
    id: "feluda-bombaiyer-bombete",
    imdbId: "tt0402868",
    title: "Bombaiyer Bombete",
    nativeTitle: "বোম্বাইয়ের বোম্বেটে",
    year: 2003,
    universe: "feluda",
    director: "Sandip Ray",
    genre: "Mystery / Action",
    description: "A fast-paced Bollywood smuggling conspiracy investigation across Mumbai.",
  },

  // Byomkesh Bakshi Universe
  {
    id: "byomkesh-har-har",
    imdbId: "tt5251642",
    title: "Har Har Byomkesh",
    nativeTitle: "হর হর ব্যোমকেশ",
    year: 2015,
    universe: "byomkesh",
    director: "Arindam Sil",
    genre: "Mystery / Period Drama",
    description: "Byomkesh Bakshi investigates a mysterious murder after a royal party in Varanasi.",
  },
  {
    id: "byomkesh-chiriakhana",
    imdbId: "tt0061474",
    title: "Chiriyakhana (The Zoo)",
    nativeTitle: "চিড়িয়াখানা",
    year: 1967,
    universe: "byomkesh",
    director: "Satyajit Ray",
    genre: "Mystery / Classic",
    description: "Uttam Kumar stars as Byomkesh Bakshi investigating secrets within an eccentric community farm.",
  },

  // Ray & Ghatak Classics
  {
    id: "ray-pather-panchali",
    imdbId: "tt0048473",
    title: "Pather Panchali (Song of the Little Road)",
    nativeTitle: "পথের পাঁচালী",
    year: 1955,
    universe: "classics",
    director: "Satyajit Ray",
    genre: "Drama / Masterpiece",
    description: "The groundbreaking first installment of the Apu Trilogy, filmed in rural Bengal.",
  },
  {
    id: "ray-nayak",
    imdbId: "tt0060742",
    title: "Nayak (The Hero)",
    nativeTitle: "নায়ক",
    year: 1966,
    universe: "classics",
    director: "Satyajit Ray",
    genre: "Drama / Character Study",
    description: "Uttam Kumar and Sharmila Tagore in an introspective 24-hour train ride revealing fame and loneliness.",
  },
  {
    id: "ghatak-meghe-dhaka-tara",
    imdbId: "tt0054075",
    title: "Meghe Dhaka Tara (The Cloud-Capped Star)",
    nativeTitle: "মেঘে ঢাকা তারা",
    year: 1960,
    universe: "classics",
    director: "Ritwik Ghatak",
    genre: "Tragedy / Post-Partition Masterpiece",
    description: "Ghatak's haunting masterpiece on the socio-economic tragedy of post-partition Bengal.",
  },

  // Modern Thrillers & New-Wave Bengali Cinema
  {
    id: "thriller-baishe-srabon",
    imdbId: "tt2083167",
    title: "Baishe Srabon",
    nativeTitle: "বাইশে শ্রাবণ",
    year: 2011,
    universe: "modern_thriller",
    director: "Srijit Mukherji",
    genre: "Psychological Thriller",
    description: "Kolkata police officers hunt a serial killer quoting Bengali poetry at every crime scene.",
  },
  {
    id: "thriller-bhooter-bhabishyat",
    imdbId: "tt2298642",
    title: "Bhooter Bhabishyat (Future of the Past)",
    nativeTitle: "ভূতের ভবিষ্যৎ",
    year: 2012,
    universe: "modern_thriller",
    director: "Anik Dutta",
    genre: "Satirical Comedy / Horror",
    description: "Ghosts from different historical eras band together to save a heritage Kolkata mansion from real estate developers.",
  },
  {
    id: "thriller-golondaaj",
    imdbId: "tt11693358",
    title: "Golondaaj",
    nativeTitle: "গোলন্দাজ",
    year: 2021,
    universe: "modern_thriller",
    director: "Dhrubo Banerjee",
    genre: "Sports / Historical Epic",
    description: "The heroic story of Nagendra Prasad Sarbadhikari, the father of Indian football.",
  },
];

export function getBengaliCinemaByUniverse(universe: BengaliCinemaEntry["universe"]): BengaliCinemaEntry[] {
  return BENGALI_CINEMA_CATALOG.filter((item) => !universe || item.universe === universe);
}
