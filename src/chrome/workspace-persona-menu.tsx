import { useState, useRef, useEffect } from "react";
import { GraduationCap, Tv, Gamepad2, Layers, Check, ChevronDown } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { useView } from "@/lib/view";
import {
  WORKSPACE_PERSONAS,
  getPersonaNavCustomization,
  type WorkspacePersona,
} from "@/chrome/nav-items";

export function WorkspacePersonaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, update } = useSettings();
  const { view, setView } = useView();
  const menuRef = useRef<HTMLDivElement>(null);

  // Detect current active persona based on hidden items in navCustomization
  const currentHidden = new Set(settings.navCustomization?.hidden || []);
  let activePersona: WorkspacePersona = "omni";

  if (currentHidden.has("movies") && currentHidden.has("shows") && !currentHidden.has("education")) {
    activePersona = "academic";
  } else if (currentHidden.has("education") && currentHidden.has("games") && !currentHidden.has("movies")) {
    activePersona = "theater";
  } else if (currentHidden.has("education") && currentHidden.has("movies") && !currentHidden.has("games")) {
    activePersona = "studio";
  }

  // Dismiss on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleSelectPersona = (persona: WorkspacePersona) => {
    setIsOpen(false);
    update({ navCustomization: getPersonaNavCustomization(persona) });

    // Helpful auto-navigation on switch
    if (persona === "academic" && view !== "education") {
      setView("education");
    } else if (persona === "theater" && (view === "education" || view === "games")) {
      setView("home");
    } else if (persona === "studio" && view === "education") {
      setView("games");
    }
  };

  const getPersonaIcon = (p: WorkspacePersona) => {
    switch (p) {
      case "academic":
        return <GraduationCap size={14} className="text-emerald-400" />;
      case "theater":
        return <Tv size={14} className="text-amber-400" />;
      case "studio":
        return <Gamepad2 size={14} className="text-cyan-400" />;
      default:
        return <Layers size={14} className="text-white/80" />;
    }
  };

  const personaLabel =
    activePersona === "academic"
      ? "Academic"
      : activePersona === "theater"
      ? "Theater"
      : activePersona === "studio"
      ? "Studio"
      : "Omni";

  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition shadow-xs cursor-pointer select-none"
        title="Switch Workspace Persona (Academic, Theater, Studio, Omni)"
        aria-label="Workspace Persona Selector"
      >
        {getPersonaIcon(activePersona)}
        <span className="hidden md:inline text-[11px] font-bold tracking-tight">
          {personaLabel}
        </span>
        <ChevronDown size={11} className={`text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-72 rounded-2xl border border-white/20 bg-neutral-900/98 backdrop-blur-2xl shadow-2xl p-2 z-[200] flex flex-col gap-1 text-white animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-white/10 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/40 block">
              Workspace Persona
            </span>
            <p className="text-xs text-white/70 mt-0.5">
              Focus mode streamlines your navigation tabs for specific workflows.
            </p>
          </div>

          {(Object.keys(WORKSPACE_PERSONAS) as WorkspacePersona[]).map((key) => {
            const item = WORKSPACE_PERSONAS[key];
            const isSelected = activePersona === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPersona(key)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl text-left transition cursor-pointer ${
                  isSelected ? "bg-white/15 border border-white/20 shadow-xs" : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="p-1 rounded-lg bg-black/40 border border-white/10 shrink-0 mt-0.5">
                  {getPersonaIcon(key)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{item.label}</span>
                    {isSelected && <Check size={12} className="text-emerald-400 font-bold" />}
                  </div>
                  <p className="text-[11px] text-white/50 leading-snug line-clamp-2 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
