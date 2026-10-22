import { addonAccepts, type Addon } from "@/lib/addons";
import { safeFetch } from "@/lib/safe-fetch";
import { dlog } from "@/lib/debug";
import type { SubResult, SubSearchQuery } from "../types";
import { normalizeLang } from "../language";
import { parseSubtitles, resourceUrl, type ExtraArg } from "@/lib/stremio-protocol";

type RawAddonSub = {
  id?: string;
  url: string;
  lang: string;
  m?: string;
  SubFormat?: string;
};

function contentId(q: SubSearchQuery): string | null {
  const base =
    q.stremioId?.trim() ||
    (q.imdbId ? (q.imdbId.startsWith("tt") ? q.imdbId : `tt${q.imdbId}`) : "");
  if (!base) return null;
  const isEpisode = q.season != null && q.episode != null;
  if (isEpisode && !/:\d+:\d+$/.test(base)) {
    return `${base}:${q.season}:${q.episode}`;
  }
  return base;
}

function extraArgs(q: SubSearchQuery): ExtraArg[] {
  const extra: ExtraArg[] = [];
  if (q.videoHash) extra.push({ name: "videoHash", value: q.videoHash });
  if (q.videoSize != null) extra.push({ name: "videoSize", value: q.videoSize });
  if (q.filename) extra.push({ name: "filename", value: q.filename });
  return extra;
}

async function callOne(addon: Addon, type: string, id: string, extra: ExtraArg[]): Promise<RawAddonSub[]> {
  const url = resourceUrl({ base: addon.transportUrl, resource: "subtitles", type, id, extra });
  dlog(`[addons] Fetching from ${addon.manifest.name}: ${url}`);
  try {
    const res = await safeFetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      dlog(`[addons] ${addon.manifest.name} returned ${res.status}`);
      return [];
    }
    const subs = parseSubtitles<RawAddonSub>(await res.json());
    dlog(`[addons] ${addon.manifest.name} returned ${subs.length} subtitles`);
    return subs;
  } catch (e) {
    dlog(`[addons] ${addon.manifest.name} error: ${e}`);
    return [];
  }
}

export async function searchAddons(
  addons: Addon[],
  q: SubSearchQuery,
): Promise<SubResult[]> {
  dlog(`[addons] searchAddons called with ${addons.length} addons`);

  const id = contentId(q);
  if (!id) {
    dlog('[addons] No content ID, returning empty');
    return [];
  }

  const type = q.type ?? (q.season != null && q.episode != null ? "series" : "movie");
  dlog(`[addons] Content ID: ${id}, Type: ${type}`);

  const subAddons = addons.filter((a) => {
    const accepts = addonAccepts(a, "subtitles", type, id);
    if (!accepts) {
      dlog(`[addons] ${a.manifest.name} does NOT accept ${type}/${id}`);
    }
    return accepts;
  });
  dlog(`[addons] === Filtered subtitle addons: ${subAddons.length} of ${addons.length} ===`);
  if (subAddons.length > 0) {
    dlog(`[addons] Accepting addons: ${subAddons.map(a => a.manifest.name).join(', ')}`);
  }
  if (subAddons.length === 0) {
    dlog('[addons] No subtitle addons accept this content');
    return [];
  }

  const extra = extraArgs(q);
  const settled = await Promise.all(
    subAddons.map(async (addon) => {
      const result = await callOne(addon, type, id, extra);
      dlog(`[addons] ${addon.manifest.name}: ${result.length} subtitles`);
      return result;
    }),
  );

  const out: SubResult[] = [];
  settled.forEach((subs, i) => {
    const addonName = subAddons[i].manifest.name;
    for (let idx = 0; idx < subs.length; idx++) {
      const s = subs[idx];
      if (!s.url) continue;
      // Include addon name and index to ensure unique IDs across different addons
      const uniqueId = s.id
        ? `${addonName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${s.id}`
        : `${addonName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`;
      out.push({
        id: uniqueId,
        url: s.url,
        lang: normalizeLang(s.lang),
        title: addonName,
        source: "addon",
        format: (s.SubFormat?.toLowerCase() as SubResult["format"]) || undefined,
      });
    }
  });

  dlog(`[addons] Total addon results: ${out.length}`);
  return out;
}

