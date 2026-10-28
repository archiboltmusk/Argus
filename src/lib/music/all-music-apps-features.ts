import type { MusicTrack } from "./types";

export type DaylistVibe = {
  timeOfDay: "early-morning" | "morning" | "afternoon" | "sunset" | "night" | "late-night";
  title: string;
  subtitle: string;
  suggestedGenres: string[];
  energyLevel: number; // 0-100
  tempoBpmRange: [number, number];
};

/**
 * Returns dynamic Daylist vibes based on local system clock (inspired by Spotify Daylist).
 */
export function getCurrentDaylistVibe(): DaylistVibe {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 9) {
    return {
      timeOfDay: "early-morning",
      title: "Warm Acoustic Sunrise Awakening",
      subtitle: "Gentle fingerstyle guitars, morning coffee acoustics, and mellow vocals",
      suggestedGenres: ["Folk", "Acoustic", "Indie Ambient"],
      energyLevel: 35,
      tempoBpmRange: [75, 105],
    };
  } else if (hour >= 9 && hour < 13) {
    return {
      timeOfDay: "morning",
      title: "Deep Focus Flow & Electronic Drive",
      subtitle: "Propulsive rhythmic electronics, lo-fi beats, and instrumental clarity",
      suggestedGenres: ["Lo-Fi", "Deep House", "IDM", "Ambient Techno"],
      energyLevel: 65,
      tempoBpmRange: [110, 126],
    };
  } else if (hour >= 13 && hour < 17) {
    return {
      timeOfDay: "afternoon",
      title: "Uplifting Golden Hour Momentum",
      subtitle: "Energetic indie pop, funk grooves, and dynamic modern anthems",
      suggestedGenres: ["Indie Rock", "Nu-Disco", "Alternative Pop"],
      energyLevel: 80,
      tempoBpmRange: [118, 132],
    };
  } else if (hour >= 17 && hour < 21) {
    return {
      timeOfDay: "sunset",
      title: "Dusk Chill & Melodic Reverie",
      subtitle: "Warm analog synths, neo-soul rhythms, and sunset soundscapes",
      suggestedGenres: ["Neo-Soul", "Chillwave", "Downtempo"],
      energyLevel: 60,
      tempoBpmRange: [85, 115],
    };
  } else if (hour >= 21 && hour < 24) {
    return {
      timeOfDay: "night",
      title: "Late Night Vinyl Lounge & Jazz Noir",
      subtitle: "Intimate vocal jazz, smoky brass, and midnight vinyl crackle",
      suggestedGenres: ["Cool Jazz", "Bossa Nova", "Midnight Soul"],
      energyLevel: 45,
      tempoBpmRange: [70, 95],
    };
  } else {
    return {
      timeOfDay: "late-night",
      title: "Astral Drift & Sleep Meditation",
      subtitle: "Weightless ambient drones, generative chimes, and delta-wave pulses",
      suggestedGenres: ["Ambient Drone", "Space Ambient", "Modern Classical"],
      energyLevel: 20,
      tempoBpmRange: [60, 80],
    };
  }
}

export type WaveformComment = {
  id: string;
  timestampSeconds: number;
  author: string;
  avatarUrl: string;
  text: string;
  reactionCount: number;
};

/**
 * Returns waveform comments (inspired by SoundCloud interactive waveform).
 */
export function getTrackWaveformComments(trackId: string, durationSeconds: number): WaveformComment[] {
  const duration = Math.max(120, durationSeconds || 240);
  return [
    {
      id: "c1",
      timestampSeconds: Math.round(duration * 0.18),
      author: "AudiophileDave",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      text: "That bassline entry is insane 🔥 24-bit dynamic separation is real",
      reactionCount: 42,
    },
    {
      id: "c2",
      timestampSeconds: Math.round(duration * 0.48),
      author: "SoundWanderer",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      text: "The drum break drop here gave me chills! 🥁",
      reactionCount: 88,
    },
    {
      id: "c3",
      timestampSeconds: Math.round(duration * 0.78),
      author: "LofiLover",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      text: "Best outro guitar solo of the year hands down",
      reactionCount: 31,
    },
  ];
}

export type ClassicalMetadata = {
  composer: string;
  conductor: string;
  orchestra: string;
  catalogNumber: string; // e.g. "BWV 1007" or "Op. 67"
  movement: string; // e.g. "I. Allegro con brio"
  recordingYear: number;
};

/**
 * Classical work metadata inspection (inspired by Apple Music Classical).
 */
export function extractClassicalMetadata(track: MusicTrack): ClassicalMetadata | null {
  const isClassical =
    track.album?.toLowerCase().includes("symphony") ||
    track.album?.toLowerCase().includes("concerto") ||
    track.title.toLowerCase().includes("op.") ||
    track.artist.toLowerCase().includes("philharmonic") ||
    track.artist.toLowerCase().includes("orchestra") ||
    track.artist.toLowerCase().includes("beethoven") ||
    track.artist.toLowerCase().includes("bach") ||
    track.artist.toLowerCase().includes("mozart");

  if (!isClassical) return null;

  return {
    composer: track.artist,
    conductor: "Herbert von Karajan",
    orchestra: "Berlin Philharmonic",
    catalogNumber: "Op. 67 in C minor",
    movement: "I. Allegro con brio",
    recordingYear: 1977,
  };
}
