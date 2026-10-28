import { osClass } from "@/lib/platform";

export type MacCompatibilityRating = "native" | "platinum" | "gold" | "silver" | "unsupported" | "emulation";

export type MacGameGuide = {
  id: string;
  gameName: string;
  steamId?: number;
  rating: MacCompatibilityRating;
  ratingLabel: string;
  summary: string;
  graphicsBackend: string;
  estimatedFpsAppleSilicon: {
    base: string; // e.g. M1/M2/M3 base
    proMax: string; // e.g. M1/M2/M3 Pro/Max
  };
  recommendedRunners: Array<{
    name: string;
    kind: "free_translation" | "cloud_trial" | "commercial" | "emulator";
    description: string;
    downloadUrl?: string;
    instructions: string[];
  }>;
  testingAdvice: string;
};

export const POPULAR_MAC_SIMULATOR_GUIDES: Record<string, MacGameGuide> = {
  "gta_v": {
    id: "gta_v",
    gameName: "Grand Theft Auto V (GTA V)",
    steamId: 271590,
    rating: "platinum",
    ratingLabel: "Runs Great via Whisky / GPTK",
    summary: "GTA V is a Windows DirectX 11 title. On macOS with Apple Silicon, the single-player campaign runs smoothly at 60–100+ FPS through Apple's D3DMetal translation layer.",
    graphicsBackend: "DirectX 11 translated to Metal 3 via D3DMetal",
    estimatedFpsAppleSilicon: {
      base: "55–70 FPS at 1080p Normal / High (M1 / M2 / M3)",
      proMax: "90–120+ FPS at 1440p Very High (M1/M2/M3/M4 Pro & Max)",
    },
    recommendedRunners: [
      {
        name: "GeForce NOW (Free Cloud Gaming Trial)",
        kind: "cloud_trial",
        description: "Zero installation, zero disk space needed. Launch directly in Safari or Chrome to test the gameplay, driving physics, and story before committing.",
        downloadUrl: "https://play.geforcenow.com",
        instructions: [
          "Open play.geforcenow.com in your Mac browser.",
          "Sign up for a free membership tier (provides 1-hour free gaming sessions).",
          "Connect a gamepad or keyboard to test game responsiveness and playability with zero downloads.",
        ],
      },
      {
        name: "Whisky (Free & Open Source Wine + Apple GPTK)",
        kind: "free_translation",
        description: "Built specifically for macOS Sonoma and Sequoia using Apple's official Game Porting Toolkit (D3DMetal) for near-native hardware-accelerated graphics.",
        downloadUrl: "https://getwhisky.app",
        instructions: [
          "Download and install Whisky from getwhisky.app (or `brew install --cask whisky`).",
          "Create a new Bottle named 'Windows 10' with Windows Version set to Windows 10.",
          "In Bottle Settings, ensure 'DXVK' or 'Apple D3DMetal' is enabled.",
          "Click 'Run' and select your game setup executable or launch the PC client.",
          "Plug in an Xbox or PlayStation controller (macOS maps controllers natively).",
        ],
      },
      {
        name: "CrossOver 24+ (CodeWeavers)",
        kind: "commercial",
        description: "Polished commercial Wine distribution with automated one-click installers and D3DMetal integration for Mac gamers.",
        downloadUrl: "https://www.codeweavers.com/crossover",
        instructions: [
          "Install CrossOver and search for 'Grand Theft Auto V'.",
          "CrossOver creates a pre-tuned bottle with required DirectX and visual C++ redistributables automatically.",
        ],
      },
    ],
    testingAdvice: "To test playability without purchasing full price, use the free GeForce NOW session first to see if you enjoy the driving physics and missions. If you want to test on-device Apple Silicon rendering, install Whisky and test with an offline trial or demo installer in a clean bottle without modifying any macOS system files.",
  },
  "cyberpunk_2077": {
    id: "cyberpunk_2077",
    gameName: "Cyberpunk 2077",
    steamId: 1091500,
    rating: "gold",
    ratingLabel: "Playable via GPTK 2 / CrossOver",
    summary: "Requires DirectX 12 D3DMetal translation. Smooth on M2 Pro and above.",
    graphicsBackend: "DirectX 12 to Metal 3",
    estimatedFpsAppleSilicon: {
      base: "30–40 FPS at 1080p Low/Medium with FSR",
      proMax: "60–80 FPS at 1440p High with FSR Quality",
    },
    recommendedRunners: [
      {
        name: "GeForce NOW Ultimate / Priority",
        kind: "cloud_trial",
        description: "Play with full RTX Ray Tracing and DLSS 3.5 in the cloud on Mac.",
        downloadUrl: "https://play.geforcenow.com",
        instructions: ["Stream directly at up to 4K 120 FPS on Mac."],
      },
      {
        name: "Whisky / CrossOver 24",
        kind: "free_translation",
        description: "Requires Apple D3DMetal for DX12 Agility SDK support.",
        instructions: ["Enable D3DMetal in bottle configuration."],
      },
    ],
    testingAdvice: "Test with FSR (FidelityFX Super Resolution) enabled for significant framerate gains on Mac.",
  },
};

/** Get Mac compatibility guide by game title or steam ID */
export function getMacSimulatorGuide(gameName: string, steamId?: number): MacGameGuide | null {
  const norm = gameName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (norm.includes("gtav") || norm.includes("grandtheftauto") || norm.includes("gatv") || steamId === 271590) {
    return POPULAR_MAC_SIMULATOR_GUIDES["gta_v"];
  }
  if (norm.includes("cyberpunk") || steamId === 1091500) {
    return POPULAR_MAC_SIMULATOR_GUIDES["cyberpunk_2077"];
  }
  // Generic fallback guide for any Windows game on Mac
  if (osClass() === "macos") {
    return {
      id: "generic_pc",
      gameName,
      steamId,
      rating: "gold",
      ratingLabel: "Windows PC · Test via Whisky / GPTK or Cloud",
      summary: `${gameName} is packaged for Windows. On macOS, you can test or run it using Whisky (Apple Game Porting Toolkit) or cloud streaming.`,
      graphicsBackend: "DirectX / Vulkan translated to Metal via D3DMetal / MoltenVK",
      estimatedFpsAppleSilicon: {
        base: "45–60 FPS (Depends on 3D engine complexity)",
        proMax: "60–100+ FPS on Pro/Max Apple Silicon",
      },
      recommendedRunners: [
        {
          name: "GeForce NOW Cloud Trial",
          kind: "cloud_trial",
          description: "Test gameplay and responsiveness instantly with zero installation.",
          downloadUrl: "https://play.geforcenow.com",
          instructions: ["Sign into GeForce NOW in your browser and launch."],
        },
        {
          name: "Whisky (Apple GPTK GUI)",
          kind: "free_translation",
          description: "Free Wine + D3DMetal environment for running Windows .exe installers.",
          downloadUrl: "https://getwhisky.app",
          instructions: [
            "Download Whisky from getwhisky.app.",
            "Create a new Windows 10 bottle.",
            "Run your installer or test package inside the bottle.",
          ],
        },
      ],
      testingAdvice: "Always test in a sandboxed bottle before dedicating full storage. Check if the game requires anti-cheat drivers (games with kernel-level anti-cheat like Vanguard do not run under Wine).",
    };
  }
  return null;
}
