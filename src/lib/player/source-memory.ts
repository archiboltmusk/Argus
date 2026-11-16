import { activeScopedProfileId } from "@/lib/active-profile-id";
import { isIncognito } from "@/lib/incognito";

export type SourceMemory = {
  addonId: string;
  resolution: string;
  audioLanguage?: string;
  at: number;
};
const TTL = 30 * 86400_000;
function key() {
  let account = "local";
  try {
    const state = JSON.parse(localStorage.getItem("argus.nuvio.state.v1") ?? "null");
    account = state?.session?.user?.id ?? "local";
  } catch {
    /* local account */
  }
  return `argus.source-memory.v1.${JSON.stringify([activeScopedProfileId(), account])}`;
}
export function readSourceMemory(): SourceMemory | null {
  if (isIncognito()) return null;
  try {
    const v = JSON.parse(localStorage.getItem(key()) ?? "null");
    return v &&
      typeof v.addonId === "string" &&
      typeof v.resolution === "string" &&
      Number.isFinite(v.at) &&
      v.at <= Date.now() &&
      Date.now() - v.at < TTL
      ? v
      : null;
  } catch {
    return null;
  }
}
/** Remember only observed successful decoding; never retain a stream URL or credentials. */
export function rememberWorkingSource(choice: Omit<SourceMemory, "at">): void {
  if (isIncognito() || !choice.addonId || choice.addonId.length > 256) return;
  try {
    localStorage.setItem(key(), JSON.stringify({ ...choice, at: Date.now() }));
  } catch {
    /* optional preference */
  }
}
export function clearSourceMemory(): void {
  try {
    localStorage.removeItem(key());
  } catch {
    /* unavailable storage */
  }
}
export function sourceMemoryBonus(
  stream: { addonId: string; resolution: string },
  remembered: SourceMemory | null | undefined,
): number {
  return remembered?.addonId === stream.addonId
    ? remembered.resolution === stream.resolution
      ? 8
      : 4
    : 0;
}
