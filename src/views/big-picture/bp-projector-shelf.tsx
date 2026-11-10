import { useState } from "react";
import { Tv, Cable, Settings2, Sliders, ExternalLink } from "lucide-react";
import { SFX } from "@/lib/sfx";
import { pushBigPicture } from "@/lib/big-picture";
import {
  PROJECTOR_INPUT_SOURCES,
  DEFAULT_PROJECTOR_APPS,
  launchProjectorApp,
  switchProjectorInput,
  type ProjectorInputSource,
  type ProjectorAppItem,
} from "@/lib/projector/projector-launcher";
import { ProjectorCalibrationModal } from "./projector-launcher/projector-calibration-modal";
import { BpRowHeader } from "./bp-row-header";

export function BpProjectorShelf() {
  const [showCalibration, setShowCalibration] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSourceClick = async (source: ProjectorInputSource) => {
    SFX.click();
    if (source.id === "argus") return;
    if (source.id === "usb") {
      pushBigPicture({ kind: "library" });
      return;
    }
    const switched = await switchProjectorInput(source);
    if (!switched) {
      showToast(`Switched to ${source.label}. Use projector remote input key if optical switcher is external.`);
    }
  };

  const handleAppClick = async (app: ProjectorAppItem) => {
    SFX.open();
    const launched = await launchProjectorApp(app);
    if (!launched) {
      showToast(`Opening ${app.name}`);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 py-2">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9950] px-6 py-2.5 rounded-2xl bg-zinc-900/95 border border-cyan-400 text-cyan-200 text-xs font-semibold shadow-[0_0_25px_rgba(34,211,238,0.4)] backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 motion-reduce:animate-none">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <BpRowHeader
        title="Projector Hub & Sources"
        lead={{
          rowKey: "projector-shelf",
          title: "Projector Hub & Sources",
          action: "Open Hub",
          tab: "projector-launcher",
        }}
      />

      {/* Horizontal Cards Strip */}
      <div
        data-bp-row
        data-bp-row-key="projector-shelf"
        className="flex items-center gap-4 overflow-x-auto scrollbar-none px-[var(--bp-gutter,36px)] py-2"
      >
        {/* Optical Lens Calibration Card */}
        <button
          type="button"
          data-bp-focusable
          data-bp-card
          data-bp-restore-key="proj-shelf-lens"
          onClick={() => {
            SFX.open();
            setShowCalibration(true);
          }}
          className="group relative flex flex-col justify-between w-60 h-32 p-4 rounded-2xl bg-gradient-to-br from-cyan-950/50 to-zinc-900 border border-cyan-500/30 hover:border-cyan-400 text-left transition-all hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg shrink-0 motion-reduce:transition-none"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
              <Sliders size={20} />
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-black uppercase">
              Optical
            </span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-cyan-200">
              Lens Calibration
            </h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Focus pattern, keystone &amp; lamp</p>
          </div>
        </button>

        {/* HDMI 1 */}
        <button
          type="button"
          data-bp-focusable
          data-bp-card
          data-bp-restore-key="proj-shelf-hdmi1"
          onClick={() => handleSourceClick(PROJECTOR_INPUT_SOURCES[0])}
          className="group relative flex flex-col justify-between w-52 h-32 p-4 rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-cyan-400/60 text-left transition-all hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg shrink-0 motion-reduce:transition-none"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-zinc-800 text-cyan-400">
              <Tv size={20} />
            </span>
            <span className="text-[10px] font-bold text-zinc-400">4K 60Hz</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">HDMI 1</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Game Console / Blu-ray</p>
          </div>
        </button>

        {/* HDMI 2 (eARC) */}
        <button
          type="button"
          data-bp-focusable
          data-bp-card
          data-bp-restore-key="proj-shelf-hdmi2"
          onClick={() => handleSourceClick(PROJECTOR_INPUT_SOURCES[1])}
          className="group relative flex flex-col justify-between w-52 h-32 p-4 rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-cyan-400/60 text-left transition-all hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg shrink-0 motion-reduce:transition-none"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-zinc-800 text-cyan-400">
              <Tv size={20} />
            </span>
            <span className="text-[10px] font-bold text-zinc-400">eARC / CEC</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">HDMI 2</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Soundbar / Receiver</p>
          </div>
        </button>

        {/* AV In */}
        <button
          type="button"
          data-bp-focusable
          data-bp-card
          data-bp-restore-key="proj-shelf-av"
          onClick={() => handleSourceClick(PROJECTOR_INPUT_SOURCES[2])}
          className="group relative flex flex-col justify-between w-52 h-32 p-4 rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-cyan-400/60 text-left transition-all hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg shrink-0 motion-reduce:transition-none"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-zinc-800 text-amber-400">
              <Cable size={20} />
            </span>
            <span className="text-[10px] font-bold text-zinc-400">Analog</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">AV / RCA In</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Component / Aux</p>
          </div>
        </button>

        {/* Popular Android TV Apps */}
        {DEFAULT_PROJECTOR_APPS.slice(0, 5).map((app) => (
          <button
            key={app.id}
            type="button"
            data-bp-focusable
            data-bp-card
            data-bp-restore-key={`proj-shelf-app-${app.id}`}
            onClick={() => handleAppClick(app)}
            className="group relative flex flex-col justify-between w-48 h-32 p-4 rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-cyan-400/60 text-left transition-all hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg shrink-0 motion-reduce:transition-none"
          >
            <div className="flex items-center justify-between">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md"
                style={{ backgroundColor: app.color }}
              >
                {app.name.charAt(0)}
              </span>
              <ExternalLink size={14} className="text-zinc-500 group-hover:text-cyan-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-cyan-200 truncate">
                {app.name}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">Android TV App</p>
            </div>
          </button>
        ))}

        {/* Exit to Google TV Launcher Button */}
        <button
          type="button"
          data-bp-focusable
          data-bp-card
          data-bp-restore-key="proj-shelf-google-launcher"
          onClick={() =>
            handleAppClick({
              id: "google-tv",
              name: "Google Launcher",
              packageName: "com.google.android.tvlauncher",
              color: "#4285F4",
              category: "system",
            })
          }
          className="group relative flex flex-col justify-between w-52 h-32 p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/30 text-left transition-all hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white shadow-lg shrink-0 motion-reduce:transition-none"
        >
          <div className="flex items-center justify-between">
            <span className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
              <Settings2 size={20} />
            </span>
            <span className="text-[10px] font-bold text-zinc-500">System</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-200">Google Launcher</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Switch to system home</p>
          </div>
        </button>
      </div>

      {/* Optical Calibration Modal */}
      {showCalibration && (
        <ProjectorCalibrationModal
          onClose={() => setShowCalibration(false)}
          onOpenTestPattern={() => {
            setShowCalibration(false);
            pushBigPicture({ kind: "projector-launcher" });
          }}
        />
      )}
    </div>
  );
}
