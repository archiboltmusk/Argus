import { useState, useMemo, useEffect, useRef } from "react";
import { X, Search, ChevronLeft, ChevronRight, FileText, Bookmark, ExternalLink } from "lucide-react";

export interface SlideItem {
  id: string;
  pageNumber: number;
  title: string;
  timestampSec: number;
  timestampLabel: string;
  bulletPoints: string[];
  latexSnippet?: string;
}

export interface SlideCompanionPanelProps {
  open: boolean;
  onClose: () => void;
  lectureTitle: string;
  currentTimeSec: number;
  onSeekTo: (sec: number) => void;
  slides?: SlideItem[];
  pdfUrl?: string;
}

export function SlideCompanionPanel({
  open,
  onClose,
  lectureTitle,
  currentTimeSec,
  onSeekTo,
  slides: initialSlides,
  pdfUrl,
}: SlideCompanionPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const activeSlideRef = useRef<HTMLDivElement | null>(null);

  // Curated fallback slides if none provided (e.g. for Stanford / MIT lectures)
  const defaultSlides: SlideItem[] = useMemo(() => {
    return [
      {
        id: "slide-1",
        pageNumber: 1,
        title: "Introduction & Motivation",
        timestampSec: 0,
        timestampLabel: "00:00",
        bulletPoints: [
          "Overview of course objectives and prerequisites",
          "Graph-structured vs. Euclidean representations",
          "Applications across biology, social graphs, and recommender systems",
        ],
      },
      {
        id: "slide-2",
        pageNumber: 2,
        title: "Mathematical Foundations & Adjacency",
        timestampSec: 360,
        timestampLabel: "06:00",
        bulletPoints: [
          "Node degree matrix D and adjacency matrix A",
          "Normalized graph Laplacian definition",
          "Eigenvalues of graph signals and spectral filtering",
        ],
        latexSnippet: "L = I - D^{-1/2} A D^{-1/2}",
      },
      {
        id: "slide-3",
        pageNumber: 3,
        title: "Neighborhood Aggregation & Graph Convolution",
        timestampSec: 840,
        timestampLabel: "14:00",
        bulletPoints: [
          "Message passing formulation across immediate neighbors",
          "Non-linear activation and weight sharing",
          "Multi-layer propagation and receptive field expansion",
        ],
        latexSnippet: "h_v^{(k)} = \\sigma \\left( W^{(k)} \\sum_{u \\in N(v)} \\frac{h_u^{(k-1)}}{|N(v)|} + B^{(k)} h_v^{(k-1)} \\right)",
      },
      {
        id: "slide-4",
        pageNumber: 4,
        title: "Over-Smoothing & Expressive Power (Weisfeiler-Lehman)",
        timestampSec: 1520,
        timestampLabel: "25:20",
        bulletPoints: [
          "Information bottleneck with deeper network layers",
          "1-WL graph isomorphism test equivalence",
          "Design of maximally expressive message aggregation functions",
        ],
      },
      {
        id: "slide-5",
        pageNumber: 5,
        title: "Summary & Open Research Frontiers",
        timestampSec: 2400,
        timestampLabel: "40:00",
        bulletPoints: [
          "Scalability to billion-node subgraphs via Neighborhood Sampling",
          "Next lecture: Graph Attention Networks (GAT)",
        ],
      },
    ];
  }, []);

  const slides = initialSlides && initialSlides.length > 0 ? initialSlides : defaultSlides;

  // Filter slides by search
  const filteredSlides = useMemo(() => {
    if (!searchQuery.trim()) return slides;
    const q = searchQuery.toLowerCase();
    return slides.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.bulletPoints.some((b) => b.toLowerCase().includes(q)) ||
        (s.latexSnippet && s.latexSnippet.toLowerCase().includes(q)),
    );
  }, [slides, searchQuery]);

  // Compute active slide based on current playback position
  const activeSlideIndex = useMemo(() => {
    let index = 0;
    for (let i = 0; i < slides.length; i++) {
      if (currentTimeSec >= slides[i].timestampSec) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [slides, currentTimeSec]);

  // Auto-scroll active slide into view
  useEffect(() => {
    if (activeSlideRef.current) {
      activeSlideRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeSlideIndex]);

  if (!open) return null;

  return (
    <aside
      className="fixed right-0 top-0 bottom-0 z-50 w-96 max-w-full bg-[#0b0c14]/95 backdrop-blur-xl border-l border-zinc-800 text-zinc-100 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      aria-label="Lecture Slide Companion"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Slide & Note Companion
            </h3>
            <p className="text-xs text-zinc-400 truncate max-w-[200px]" title={lectureTitle}>
              {lectureTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              title="Open full PDF"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-zinc-800/60 bg-zinc-950/30">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search slides, formulas, or concepts..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900/80 border border-zinc-700/60 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Slides List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredSlides.map((slide, idx) => {
          const isActive = idx === activeSlideIndex;
          return (
            <div
              key={slide.id}
              ref={isActive ? activeSlideRef : null}
              onClick={() => onSeekTo(slide.timestampSec)}
              className={`cursor-pointer p-3.5 rounded-xl border transition-all text-xs ${
                isActive
                  ? "bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-500/5"
                  : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                  <Bookmark className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-zinc-500"}`} />
                  Slide {slide.pageNumber}: {slide.title}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                    isActive
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {slide.timestampLabel}
                </span>
              </div>

              <ul className="space-y-1 text-zinc-400 pl-4 list-disc marker:text-zinc-600">
                {slide.bulletPoints.map((bp, bidx) => (
                  <li key={bidx} className="leading-relaxed">
                    {bp}
                  </li>
                ))}
              </ul>

              {slide.latexSnippet && (
                <div className="mt-2.5 p-2 rounded-lg bg-black/60 border border-emerald-500/20 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                  {slide.latexSnippet}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-950/60 text-xs text-zinc-400">
        <button
          onClick={() => {
            if (activeSlideIndex > 0) {
              onSeekTo(slides[activeSlideIndex - 1].timestampSec);
            }
          }}
          disabled={activeSlideIndex <= 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev Slide</span>
        </button>

        <span className="font-mono text-[11px]">
          {activeSlideIndex + 1} / {slides.length}
        </span>

        <button
          onClick={() => {
            if (activeSlideIndex < slides.length - 1) {
              onSeekTo(slides[activeSlideIndex + 1].timestampSec);
            }
          }}
          disabled={activeSlideIndex >= slides.length - 1}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <span>Next Slide</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
