import type { Settings } from "@/lib/settings/types";
export const ACCESSIBILITY_PRESETS = {
  readable: {
    subFontSize: 44,
    subStyle: "box",
    subBoxOpacity: 0.85,
    subFontColor: "#FFFFFF",
    subBoxColor: "#000000",
    subBold: true,
  },
  dialogue: { audioProfile: "speech-clarity" },
  comfortable: { uiScale: 1.15, reduceMotion: true, subFontSize: 40 },
} satisfies Record<string, Partial<Settings>>;
