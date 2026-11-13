import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Cloud, Tv, Play, Plus, SlidersHorizontal, Grid, Home } from "lucide-react";
import { SFX } from "@/lib/sfx";
import { useSettings } from "@/lib/settings";
import { useCloudSync } from "@/lib/cloud-sync/unified-cloud-sync";
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
import { BpCloudLinkModal } from "../bp-cloud-link-modal";

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
  const cloudSync = useCloudSync();

  const [showCalibration, setShowCalibration] = useState(false);
  const [showTestPattern, setShowTestPattern] = useState(false);
  const [showCloudLink, setShowCloudLink] = useState(false);
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

  const chipCls =
    "px-4 py-2.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/12 text-white/90 text-[13px] font-semibold tracking-tight flex items-center gap-2 argus-vibrancy-rail transition-all duration-[380ms] ease-[cubic-bezier(0.22,1.18,0.36,1)] hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/90 focus:bg-white/[0.16]";

  return (
    <div
      className="relative h-full w-full text-[#f4f4f6] select-none overflow-x-hidden overflow-y-auto scrollbar-none pt-[calc(var(--bp-page-top,84px)+18px)] px-[var(--bp-gutter,48px)] pb-36 bg-[radial-gradient(120%_80%_at_10%_-10%,rgba(255,255,255,0.06),transparent_55%),#07080b]"
      style={{
        paddingLeft: `calc(var(--bp-gutter,48px) + ${settings.projectorKeystoneOverscan ?? 5}vw)`,
        paddingRight: `calc(var(--bp-gutter,48px) + ${settings.projectorKeystoneOverscan ?? 5}vw)`,
        paddingBottom: `calc(9rem + ${settings.projectorKeystoneOverscan ?? 5}vh)`,
        filter: activeWallPreset.filter !== "none" ? activeWallPreset.filter : undefined,
      }}
    >
      {/* Source Switch Toast Notification */}
      {activeSourceToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9950] px-6 py-3 rounded-full bg-black/85 border border-white/20 text-white text-[13px] font-medium shadow-2xl backdrop-blur-xl">
          {activeSourceToast}
        </div>
      )}

      {/* Big Screen Hero Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 pt-2 pb-8 border-b border-white/[0.08]">
        <div>
          <div className="flex items-baseline gap-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-[-0.04em] text-white">
              {timeStr}
            </h1>
            <span className="text-lg md:text-xl font-medium text-white/55 tracking-tight">
              {dateStr}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 text-[12px] font-medium text-white/70">
            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/12 text-white/90 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Projector
            </span>
            <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
              Wall · {activeWallPreset.label}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
              {activeProfilePreset.label} · {activeProfilePreset.fanNoise}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
              {settings.projectorKeystoneOverscan ?? 5}% Inset
            </span>
          </div>
        </div>

        {/* Big Screen Pill Action Bar */}
        <div data-bp-row data-bp-row-key="proj-quick-controls" className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            data-bp-focusable
            data-bp-chip
            data-bp-restore-key="proj-cinema-hub"
            onClick={() => resetBigPictureToHome()}
            className="px-5 py-2.5 rounded-full bg-[#f4f4f6] hover:bg-white text-[#07080c] text-[13px] font-bold tracking-tight flex items-center gap-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
          >
            <Home size={15} strokeWidth={2.3} />
            <span>Argus Home</span>
          </button>

          <button
            type="button"
            data-bp-focusable
            data-bp-chip
            data-bp-restore-key="proj-cloud-sync"
            onClick={() => {
              SFX.open();
              setShowCloudLink(true);
            }}
            className={chipCls}
          >
            <Cloud size={15} className="text-white/75 shrink-0" />
            <span>
              {cloudSync.isConnected
                ? cloudSync.userEmail?.split("@")[0] || "Synced"
                : "Cloud Link"}
            </span>
          </button>

          <button
            type="button"
            data-bp-focusable
            data-bp-chip
            data-bp-restore-key="proj-lens-setup"
            onClick={() => {
              SFX.open();
              setShowCalibration(true);
            }}
            className={chipCls}
          >
            <SlidersHorizontal size={15} className="text-white/75 shrink-0" />
            <span>Wall &amp; Lens</span>
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
            className={chipCls}
          >
            <Grid size={15} className="text-white/75 shrink-0" />
            <span>Focus Grid</span>
          </button>
        </div>
      </header>

      {/* SECTION 1: Inputs & Sources */}
      <section data-bp-row data-bp-row-key="proj-sources" className="mb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[19px] font-bold text-white/95 tracking-[-0.02em]">
            Inputs &amp; Sources
          </h2>
          <span className="text-[12.5px] text-white/45">
            HDMI, USB storage, or wireless cast
          </span>
        </div>

        <div data-bp-grid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {PROJECTOR_INPUT_SOURCES.map((source) => (
            <button
              key={source.id}
              type="button"
              data-bp-focusable
              data-bp-tile
              data-bp-autofocus={source.id === "argus" ? "true" : undefined}
              data-bp-restore-key={`proj-src-${source.id}`}
              onClick={() => handleSelectSource(source)}
              className="group relative flex flex-col items-start p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.11] border border-white/[0.09] hover:border-white/30 backdrop-blur-xl transition-all duration-200 text-left hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/90 focus:bg-white/[0.12]"
            >
              <div className="flex items-center justify-between w-full mb-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center text-white/85 group-hover:text-white">
                  <Tv size={17} strokeWidth={1.9} />
                </div>
                {source.badge && (
                  <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-white/[0.07] border border-white/10 text-white/70">
                    {source.badge}
                  </span>
                )}
              </div>
              <span className="text-[14px] font-semibold text-white tracking-tight">
                {source.label}
              </span>
              <span className="text-[12px] text-white/50 line-clamp-1 mt-0.5">
                {source.subtitle}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 2: Continue Watching */}
      {cwReady && cwItems.length > 0 && (
        <section data-bp-row data-bp-row-key="proj-cw" className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[19px] font-bold text-white/95 tracking-[-0.02em]">
              Continue Watching
            </h2>
            <span className="text-[12.5px] text-white/45">
              Resume on the big screen
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
                  className="group relative flex-none w-60 md:w-68 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/40 overflow-hidden text-left transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/90"
                >
                  <div className="relative aspect-video w-full bg-black/50 overflow-hidden">
                    <img
                      src={item.background || item.poster || ""}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center text-black shadow-2xl">
                        <Play size={18} className="fill-current ml-0.5" />
                      </div>
                    </div>

                    {item.state?.season && item.state?.episode && (
                      <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-medium text-white/90 border border-white/15">
                        S{item.state.season} · E{item.state.episode}
                      </span>
                    )}

                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/15">
                      <div
                        className="h-full bg-white"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5">
                    <h3 className="text-[14px] font-semibold text-white line-clamp-1 tracking-tight">
                      {item.name}
                    </h3>
                    <span className="text-[11.5px] text-white/50">
                      {progressPct > 0 ? `${progressPct}% watched` : "Ready to play"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: Apps */}
      <section data-bp-row data-bp-row-key="proj-apps" className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[19px] font-bold text-white/95 tracking-[-0.02em]">
            Apps
          </h2>
          <button
            type="button"
            data-bp-focusable
            data-bp-chip
            data-bp-restore-key="proj-app-add"
            onClick={() => setShowAddApp(true)}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/80 hover:text-white px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] transition-all focus:outline-none focus:ring-2 focus:ring-white/90"
          >
            <Plus size={14} />
            <span>Add App</span>
          </button>
        </div>

        <div data-bp-grid className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              data-bp-focusable
              data-bp-tile
              data-bp-restore-key={`proj-app-${app.id}`}
              onClick={() => handleLaunchApp(app)}
              className="group flex flex-col items-center justify-center p-5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.11] border border-white/[0.09] hover:border-white/30 backdrop-blur-xl text-center transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/90"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-lg ring-1 ring-white/15 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: app.color }}
              >
                <span className="text-[17px] font-bold text-white">
                  {app.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-[13.5px] font-semibold text-white line-clamp-1 tracking-tight">
                {app.name}
              </span>
              <span className="text-[11px] text-white/45 mt-0.5 capitalize">
                {app.category}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 4: Cinema Scenes */}
      <section data-bp-row data-bp-row-key="proj-scenes">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[19px] font-bold text-white/95 tracking-[-0.02em]">
            Cinema Scenes &amp; Acoustics
          </h2>
          <span className="text-[12.5px] text-white/45">
            One-touch optical and sound presets
          </span>
        </div>

        <div data-bp-grid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
                className={`flex flex-col items-start p-4 rounded-2xl border backdrop-blur-xl transition-all duration-200 text-left hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/90 ${
                  active
                    ? "bg-white/[0.14] border-white/60 shadow-lg"
                    : "bg-white/[0.04] border-white/[0.09] hover:bg-white/[0.09] hover:border-white/25"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-[14px] font-semibold text-white tracking-tight">
                    {scene.title}
                  </span>
                  {active && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-[12px] text-white/55 leading-relaxed">{scene.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {showCalibration && (
        <ProjectorCalibrationModal
          onClose={() => setShowCalibration(false)}
          onOpenTestPattern={() => {
            setShowCalibration(false);
            setShowTestPattern(true);
          }}
        />
      )}

      {showTestPattern && (
        <ProjectorTestPattern onClose={() => setShowTestPattern(false)} />
      )}

      {showAddApp && createPortal(
        <div
          className="fixed inset-0 z-[9920] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none"
          onClick={() => setShowAddApp(false)}
        >
          <div
            className="w-full max-w-md bg-[#0e1017] border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Add Custom App</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-white/55">App Name</label>
                <input
                  type="text"
                  placeholder="e.g. VLC Player"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:border-white/40"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/55">
                  Android Package Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. org.videolan.vlc"
                  value={newAppPkg}
                  onChange={(e) => setNewAppPkg(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white focus:outline-none focus:border-white/40 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowAddApp(false)}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomApp}
                className="px-5 py-2 rounded-full bg-[#f4f4f6] hover:bg-white text-xs font-bold text-[#07080c]"
              >
                Add App
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {showCloudLink && (
        <BpCloudLinkModal onClose={() => setShowCloudLink(false)} />
      )}
    </div>
  );
}
