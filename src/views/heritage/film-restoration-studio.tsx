import { useState } from "react";
import {
  Archive, AudioLines, Film, Play, RefreshCw,
  Sliders, Sparkles, UploadCloud, Volume2, Wand2, Zap
} from "lucide-react";
import {
  DEFAULT_RESTORATION_PARAMS,
  buildRestorationFilterGraph,
  type RestorationParameters,
} from "@/lib/heritage/neural-restoration";
import { createPreservationIngestJob } from "@/lib/heritage/film-ingest-pipeline";
import { useView } from "@/lib/view";

const SAMPLE_ARCHIVAL_FILMS = [
  {
    id: "tt0074854",
    title: "Manthan (1976)",
    director: "Shyam Benegal",
    language: "Hindi",
    aspectRatio: "1.37:1 Academy",
    rawFading: "Severe Yellow Dye Loss & Emulsion Scratches",
    rawImage: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=900&auto=format&fit=crop&q=80",
    restoredImage: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&auto=format&fit=crop&q=80",
    resolution: "4K Master (Cannes Classics 2024)",
    archive: "Film Heritage Foundation & NFDC-NFAI",
  },
  {
    id: "tt0054073",
    title: "Meghe Dhaka Tara (1960)",
    director: "Ritwik Ghatak",
    language: "Bengali",
    aspectRatio: "1.37:1 Academy",
    rawFading: "Nitrate Shrinkage & Optical Audio Crackle",
    rawImage: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=900&auto=format&fit=crop&q=80",
    restoredImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=900&auto=format&fit=crop&q=80",
    resolution: "4K Master (Avik Mukhopadhyay Supervised)",
    archive: "National Film Heritage Mission (NFHM)",
  },
  {
    id: "tt0079424",
    title: "Kummatty (1979)",
    director: "G. Aravindan",
    language: "Malayalam",
    aspectRatio: "1.37:1",
    rawFading: "Faded Green/Magenta Shift & Gate Weave",
    rawImage: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=900&auto=format&fit=crop&q=80",
    restoredImage: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=900&auto=format&fit=crop&q=80",
    resolution: "4K Master (Martin Scorsese World Cinema)",
    archive: "The Film Foundation & Cineteca di Bologna",
  },
  {
    id: "tt0102131",
    title: "Ishanou (1990)",
    director: "Aribam Syam Sharma",
    language: "Manipuri",
    aspectRatio: "1.66:1",
    rawFading: "Negative Mold, Physical Splices & Audio Hiss",
    rawImage: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=900&auto=format&fit=crop&q=80",
    restoredImage: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&auto=format&fit=crop&q=80",
    resolution: "4K Master (Cannes Classics 2023)",
    archive: "Film Heritage Foundation & NFDC-NFAI",
  },
];

export function FilmRestorationStudio() {
  const { openMeta } = useView();
  const [selectedFilmIndex, setSelectedFilmIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50); // 0% (full raw) to 100% (full restored)
  const [params, setParams] = useState<RestorationParameters>(DEFAULT_RESTORATION_PARAMS);
  const [activeTab, setActiveTab] = useState<"viewer" | "ingest" | "audio">("viewer");
  const [ingestJob, setIngestJob] = useState(() => createPreservationIngestJob("Nagarik_1952_Reel_01.raw.dpx", "35mm-safety"));
  const [notice, setNotice] = useState<string | null>(null);

  const currentFilm = SAMPLE_ARCHIVAL_FILMS[selectedFilmIndex];
  const filterGraph = buildRestorationFilterGraph(params);

  const handleTriggerIngest = () => {
    const fresh = createPreservationIngestJob("Pather_Panchali_Reel_03_charred.scan", "35mm-nitrate");
    setIngestJob(fresh);
    setNotice("New Indian archival preservation job started: 4K optical scan ingesting.");
  };

  const handleOpenFilmDetail = (imdbId: string) => {
    openMeta({
      id: imdbId,
      type: "movie",
      name: currentFilm.title,
      poster: currentFilm.restoredImage,
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Studio Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-amber-500/15 via-surface to-accent/10 p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Archive className="h-3.5 w-3.5" /> Indian Cinema Archival &amp; AI Restoration Hub
            </span>
            <h1 className="text-2xl font-extrabold sm:text-3xl">National Film Heritage Studio</h1>
            <p className="max-w-3xl text-xs sm:text-sm text-ink-subtle">
              Automated temporal scratch inpainting, Eastmancolor fading reversal, 50Hz optical audio de-crackle, and decentralized preservation. Bringing India's endangered cinematic heritage online in pristine 4K.
            </p>
          </div>
          <button
            onClick={() => handleOpenFilmDetail(currentFilm.id)}
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-accent/20 hover:scale-105 transition-all self-start md:self-auto"
          >
            <Play className="h-4 w-4 fill-current" /> Watch Restored Film in Argus
          </button>
        </div>
      </section>

      {/* Mode Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        {[
          { id: "viewer", label: "Interactive Before/After Split Viewer", icon: Film },
          { id: "audio", label: "Optical Soundtrack Restoration", icon: AudioLines },
          { id: "ingest", label: "Community Reel Ingestion Pipeline", icon: UploadCloud },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
                active
                  ? "border-accent text-accent bg-accent/5 font-bold"
                  : "border-transparent text-ink-subtle hover:text-ink hover:border-white/20"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "viewer" && (
        <div className="space-y-6">
          {/* Film Selector Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-subtle font-semibold mr-2">Featured Restorations:</span>
            {SAMPLE_ARCHIVAL_FILMS.map((f, idx) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilmIndex(idx)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  selectedFilmIndex === idx
                    ? "bg-accent text-white shadow-md"
                    : "border border-white/10 bg-surface hover:bg-surface-hover text-ink-subtle"
                }`}
              >
                {f.title}
              </button>
            ))}
          </div>

          {/* Interactive Split-Screen Comparison View */}
          <div className="relative aspect-[16/9] w-full max-h-[580px] overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl select-none group">
            {/* Background: Restored Image */}
            <img
              src={currentFilm.restoredImage}
              alt="4K Restored Master"
              className="absolute inset-0 h-full w-full object-cover filter brightness-105"
            />

            {/* Foreground: Raw Degraded Print (Clipped by slider position) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={currentFilm.rawImage}
                alt="Degraded Archival Negative"
                className="absolute inset-0 h-full w-full object-cover filter contrast-125 sepia-[0.35] brightness-90 grayscale-[0.2]"
                style={{
                  width: `${(100 / Math.max(sliderPosition, 0.1)) * 100}%`,
                  maxWidth: "none",
                }}
              />
              <span className="absolute top-4 left-4 z-10 rounded-full bg-red-600/80 backdrop-blur-md px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white">
                Original Faded Print ({currentFilm.rawFading})
              </span>
            </div>

            {/* Restored Label */}
            <span className="absolute top-4 right-4 z-10 rounded-full bg-emerald-600/80 backdrop-blur-md px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white">
              {currentFilm.resolution}
            </span>

            {/* Slider Divider Bar */}
            <div
              className="absolute top-0 bottom-0 z-20 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] cursor-ew-resize flex items-center justify-center"
              style={{ left: `calc(${sliderPosition}% - 2px)` }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-xl font-bold text-xs">
                ⇄
              </div>
            </div>

            {/* Slider Input overlay */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 z-30 h-full w-full opacity-0 cursor-ew-resize"
              aria-label="Before/After Split Comparison"
            />
          </div>

          {/* Restoration Dials & Live Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-surface/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-accent" /> Temporal Scratch Inpainting
                </span>
                <span className="font-mono text-xs font-bold text-accent">
                  {Math.round(params.scratchRemovalIntensity * 100)}%
                </span>
              </div>
              <p className="text-xs text-ink-subtle">
                Motion-compensated patch matching across frames t-1, t, t+1 to eliminate physical gouges and chemical spots without softening real motion.
              </p>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={params.scratchRemovalIntensity}
                onChange={(e) => setParams({ ...params, scratchRemovalIntensity: parseFloat(e.target.value) })}
                className="w-full accent-accent cursor-pointer"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" /> Deflicker &amp; Emulsion Leveling
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {Math.round(params.deflickerStrength * 100)}%
                </span>
              </div>
              <p className="text-xs text-ink-subtle">
                Removes uneven exposure fluctuations and chemical decay flicker across vintage hand-developed reels.
              </p>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={params.deflickerStrength}
                onChange={(e) => setParams({ ...params, deflickerStrength: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-400" /> Color Fading Reversal
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-400 uppercase">
                  {params.colorRecoveryMode}
                </span>
              </div>
              <p className="text-xs text-ink-subtle">
                Reconstructs lost yellow and cyan dye densities from aged Eastmancolor negatives to restore authentic warm flesh tones.
              </p>
              <select
                value={params.colorRecoveryMode}
                onChange={(e) => setParams({ ...params, colorRecoveryMode: e.target.value as RestorationParameters["colorRecoveryMode"] })}
                className="w-full rounded-lg border border-white/10 bg-surface px-3 py-1.5 text-xs text-ink font-medium"
              >
                <option value="eastmancolor-revive">Eastmancolor Dye-Revive</option>
                <option value="monochrome-nitrate">Nitrate High-Contrast B&amp;W</option>
                <option value="technicolor-three-strip">Technicolor 3-Strip Vivid</option>
                <option value="original">Uncorrected Master Scan</option>
              </select>
            </div>
          </div>

          {/* Active libmpv Hardware Shader Summary */}
          <div className="rounded-xl border border-white/10 bg-canvas/60 p-3.5 text-xs text-ink-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <span>{filterGraph.summary}</span>
            </div>
            <span className="font-bold text-emerald-400">Zero Transcode · Real-Time GPU Metal/Direct3D Shader</span>
          </div>
        </div>
      )}

      {activeTab === "audio" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-surface/60 p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-accent" /> Optical Soundtrack De-noising &amp; 50Hz Hum Removal
            </h3>
            <p className="text-xs text-ink-subtle">
              Old Indian film sound was encoded optically beside the film perforations, suffering from physical dirt clicks, projector hum, and limited dynamic range.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-surface">
                <div>
                  <h4 className="font-semibold text-sm">50Hz Electrical Hum Notch Filter</h4>
                  <p className="text-xs text-ink-subtle mt-0.5">Removes mains power hum from vintage Indian projection tube amps.</p>
                </div>
                <button
                  onClick={() => setParams({ ...params, acHumFilter50Hz: !params.acHumFilter50Hz })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                    params.acHumFilter50Hz ? "bg-accent" : "bg-white/20"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    params.acHumFilter50Hz ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-surface">
                <div>
                  <h4 className="font-semibold text-sm">Optical Soundtrack De-crackle</h4>
                  <p className="text-xs text-ink-subtle mt-0.5">Suppresses high-frequency clicks and pops from scratch emulsion damage.</p>
                </div>
                <button
                  onClick={() => setParams({ ...params, opticalAudioDeCrackle: !params.opticalAudioDeCrackle })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                    params.opticalAudioDeCrackle ? "bg-accent" : "bg-white/20"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    params.opticalAudioDeCrackle ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ingest" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Community Ingestion &amp; Open Archival Protocol</h3>
              <p className="text-xs text-ink-subtle">
                Drag-and-drop digitized reels (from 16mm/35mm telecines, U-Matic tapes, or collectors' archives) to run OCR title extraction and 4K restoration.
              </p>
            </div>
            <button
              onClick={handleTriggerIngest}
              className="flex items-center gap-1.5 rounded-xl border border-accent bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Simulate New Film Reel Ingest
            </button>
          </div>

          {notice && (
            <div className="rounded-xl border border-accent/20 bg-accent/10 p-3 text-xs text-accent">
              {notice}
            </div>
          )}

          {/* Ingestion Steps */}
          <div className="rounded-2xl border border-white/10 bg-surface/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="font-mono text-xs text-ink-subtle">Active Ingestion Job:</span>
                <h4 className="text-base font-bold text-ink">{ingestJob.fileName}</h4>
              </div>
              <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-3 py-1 text-xs font-semibold">
                Source: {ingestJob.sourceFormat}
              </span>
            </div>

            <div className="space-y-3">
              {ingestJob.steps.map((step) => (
                <div key={step.id} className="rounded-xl border border-white/5 bg-surface p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{step.name}</span>
                    <span className={`font-bold ${
                      step.status === "completed" ? "text-emerald-400" : step.status === "running" ? "text-accent animate-pulse" : "text-ink-subtle"
                    }`}>
                      {step.status === "completed" ? "Verified" : step.status === "running" ? `${step.progressPercent}% Active` : "Queued"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-subtle">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
