import {
  Home,
  BookOpen,
  Timer,
  Tv,
  Calendar,
  Layers,
  Target,
  Eye,
  Calculator,
  Droplets,
  Search,
  Radio,
  Triangle,
  Stethoscope,
  FolderCheck,
  FolderPlus,
  Flame,
  BarChart2,
  BookmarkCheck,
} from "lucide-react";

export type BTRAppDestination =
  | "today"
  | "subjects"
  | "tests"
  | "live"
  | "plan"
  | "workstation"
  | "tnd"
  | "blitz"
  | "spotters"
  | "matrix"
  | "drip"
  | "search"
  | "broadcasts"
  | "pyramids"
  | "cases"
  | "volatiles"
  | "gt_analytics"
  | "gt_tracker"
  | "cross_app_tests"
  | "strategy";

interface BTRAppDockProps {
  activeDestination: BTRAppDestination;
  onNavigate: (dest: BTRAppDestination) => void;
  dailyDueCount?: number;
  streakDays?: number;
  totalFilesLinked?: number;
  onLinkFolder: () => void;
  isWorkstationActive?: boolean;
}

export function BTRAppDock({
  activeDestination,
  onNavigate,
  dailyDueCount = 10,
  streakDays = 1,
  totalFilesLinked = 95,
  onLinkFolder,
  isWorkstationActive = false,
}: BTRAppDockProps) {
  // Canonical 5 CoreBTR App destinations
  const canonicalDestinations: Array<{
    id: BTRAppDestination;
    label: string;
    icon: typeof Home;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    { id: "today", label: "Home", icon: Home },
    { id: "subjects", label: "Library", icon: BookOpen, badge: "19 Subs" },
    {
      id: "tests",
      label: "Tests",
      icon: Timer,
      badge: "GTs & Minis",
      badgeColor: "bg-[#1767be]/20 text-[#4da2ff] border-[#1767be]/30",
    },
    {
      id: "live",
      label: "Live",
      icon: Tv,
      badge: "Recalls",
      badgeColor: "bg-[#1767be]/20 text-[#4da2ff] border-[#1767be]/30",
    },
    { id: "plan", label: "Plan", icon: Calendar, badge: "Custom Mod" },
  ];

  // Studio & Specialized tools
  const studioDestinations: Array<{
    id: BTRAppDestination;
    label: string;
    icon: typeof Home;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    {
      id: "workstation",
      label: "Dual Workstation",
      icon: Layers,
      badge: isWorkstationActive ? "LIVE" : undefined,
      badgeColor: "bg-[#1767be]/20 text-[#4da2ff] border-[#1767be]/30",
    },
    {
      id: "drip",
      label: "Daily FSRS Drip",
      icon: Droplets,
      badge: dailyDueCount > 0 ? dailyDueCount : undefined,
      badgeColor: "bg-[#1767be]/20 text-[#4da2ff] border-[#1767be]/30",
    },
    { id: "volatiles", label: "Super-Volatiles", icon: BookmarkCheck, badge: "100", badgeColor: "bg-[#feb122]/15 text-[#feb122] border-[#feb122]/30" },
    {
      id: "gt_tracker",
      label: "Next GT Tracker",
      icon: Timer,
      badge: "Live Radar",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      id: "cross_app_tests",
      label: "Cross-App Ingestion",
      icon: Target,
      badge: "Marrow/Prep",
      badgeColor: "bg-[#1767be]/20 text-[#4da2ff] border-[#1767be]/30",
    },
  ];

  const advancedDestinations: Array<{
    id: BTRAppDestination;
    label: string;
    icon: typeof Home;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    { id: "spotters", label: "Spotter Bank", icon: Eye },
    { id: "matrix", label: "20th Subject Matrix", icon: Calculator },
    { id: "pyramids", label: "3-Tier Pyramids", icon: Triangle },
    { id: "cases", label: "Two-Step Cases", icon: Stethoscope },
    { id: "gt_analytics", label: "GT Strike Rate", icon: BarChart2 },
    { id: "search", label: "Cross-PDF Search", icon: Search },
    { id: "broadcasts", label: "Core Drops", icon: Radio, badge: "3 PM", badgeColor: "bg-[#1767be]/20 text-[#4da2ff] border-[#1767be]/30" },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-[#1767be]/25 bg-[#0d1b4b]/95 backdrop-blur-md p-3.5 select-none overflow-y-auto">
      {/* Top Branding */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-[#1767be]/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1767be] text-white font-black text-sm shadow-sm">
              BTR
            </div>
            <div>
              <h1 className="text-xs font-extrabold text-white tracking-tight flex items-center gap-1.5">
                CoreBTR
                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#1767be]/20 text-[#4da2ff] font-bold border border-[#1767be]/30">
                  APP
                </span>
              </h1>
              <span className="text-[10px] text-white/60 block">Dr. Zainab Vora Suite</span>
            </div>
          </div>

          <div
            className="flex items-center gap-1 text-[11px] font-bold text-[#feb122] bg-[#feb122]/10 px-2 py-0.5 rounded-lg border border-[#feb122]/30"
            title={`${streakDays} days active revision streak`}
          >
            <Flame size={12} className="text-[#feb122]" />
            <span>{streakDays}d</span>
          </div>
        </div>

        {/* 1. CoreBTR Primary Navigation (5 Canonical Tabs) */}
        <div className="flex flex-col gap-1">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#4da2ff] px-2 mb-1">
            CoreBTR App
          </span>
          {canonicalDestinations.map((dest) => {
            const Icon = dest.icon;
            const isActive = activeDestination === dest.id;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => onNavigate(dest.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#1767be] text-white shadow-sm font-bold"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={15} />
                  <span>{dest.label}</span>
                </div>
                {dest.badge && (
                  <span
                    className={`font-mono text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${
                      dest.badgeColor || (isActive ? "bg-white/20 text-white border-white/30" : "bg-[#1d204b] text-white/70 border-[#1767be]/30")
                    }`}
                  >
                    {dest.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 2. Studio & Spaced Repetition Workstation */}
        <div className="flex flex-col gap-1 pt-2 border-t border-[#1767be]/20">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#4da2ff] px-2 mb-1">
            Workstation & Spaced Repetition
          </span>
          {studioDestinations.map((dest) => {
            const Icon = dest.icon;
            const isActive = activeDestination === dest.id;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => onNavigate(dest.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#1767be] text-white shadow-sm font-bold"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={15} />
                  <span>{dest.label}</span>
                </div>
                {dest.badge && (
                  <span
                    className={`font-mono text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${
                      dest.badgeColor || (isActive ? "bg-white/20 text-white border-white/30" : "bg-[#1d204b] text-white/70 border-[#1767be]/30")
                    }`}
                  >
                    {dest.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Advanced Tactical Tools */}
        <div className="flex flex-col gap-1 pt-2 border-t border-[#1767be]/20">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#4da2ff] px-2 mb-1">
            Specialized BTR Engines
          </span>
          {advancedDestinations.map((dest) => {
            const Icon = dest.icon;
            const isActive = activeDestination === dest.id;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => onNavigate(dest.id)}
                className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#1767be] text-white shadow-sm font-bold"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={14} />
                  <span>{dest.label}</span>
                </div>
                {dest.badge && (
                  <span
                    className={`font-mono text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${
                      dest.badgeColor || (isActive ? "bg-white/20 text-white border-white/30" : "bg-[#1d204b] text-white/70 border-[#1767be]/30")
                    }`}
                  >
                    {dest.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Local Storage & Folder Status */}
      <div className="pt-3 border-t border-[#1767be]/20 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-white/70 flex items-center gap-1 text-[11px]">
            <FolderCheck size={12} className="text-[#4da2ff]" />
            <span>Local BTR Folder:</span>
          </span>
          <span className="font-mono text-[11px] font-bold text-white">
            {totalFilesLinked} Files
          </span>
        </div>

        <button
          type="button"
          onClick={onLinkFolder}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-[#1d204b] hover:bg-[#252a60] text-white text-xs font-bold border border-[#1767be]/30 transition"
        >
          <FolderPlus size={13} className="text-[#4da2ff]" />
          <span>Switch / Rescan Folder</span>
        </button>
      </div>
    </aside>
  );
}
