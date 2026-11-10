import { useState, useEffect, useMemo } from "react";
import { SFX } from "@/lib/sfx";
import { useSettings } from "@/lib/settings";
import { useMobileCw, useMobileCwReady } from "@/views/mobile/mobile-cw-row";
import { pushBigPicture, resetBigPictureToHome } from "@/lib/big-picture";
import { isAndroid } from "@/lib/platform";
import {
  PROJECTOR_INPUT_SOURCES,
  DEFAULT_PROJECTOR_APPS,
  AMBIANCE_SCENES,
  WALL_COLOR_PRESETS,
  PICTURE_PROFILES,
  launchProjectorApp,
  switchProjectorInput,
  type ProjectorInputSource,
  type ProjectorAppItem,
  type AmbianceScene,
} from "@/lib/projector/projector-launcher";
import { ProjectorTestPattern } from "./projector-test-pattern";
import { ProjectorCalibrationModal } from "./projector-calibration-modal";

function useLauncherClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return { timeStr, dateStr };
}

export function BpProjectorLauncher() {
  const { settings, update } = useSettings();
  const cwItems = useMobileCw(12);
  const cwReady = useMobileCwReady();
  const { timeStr, dateStr } = useLauncherClock();

  const [showCalibration, setShowCalibration] = useState(false);
  const [showTestPattern, setShowTestPattern] = useState(false);
  const [activeSourceToast, setActiveSourceToast] = useState<string | null>(null);
  const [apps, setApps] = useState<ProjectorAppItem[]>(() => {
    try {
      const stored = localStorage.getItem("argus.projector.apps");
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_PROJECTOR_APPS;
  });
  const [showAddApp, setShowAddApp] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [newAppPkg, setNewAppPkg] = useState("");
  const [activeAmbiance, setActiveAmbiance] = useState<string>("movie-night");

  const activeWallPreset = useMemo(
    () =>
      WALL_COLOR_PRESETS.find((p) => p.id === (settings.projectorWallColorTint || "white")) ??
      WALL_COLOR_PRESETS[0],
    [settings.projectorWallColorTint],
  );

  const activeProfilePreset = useMemo(
    () =>
      PICTURE_PROFILES.find((p) => p.id === (settings.projectorPictureProfile || "cinema")) ??
      PICTURE_PROFILES[0],
    [settings.projectorPictureProfile],
  );

  const handleSelectSource = async (source: ProjectorInputSource) => {
    SFX.click();
    if (source.id === "argus") {
      resetBigPictureToHome();
      return;
    }
    if (source.id === "usb") {
      pushBigPicture({ kind: "library" });
      return;
    }
    if (source.id === "cast") {
      setActiveSourceToast("Argus Screen Mirroring & Cast receiver is online and ready");
      setTimeout(() => setActiveSourceToast(null), 4000);
      return;
    }

    const switched = await switchProjectorInput(source);
    if (!switched) {
      setActiveSourceToast(
        `Switched to ${source.label}. If your projector has an optical input button, select ${source.label}.`,
      );
      setTimeout(() => setActiveSourceToast(null), 5000);
    }
  };

  const handleLaunchApp = async (app: ProjectorAppItem) => {
    SFX.open();
    const launched = await launchProjectorApp(app);
    if (!launched && !isAndroid()) {
      setActiveSourceToast(`Opening ${app.name} (${app.packageName})`);
      setTimeout(() => setActiveSourceToast(null), 3000);
    }
  };

  const handleAddCustomApp = () => {
    if (!newAppName.trim() || !newAppPkg.trim()) return;
    const newApp: ProjectorAppItem = {
      id: `custom-${Date.now()}`,
      name: newAppName.trim(),
      packageName: newAppPkg.trim(),
      color: "#6366F1",
      category: "tools",
      isCustom: true,
    };
    const updated = [...apps, newApp];
    setApps(updated);
    try {
      localStorage.setItem("argus.projector.apps", JSON.stringify(updated));
    } catch {}
    setNewAppName("");
    setNewAppPkg("");
    setShowAddApp(false);
    SFX.click();
  };

  const handleSelectAmbiance = (scene: AmbianceScene) => {
    SFX.click();
    setActiveAmbiance(scene.id);
    if (scene.id === "movie-night") {
      update({
        projectorModeEnabled: true,
        projectorPictureProfile: "cinema",
        projectorHighContrastSubs: true,
      });
    } else if (scene.id === "vocal-clarity") {
      update({
        neuralVoiceClarifier: true,
        voiceClarifierProfileId: "projector-beem",
      });
    }
  };

  const handlePlayCw = (item: any) => {
    SFX.open();
    pushBigPicture({ kind: "detail", metaId: item._id });
  };

  const overscanPadding = `${settings.projectorKeystoneOverscan ?? 5}vh ${settings.projectorKeystoneOverscan ?? 5}vw`;

  return (
    <div
      className="relative w-full min-h-screen text-white select-none overflow-x-hidden overflow-y-auto pb-24"
      style={{
        padding: overscanPadding,
        filter: activeWallPreset.filter,
      }}
    >
      {/* Cinematic Ambient Backdrop */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black opacity-95"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/25 via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* Source Switch Toast Notification */}
      {activeSourceToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9950] px-6 py-3 rounded-2xl bg-zinc-900/95 border border-cyan-400 text-cyan-200 text-sm font-semibold shadow-[0_0_25px_rgba(34,211,238,0.4)] backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 motion-reduce:animate-none">
          {activeSourceToast}
        </div>
      )}

      {/* Top Ambient Header (Google TV / Home Style) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pt-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-baseline gap-4">
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white font-mono drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {timeStr}
            </h1>
            <span className="text-xl md:text-2xl font-medium text-zinc-300">{dateStr}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-medium text-zinc-400">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse motion-reduce:animate-none" />
              Smart Projector Mode
            </span>
            <span className="px-3 py-1 rounded-full bg-zinc-800/80 border border-white/10 text-zinc-300">
              Wall: {activeWallPreset.label}
            </span>
            <span className="px-3 py-1 rounded-full bg-zinc-800/80 border border-white/10 text-zinc-300">
              Lamp: {activeProfilePreset.label} ({activeProfilePreset.fanNoise})
            </span>
            <span className="px-3 py-1 rounded-full bg-zinc-800/80 border border-white/10 text-zinc-300">
              Keystone: {settings.projectorKeystoneOverscan ?? 5}% Inset
            </span>
          </div>
        </div>

        {/* Quick Projector Controls Pill Bar */}
        <div data-bp-row data-bp-row-key="proj-quick-controls" className="flex items-center gap-3">
          <button
            type="button"
            data-bp-focusable
            data-bp-chip
            data-bp-restore-key="proj-lens-setup"
            onClick={() => {
              SFX.open();
              setShowCalibration(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-sm font-semibold tracking-wide flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.2)] focus:ring-2 focus:ring-cyan-400"
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" strokeWidth="2" />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                strokeWidth="2"
              />
            </svg>
            Wall &amp; Lens Setup
          </button>

          <button
            type="button"
            data-bp-focusable
            data-bp-chip
            data-bp-restore-key="proj-focus-grid"
            onClick={() => {
              SFX.open();
              setShowTestPattern(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/15 text-zinc-200 text-sm font-semibold tracking-wide flex items-center gap-2 transition-all hover:scale-105 active:scale-95 focus:ring-2 focus:ring-emerald-400"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
              <path d="M12 3v18M3 12h18" strokeWidth="2" />
            </svg>
            Focus Grid
          </button>

          <button
            type="button"
            data-bp-focusable
            data-bp-chip
            data-bp-restore-key="proj-cinema-hub"
            onClick={() => resetBigPictureToHome()}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm tracking-wide transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2 focus:ring-2 focus:ring-amber-300"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            Argus Cinema Hub
          </button>
        </div>
      </header>

      {/* SECTION 1: Google Home / Quick Source Switcher Row */}
      <section data-bp-row data-bp-row-key="proj-sources" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Hardware Inputs &amp; Sources
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            Switch HDMI ports, USB storage, or mirror your mobile screen
          </span>
        </div>

        <div data-bp-grid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {PROJECTOR_INPUT_SOURCES.map((source) => (
            <button
              key={source.id}
              type="button"
              data-bp-focusable
              data-bp-tile
              data-bp-autofocus={source.id === "argus" ? "true" : undefined}
              data-bp-restore-key={`proj-src-${source.id}`}
              onClick={() => handleSelectSource(source)}
              className="group relative flex flex-col items-start p-4 rounded-3xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-white/10 hover:border-cyan-400/80 transition-all duration-200 text-left hover:scale-[1.03] active:scale-[0.98] shadow-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 group-hover:bg-cyan-500/20 border border-white/10 group-hover:border-cyan-500/40 flex items-center justify-center transition-colors">
                  {source.iconType === "hdmi" && (
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="4" y="6" width="16" height="12" rx="2" strokeWidth="2" />
                      <path d="M8 12h2m4 0h2" strokeWidth="2" />
                    </svg>
                  )}
                  {source.iconType === "tv" && (
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="2" y="7" width="20" height="13" rx="2" strokeWidth="2" />
                      <path d="M17 2l-5 5-5-5" strokeWidth="2" />
                    </svg>
                  )}
                  {source.iconType === "cable" && (
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8" strokeWidth="2" />
                      <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    </svg>
                  )}
                  {source.iconType === "usb" && (
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M10 2v7.5M14 2v7.5M12 2v15m0 0l-3-3m3 3l3-3M6 9a2 2 0 100-4 2 2 0 000 4zm12 0a2 2 0 100-4 2 2 0 000 4z" strokeWidth="2" />
                    </svg>
                  )}
                  {source.iconType === "cast" && (
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M2 16.1A5 5 0 015.9 20M2 12.05A9 9 0 019.95 20M2 8V6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2h-6M2 20h.01" strokeWidth="2" />
                    </svg>
                  )}
                  {source.iconType === "argus" && (
                    <svg className="w-5 h-5 text-amber-300 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l-10-5v9l10 5 10-5v-9l-10 5z" />
                    </svg>
                  )}
                </div>
                {source.badge && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                    {source.badge}
                  </span>
                )}
              </div>

              <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                {source.label}
              </span>
              <span className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                {source.subtitle}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 2: Google TV Continue Watching Rail */}
      {cwReady && cwItems.length > 0 && (
        <section data-bp-row data-bp-row-key="proj-cw" className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              <h2 className="text-xl font-bold text-white tracking-wide">
                Jump Back In (Continue Watching)
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              One-click resume on your wall screen
            </span>
          </div>

          <div data-bp-scroll-x className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none">
            {cwItems.map((item) => {
              const progressPct =
                item.state?.duration && item.state?.duration > 0
                  ? Math.min(100, Math.round((item.state.timeOffset / item.state.duration) * 100))
                  : 0;

              return (
                <button
                  key={item._id}
                  type="button"
                  data-bp-focusable
                  data-bp-tile
                  data-bp-restore-key={`proj-cw-${item._id}`}
                  onClick={() => handlePlayCw(item)}
                  className="group relative flex-none w-56 md:w-64 rounded-3xl bg-zinc-900 border border-white/10 hover:border-amber-400 overflow-hidden text-left transition-all duration-200 hover:scale-[1.04] active:scale-[0.98] shadow-lg hover:shadow-[0_0_25px_rgba(251,191,36,0.25)] focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <div className="relative aspect-video w-full bg-zinc-800 overflow-hidden">
                    <img
                      src={item.background || item.poster || ""}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Play Badge Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-amber-400/90 flex items-center justify-center text-black shadow-xl">
                        <svg className="w-6 h-6 fill-current ml-0.5" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Episode chip */}
                    {item.state?.season && item.state?.episode && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[11px] font-mono font-semibold text-amber-300 border border-amber-400/30">
                        S{item.state.season} E{item.state.episode}
                      </span>
                    )}

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/60">
                      <div
                        className="h-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <span className="text-[11px] text-zinc-400">
                      {progressPct > 0 ? `${progressPct}% watched` : "Ready to play"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: Google TV Installed TV Apps Drawer */}
      <section data-bp-row data-bp-row-key="proj-apps" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Installed Projector &amp; TV Apps
            </h2>
          </div>
          <button
            type="button"
            data-bp-focusable
            data-bp-chip
            data-bp-restore-key="proj-app-add"
            onClick={() => setShowAddApp(true)}
            className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors focus:ring-2 focus:ring-indigo-400 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
          >
            + Add Custom App
          </button>
        </div>

        <div data-bp-grid className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              data-bp-focusable
              data-bp-tile
              data-bp-restore-key={`proj-app-${app.id}`}
              onClick={() => handleLaunchApp(app)}
              className="group flex flex-col items-center justify-center p-5 rounded-3xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-indigo-400 text-center transition-all duration-200 hover:scale-[1.05] active:scale-[0.98] shadow-lg hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform"
                style={{ backgroundColor: app.color }}
              >
                <span className="text-xl font-black text-white drop-shadow">
                  {app.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                {app.name}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {app.category}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 4: Google Home Style Smart Ambiance Modes */}
      <section data-bp-row data-bp-row-key="proj-scenes">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Smart Cinema Scenes &amp; Acoustics
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            One-touch acoustic filters and optical tuning
          </span>
        </div>

        <div data-bp-grid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AMBIANCE_SCENES.map((scene) => {
            const active = activeAmbiance === scene.id;
            return (
              <button
                key={scene.id}
                type="button"
                data-bp-focusable
                data-bp-tile
                data-bp-restore-key={`proj-scene-${scene.id}`}
                onClick={() => handleSelectAmbiance(scene)}
                className={`flex flex-col items-start p-4 rounded-3xl border transition-all duration-200 text-left hover:scale-[1.02] active:scale-[0.98] ${
                  active
                    ? "bg-emerald-950/40 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.25)] ring-2 ring-emerald-400"
                    : "bg-zinc-900/80 border-white/10 hover:border-white/20"
                }`}
              >
                <span className="text-sm font-bold text-white mb-1">{scene.title}</span>
                <span className="text-xs text-zinc-400 leading-relaxed">{scene.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Modal 1: Projector Picture & Lens Calibration */}
      {showCalibration && (
        <ProjectorCalibrationModal
          onClose={() => setShowCalibration(false)}
          onOpenTestPattern={() => {
            setShowCalibration(false);
            setShowTestPattern(true);
          }}
        />
      )}

      {/* Modal 2: Precision Test Pattern */}
      {showTestPattern && (
        <ProjectorTestPattern onClose={() => setShowTestPattern(false)} />
      )}

      {/* Modal 3: Add Custom TV App Dialog */}
      {showAddApp && (
        <div
          className="fixed inset-0 z-[9920] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none"
          onClick={() => setShowAddApp(false)}
        >
          <div
            className="w-full max-w-md bg-zinc-900 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Add Custom Android TV App</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-400">App Name</label>
                <input
                  type="text"
                  placeholder="e.g. VLC Player"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400">
                  Android Package Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. org.videolan.vlc"
                  value={newAppPkg}
                  onChange={(e) => setNewAppPkg(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowAddApp(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomApp}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-xs font-bold text-white shadow-md"
              >
                Add App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
