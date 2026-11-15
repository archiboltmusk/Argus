import { cwProfileScope } from "../cw-profile";
import { musicTrackIdentity } from "./track-identity";
import { readMusicPreference, writeMusicPreference } from "./preferences";
import type { MusicTrack } from "./types";

export type RadioFocus = "balanced" | "familiar" | "discover";
function key(name: string): string {
  return `argus.music.${name}.${cwProfileScope().profileId || "default"}`;
}
export function tasteExclusions(): string[] {
  try {
    const value = JSON.parse(readMusicPreference(key("taste-exclusions")) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
export function excludedFromTaste(track: MusicTrack): boolean {
  return tasteExclusions().includes(musicTrackIdentity(track));
}
export function setTasteExcluded(track: MusicTrack, excluded: boolean): void {
  const id = musicTrackIdentity(track);
  const values = tasteExclusions().filter((value) => value !== id);
  if (excluded) values.push(id);
  writeMusicPreference(key("taste-exclusions"), JSON.stringify(values.slice(-1000)));
}
export function tasteCacheRevision(): string {
  return JSON.stringify(tasteExclusions());
}
export function radioFocus(): RadioFocus {
  const value = readMusicPreference(key("radio-focus"));
  return value === "familiar" || value === "discover" ? value : "balanced";
}
export function setRadioFocus(value: RadioFocus): void {
  writeMusicPreference(key("radio-focus"), value);
}
export function tuneRadio(
  tracks: MusicTrack[],
  familiar: readonly MusicTrack[],
  focus = radioFocus(),
): MusicTrack[] {
  const known = new Set(familiar.map(musicTrackIdentity));
  if (focus === "balanced") return [...tracks];
  return tracks
    .map((track, index) => ({ track, index, known: known.has(musicTrackIdentity(track)) }))
    .sort(
      (a, b) =>
        (focus === "familiar"
          ? Number(b.known) - Number(a.known)
          : Number(a.known) - Number(b.known)) || a.index - b.index,
    )
    .map((item) => item.track);
}
