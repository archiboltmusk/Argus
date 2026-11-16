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
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    },
    {
      id: "live",
      label: "Live",
      icon: Tv,
      badge: "Recalls",
      badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
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
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      id: "drip",
      label: "Daily FSRS Drip",
      icon: Droplets,
      badge: dailyDueCount > 0 ? dailyDueCount : undefined,
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    },
    { id: "volatiles", label: "Super-Volatiles", icon: BookmarkCheck, badge: "100" },
    {
      id: "cross_app_tests",
      label: "Cross-App Ingestion",
      icon: Target,
      badge: "Marrow/Prep",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
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
    { id: "broadcasts", label: "Core Drops", icon: Radio, badge: "3 PM", badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-edge bg-surface/70 backdrop-blur-md p-3.5 select-none overflow-y-auto">
      {/* Top Branding */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-edge-soft">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-sm">
              BTR
            </div>
            <div>
              <h1 className="text-xs font-extrabold text-ink tracking-tight flex items-center gap-1.5">
                CoreBTR
                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                  APP
                </span>
              </h1>
              <span className="text-[10px] text-ink-muted block">Dr. Zainab Vora Suite</span>
            </div>
          </div>

          <div
            className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/25"
            title={`${streakDays} days active revision streak`}
          >
            <Flame size={12} className="text-amber-400" />
            <span>{streakDays}d</span>
          </div>
        </div>

        {/* 1. CoreBTR Primary Navigation (5 Canonical Tabs) */}
        <div className="flex flex-col gap-1">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-400 px-2 mb-1">
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
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-ink-muted hover:text-ink hover:bg-elevated"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={15} />
                  <span>{dest.label}</span>
                </div>
                {dest.badge && (
                  <span
                    className={`font-mono text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${
                      dest.badgeColor || (isActive ? "bg-white/20 text-white border-white/30" : "bg-elevated text-ink-muted border-edge-soft")
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
        <div className="flex flex-col gap-1 pt-2 border-t border-edge-soft">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-ink-muted px-2 mb-1">
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
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-ink-muted hover:text-ink hover:bg-elevated"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={15} />
                  <span>{dest.label}</span>
                </div>
                {dest.badge && (
                  <span
                    className={`font-mono text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${
                      dest.badgeColor || (isActive ? "bg-white/20 text-white border-white/30" : "bg-elevated text-ink-muted border-edge-soft")
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
        <div className="flex flex-col gap-1 pt-2 border-t border-edge-soft">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-ink-muted px-2 mb-1">
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
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : "text-ink-muted hover:text-ink hover:bg-elevated"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={14} />
                  <span>{dest.label}</span>
                </div>
                {dest.badge && (
                  <span
                    className={`font-mono text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${
                      dest.badgeColor || (isActive ? "bg-white/20 text-white border-white/30" : "bg-elevated text-ink-muted border-edge-soft")
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
      <div className="pt-3 border-t border-edge-soft flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-ink-muted flex items-center gap-1 text-[11px]">
            <FolderCheck size={12} className="text-emerald-400" />
            <span>Local BTR Folder:</span>
          </span>
          <span className="font-mono text-[11px] font-bold text-ink">
            {totalFilesLinked} Files
          </span>
        </div>

        <button
          type="button"
          onClick={onLinkFolder}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-elevated hover:bg-raised text-ink text-xs font-bold border border-edge-soft transition"
        >
          <FolderPlus size={13} />
          <span>Switch / Rescan Folder</span>
        </button>
      </div>
    </aside>
  );
}
