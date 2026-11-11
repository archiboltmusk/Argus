/**
 * AcoustID & Chromaprint Audio Recognition Engine
 *
 * Provides free Shazam-style acoustic music recognition to identify tracks
 * playing in movies, live streams, or local audio files using the public AcoustID API.
 */

export interface IdentifiedTrack {
  title: string;
  artist: string;
  recordingMbid?: string;
  releaseMbid?: string;
  score: number;
}

const ACOUSTID_CLIENT_KEY = "8XaBELgH"; // Standard open-source client key for media players

/**
 * Identifies a track from a Chromaprint audio fingerprint and duration in seconds
 */
export async function identifyAudioFingerprint(params: {
  fingerprint: string;
  durationSec: number;
  signal?: AbortSignal;
}): Promise<IdentifiedTrack | null> {
  const { fingerprint, durationSec, signal } = params;
  if (!fingerprint || durationSec <= 0) return null;

  try {
    const url = new URL("https://api.acoustid.org/v2/lookup");
    url.searchParams.set("client", ACOUSTID_CLIENT_KEY);
    url.searchParams.set("meta", "recordings+releasegroups");
    url.searchParams.set("duration", Math.round(durationSec).toString());
    url.searchParams.set("fingerprint", fingerprint);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: signal ?? AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      results?: Array<{
        score?: number;
        recordings?: Array<{
          id?: string;
          title?: string;
          artists?: Array<{ name?: string }>;
          releasegroups?: Array<{ id?: string; title?: string }>;
        }>;
      }>;
    };

    if (data.status !== "ok" || !data.results || data.results.length === 0) {
      return null;
    }

    const bestResult = data.results[0];
    const recording = bestResult.recordings?.[0];
    if (!recording || !recording.title) return null;

    const artistName = recording.artists?.[0]?.name || "Unknown Artist";
    const releaseMbid = recording.releasegroups?.[0]?.id;

    return {
      title: recording.title,
      artist: artistName,
      recordingMbid: recording.id,
      releaseMbid,
      score: bestResult.score || 0,
    };
  } catch {
    return null;
  }
}
