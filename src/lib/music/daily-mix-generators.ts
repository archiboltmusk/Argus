import { rankMixArtists, type MixTaste } from "./made-for-you-selection";
import { musicTrackIdentity } from "./track-identity";
import type { MusicTrack } from "./types";

export type DailyMixId = "deep-focus" | "daily-drive" | "discovery-radar" | "heavy-rotation";

export type DailyMixDescriptor = {
  id: DailyMixId;
  title: string;
  subtitle: string;
  gradient: string;
  tracks: MusicTrack[];
};

function dedupeTracks(tracks: MusicTrack[]): MusicTrack[] {
  const seen = new Set<string>();
  const out: MusicTrack[] = [];
  for (const t of tracks) {
    const id = musicTrackIdentity(t);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(t);
  }
  return out;
}

/**
 * Focus & Ambient Flow: Instrumental, ambient, lo-fi, and acoustic recordings.
 */
export function generateDeepFocusMix(taste: MixTaste, limit = 20): MusicTrack[] {
  const candidates: MusicTrack[] = [];
  const focusKeywords = /\b(ambient|lo-?fi|chill|instrumental|piano|acoustic|soundtrack|sleep|meditation|focus|study)\b/i;

  for (const list of [taste.library, taste.liked, taste.recents]) {
    for (const track of list) {
      const match =
        focusKeywords.test(track.title) ||
        (track.album && focusKeywords.test(track.album)) ||
        track.mediaKind === "audio";
      if (match) candidates.push(track);
    }
  }

  const unique = dedupeTracks(candidates);
  return unique.slice(0, limit);
}

/**
 * Daily Drive: High-energy, familiar favourites mixed with recent discoveries.
 */
export function generateDailyDriveMix(taste: MixTaste, limit = 25): MusicTrack[] {
  const topArtists = rankMixArtists(taste).slice(0, 8);
  const candidates: MusicTrack[] = [];

  // Pick top 2-3 tracks per artist
  for (const artist of topArtists) {
    const seeds = artist.seeds.slice(0, 3);
    candidates.push(...seeds);
  }

  // Interleave with recently liked tracks
  for (const liked of taste.liked.slice(0, 10)) {
    candidates.push(liked);
  }

  return dedupeTracks(candidates).slice(0, limit);
}

/**
 * Discovery Radar: Unheard or rarely played tracks from followed and related artists.
 */
export function generateDiscoveryRadar(taste: MixTaste, limit = 20): MusicTrack[] {
  const topArtists = rankMixArtists(taste);
  const played = new Set(taste.recents.map(musicTrackIdentity));
  const candidates: MusicTrack[] = [];

  for (const artist of topArtists) {
    for (const seed of artist.seeds) {
      if (!played.has(musicTrackIdentity(seed))) {
        candidates.push(seed);
      }
    }
  }

  return dedupeTracks(candidates).slice(0, limit);
}

/**
 * Heavy Rotation: Most replayed tracks ranked by play count and listening affinity.
 */
export function generateHeavyRotation(taste: MixTaste, limit = 20): MusicTrack[] {
  const scores = new Map<string, { track: MusicTrack; score: number }>();

  for (const list of [taste.recents, taste.liked, taste.library]) {
    for (const track of list) {
      const id = musicTrackIdentity(track);
      if (!id) continue;
      const aff = taste.affinity[id];
      const playCount = aff?.plays ?? 1;
      const recencyBonus = aff?.at ? Math.max(0, 1 - (Date.now() - aff.at) / (14 * 86_400_000)) : 0;
      const score = playCount * 2 + recencyBonus * 3;

      const current = scores.get(id);
      if (!current || score > current.score) {
        scores.set(id, { track, score });
      }
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((s) => s.track)
    .slice(0, limit);
}

/**
 * Generates all 4 personalized daily mixes for display in the Music Home view.
 */
export function buildDailyMixes(taste: MixTaste): DailyMixDescriptor[] {
  return [
    {
      id: "deep-focus",
      title: "Deep Focus Flow",
      subtitle: "Calm instrumental, ambient, and lo-fi textures to stay in the zone",
      gradient: "linear-gradient(135deg, #1e3a8a 0%, #064e3b 100%)",
      tracks: generateDeepFocusMix(taste),
    },
    {
      id: "daily-drive",
      title: "Daily Drive",
      subtitle: "A personalized blend of your top artists and upbeat discoveries",
      gradient: "linear-gradient(135deg, #b45309 0%, #7c2d12 100%)",
      tracks: generateDailyDriveMix(taste),
    },
    {
      id: "discovery-radar",
      title: "Discovery Radar",
      subtitle: "Fresh cuts and hidden gems from artists you love that you haven't heard yet",
      gradient: "linear-gradient(135deg, #581c87 0%, #1e1b4b 100%)",
      tracks: generateDiscoveryRadar(taste),
    },
    {
      id: "heavy-rotation",
      title: "Heavy Rotation",
      subtitle: "Your most-streamed tracks and current obsessions on repeat",
      gradient: "linear-gradient(135deg, #831843 0%, #4c0519 100%)",
      tracks: generateHeavyRotation(taste),
    },
  ];
}
