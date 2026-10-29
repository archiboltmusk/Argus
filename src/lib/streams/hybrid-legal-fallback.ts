/**
 * Hybrid Debrid + Official Free Legal Streaming Fallback
 * Resolves official public studio YouTube feeds when torrent/debrid seeders are dead or poor quality
 * for regional Tollywood / Indian cinema (SVF Movies, Angel Digital, Zee Bangla, Rajshri, Ultra).
 */

export interface LegalStudioChannel {
  channelId: string;
  name: string;
  region: "bengali" | "hindi" | "south";
  curatedKeywords: string[];
}

export const VERIFIED_LEGAL_STUDIOS: LegalStudioChannel[] = [
  {
    channelId: "svf-movies",
    name: "SVF Cinema (Official Bengali Studio)",
    region: "bengali",
    curatedKeywords: ["feluda", "byomkesh", "chander pahar", "autograph", "kakababu", "mishawr rawhoshyo"],
  },
  {
    channelId: "angel-digital",
    name: "Angel Digital (Classic & Golden Tollywood)",
    region: "bengali",
    curatedKeywords: ["ray", "uttam kumar", "suchitra sen", "soumitra", "tarun majumdar", "satyanweshi"],
  },
  {
    channelId: "zee-bangla-cinema",
    name: "Zee Bangla Cinema Originals",
    region: "bengali",
    curatedKeywords: ["zee bangla", "bhooter bhabishyat", "bengali movie"],
  },
  {
    channelId: "rajshri-films",
    name: "Rajshri Productions (Family Classics)",
    region: "hindi",
    curatedKeywords: ["rajshri", "classic hindi"],
  },
];

export interface LegalStreamResult {
  isAvailable: boolean;
  studioName?: string;
  streamUrl?: string;
  resolution?: "1080p" | "720p";
  badge?: string;
}

export function resolveLegalStudioFallback(
  title: string,
  year?: number,
  seederCount = 0
): LegalStreamResult {
  // If torrent has healthy seeders (>= 5), debrid playback remains preferred
  if (seederCount >= 5) {
    return { isAvailable: false };
  }

  const clean = title.toLowerCase();

  for (const studio of VERIFIED_LEGAL_STUDIOS) {
    const matched = studio.curatedKeywords.some((kw) => clean.includes(kw));
    if (matched) {
      return {
        isAvailable: true,
        studioName: studio.name,
        streamUrl: `legal://studio/${studio.channelId}?q=${encodeURIComponent(title)}&year=${year ?? ""}`,
        resolution: "1080p",
        badge: "Official Legal Master",
      };
    }
  }

  return { isAvailable: false };
}
