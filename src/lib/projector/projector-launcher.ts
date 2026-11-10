import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";
import { isAndroid } from "@/lib/platform";

export type ProjectorInputSourceId = "hdmi-1" | "hdmi-2" | "av" | "usb" | "cast" | "argus";

export interface ProjectorInputSource {
  id: ProjectorInputSourceId;
  label: string;
  subtitle: string;
  badge?: string;
  iconType: "hdmi" | "tv" | "cable" | "usb" | "cast" | "argus";
  intentAction?: string;
}

export const PROJECTOR_INPUT_SOURCES: ProjectorInputSource[] = [
  {
    id: "hdmi-1",
    label: "HDMI 1",
    subtitle: "Game Console & Blu-ray",
    badge: "4K 60Hz",
    iconType: "hdmi",
    intentAction: "android.media.tv.action.VIEW_INPUTS",
  },
  {
    id: "hdmi-2",
    label: "HDMI 2 (eARC)",
    subtitle: "Soundbar & Receiver",
    badge: "eARC / CEC",
    iconType: "tv",
    intentAction: "android.media.tv.action.VIEW_INPUTS",
  },
  {
    id: "av",
    label: "AV / RCA In",
    subtitle: "Analog Component / Aux",
    badge: "480p",
    iconType: "cable",
    intentAction: "android.media.tv.action.VIEW_INPUTS",
  },
  {
    id: "usb",
    label: "USB Storage",
    subtitle: "Local Media & Offline Files",
    badge: "Direct Play",
    iconType: "usb",
  },
  {
    id: "cast",
    label: "Screen Mirror",
    subtitle: "AirPlay, Miracast & Google Cast",
    badge: "Ready",
    iconType: "cast",
  },
  {
    id: "argus",
    label: "Argus Cinema Hub",
    subtitle: "Movies, Shows, Anime & Live TV",
    badge: "Infinite",
    iconType: "argus",
  },
];

export interface ProjectorAppItem {
  id: string;
  name: string;
  packageName: string;
  scheme?: string;
  color: string;
  category: "streaming" | "tools" | "music" | "system";
  isCustom?: boolean;
}

export const DEFAULT_PROJECTOR_APPS: ProjectorAppItem[] = [
  {
    id: "youtube-tv",
    name: "YouTube",
    packageName: "com.google.android.youtube.tv",
    scheme: "vnd.youtube://",
    color: "#EF4444",
    category: "streaming",
  },
  {
    id: "smarttube",
    name: "SmartTube",
    packageName: "com.teamsmart.videomanager.tv",
    scheme: "smarttube://",
    color: "#F97316",
    category: "streaming",
  },
  {
    id: "netflix",
    name: "Netflix",
    packageName: "com.netflix.ninja",
    scheme: "netflix://",
    color: "#DC2626",
    category: "streaming",
  },
  {
    id: "prime-video",
    name: "Prime Video",
    packageName: "com.amazon.amazonvideo.livingroom",
    scheme: "primevideo://",
    color: "#0284C7",
    category: "streaming",
  },
  {
    id: "disney-hotstar",
    name: "Disney+ Hotstar",
    packageName: "in.startv.hotstar",
    scheme: "hotstar://",
    color: "#2563EB",
    category: "streaming",
  },
  {
    id: "plex",
    name: "Plex",
    packageName: "com.plexapp.android",
    scheme: "plex://",
    color: "#EAB308",
    category: "streaming",
  },
  {
    id: "kodi",
    name: "Kodi",
    packageName: "org.xbmc.kodi",
    scheme: "kodi://",
    color: "#06B6D4",
    category: "streaming",
  },
  {
    id: "spotify",
    name: "Spotify",
    packageName: "com.spotify.tv.android",
    scheme: "spotify://",
    color: "#22C55E",
    category: "music",
  },
  {
    id: "twitch",
    name: "Twitch",
    packageName: "tv.twitch.android.app",
    scheme: "twitch://",
    color: "#A855F7",
    category: "streaming",
  },
  {
    id: "android-settings",
    name: "Projector Settings",
    packageName: "com.android.tv.settings",
    scheme: "intent:#Intent;action=android.settings.SETTINGS;end",
    color: "#64748B",
    category: "system",
  },
];

export interface WallColorPreset {
  id: "white" | "ivory" | "cool-grey" | "peach" | "green";
  label: string;
  color: string;
  filter: string;
  description: string;
}

export const WALL_COLOR_PRESETS: WallColorPreset[] = [
  {
    id: "white",
    label: "Standard White",
    color: "#FFFFFF",
    filter: "none",
    description: "Standard balanced color calibration for matte white screens and plain white walls.",
  },
  {
    id: "ivory",
    label: "Warm Ivory / Cream",
    color: "#FDFBF7",
    filter: "hue-rotate(185deg) saturate(1.08) contrast(1.03)",
    description: "Neutralizes yellow/cream wall paint with gentle cool-cyan light compensation.",
  },
  {
    id: "cool-grey",
    label: "Cool Slate / Grey",
    color: "#D1D5DB",
    filter: "brightness(1.16) contrast(1.12)",
    description: "Lifts midtone luminance (+16%) and punch on modern light-grey living room walls.",
  },
  {
    id: "peach",
    label: "Peach / Beige",
    color: "#FDE68A",
    filter: "hue-rotate(205deg) saturate(1.10)",
    description: "Compensates for warm beige, peach or wood panel reflections for natural skin tones.",
  },
  {
    id: "green",
    label: "Light Mint / Sage",
    color: "#D1FAE5",
    filter: "hue-rotate(310deg) saturate(1.06)",
    description: "Removes subtle greenish wall tint, maintaining natural cinema white balance.",
  },
];

export interface PictureProfilePreset {
  id: "cinema" | "daylight" | "eco" | "night";
  label: string;
  brightness: number;
  contrast: number;
  gamma: number;
  fanNoise: string;
  lumens: string;
  subtitleColor: string;
  description: string;
}

export const PICTURE_PROFILES: PictureProfilePreset[] = [
  {
    id: "cinema",
    label: "Cinema Reference",
    brightness: 100,
    contrast: 110,
    gamma: 2.4,
    fanNoise: "Quiet (30 dB)",
    lumens: "100% Rec.709",
    subtitleColor: "#FFD180",
    description: "Tuned for darkened theater rooms. Accurate gamma 2.4 with deep black levels.",
  },
  {
    id: "daylight",
    label: "Daylight Boost",
    brightness: 125,
    contrast: 125,
    gamma: 2.0,
    fanNoise: "High (38 dB)",
    lumens: "Peak Lumens",
    subtitleColor: "#FFFFFF",
    description: "Maximum optical output and midtone lift to cut through ambient daylight.",
  },
  {
    id: "eco",
    label: "Eco Whisper",
    brightness: 82,
    contrast: 100,
    gamma: 2.2,
    fanNoise: "Silent (<26 dB)",
    lumens: "65% Lamp",
    subtitleColor: "#FFE082",
    description: "Reduces projector fan RPM to whisper-quiet and extends LED/laser lamp longevity.",
  },
  {
    id: "night",
    label: "Midnight Ambient",
    brightness: 72,
    contrast: 95,
    gamma: 2.3,
    fanNoise: "Silent (<24 dB)",
    lumens: "50% Soft",
    subtitleColor: "#FFAB40",
    description: "Gentle eye-care amber glow for late night bedroom cinema projection.",
  },
];

export interface AmbianceScene {
  id: "movie-night" | "ambient-fireplace" | "vocal-clarity" | "game-low-latency";
  title: string;
  desc: string;
  icon: string;
}

export const AMBIANCE_SCENES: AmbianceScene[] = [
  {
    id: "movie-night",
    title: "Cinema Night",
    desc: "Dimmed UI, auto theater mode, Rec.709 matrix",
    icon: "film",
  },
  {
    id: "ambient-fireplace",
    title: "Cozy Hearth",
    desc: "Warm glow fireplace visualizer & ambient audio",
    icon: "flame",
  },
  {
    id: "vocal-clarity",
    title: "Speech Isolation",
    desc: "+6dB dialogue boost to overcome projector fan hum",
    icon: "volume",
  },
  {
    id: "game-low-latency",
    title: "Ultra Low Latency",
    desc: "Fast-response gaming mode for HDMI 1 / 2 consoles",
    icon: "gamepad",
  },
];

/**
 * Launches an external Android TV app via Android intent URI or app scheme.
 */
export async function launchProjectorApp(app: ProjectorAppItem): Promise<boolean> {
  const intentUri = `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LEANBACK_LAUNCHER;package=${encodeURIComponent(app.packageName)};end`;

  try {
    if (isAndroid()) {
      if (app.scheme) {
        try {
          await tauriOpenUrl(app.scheme);
          return true;
        } catch {
          /* try intent */
        }
      }
      await tauriOpenUrl(intentUri);
      return true;
    }
    // Web or desktop fallback
    if (app.scheme && typeof window !== "undefined") {
      window.location.href = app.scheme;
      return true;
    }
  } catch (err) {
    console.warn(`[projector-launcher] could not launch ${app.packageName}:`, err);
  }
  return false;
}

/**
 * Triggers switching to a hardware input source on Android TV or Smart Projector.
 */
export async function switchProjectorInput(input: ProjectorInputSource): Promise<boolean> {
  if (input.intentAction && isAndroid()) {
    try {
      const intentUri = `intent:#Intent;action=${encodeURIComponent(input.intentAction)};end`;
      await tauriOpenUrl(intentUri);
      return true;
    } catch (e) {
      console.warn(`[projector-launcher] input intent switch failed:`, e);
    }
  }
  return false;
}

export function getWallColorFilter(tintId: WallColorPreset["id"]): string {
  const preset = WALL_COLOR_PRESETS.find((p) => p.id === tintId);
  return preset ? preset.filter : "none";
}
