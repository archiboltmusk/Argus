export type UpgradeHighlight = {
  icon: "zap" | "gesture" | "book" | "sparkles" | "film" | "shield" | "audio" | "bot";
  title: string;
  description: string;
};

export type UpgradeRelease = {
  version: string;
  title: string;
  date: string;
  tag?: string;
  badge?: "Latest" | "Major" | "Performance" | "Fixes";
  highlights: UpgradeHighlight[];
};

export const RECENT_UPGRADES: UpgradeRelease[] = [
  {
    version: "v3.17.0",
    title: "Free Intelligence APIs & On-Device AI Companion",
    date: "November 2026",
    badge: "Latest",
    highlights: [
      {
        icon: "bot",
        title: "On-Device Ollama AI Cinema Companion",
        description:
          "Zero-cloud-cost local AI integration (localhost:11434) providing real-time, anti-spoiler film lore and scene breakdowns.",
      },
      {
        icon: "audio",
        title: "AcoustID Audio Fingerprinting (Shazam-Style)",
        description:
          "Free acoustic fingerprint identification to name any background track playing in media with MusicBrainz linkage.",
      },
      {
        icon: "film",
        title: "Watchmode Legal Streaming Availability",
        description:
          "Displays regional streaming availability badges (Netflix, Prime, Disney+, Max) for legal watching options.",
      },
      {
        icon: "sparkles",
        title: "AniList Public GraphQL Integration",
        description:
          "Comprehensive anime relationship trees, voice actors, Japanese kanji/romaji titles, and studio catalogs with zero API keys.",
      },
    ],
  },
  {
    version: "v3.16.1",
    title: "Touch & Mobile Gestures Engine with Glassmorphic HUD",
    date: "November 2026",
    badge: "Major",
    highlights: [
      {
        icon: "gesture",
        title: "Left-Screen Vertical Swipe — Display Brightness",
        description:
          "Smoothly adjusts display and hardware video brightness in real time with a floating amber HUD gauge.",
      },
      {
        icon: "audio",
        title: "Right-Screen Vertical Swipe — Audio Volume",
        description:
          "Controls player audio volume with a reactive emerald level meter and auto-limiter protection.",
      },
      {
        icon: "zap",
        title: "Horizontal Scrubbing Seek with Live Timecode",
        description:
          "Drag across the stage to scrub through the timeline with live seek delta (±seconds) and target timestamp preview.",
      },
      {
        icon: "sparkles",
        title: "Edge Double-Tap Quick Jump & Ripple Feedback",
        description:
          "Double tap on the left 35% to jump -10s, right 35% to jump +10s, and center to toggle fullscreen.",
      },
    ],
  },
  {
    version: "v3.16.0",
    title: "Phase 2 Sub-Second Playback Engine (Nuvio Parity & Beyond)",
    date: "November 2026",
    badge: "Performance",
    highlights: [
      {
        icon: "zap",
        title: "Native TCP/TLS & DNS Socket Pre-Warming",
        description:
          "Asynchronously resolves DNS and initiates TCP handshakes in Tokio background workers before clicking Play, shaving 150–300ms.",
      },
      {
        icon: "film",
        title: "Instant I-Frame Rendering (initial-audio-sync=no)",
        description:
          "Decouples initial video presentation from audio clock sync, painting the first video frame immediately on demux.",
      },
      {
        icon: "zap",
        title: "ExoPlayer-Style 32KiB Demuxer Probing",
        description:
          "Tuned probesize to 32KiB and analyze duration to 0.1s with fpsprobesize=0 to eliminate demuxer probe wait.",
      },
      {
        icon: "sparkles",
        title: "Predictive Dual-Candidate Pre-Resolution",
        description:
          "Speculatively resolves and un-restricts the top 2 stream candidates on stream picker load and card hover.",
      },
    ],
  },
  {
    version: "v3.15.0",
    title: "Fast-Start Playback Foundation & macOS Surface Retain",
    date: "November 2026",
    badge: "Major",
    highlights: [
      {
        icon: "zap",
        title: "Background Debrid Stream Pre-Warming",
        description:
          "Resolves cached torrent streams on hover so that playback starts instantly with zero roundtrip API delay.",
      },
      {
        icon: "shield",
        title: "Cross-Platform Retained MPV Surfaces",
        description:
          "Keeps Metal / DirectX rendering surfaces pooled and alive between video transitions to eliminate window recreate overhead.",
      },
      {
        icon: "zap",
        title: "Direct Header Passthrough Bypass",
        description:
          "Passes authentication and custom CDN headers straight into native MPV without local HTTP proxy loopback latency.",
      },
    ],
  },
  {
    version: "v3.14.2",
    title: "Polyglot LNReader Extension Sandbox Hardening",
    date: "November 2026",
    badge: "Fixes",
    highlights: [
      {
        icon: "book",
        title: "WebKit Worker FormData & Module Shims",
        description:
          "Polyfilled worker FormData and added CommonJS shims for @libs/filterInputs and @libs/isAbsoluteUrl.",
      },
      {
        icon: "shield",
        title: "Strict-Mode Execution Compatibility",
        description:
          "Declared scoped plugin variables and sandbox handles, unblocking 600+ community web novel scrapers (ArNovel, Azora, etc.).",
      },
    ],
  },
  {
    version: "v3.14.0",
    title: "Visionary Cinema Suite & Social Reframer",
    date: "November 2026",
    badge: "Major",
    highlights: [
      {
        icon: "film",
        title: "Lossless Scene Clipper & 9:16 Reframer",
        description:
          "Extracts high-bitrate clips losslessly without re-encoding and auto-tracks subjects into 9:16 vertical video for mobile.",
      },
      {
        icon: "bot",
        title: "Cinema Lore Bot & Smart Trailers",
        description:
          "Context-aware AI film companion explaining plot threads, trivia, and generating dynamic spoiler-free trailers.",
      },
    ],
  },
  {
    version: "v3.13.0",
    title: "Cinematic Mastery & Reactive Ambilight",
    date: "October 2026",
    badge: "Major",
    highlights: [
      {
        icon: "sparkles",
        title: "Reactive Edge Ambilight Sync",
        description:
          "Samples perimeter video pixels at 60 FPS to project immersive ambient glow onto your surrounding UI and walls.",
      },
      {
        icon: "shield",
        title: "Neural Inpaint Subtitle Shield",
        description:
          "Protects OLED displays from subtitle burn-in by dynamically modulating luminance and anti-aliasing text edges.",
      },
      {
        icon: "audio",
        title: "Binaural 3D Audio Spatializer & 3D LUTs",
        description:
          "Virtualizes 5.1/7.1 surround sound into headphones using HRTF filters alongside professional 3D LUT color grading.",
      },
    ],
  },
  {
    version: "v3.12.0",
    title: "Neural Dialogue Isolation & AI Catch-Me-Up",
    date: "October 2026",
    badge: "Major",
    highlights: [
      {
        icon: "audio",
        title: "Neural Voice Dialogue Enhancer",
        description:
          "Applies real-time voice demixing to clarify low-frequency whisper dialogue without boosting loud background explosions.",
      },
      {
        icon: "bot",
        title: "AI Catch-Me-Up Recap",
        description:
          "Instant contextual summary of prior episodes and plot arcs before jumping into a new season.",
      },
    ],
  },
];
