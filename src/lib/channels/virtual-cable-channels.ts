/**
 * Virtual 24/7 Cable Channels (Instant Nostalgic Channel Surfing)
 *
 * Generates continuous linear broadcast channels from media libraries and streams.
 * Uses synchronized wall-clock modulo scheduling so that anyone tuning in sees
 * the exact same "live" scene at any time, complete with EPG grid and channel surfing.
 */

export interface ProgramSlot {
  id: string;
  mediaId: string;
  title: string;
  season?: number;
  episode?: number;
  durationSec: number;
  posterUrl?: string;
}

export interface VirtualChannel {
  id: string;
  number: number; // e.g. 101, 102, 103
  name: string;
  category: "cinema" | "scifi" | "anime" | "sitcoms" | "documentary";
  description: string;
  icon: string;
  programs: ProgramSlot[];
}

export interface LiveBroadcastState {
  channel: VirtualChannel;
  currentProgram: ProgramSlot;
  currentPositionSec: number;
  timeRemainingSec: number;
  nextProgram: ProgramSlot;
}

/**
 * Calculates what is currently "airing live" on a virtual channel at a given wall-clock time.
 */
export function calculateLiveBroadcast(
  channel: VirtualChannel,
  wallClockMs: number = Date.now(),
): LiveBroadcastState | null {
  if (!channel.programs || channel.programs.length === 0) return null;

  const totalCycleSec = channel.programs.reduce((acc, p) => acc + p.durationSec, 0);
  if (totalCycleSec <= 0) return null;

  // Modulo of total seconds since Unix epoch
  const totalSeconds = Math.floor(wallClockMs / 1000);
  let cycleOffsetSec = totalSeconds % totalCycleSec;

  for (let i = 0; i < channel.programs.length; i++) {
    const prog = channel.programs[i];
    if (cycleOffsetSec < prog.durationSec) {
      const nextProg = channel.programs[(i + 1) % channel.programs.length];
      return {
        channel,
        currentProgram: prog,
        currentPositionSec: cycleOffsetSec,
        timeRemainingSec: prog.durationSec - cycleOffsetSec,
        nextProgram: nextProg,
      };
    }
    cycleOffsetSec -= prog.durationSec;
  }

  return null;
}

/**
 * Navigates to the next channel in linear order (Ch+).
 */
export function channelUp(channels: VirtualChannel[], currentNumber: number): VirtualChannel {
  if (channels.length === 0) throw new Error("No channels configured");
  const sorted = [...channels].sort((a, b) => a.number - b.number);
  const next = sorted.find((c) => c.number > currentNumber);
  return next ?? sorted[0];
}

/**
 * Navigates to the previous channel in linear order (Ch-).
 */
export function channelDown(channels: VirtualChannel[], currentNumber: number): VirtualChannel {
  if (channels.length === 0) throw new Error("No channels configured");
  const sorted = [...channels].sort((a, b) => a.number - b.number);
  const prev = [...sorted].reverse().find((c) => c.number < currentNumber);
  return prev ?? sorted[sorted.length - 1];
}

/**
 * Generates default curated broadcast channels.
 */
export function generateDefaultVirtualChannels(): VirtualChannel[] {
  return [
    {
      id: "ch_cinema_prime",
      number: 101,
      name: "Cinema Prime",
      category: "cinema",
      description: "24/7 Hollywood Blockbusters & Oscar Winners",
      icon: "film",
      programs: [
        { id: "p1", mediaId: "tt1375666", title: "Inception", durationSec: 8880 },
        { id: "p2", mediaId: "tt0816692", title: "Interstellar", durationSec: 10140 },
        { id: "p3", mediaId: "tt0468569", title: "The Dark Knight", durationSec: 9120 },
      ],
    },
    {
      id: "ch_anime_nonstop",
      number: 102,
      name: "Anime Non-Stop",
      category: "anime",
      description: "Continuous Anime Episodes, Shonen & Seinen Hits",
      icon: "tv",
      programs: [
        { id: "p4", mediaId: "kitsu:12", title: "Attack on Titan", season: 1, episode: 1, durationSec: 1440 },
        { id: "p5", mediaId: "kitsu:12", title: "Attack on Titan", season: 1, episode: 2, durationSec: 1440 },
        { id: "p6", mediaId: "kitsu:45", title: "Demon Slayer", season: 1, episode: 1, durationSec: 1440 },
      ],
    },
    {
      id: "ch_scifi_dimension",
      number: 103,
      name: "Sci-Fi Dimension",
      category: "scifi",
      description: "Futuristic Worlds, Space Exploration & Dystopias",
      icon: "zap",
      programs: [
        { id: "p7", mediaId: "tt0133093", title: "The Matrix", durationSec: 8160 },
        { id: "p8", mediaId: "tt1856101", title: "Blade Runner 2049", durationSec: 9780 },
      ],
    },
  ];
}
