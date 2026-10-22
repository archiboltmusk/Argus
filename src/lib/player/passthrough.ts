import type { Settings } from "@/lib/settings";

export type PassthroughCodec = "ac3" | "eac3" | "dts" | "dts-hd" | "truehd";

export const PASSTHROUGH_CODECS: ReadonlyArray<{ id: PassthroughCodec; label: string }> = [
  { id: "ac3", label: "Dolby Digital" },
  { id: "eac3", label: "Dolby Digital Plus (Atmos on streaming)" },
  { id: "dts", label: "DTS" },
  { id: "dts-hd", label: "DTS-HD MA" },
  { id: "truehd", label: "Dolby TrueHD (Atmos on disc)" },
];


export function sanitizePassthroughCodecs(value: unknown): PassthroughCodec[] {
  if (!Array.isArray(value)) return ["ac3", "eac3", "dts-hd", "truehd"];
  return PASSTHROUGH_CODECS.map((c) => c.id).filter((id) => value.includes(id));
}

/**
 * mpv sends only the listed codecs bitstream; everything else is decoded as usual.
 * mpv cannot apply filters, volume boost or downmix to a bitstream, so those are
 * skipped for the passthrough codecs by mpv itself.
 */
export function passthroughMpvLines(
  s: Pick<Settings, "mpvPassthrough" | "mpvPassthroughCodecs">,
): string[] {
  if (!s.mpvPassthrough) return [];
  const codecs = sanitizePassthroughCodecs(s.mpvPassthroughCodecs);
  if (codecs.length === 0) return [];
  return [`audio-spdif=${codecs.join(",")}`];
}
