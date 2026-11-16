import { useState, useMemo } from "react";
import {
  X,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  FileText,
  Layers,
} from "lucide-react";
import {
  CURATED_BOOK_TORRENTS,
  inspectTorrentForBooks,
  createEBookFromTorrent,
  type CuratedBookTorrent,
  type TorrentBookMetadata,
} from "@/lib/ebook/torrent-book-resolver";
import type { EBook } from "@/lib/ebook/api";
import type { EBookChapter } from "@/lib/ebook/providers";

export interface TorrentBookModalProps {
  open: boolean;
  onClose: () => void;
  onOpenBook: (ebook: EBook, chapter: EBookChapter, chapters: EBookChapter[]) => void;
}

export function TorrentBookModal({ open, onClose, onOpenBook }: {
  open: boolean;
  onClose: () => void;
  onOpenBook: (ebook: EBook, chapter: EBookChapter, chapters: EBookChapter[]) => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [selectedCurated, setSelectedCurated] = useState<CuratedBookTorrent | null>(CURATED_BOOK_TORRENTS[0]);
  const [customMetadata, setCustomMetadata] = useState<TorrentBookMetadata | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeMeta = useMemo(() => {
    if (customMetadata) return customMetadata;
    if (selectedCurated) {
      try {
        return inspectTorrentForBooks(selectedCurated.magnetUri);
      } catch {
        return null;
      }
    }
    return null;
  }, [customMetadata, selectedCurated]);

  if (!open) return null;

  const handleInspectInput = () => {
    setError(null);
    if (!inputVal.trim()) return;
    try {
      const meta = inspectTorrentForBooks(inputVal.trim());
      setCustomMetadata(meta);
      setSelectedCurated(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to inspect torrent magnet");
    }
  };

  const handleLaunchReader = (fileIdx = 0) => {
    if (!activeMeta) return;
    const { ebook, chapters } = createEBookFromTorrent(activeMeta, fileIdx);
    onOpenBook(ebook, chapters[0], chapters);
    onClose();
  };

  const handleCopyMagnet = (magnet: string) => {
    void navigator.clipboard?.writeText(magnet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-3xl bg-[#0b0c14]/95 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-wider uppercase text-emerald-400">
                P2P Swarm & Shadow Library Reader
              </div>
              <h2 className="text-sm font-semibold text-zinc-200">
                Read Books from Torrents & Magnets
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Magnet / InfoHash Input Box */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">
              Paste Magnet Link or Torrent InfoHash:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInspectInput()}
                placeholder="magnet:?xt=urn:btih:... or 40-character hex hash"
                className="flex-1 px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60"
              />
              <button
                onClick={handleInspectInput}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-colors shadow-md"
              >
                Inspect Swarm
              </button>
            </div>
            {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
          </div>

          {/* Curated Masterpiece Books */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Curated Open-Access Torrent Masterpieces
              </span>
              <span className="text-[11px] text-zinc-500">Zero-setup DRM-free</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {CURATED_BOOK_TORRENTS.map((c) => {
                const isSelected = selectedCurated?.id === c.id && !customMetadata;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCurated(c);
                      setCustomMetadata(null);
                    }}
                    className={`cursor-pointer p-3 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? "bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-500/5"
                        : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-zinc-200 line-clamp-1">{c.title}</span>
                      <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-emerald-500/20 text-emerald-300 shrink-0">
                        {c.format.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-2 line-clamp-1">{c.author}</p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>Size: {c.sizeLabel}</span>
                      <span className="font-mono text-zinc-600 truncate max-w-[120px]">
                        {c.infoHash.slice(0, 10)}...
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Torrent Details & Read Action */}
          {activeMeta && (
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-700/80 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">{activeMeta.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                    <span className="flex items-center gap-1 font-mono text-emerald-400">
                      <Layers className="w-3.5 h-3.5" />
                      {activeMeta.files.length} book file{activeMeta.files.length > 1 ? "s" : ""}
                    </span>
                    <span>&bull;</span>
                    <span className="font-mono text-zinc-500">
                      Hash: {activeMeta.infoHash.slice(0, 16)}...
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyMagnet(activeMeta.magnetUri)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-300 transition-colors"
                    title="Copy Magnet URI"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Magnet"}</span>
                  </button>
                  <button
                    onClick={() => handleLaunchReader(0)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Read Book Now</span>
                  </button>
                </div>
              </div>

              {/* Contained Files List */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Contained Files in Torrent:
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {activeMeta.files.map((file) => (
                    <div
                      key={file.index}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-zinc-800/80 text-xs text-zinc-300"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{file.filename}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">
                          {file.extension.toUpperCase()}
                        </span>
                        <button
                          onClick={() => handleLaunchReader(file.index)}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-medium"
                        >
                          Read
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 text-xs text-zinc-500">
          <span>Supported Formats: EPUB, PDF, MOBI, CBZ comic archives</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
