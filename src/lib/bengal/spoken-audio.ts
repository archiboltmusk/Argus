/**
 * Bengal & Indic Spoken Literature & Audio Vault for Argus
 *
 * Curated dramatized audio stories and radio drama library:
 * - Sunday Suspense classics (Mir Afsar Ali, Radio Mirchi)
 * - Satyajit Ray's Feluda audio adventures
 * - Sharadindu Bandyopadhyay's Byomkesh Bakshi
 * - Taradas Bandyopadhyay's Taranath Tantrik
 * - Sukumar Ray & Upendrakishore Ray Chowdhury children's classics
 */

export interface SpokenAudioTrack {
  id: string;
  title: string;
  series: "sunday-suspense" | "feluda" | "byomkesh" | "taranath" | "classic-bengal";
  author: string;
  narrator?: string;
  durationMinutes: number;
  audioUrl: string;
  coverUrl?: string;
  description: string;
}

export const BENGAL_AUDIO_VAULT: SpokenAudioTrack[] = [
  {
    id: "ss-feluda-badshahi-angti",
    title: "Badshahi Angti (বাদশাহী আংটি - The Emperor's Ring)",
    series: "feluda",
    author: "Satyajit Ray",
    narrator: "Mir Afsar Ali & Team",
    durationMinutes: 78,
    audioUrl: "https://archive.org/download/sunday_suspense_collection/Badshahi_Angti.mp3",
    coverUrl: "https://covers.openlibrary.org/b/id/8412903-M.jpg",
    description: "Prodosh C. Mitter (Feluda) and Topshe travel to Lucknow to solve the theft of Emperor Aurangzeb's heirloom ring.",
  },
  {
    id: "ss-feluda-sonar-kella",
    title: "Sonar Kella (সোনার কেল্লা - The Golden Fortress)",
    series: "feluda",
    author: "Satyajit Ray",
    narrator: "Mir Afsar Ali & Team",
    durationMinutes: 85,
    audioUrl: "https://archive.org/download/sunday_suspense_collection/Sonar_Kella.mp3",
    coverUrl: "https://covers.openlibrary.org/b/id/8315186-M.jpg",
    description: "Feluda investigates a boy who remembers his past life and hidden treasure in Rajasthan's desert fortress.",
  },
  {
    id: "ss-byomkesh-satyanweshi",
    title: "Byomkesh: Satyanweshi (সত্যান্বেষী - The Truth-Seeker)",
    series: "byomkesh",
    author: "Sharadindu Bandyopadhyay",
    narrator: "Sunday Suspense Audio",
    durationMinutes: 62,
    audioUrl: "https://archive.org/download/sunday_suspense_collection/Satyanweshi.mp3",
    coverUrl: "https://covers.openlibrary.org/b/id/8212456-M.jpg",
    description: "The classic origin adventure introducing Byomkesh Bakshi and Ajit Bandyopadhyay in Harrison Road, Kolkata.",
  },
  {
    id: "ss-byomkesh-chitrachor",
    title: "Byomkesh: Chitrachor (চিত্রচোর - The Picture Thief)",
    series: "byomkesh",
    author: "Sharadindu Bandyopadhyay",
    narrator: "Sunday Suspense Audio",
    durationMinutes: 70,
    audioUrl: "https://archive.org/download/sunday_suspense_collection/Chitrachor.mp3",
    coverUrl: "https://covers.openlibrary.org/b/id/8231451-M.jpg",
    description: "Byomkesh Bakshi investigates a mysterious colony robbery that unravels secrets of greed, hidden love, and subtle deceit.",
  },
  {
    id: "ss-taranath-tantrik-1",
    title: "Taranath Tantrik: Matu Pagli (তারানাথ তান্ত্রিক)",
    series: "taranath",
    author: "Bibhutibhushan & Taradas Bandyopadhyay",
    narrator: "Mir Afsar Ali",
    durationMinutes: 54,
    audioUrl: "https://archive.org/download/sunday_suspense_collection/Taranath_Tantrik_01.mp3",
    coverUrl: "https://covers.openlibrary.org/b/id/7981242-M.jpg",
    description: "Supernatural investigator Taranath recounts ancient occult mysteries in rural Bengal.",
  },
  {
    id: "ss-prof-shonku-corvus",
    title: "Corvus (কর্ভাস - The Intelligent Crow)",
    series: "sunday-suspense",
    author: "Satyajit Ray",
    narrator: "Mir Afsar Ali & Team",
    durationMinutes: 48,
    audioUrl: "https://archive.org/download/sunday_suspense_collection/Prof_Shonku_Corvus.mp3",
    coverUrl: "https://covers.openlibrary.org/b/id/8119042-M.jpg",
    description: "Scientist Professor Shonku invents the Ornithon machine to elevate the intelligence of a common crow.",
  },
];

/** Search the Bengal spoken literature vault by query or series */
export function searchBengalAudio(query: string, series?: SpokenAudioTrack["series"]): SpokenAudioTrack[] {
  const q = query.trim().toLowerCase();
  return BENGAL_AUDIO_VAULT.filter((item) => {
    const matchesSeries = !series || item.series === series;
    const matchesQuery = !q || item.title.toLowerCase().includes(q) || item.author.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.series.toLowerCase().includes(q);
    return matchesSeries && matchesQuery;
  });
}
