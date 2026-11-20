import { Eye, EyeOff, Sparkles } from "lucide-react";

export interface SpotterVisualProps {
  spotterId: string;
  modality: string;
  revealed: boolean;
  onToggleReveal?: () => void;
}

export function SpotterVisualDiagram({
  spotterId,
  modality,
  revealed,
  onToggleReveal,
}: SpotterVisualProps) {
  return (
    <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-72 rounded-2xl bg-black/90 border border-white/10 overflow-hidden flex flex-col items-center justify-center shadow-inner group">
      {/* Top Banner Tag */}
      <div className="absolute top-2.5 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[10.5px] font-mono text-white/80">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        <span className="font-bold text-accent">{modality}</span>
        <span className="text-white/40">•</span>
        <span>Diagnostic Spotter</span>
      </div>

      {/* Mask toggle button */}
      <button
        type="button"
        onClick={onToggleReveal}
        className="absolute top-2.5 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-[10.5px] font-bold text-white transition cursor-pointer"
      >
        {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
        <span>{revealed ? "Mask Labels" : "Label Overlay"}</span>
      </button>

      {/* Render Specific SVG Spotter Schema */}
      <div className="w-full h-full flex items-center justify-center p-4">
        {spotterId === "spot-2" ? (
          // Achalasia Cardia - Barium Swallow Bird's Beak
          <svg viewBox="0 0 320 200" className="w-full h-full max-h-60" fill="none">
            {/* Thoracic spine background */}
            <rect x="150" y="10" width="20" height="180" rx="3" fill="#1c1c24" opacity="0.6" />
            <path d="M140 40 H180 M140 70 H180 M140 100 H180 M140 130 H180 M140 160 H180" stroke="#282835" strokeWidth="2" />
            {/* Dilated mega-esophagus with barium contrast */}
            <path
              d="M135 15 C135 70, 120 110, 148 155 L160 185 L172 155 C200 110, 185 70, 185 15 Z"
              fill="url(#bariumGrad)"
              stroke="#e2e8f0"
              strokeWidth="2.5"
            />
            {/* Bird's Beak Tapering Arrow */}
            {revealed && (
              <g className="animate-in fade-in duration-300">
                <circle cx="160" cy="180" r="14" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" fill="#f59e0b" fillOpacity="0.15" />
                <path d="M220 175 L178 178" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)" />
                <rect x="222" y="165" width="90" height="22" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                <text x="227" y="179" fill="#fbbf24" fontSize="9.5" fontWeight="bold">Bird's Beak Sign</text>
              </g>
            )}
            <defs>
              <linearGradient id="bariumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.95" />
                <stop offset="60%" stopColor="#cbd5e1" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        ) : spotterId === "spot-1" ? (
          // Sigmoid Volvulus - Coffee Bean Sign
          <svg viewBox="0 0 320 200" className="w-full h-full max-h-60" fill="none">
            {/* Pelvic Basin outline */}
            <path d="M70 180 Q160 195 250 180" stroke="#334155" strokeWidth="3" />
            {/* Huge inverted U loop pointing to RUQ */}
            <path
              d="M120 180 C90 120, 110 30, 200 35 C270 40, 250 120, 200 180 Z"
              fill="#1e293b"
              stroke="#94a3b8"
              strokeWidth="3"
            />
            {/* Central dense cleft (two apposed walls) */}
            <path d="M165 42 Q175 110 160 175" stroke="#f8fafc" strokeWidth="3.5" />
            {revealed && (
              <g className="animate-in fade-in duration-300">
                <rect x="20" y="45" width="105" height="34" rx="6" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                <text x="26" y="60" fill="#fbbf24" fontSize="9.5" fontWeight="bold">Coffee Bean Apex</text>
                <text x="26" y="72" fill="#94a3b8" fontSize="8.5">Points to RUQ</text>
                <path d="M125 60 L160 55" stroke="#f59e0b" strokeWidth="1.5" />
              </g>
            )}
          </svg>
        ) : spotterId === "spot-3" ? (
          // Duodenal Atresia - Double Bubble
          <svg viewBox="0 0 320 200" className="w-full h-full max-h-60" fill="none">
            {/* Abdominal wall */}
            <rect x="50" y="20" width="220" height="160" rx="20" fill="#090d16" stroke="#1e293b" strokeWidth="2" />
            {/* Bubble 1: Gastric bubble (Left upper) */}
            <ellipse cx="120" cy="85" rx="42" ry="32" fill="#1e293b" stroke="#f1f5f9" strokeWidth="2.5" />
            <text x="100" y="88" fill="#e2e8f0" fontSize="10" fontWeight="bold">Stomach</text>
            {/* Bubble 2: Duodenal bulb (Right midline) */}
            <ellipse cx="185" cy="95" rx="26" ry="22" fill="#1e293b" stroke="#f1f5f9" strokeWidth="2.5" />
            <text x="168" y="98" fill="#e2e8f0" fontSize="9" fontWeight="bold">Duodenum</text>
            {/* Gasless distal bowel */}
            <text x="110" y="155" fill="#475569" fontSize="9.5" fontStyle="italic">Gasless Lower Abdomen</text>
            {revealed && (
              <g className="animate-in fade-in duration-300">
                <rect x="85" y="115" width="150" height="22" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                <text x="95" y="130" fill="#34d399" fontSize="9.5" fontWeight="bold">Classic "Double Bubble" Sign</text>
              </g>
            )}
          </svg>
        ) : spotterId === "spot-4" ? (
          // Burkitt Lymphoma - Starry Sky Pattern
          <svg viewBox="0 0 320 200" className="w-full h-full max-h-60" fill="none">
            {/* Dense basophilic lymphoid background */}
            <rect x="20" y="15" width="280" height="170" rx="12" fill="#311042" stroke="#4c1d95" strokeWidth="2" />
            {/* Numerous small purple lymphoblasts */}
            {Array.from({ length: 48 }).map((_, i) => (
              <circle
                key={i}
                cx={35 + ((i * 37) % 250)}
                cy={25 + ((i * 23) % 150)}
                r="4.5"
                fill="#6d28d9"
                opacity="0.8"
              />
            ))}
            {/* Tingible body macrophages with clear halo (Stars) */}
            {[
              { x: 70, y: 55 },
              { x: 130, y: 110 },
              { x: 210, y: 65 },
              { x: 165, y: 40 },
              { x: 250, y: 130 },
              { x: 90, y: 145 },
            ].map((m, idx) => (
              <g key={idx}>
                <circle cx={m.x} cy={m.y} r="14" fill="#fdf4ff" opacity="0.85" />
                <circle cx={m.x} cy={m.y} r="4" fill="#581c87" />
                <circle cx={m.x + 3} cy={m.y - 3} r="1.5" fill="#1e1b4b" />
              </g>
            ))}
            {revealed && (
              <g className="animate-in fade-in duration-300">
                <rect x="180" y="145" width="110" height="28" rx="4" fill="#0f172a" stroke="#ec4899" strokeWidth="1" />
                <text x="186" y="162" fill="#f472b6" fontSize="9" fontWeight="bold">Starry Sky Pattern</text>
              </g>
            )}
          </svg>
        ) : spotterId === "spot-5" ? (
          // Papillary Thyroid Carcinoma - Orphan Annie Eyes & Psammoma Body
          <svg viewBox="0 0 320 200" className="w-full h-full max-h-60" fill="none">
            <rect x="20" y="15" width="280" height="170" rx="12" fill="#181824" stroke="#2e2e42" strokeWidth="2" />
            {/* Optically clear ground glass nuclei (Orphan Annie) */}
            <ellipse cx="90" cy="80" rx="30" ry="24" fill="#38bdf8" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="2" />
            <path d="M72 80 Q90 85 108 80" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
            <ellipse cx="150" cy="120" rx="28" ry="22" fill="#38bdf8" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="2" />
            {/* Psammoma Body: Concentric laminated calcification */}
            <g transform="translate(220, 85)">
              <circle cx="0" cy="0" r="26" fill="#78350f" fillOpacity="0.3" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="18" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="11" stroke="#d97706" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="5" fill="#f59e0b" />
            </g>
            {revealed && (
              <g className="animate-in fade-in duration-300">
                <text x="60" y="125" fill="#38bdf8" fontSize="9" fontWeight="bold">Orphan Annie Eye</text>
                <text x="185" y="130" fill="#f59e0b" fontSize="9" fontWeight="bold">Psammoma Body</text>
              </g>
            )}
          </svg>
        ) : spotterId === "spot-6" ? (
          // Osteosarcoma - Codman Triangle & Sunburst
          <svg viewBox="0 0 320 200" className="w-full h-full max-h-60" fill="none">
            {/* Femur shaft */}
            <path d="M110 15 L110 185 M160 15 L160 185" stroke="#94a3b8" strokeWidth="4" />
            {/* Codman Triangle (Elevated periosteum) */}
            <path d="M160 70 L205 110 L160 110 Z" fill="#f59e0b" fillOpacity="0.25" stroke="#f59e0b" strokeWidth="2" />
            {/* Sunburst spicules radiating outward */}
            <line x1="160" y1="120" x2="230" y2="100" stroke="#f87171" strokeWidth="2" />
            <line x1="160" y1="130" x2="245" y2="125" stroke="#f87171" strokeWidth="2" />
            <line x1="160" y1="140" x2="240" y2="150" stroke="#f87171" strokeWidth="2" />
            <line x1="160" y1="150" x2="225" y2="170" stroke="#f87171" strokeWidth="2" />
            {revealed && (
              <g className="animate-in fade-in duration-300">
                <rect x="180" y="25" width="115" height="30" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                <text x="186" y="44" fill="#fbbf24" fontSize="9.5" fontWeight="bold">Codman's Triangle</text>
              </g>
            )}
          </svg>
        ) : (
          // Target Lesions (Erythema Multiforme) or Generic Medical Spotter
          <svg viewBox="0 0 320 200" className="w-full h-full max-h-60" fill="none">
            {/* 3 Concentric Targetoid zones */}
            <circle cx="160" cy="100" r="65" fill="#be123c" fillOpacity="0.25" stroke="#e11d48" strokeWidth="2.5" />
            <circle cx="160" cy="100" r="42" fill="#fed7aa" fillOpacity="0.4" stroke="#fba758" strokeWidth="2" />
            <circle cx="160" cy="100" r="20" fill="#881337" stroke="#4c0519" strokeWidth="2.5" />
            {revealed && (
              <g className="animate-in fade-in duration-300">
                <rect x="25" y="25" width="140" height="24" rx="4" fill="#0f172a" stroke="#f43f5e" strokeWidth="1" />
                <text x="32" y="41" fill="#fb7185" fontSize="9.5" fontWeight="bold">Concentric Target Lesion</text>
              </g>
            )}
          </svg>
        )}
      </div>

      {/* Mask Notice overlay */}
      {!revealed && (
        <div className="absolute bottom-2 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-white/90 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
          <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <Sparkles size={12} />
            <span>Active Recall Mask Active</span>
          </span>
          <span className="text-[10px] text-white/60">Identify pathognomonic sign before revealing key</span>
        </div>
      )}
    </div>
  );
}
