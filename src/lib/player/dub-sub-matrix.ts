import type { Meta } from "@/lib/cinemeta";

export type ContentLanguageCategory = "anime" | "native" | "foreign";

export interface MediaTrack {
  id: number | string;
  lang?: string;
  title?: string;
  codec?: string;
  selected?: boolean;
  forced?: boolean;
  hearingImpaired?: boolean;
}

export interface DubSubDecision {
  category: ContentLanguageCategory;
  preferredAudioTrackId?: number | string;
  preferredAudioLang?: string;
  subtitlesEnabled: boolean;
  preferredSubtitleTrackId?: number | string;
  preferredSubtitleLang?: string;
  reason: string;
}

const OVERRIDE_STORAGE_KEY = "argus.dub-matrix.overrides.v1";

type OverrideMap = Record<string, { audioTrackId?: number | string; subTrackId?: number | string }>;

let memOverrides: OverrideMap = {};

function getOverrides(): OverrideMap {
  try {
    const raw = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    if (raw) return { ...memOverrides, ...JSON.parse(raw) };
  } catch {}
  return memOverrides;
}

export function saveTrackOverride(metaId: string, audioTrackId?: number | string, subTrackId?: number | string) {
  if (!metaId) return;
  memOverrides[metaId] = { audioTrackId, subTrackId };
  try {
    localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(memOverrides));
  } catch {}
}

export function clearTrackOverride(metaId: string) {
  if (!metaId) return;
  delete memOverrides[metaId];
  try {
    localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(memOverrides));
  } catch {}
}

/**
 * Determines whether content is Anime based on genres, origin, or format.
 */
export function isAnimeContent(meta: Meta): boolean {
  if (meta.type === "anime") return true;
  if (meta.animeFormat || meta.malId) return true;
  if (meta.id && meta.id.startsWith("kitsu:")) return true;
  const genres = meta.genres ?? [];
  if (genres.some((g) => /^anime$/i.test(g))) return true;
  const text = `${meta.name ?? ""} ${meta.description ?? ""}`.toLowerCase();
  if (genres.includes("Animation") && (text.includes("anime") || meta.originalLanguage === "ja" || meta.country === "JP")) {
    return true;
  }
  return false;
}

/**
 * Normalizes ISO language codes and track names (e.g. "jpn", "ja", "Japanese" -> "ja").
 */
export function normalizeLanguageCode(langOrTitle?: string): string {
  if (!langOrTitle) return "unknown";
  const str = langOrTitle.trim().toLowerCase();
  if (/^ja(p|panese)?$/.test(str) || str.includes("japanese")) return "ja";
  if (/^en(g|glish)?$/.test(str) || str.includes("english")) return "en";
  if (/^ko(r|rean)?$/.test(str) || str.includes("korean")) return "ko";
  if (/^es|spa(n|nish)?$/.test(str) || str.includes("spanish")) return "es";
  if (/^fr(a|ench)?$/.test(str) || str.includes("french")) return "fr";
  if (/^de(u|german)?$/.test(str) || str.includes("german")) return "de";
  if (/^hi(n|ndi)?$/.test(str) || str.includes("hindi")) return "hi";
  if (/^it(a|alian)?$/.test(str) || str.includes("italian")) return "it";
  if (/^zh|chi(nese)?$/.test(str) || str.includes("chinese")) return "zh";
  return str.slice(0, 3);
}

export interface DubSubDecisionOptions {
  meta: Meta;
  audioTracks: MediaTrack[];
  subtitleTracks: MediaTrack[];
  userNativeLang?: string;
  systemLang?: string;
}

/**
 * Evaluates the Smart Dub & Sub Matrix for a given title and track roster.
 */
export function resolveDubSubDecision(
  metaOrOptions: Meta | DubSubDecisionOptions,
  audioTracksParam?: MediaTrack[],
  subtitleTracksParam?: MediaTrack[],
  userNativeLangParam = "en",
): DubSubDecision {
  let meta: Meta;
  let audioTracks: MediaTrack[];
  let subtitleTracks: MediaTrack[];
  let userNativeLang: string;

  if (
    metaOrOptions &&
    typeof metaOrOptions === "object" &&
    "meta" in metaOrOptions &&
    Array.isArray((metaOrOptions as DubSubDecisionOptions).audioTracks)
  ) {
    const opts = metaOrOptions as DubSubDecisionOptions;
    meta = opts.meta;
    audioTracks = opts.audioTracks ?? [];
    subtitleTracks = opts.subtitleTracks ?? [];
    userNativeLang = normalizeLanguageCode(opts.systemLang || opts.userNativeLang || "en");
  } else {
    meta = metaOrOptions as Meta;
    audioTracks = audioTracksParam ?? [];
    subtitleTracks = subtitleTracksParam ?? [];
    userNativeLang = normalizeLanguageCode(userNativeLangParam);
  }

  const overrides = getOverrides();
  const override = overrides[meta.id];

  // 1. Check user manual sticky override
  if (override) {
    return {
      category: isAnimeContent(meta) ? "anime" : "native",
      preferredAudioTrackId: override.audioTrackId,
      preferredSubtitleTrackId: override.subTrackId,
      subtitlesEnabled: override.subTrackId !== undefined && override.subTrackId !== "no",
      reason: "User manual preference remembered for this title",
    };
  }

  // 2. Rule: Anime Content
  if (isAnimeContent(meta)) {
    // Prefer original Japanese audio
    const jpnAudio = audioTracks.find(
      (t) => normalizeLanguageCode(t.lang) === "ja" || normalizeLanguageCode(t.title) === "ja",
    );
    // Subtitles in user's preferred language (non-SDH preferred)
    const userSub = subtitleTracks.find(
      (t) => normalizeLanguageCode(t.lang) === userNativeLang && !t.hearingImpaired,
    ) ?? subtitleTracks.find(
      (t) => normalizeLanguageCode(t.lang) === userNativeLang,
    );

    return {
      category: "anime",
      preferredAudioTrackId: jpnAudio?.id ?? audioTracks[0]?.id,
      preferredAudioLang: jpnAudio?.lang ?? "ja",
      subtitlesEnabled: Boolean(userSub),
      preferredSubtitleTrackId: userSub?.id,
      preferredSubtitleLang: userSub?.lang ?? userNativeLang,
      reason: "Anime Rule: Original Japanese voice audio with native subtitles",
    };
  }

  // 3. Rule: Foreign Cinema (non-anime foreign language)
  const isForeign = meta.originalLanguage && normalizeLanguageCode(meta.originalLanguage) !== userNativeLang;
  if (isForeign) {
    const origLang = normalizeLanguageCode(meta.originalLanguage);
    const origAudio = audioTracks.find((t) => normalizeLanguageCode(t.lang) === origLang);
    const userSub = subtitleTracks.find((t) => normalizeLanguageCode(t.lang) === userNativeLang);

    return {
      category: "foreign",
      preferredAudioTrackId: origAudio?.id ?? audioTracks[0]?.id,
      preferredAudioLang: origAudio?.lang ?? origLang,
      subtitlesEnabled: Boolean(userSub),
      preferredSubtitleTrackId: userSub?.id,
      preferredSubtitleLang: userSub?.lang ?? userNativeLang,
      reason: "Foreign Cinema Rule: Authentic original dialogue with translated subtitles",
    };
  }

  // 4. Rule: Native Content (Audio in user's language)
  const nativeAudio = audioTracks.find((t) => normalizeLanguageCode(t.lang) === userNativeLang) ?? audioTracks[0];
  const forcedSub = subtitleTracks.find((t) => t.forced && normalizeLanguageCode(t.lang) === userNativeLang);

  return {
    category: "native",
    preferredAudioTrackId: nativeAudio?.id,
    preferredAudioLang: nativeAudio?.lang ?? userNativeLang,
    // Turn subtitles off for native language unless forced subtitles exist
    subtitlesEnabled: Boolean(forcedSub),
    preferredSubtitleTrackId: forcedSub?.id,
    preferredSubtitleLang: forcedSub?.lang,
    reason: forcedSub
      ? "Native Rule: Audio in primary language with forced dialogue subtitles"
      : "Native Rule: Audio in primary language with subtitles disabled",
  };
}
