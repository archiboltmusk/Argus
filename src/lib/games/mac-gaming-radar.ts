/**
 * macOS Gaming Compatibility Radar & Anti-Cheat Intelligence
 * Derived from community-verified benchmarks across r/macgaming, AppleGamingWiki, and ProtonDB.
 */

export type AppleSiliconTier = "base" | "pro_max" | "ultra";

export type CompatibilityStatus =
  | "native" // Compiled natively for Apple Silicon (ARM64 Metal)
  | "rosetta" // Intel Mac x86_64 running via Rosetta 2
  | "gptk_platinum" // Flawless 60+ FPS via GPTK 2 / D3DMetal / CrossOver
  | "gptk_gold" // Playable with minor tweaks (FSR/MSync) via GPTK 2
  | "gptk_silver" // Runs with performance compromises or graphical glitches
  | "anticheat_blocked" // Blocked by Windows kernel-level anti-cheat
  | "unsupported"; // Broken or black screen under Wine/macOS

export type AntiCheatEngine =
  | "vanguard" // Riot Vanguard (Kernel ring 0 - Hard Blocked)
  | "eac" // Easy Anti-Cheat (Blocked unless Linux/Proton enabled by dev)
  | "battleye" // BattlEye (Blocked unless Proton enabled)
  | "ricochet" // Call of Duty Ricochet (Kernel ring 0 - Hard Blocked)
  | "ea_anticheat" // EA AntiCheat (Hard Blocked)
  | "denuvo_antitamper" // Denuvo Anti-Tamper (Usually works under GPTK)
  | "ace" // Tencent Anti-Cheat Expert (Hard Blocked)
  | "none";

export interface AntiCheatDetails {
  engine: AntiCheatEngine;
  name: string;
  isKernelLevel: boolean;
  macPlayable: boolean;
  explanation: string;
  workaround?: string;
}

export interface MacGameCompatibilityEntry {
  id: string;
  title: string;
  steamId?: number;
  status: CompatibilityStatus;
  statusLabel: string;
  nativeAppleSilicon: boolean;
  antiCheat: AntiCheatDetails;
  graphicsApi: string;
  fpsEstimates: {
    baseMSeries: string; // M1, M2, M3, M4
    proMaxMSeries: string; // Pro / Max / Ultra
  };
  recommendedRunner: string;
  optimalSettings: {
    resolution: string;
    translationLayer: "Native" | "D3DMetal" | "DXVK-macOS" | "Rosetta 2";
    syncMethod: "MSync" | "ESync" | "Default";
    hudEnabled: boolean;
    avx2Required: boolean;
    recommendedUpscaler?: "MetalFX" | "FSR 2.2" | "FSR 3 Frame Gen" | "None";
  };
  communityNotes: string;
}

export const KNOWN_ANTI_CHEAT_ENGINES: Record<AntiCheatEngine, AntiCheatDetails> = {
  vanguard: {
    engine: "vanguard",
    name: "Riot Vanguard",
    isKernelLevel: true,
    macPlayable: false,
    explanation:
      "Riot Vanguard operates as a Windows Ring-0 kernel driver. macOS cannot load Windows NT kernel extensions into Darwin, making it impossible to run via Wine, CrossOver, or GPTK.",
    workaround: "Play League of Legends on macOS native client (Vanguard is Windows-only for LoL Mac). Valorant is strictly Windows PC only.",
  },
  eac: {
    engine: "eac",
    name: "Easy Anti-Cheat (Epic Games)",
    isKernelLevel: true,
    macPlayable: false,
    explanation:
      "Easy Anti-Cheat requires Windows kernel services. Unless the game developer explicitly activates the Wine/Proton compatibility bridge, multiplayer servers will disconnect.",
    workaround: "Single player modes may boot offline, or stream via GeForce NOW / Moonlight.",
  },
  battleye: {
    engine: "battleye",
    name: "BattlEye",
    isKernelLevel: true,
    macPlayable: false,
    explanation:
      "BattlEye driver fails to initialize under macOS translation layers without Valve Proton Linux signing.",
    workaround: "Cloud gaming via GeForce NOW or Boosteroid.",
  },
  ricochet: {
    engine: "ricochet",
    name: "Activision Ricochet",
    isKernelLevel: true,
    macPlayable: false,
    explanation:
      "Kernel driver actively checks for hypervisors and non-standard Windows kernels, instantly terminating boot.",
    workaround: "Stream via GeForce NOW or local Windows PC streaming with Moonlight.",
  },
  ea_anticheat: {
    engine: "ea_anticheat",
    name: "EA AntiCheat (EAAC)",
    isKernelLevel: true,
    macPlayable: false,
    explanation:
      "EA's proprietary kernel anti-cheat restricts FIFA, EA Sports FC 24/25, and Battlefield from running outside Windows NT.",
    workaround: "Older FIFA titles (FIFA 22/23 offline) or cloud streaming.",
  },
  denuvo_antitamper: {
    engine: "denuvo_antitamper",
    name: "Denuvo Anti-Tamper",
    isKernelLevel: false,
    macPlayable: true,
    explanation:
      "Denuvo Anti-Tamper runs in user-mode. It generally boots successfully in GPTK 2 and CrossOver once authorized online.",
  },
  ace: {
    engine: "ace",
    name: "Anti-Cheat Expert (Tencent)",
    isKernelLevel: true,
    macPlayable: false,
    explanation: "Kernel module blocks unauthorized environments.",
  },
  none: {
    engine: "none",
    name: "No Intrusive Anti-Cheat",
    isKernelLevel: false,
    macPlayable: true,
    explanation: "Fully compatible with macOS user-space translation and Wine bottles.",
  },
};

export const MAC_COMPATIBILITY_DATABASE: Record<string, MacGameCompatibilityEntry> = {
  // 1. Native Apple Silicon Titles
  "baldurs_gate_3": {
    id: "baldurs_gate_3",
    title: "Baldur's Gate 3",
    steamId: 1086940,
    status: "native",
    statusLabel: "Native Apple Silicon (ARM64 Metal)",
    nativeAppleSilicon: true,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.none,
    graphicsApi: "Metal 3 Native",
    fpsEstimates: {
      baseMSeries: "35–45 FPS at 1080p Medium with FSR 2.2 Quality",
      proMaxMSeries: "60–90+ FPS at 1440p / 4K High",
    },
    recommendedRunner: "Native macOS Steam / GOG",
    optimalSettings: {
      resolution: "1080p (1920x1080) or 1512x982",
      translationLayer: "Native",
      syncMethod: "Default",
      hudEnabled: true,
      avx2Required: false,
      recommendedUpscaler: "FSR 2.2",
    },
    communityNotes:
      "Runs completely native with zero translation overhead. Ensure Act 3 crowd density is set to Medium on base 8GB/16GB unified memory Macs.",
  },
  "death_stranding": {
    id: "death_stranding",
    title: "Death Stranding: Director's Cut",
    steamId: 1850570,
    status: "native",
    statusLabel: "Native Apple Silicon (Metal 3)",
    nativeAppleSilicon: true,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.none,
    graphicsApi: "Metal 3 with MetalFX Spatial & Temporal",
    fpsEstimates: {
      baseMSeries: "50–60 FPS at 1080p MetalFX Quality",
      proMaxMSeries: "90–120 FPS at 1440p / 4K ProMotion",
    },
    recommendedRunner: "Mac App Store / Native macOS",
    optimalSettings: {
      resolution: "1440p or 1080p",
      translationLayer: "Native",
      syncMethod: "Default",
      hudEnabled: true,
      avx2Required: false,
      recommendedUpscaler: "MetalFX",
    },
    communityNotes:
      "Flagship Metal 3 title showcasing Apple's MetalFX Temporal upscaling and DualSense haptic feedback.",
  },
  "resident_evil_4": {
    id: "resident_evil_4",
    title: "Resident Evil 4 Remake",
    steamId: 2050650,
    status: "native",
    statusLabel: "Native Apple Silicon (RE Engine)",
    nativeAppleSilicon: true,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.none,
    graphicsApi: "Metal 3 RE Engine",
    fpsEstimates: {
      baseMSeries: "45–60 FPS at 1080p MetalFX Prioritize Performance",
      proMaxMSeries: "70–100 FPS at 1440p MetalFX Quality",
    },
    recommendedRunner: "Mac App Store Native",
    optimalSettings: {
      resolution: "1080p",
      translationLayer: "Native",
      syncMethod: "Default",
      hudEnabled: true,
      avx2Required: false,
      recommendedUpscaler: "MetalFX",
    },
    communityNotes: "Uses unified memory efficiently. Cap framerate to 60 FPS for rock-solid frametimes.",
  },
  "no_mans_sky": {
    id: "no_mans_sky",
    title: "No Man's Sky",
    steamId: 275850,
    status: "native",
    statusLabel: "Native Apple Silicon (Metal 3)",
    nativeAppleSilicon: true,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.none,
    graphicsApi: "Metal 3 with MetalFX",
    fpsEstimates: {
      baseMSeries: "50–60 FPS at 1080p High",
      proMaxMSeries: "90–120 FPS at 1440p Ultra",
    },
    recommendedRunner: "macOS Steam Native",
    optimalSettings: {
      resolution: "1080p",
      translationLayer: "Native",
      syncMethod: "Default",
      hudEnabled: true,
      avx2Required: false,
      recommendedUpscaler: "MetalFX",
    },
    communityNotes: "Cross-play enabled with PC and consoles. Outstanding battery life on MacBook Air.",
  },
  "lies_of_p": {
    id: "lies_of_p",
    title: "Lies of P",
    steamId: 1627720,
    status: "native",
    statusLabel: "Native Apple Silicon (MetalFX)",
    nativeAppleSilicon: true,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.none,
    graphicsApi: "Metal 3 Unreal Engine 4",
    fpsEstimates: {
      baseMSeries: "60 FPS locked at 1080p High",
      proMaxMSeries: "100–120 FPS at 1440p Best",
    },
    recommendedRunner: "macOS Steam / Mac App Store Native",
    optimalSettings: {
      resolution: "1080p",
      translationLayer: "Native",
      syncMethod: "Default",
      hudEnabled: true,
      avx2Required: false,
      recommendedUpscaler: "MetalFX",
    },
    communityNotes: "One of the best optimized native Mac games released. Flawless 60 FPS even on base M1.",
  },

  // 2. GPTK 2 / CrossOver Platinum / Gold Titles
  "gta_v": {
    id: "gta_v",
    title: "Grand Theft Auto V",
    steamId: 271590,
    status: "gptk_platinum",
    statusLabel: "Platinum via GPTK 2 / Whisky / CrossOver",
    nativeAppleSilicon: false,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.none,
    graphicsApi: "DirectX 11 via D3DMetal",
    fpsEstimates: {
      baseMSeries: "55–70 FPS at 1080p High",
      proMaxMSeries: "90–120+ FPS at 1440p Very High",
    },
    recommendedRunner: "Whisky (Apple D3DMetal) or CrossOver 24",
    optimalSettings: {
      resolution: "1080p (1920x1080)",
      translationLayer: "D3DMetal",
      syncMethod: "MSync",
      hudEnabled: true,
      avx2Required: false,
    },
    communityNotes:
      "Story mode runs with near-native performance. Use MSync in Whisky for lower CPU latency. GTA Online requires BattleEye bypass/offline play.",
  },
  "cyberpunk_2077": {
    id: "cyberpunk_2077",
    title: "Cyberpunk 2077: Phantom Liberty",
    steamId: 1091500,
    status: "gptk_gold",
    statusLabel: "Gold via GPTK 2 / D3DMetal",
    nativeAppleSilicon: false,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.none,
    graphicsApi: "DirectX 12 Agility SDK via D3DMetal",
    fpsEstimates: {
      baseMSeries: "30–42 FPS at 1080p Low/Medium with FSR",
      proMaxMSeries: "60–85 FPS at 1440p High with FSR Quality",
    },
    recommendedRunner: "CrossOver 24 (D3DMetal) or GeForce NOW Ultimate",
    optimalSettings: {
      resolution: "1080p",
      translationLayer: "D3DMetal",
      syncMethod: "MSync",
      hudEnabled: true,
      avx2Required: true,
      recommendedUpscaler: "FSR 2.2",
    },
    communityNotes:
      "On macOS Sequoia with GPTK 2, AVX2 emulation enables Phantom Liberty without crashes. FSR 2.2 is mandatory.",
  },
  "elden_ring": {
    id: "elden_ring",
    title: "Elden Ring: Shadow of the Erdtree",
    steamId: 1245620,
    status: "gptk_gold",
    statusLabel: "Gold via CrossOver 24 / Whisky (Offline)",
    nativeAppleSilicon: false,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.eac,
    graphicsApi: "DirectX 12 via D3DMetal",
    fpsEstimates: {
      baseMSeries: "35–45 FPS at 1080p Medium",
      proMaxMSeries: "55–60 FPS locked at 1440p High",
    },
    recommendedRunner: "CrossOver 24 (CX24.0.4+ with D3DMetal)",
    optimalSettings: {
      resolution: "1080p",
      translationLayer: "D3DMetal",
      syncMethod: "MSync",
      hudEnabled: false,
      avx2Required: false,
    },
    communityNotes:
      "Must launch offline (toggle EAC off via start_protected_game.exe renaming) to bypass Easy Anti-Cheat. Game runs smoothly once in offline mode.",
  },
  "hogwarts_legacy": {
    id: "hogwarts_legacy",
    title: "Hogwarts Legacy",
    steamId: 990080,
    status: "gptk_gold",
    statusLabel: "Gold via GPTK 2",
    nativeAppleSilicon: false,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.none,
    graphicsApi: "DirectX 12 via D3DMetal",
    fpsEstimates: {
      baseMSeries: "30–40 FPS at 900p / 1080p FSR Balanced",
      proMaxMSeries: "55–75 FPS at 1440p FSR Quality",
    },
    recommendedRunner: "Whisky / CrossOver 24",
    optimalSettings: {
      resolution: "1080p",
      translationLayer: "D3DMetal",
      syncMethod: "MSync",
      hudEnabled: true,
      avx2Required: false,
      recommendedUpscaler: "FSR 2.2",
    },
    communityNotes: "Requires 16GB unified memory minimum; 8GB Macs will experience memory paging stutter.",
  },

  // 3. Blocked by Anti-Cheat (The #1 r/macgaming Pain Point)
  "valorant": {
    id: "valorant",
    title: "Valorant",
    status: "anticheat_blocked",
    statusLabel: "BLOCKED by Riot Vanguard Kernel Anti-Cheat",
    nativeAppleSilicon: false,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.vanguard,
    graphicsApi: "DirectX 11 (Blocked before graphics init)",
    fpsEstimates: {
      baseMSeries: "0 FPS (Does Not Boot)",
      proMaxMSeries: "0 FPS (Does Not Boot)",
    },
    recommendedRunner: "Cannot run on macOS / Wine / VM. Windows PC required.",
    optimalSettings: {
      resolution: "N/A",
      translationLayer: "Native",
      syncMethod: "Default",
      hudEnabled: false,
      avx2Required: false,
    },
    communityNotes:
      "DO NOT DOWNLOAD on Mac. Riot Vanguard requires a Windows Ring-0 kernel driver that cannot be emulated on Darwin / macOS or ARM64 virtual machines.",
  },
  "fortnite": {
    id: "fortnite",
    title: "Fortnite",
    status: "anticheat_blocked",
    statusLabel: "BLOCKED by BattlEye / Easy Anti-Cheat (Multiplayer)",
    nativeAppleSilicon: false,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.eac,
    graphicsApi: "Unreal Engine 5 (DirectX 12)",
    fpsEstimates: {
      baseMSeries: "Cloud Only: 60 FPS (Xbox Cloud / GeForce NOW)",
      proMaxMSeries: "Cloud Only: 120 FPS (GeForce NOW Ultimate)",
    },
    recommendedRunner: "GeForce NOW or Xbox Cloud Gaming",
    optimalSettings: {
      resolution: "1080p or 1440p via Cloud",
      translationLayer: "Native",
      syncMethod: "Default",
      hudEnabled: false,
      avx2Required: false,
    },
    communityNotes:
      "The outdated native Mac build is stranded in Chapter 2 (v13.40). Current Battle Royale is strictly cloud streaming on macOS.",
  },
  "apex_legends": {
    id: "apex_legends",
    title: "Apex Legends",
    steamId: 1172470,
    status: "anticheat_blocked",
    statusLabel: "BLOCKED by Easy Anti-Cheat",
    nativeAppleSilicon: false,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.eac,
    graphicsApi: "DirectX 11 Source Engine",
    fpsEstimates: {
      baseMSeries: "Cloud Only: 60 FPS",
      proMaxMSeries: "Cloud Only: 120 FPS (GeForce NOW)",
    },
    recommendedRunner: "GeForce NOW",
    optimalSettings: {
      resolution: "1080p via Cloud",
      translationLayer: "Native",
      syncMethod: "Default",
      hudEnabled: false,
      avx2Required: false,
    },
    communityNotes:
      "EA has not enabled the Proton EAC runtime for Wine translation. Disconnects from match server within 30 seconds of landing.",
  },
  "call_of_duty_warzone": {
    id: "call_of_duty_warzone",
    title: "Call of Duty: Warzone",
    steamId: 1938090,
    status: "anticheat_blocked",
    statusLabel: "BLOCKED by Ricochet Kernel Anti-Cheat",
    nativeAppleSilicon: false,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.ricochet,
    graphicsApi: "DirectX 12",
    fpsEstimates: {
      baseMSeries: "Cloud Only: 60 FPS",
      proMaxMSeries: "Cloud Only: 120 FPS",
    },
    recommendedRunner: "GeForce NOW or Local Moonlight PC Streaming",
    optimalSettings: {
      resolution: "1080p / 1440p via Stream",
      translationLayer: "Native",
      syncMethod: "Default",
      hudEnabled: false,
      avx2Required: false,
    },
    communityNotes: "Ricochet Ring-0 driver blocks all translation layers. Playable solely via game streaming.",
  },
};

/**
 * Searches the Mac Gaming compatibility database by name or Steam App ID.
 */
export function lookupMacCompatibility(gameName: string, steamId?: number): MacGameCompatibilityEntry {
  const norm = gameName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Exact ID checks
  if (steamId) {
    for (const entry of Object.values(MAC_COMPATIBILITY_DATABASE)) {
      if (entry.steamId === steamId) return entry;
    }
  }

  // Name substring matching
  if (norm.includes("baldursgate") || norm.includes("bg3")) return MAC_COMPATIBILITY_DATABASE["baldurs_gate_3"];
  if (norm.includes("deathstranding")) return MAC_COMPATIBILITY_DATABASE["death_stranding"];
  if (norm.includes("residentevil4") || norm.includes("re4")) return MAC_COMPATIBILITY_DATABASE["resident_evil_4"];
  if (norm.includes("nomanssky") || norm.includes("nms")) return MAC_COMPATIBILITY_DATABASE["no_mans_sky"];
  if (norm.includes("liesofp")) return MAC_COMPATIBILITY_DATABASE["lies_of_p"];
  if (norm.includes("gtav") || norm.includes("grandtheftauto") || norm.includes("gta5")) return MAC_COMPATIBILITY_DATABASE["gta_v"];
  if (norm.includes("cyberpunk")) return MAC_COMPATIBILITY_DATABASE["cyberpunk_2077"];
  if (norm.includes("eldenring")) return MAC_COMPATIBILITY_DATABASE["elden_ring"];
  if (norm.includes("hogwarts")) return MAC_COMPATIBILITY_DATABASE["hogwarts_legacy"];
  if (norm.includes("valorant")) return MAC_COMPATIBILITY_DATABASE["valorant"];
  if (norm.includes("fortnite")) return MAC_COMPATIBILITY_DATABASE["fortnite"];
  if (norm.includes("apex")) return MAC_COMPATIBILITY_DATABASE["apex_legends"];
  if (norm.includes("warzone") || norm.includes("callofduty") || norm.includes("cod")) return MAC_COMPATIBILITY_DATABASE["call_of_duty_warzone"];

  // Heuristic for unknown Windows titles
  return {
    id: "unknown_title",
    title: gameName,
    steamId,
    status: "gptk_gold",
    statusLabel: "Windows PC Title · Test via Whisky / GPTK 2",
    nativeAppleSilicon: false,
    antiCheat: KNOWN_ANTI_CHEAT_ENGINES.none,
    graphicsApi: "DirectX 11 / 12 translated to Metal via D3DMetal",
    fpsEstimates: {
      baseMSeries: "40–60 FPS (Depends on 3D engine complexity)",
      proMaxMSeries: "60–100+ FPS on Pro/Max M-Series",
    },
    recommendedRunner: "Whisky (Apple GPTK 2) or CrossOver 24",
    optimalSettings: {
      resolution: "1080p (1920x1080)",
      translationLayer: "D3DMetal",
      syncMethod: "MSync",
      hudEnabled: true,
      avx2Required: false,
      recommendedUpscaler: "FSR 2.2",
    },
    communityNotes:
      "Test in a clean Wine bottle with D3DMetal and MSync enabled. If the game crashes on startup, check if it requires AVX2 (macOS Sequoia) or kernel-level anti-cheat.",
  };
}

/**
 * Calculates Retina 1x logical point resolution to avoid the severe 4K Retina GPU penalty.
 */
export function calculateRetinaOptimization(
  screenPhysicalWidth: number = 3024,
  screenPhysicalHeight: number = 1964,
  scaleFactor: number = 2.0
) {
  const logicalWidth = Math.round(screenPhysicalWidth / scaleFactor);
  const logicalHeight = Math.round(screenPhysicalHeight / scaleFactor);
  const rawPixelCount = screenPhysicalWidth * screenPhysicalHeight;
  const optimizedPixelCount = logicalWidth * logicalHeight;
  const gpuLoadReductionPercent = Math.round(((rawPixelCount - optimizedPixelCount) / rawPixelCount) * 100);

  return {
    physicalResolution: `${screenPhysicalWidth} × ${screenPhysicalHeight}`,
    optimizedPointResolution: `${logicalWidth} × ${logicalHeight}`,
    gpuLoadReductionPercent,
    standardGamingTargets: [
      { label: "1080p Standard (Highest FPS)", width: 1920, height: 1080 },
      { label: "MacBook 14\" Point 1x (Ultra Sharp)", width: 1512, height: 982 },
      { label: "MacBook 16\" Point 1x (Crisp Balance)", width: 1728, height: 1117 },
      { label: "1440p QHD (Pro / Max Chips)", width: 2560, height: 1440 },
    ],
  };
}
