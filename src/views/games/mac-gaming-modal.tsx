import React, { useState } from "react";
import {
  X,
  Apple,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Gauge,
  HardDrive,
  Cloud,
  Search,
  CheckCircle2,
  Copy,
  Sliders,
  ExternalLink,
  Zap,
} from "lucide-react";
import {
  MAC_COMPATIBILITY_DATABASE,
  lookupMacCompatibility,
  calculateRetinaOptimization,
  MacGameCompatibilityEntry,
} from "@/lib/games/mac-gaming-radar";
import { getMacGamingCacheCleanupItems, generateSymlinkPlan } from "@/lib/games/mac-storage-manager";

interface MacGamingModalProps {
  onClose: () => void;
  initialGameTitle?: string;
}

export const MacGamingModal: React.FC<MacGamingModalProps> = ({ onClose, initialGameTitle }) => {
  const [activeTab, setActiveTab] = useState<"radar" | "hud" | "storage" | "streaming">("radar");
  const [searchQuery, setSearchQuery] = useState(initialGameTitle ?? "");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // HUD & Optimization State
  const [hudEnabled, setHudEnabled] = useState(true);
  const [syncMethod, setSyncMethod] = useState<"MSync" | "ESync">("MSync");
  const [avx2Enabled, setAvx2Enabled] = useState(true);
  const [selectedResTarget, setSelectedResTarget] = useState("1080p Standard (Highest FPS)");

  // Storage State
  const [externalDriveName, setExternalDriveName] = useState("External_SSD");
  const [offloadGameName, setOffloadGameName] = useState("Grand Theft Auto V");

  const retinaOpt = calculateRetinaOptimization(3024, 1964, 2.0);

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtered games for radar tab
  const activeEntry: MacGameCompatibilityEntry = searchQuery.trim()
    ? lookupMacCompatibility(searchQuery)
    : MAC_COMPATIBILITY_DATABASE["baldurs_gate_3"];

  const sampleGames = Object.values(MAC_COMPATIBILITY_DATABASE);

  // Symlink plan
  const symlinkPlan = generateSymlinkPlan(
    offloadGameName,
    `~/Library/Application Support/Argus/bottles/${offloadGameName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    externalDriveName,
    95
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 p-4">
      <div className="relative w-full max-w-4xl h-[780px] max-h-[92vh] bg-stone-950 rounded-2xl border border-stone-800 shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80 bg-stone-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 border border-stone-700/60 text-white shadow-md">
              <Apple className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-wider flex items-center gap-2">
                Mac Gaming Power Suite
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Apple Silicon Ready
                </span>
              </h1>
              <p className="text-xs text-stone-400">
                Compatibility Radar • Anti-Cheat Engine • Metal HUD Optimizer • APFS Offloader
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-stone-900/40 border-b border-stone-800/60 overflow-x-auto">
          {[
            { id: "radar", label: "Compatibility & Anti-Cheat Radar", icon: ShieldCheck },
            { id: "hud", label: "Metal HUD & Retina Scaler", icon: Gauge },
            { id: "storage", label: "APFS External Drive Offloader", icon: HardDrive },
            { id: "streaming", label: "Local PC & Cloud Streaming", icon: Cloud },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-950">
          {/* ================= TAB 1: RADAR & ANTI-CHEAT ================= */}
          {activeTab === "radar" && (
            <div className="flex flex-col gap-6">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search any game (e.g., Baldur's Gate 3, GTA V, Valorant, Cyberpunk 2077)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-900/80 border border-stone-800 focus:border-amber-500 text-stone-100 placeholder-stone-500 text-sm outline-none transition-colors"
                />
              </div>

              {/* Active Match Card */}
              <div
                className={`p-6 rounded-2xl border shadow-xl relative overflow-hidden ${
                  activeEntry.status === "anticheat_blocked"
                    ? "bg-red-950/20 border-red-500/40"
                    : activeEntry.nativeAppleSilicon
                    ? "bg-emerald-950/20 border-emerald-500/40"
                    : "bg-amber-950/20 border-amber-500/40"
                }`}
              >
                {/* Status Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                        activeEntry.status === "anticheat_blocked"
                          ? "bg-red-500/20 text-red-400 border-red-500/40"
                          : activeEntry.nativeAppleSilicon
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      }`}
                    >
                      {activeEntry.status === "anticheat_blocked" ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      {activeEntry.statusLabel}
                    </span>

                    {activeEntry.nativeAppleSilicon && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        <Cpu className="w-3 h-3" />
                        ARM64 Metal Native
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-stone-400 font-mono">
                    API: <span className="text-stone-200">{activeEntry.graphicsApi}</span>
                  </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-2">{activeEntry.title}</h2>

                {/* Anti-Cheat Alert Banner if Blocked */}
                {activeEntry.antiCheat.engine !== "none" && (
                  <div
                    className={`p-3.5 rounded-xl border mb-4 text-xs leading-relaxed ${
                      activeEntry.antiCheat.macPlayable
                        ? "bg-stone-900/80 border-stone-700/60 text-stone-300"
                        : "bg-red-950/40 border-red-500/50 text-red-200"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                      Anti-Cheat Engine: {activeEntry.antiCheat.name}
                    </div>
                    <p>{activeEntry.antiCheat.explanation}</p>
                    {activeEntry.antiCheat.workaround && (
                      <div className="mt-2 text-stone-300 font-medium">
                        💡 <span className="text-amber-300">Recommendation:</span>{" "}
                        {activeEntry.antiCheat.workaround}
                      </div>
                    )}
                  </div>
                )}

                {/* Performance Benchmarks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800">
                    <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      Base Chips (M1, M2, M3, M4)
                    </div>
                    <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
                      {activeEntry.fpsEstimates.baseMSeries}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800">
                    <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      Pro / Max / Ultra Chips
                    </div>
                    <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                      {activeEntry.fpsEstimates.proMaxMSeries}
                    </div>
                  </div>
                </div>

                {/* Recommended Runner & Optimal Settings */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-stone-800/80 text-xs">
                  <div>
                    <span className="text-stone-400">Recommended Runner: </span>
                    <span className="font-bold text-white">{activeEntry.recommendedRunner}</span>
                  </div>
                  <div className="text-stone-400">
                    Target:{" "}
                    <span className="font-mono text-amber-400">
                      {activeEntry.optimalSettings.resolution} ({activeEntry.optimalSettings.syncMethod})
                    </span>
                  </div>
                </div>

                {/* Community Notes */}
                <p className="mt-3 text-xs text-stone-400 italic">
                  Note from r/macgaming: "{activeEntry.communityNotes}"
                </p>
              </div>

              {/* Quick Sample Browsing Shelf */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                  Verified r/macgaming Titles
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {sampleGames.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => setSearchQuery(game.title)}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-900/60 border border-stone-800 hover:border-stone-700 hover:bg-stone-850 text-left transition-all group"
                    >
                      <div className="truncate mr-2">
                        <div className="text-xs font-bold text-white group-hover:text-amber-400 truncate">
                          {game.title}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate">{game.statusLabel}</div>
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          game.status === "anticheat_blocked"
                            ? "bg-red-500"
                            : game.nativeAppleSilicon
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: METAL HUD & RETINA SCALER ================= */}
          {activeTab === "hud" && (
            <div className="flex flex-col gap-6">
              {/* Retina Scaling Calculator Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <h3 className="font-black text-white text-base">HiDPI Retina Resolution Optimizer</h3>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed mb-4">
                  MacBook screens render at ultra-dense physical pixel grids (e.g. 3024×1964 on 14" Pro).
                  Running games at raw physical resolution severely degrades framerates. Locking games to 1x
                  logical point resolution saves massive GPU overhead while keeping visuals pixel-perfect.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
                    <div className="text-[10px] uppercase font-bold text-stone-400">MacBook Physical Screen</div>
                    <div className="text-sm font-black text-stone-200 font-mono mt-0.5">
                      {retinaOpt.physicalResolution}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
                    <div className="text-[10px] uppercase font-bold text-amber-400">1x Point Target</div>
                    <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
                      {retinaOpt.optimizedPointResolution}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
                    <div className="text-[10px] uppercase font-bold text-emerald-400">GPU Load Saved</div>
                    <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                      ~{retinaOpt.gpuLoadReductionPercent}% Less Pixels!
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {retinaOpt.standardGamingTargets.map((tgt) => (
                    <button
                      key={tgt.label}
                      onClick={() => setSelectedResTarget(tgt.label)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        selectedResTarget === tgt.label
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                          : "bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      {tgt.label} ({tgt.width}×{tgt.height})
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles for Performance & Metal HUD */}
              <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex flex-col gap-4">
                <h3 className="font-black text-white text-base">macOS Launch Engine Flags</h3>

                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/80 border border-stone-800">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Metal Performance HUD</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 font-mono text-amber-400">
                        MTL_HUD_ENABLED=1
                      </span>
                    </div>
                    <div className="text-xs text-stone-400">
                      Shows real-time FPS, GPU core utilization, and frametime graph on screen
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={hudEnabled}
                    onChange={(e) => setHudEnabled(e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/80 border border-stone-800">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Mach Synchronization (MSync)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 font-mono text-emerald-400">
                        WINEMSYNC=1
                      </span>
                    </div>
                    <div className="text-xs text-stone-400">
                      High-efficiency Darwin thread synchronization (preferred over ESync on Apple Silicon)
                    </div>
                  </div>
                  <button
                    onClick={() => setSyncMethod(syncMethod === "MSync" ? "ESync" : "MSync")}
                    className="px-3 py-1 rounded-lg text-xs font-black bg-stone-800 border border-stone-700 text-amber-400"
                  >
                    {syncMethod}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/80 border border-stone-800">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>AVX2 Rosetta 2 Emulation</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 font-mono text-sky-400">
                        ROSETTA_ADVERTISE_AVX2=1
                      </span>
                    </div>
                    <div className="text-xs text-stone-400">
                      Enables games requiring AVX2 vector instructions (macOS 15 Sequoia feature)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={avx2Enabled}
                    onChange={(e) => setAvx2Enabled(e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Generated Shell Command */}
              <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                <code className="text-xs font-mono text-amber-300 truncate mr-3">
                  {`MTL_HUD_ENABLED=${hudEnabled ? "1" : "0"} WINEMSYNC=${
                    syncMethod === "MSync" ? "1" : "0"
                  } ROSETTA_ADVERTISE_AVX2=${avx2Enabled ? "1" : "0"}`}
                </code>
                <button
                  onClick={() =>
                    handleCopy(
                      `MTL_HUD_ENABLED=${hudEnabled ? "1" : "0"} WINEMSYNC=${
                        syncMethod === "MSync" ? "1" : "0"
                      } ROSETTA_ADVERTISE_AVX2=${avx2Enabled ? "1" : "0"}`,
                      "flags"
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all shrink-0"
                >
                  {copiedKey === "flags" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedKey === "flags" ? "Copied" : "Copy Flags"}
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 3: APFS STORAGE OFFLOADER ================= */}
          {activeTab === "storage" && (
            <div className="flex flex-col gap-6">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 shadow-xl">
                <h3 className="font-black text-white text-base mb-1">
                  APFS External Drive Symlink Helper
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed mb-4">
                  Offload massive 80GB–150GB game files to an external NVMe/USB-C SSD while keeping
                  transparent APFS links in macOS so Steam, Whisky, and CrossOver launch normally.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">
                      External Volume Name
                    </label>
                    <input
                      type="text"
                      value={externalDriveName}
                      onChange={(e) => setExternalDriveName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs font-mono text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">
                      Target Game Name
                    </label>
                    <input
                      type="text"
                      value={offloadGameName}
                      onChange={(e) => setOffloadGameName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Move & Symlink Shell Command Box */}
                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 font-mono text-xs flex flex-col gap-2">
                  <div className="text-stone-400 text-[10px] uppercase font-bold">Terminal Shell Script:</div>
                  <div className="text-emerald-400 break-all select-all">
                    {`${symlinkPlan.terminalMoveCommand} && ${symlinkPlan.terminalSymlinkCommand}`}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() =>
                        handleCopy(
                          `${symlinkPlan.terminalMoveCommand} && ${symlinkPlan.terminalSymlinkCommand}`,
                          "symlink"
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all"
                    >
                      {copiedKey === "symlink" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedKey === "symlink" ? "Copied" : "Copy Command"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Cache Cleanup Opportunities */}
              <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-base">Reclaimable Cache Breakdown</h3>
                  <span className="text-xs font-black text-emerald-400">~4.4 GB Reclaimable</span>
                </div>

                {getMacGamingCacheCleanupItems().map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-stone-950/80 border border-stone-800"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{item.category}</div>
                      <div className="text-[11px] text-stone-400">{item.description}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        ~{item.estimatedReclaimableMb} MB
                      </span>
                      <button
                        onClick={() => handleCopy(item.cleanCommand, `clean-${i}`)}
                        className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-bold transition-colors"
                      >
                        {copiedKey === `clean-${i}` ? "Copied" : "Copy Clean Cmd"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 4: STREAMING & CLOUD ================= */}
          {activeTab === "streaming" && (
            <div className="flex flex-col gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 shadow-xl">
                <h3 className="font-black text-white text-base mb-1">
                  Local Windows PC & Cloud Streaming
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed mb-4">
                  For games hard-blocked by Windows kernel anti-cheat (e.g. *Valorant*, *Fortnite*, *Warzone*),
                  streaming provides full 120 FPS performance with zero Mac battery drain.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Moonlight / Sunshine */}
                  <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-sm text-sky-400 mb-1 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-sky-400" />
                        Moonlight / Sunshine (Local PC Stream)
                      </div>
                      <p className="text-xs text-stone-400 leading-relaxed mb-3">
                        Stream games from your local Windows gaming PC to your Mac with near-zero latency
                        over Wi-Fi 6 / Ethernet using hardware Apple VideoToolbox HEVC/AV1 decoding.
                      </p>
                    </div>
                    <a
                      href="https://moonlight-stream.org"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300"
                    >
                      Download Moonlight Client <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* GeForce NOW */}
                  <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-sm text-emerald-400 mb-1 flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-emerald-400" />
                        NVIDIA GeForce NOW
                      </div>
                      <p className="text-xs text-stone-400 leading-relaxed mb-3">
                        Cloud stream RTX 4080 rigs at up to 4K 120 FPS with full controller support directly on Mac
                        without installing Windows. Free 1-hour tier available for testing.
                      </p>
                    </div>
                    <a
                      href="https://play.geforcenow.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                    >
                      Open play.geforcenow.com <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
