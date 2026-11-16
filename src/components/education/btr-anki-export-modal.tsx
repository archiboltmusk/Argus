import { useState } from "react";
import { Download, Sparkles, Check, X } from "lucide-react";
import { downloadBTRAnkiDeck } from "@/lib/education/btr-anki-exporter";
import { CORE_BTR_SUPER_VOLATILES } from "@/lib/education/corebtr-schedule";

interface BTRAnkiExportModalProps {
  open: boolean;
  onClose: () => void;
}

export function BTRAnkiExportModal({ open, onClose }: BTRAnkiExportModalProps) {
  const [includeTraps, setIncludeTraps] = useState(true);
  const [includeMnemonics, setIncludeMnemonics] = useState(true);
  const [tagPrefix, setTagPrefix] = useState("NEETPG2027::CoreBTR");
  const [downloaded, setDownloaded] = useState(false);

  if (!open) return null;

  const totalCards = CORE_BTR_SUPER_VOLATILES.length;

  const handleExport = () => {
    downloadBTRAnkiDeck(
      CORE_BTR_SUPER_VOLATILES,
      `CoreBTR_2027_SuperVolatiles_${totalCards}Cards.txt`,
      {
        tagPrefix,
        includeExaminerTraps: includeTraps,
        includeMnemonics,
      }
    );
    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-surface border border-edge p-6 shadow-2xl flex flex-col gap-5 text-ink animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-edge-soft pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/25">
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Export BTR Super-Volatiles to Anki</h3>
              <p className="text-xs text-ink-muted">Sync cards to Anki on desktop, iPhone, iPad, or Android.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-elevated hover:bg-raised text-ink-muted hover:text-ink transition border border-edge"
          >
            <X size={15} />
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3 text-xs">
          <div className="rounded-2xl bg-canvas/60 border border-edge-soft p-4 flex flex-col gap-2.5">
            <span className="font-bold text-ink-muted uppercase tracking-wider text-[10.5px]">
              Card Customization:
            </span>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold text-ink">Include Examiner Trap Warning Boxes</span>
              <input
                type="checkbox"
                checked={includeTraps}
                onChange={(e) => setIncludeTraps(e.target.checked)}
                className="accent-accent h-4 w-4 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold text-ink">Include Memory Hook Mnemonics</span>
              <input
                type="checkbox"
                checked={includeMnemonics}
                onChange={(e) => setIncludeMnemonics(e.target.checked)}
                className="accent-accent h-4 w-4 rounded cursor-pointer"
              />
            </label>

            <div className="pt-2 border-t border-edge-soft flex flex-col gap-1">
              <span className="font-semibold text-ink-muted">Deck Hierarchical Tag:</span>
              <input
                type="text"
                value={tagPrefix}
                onChange={(e) => setTagPrefix(e.target.value)}
                className="w-full rounded-xl bg-surface border border-edge px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Quick Import Instructions */}
          <div className="rounded-2xl bg-accent/10 border border-accent/20 p-3.5 text-[11.5px] text-accent flex items-start gap-2.5 leading-relaxed">
            <Sparkles size={16} className="shrink-0 mt-0.5" />
            <div>
              <strong>How to Import into Anki:</strong>
              <ol className="list-decimal list-inside mt-1 flex flex-col gap-0.5 text-ink-muted">
                <li>Click &quot;Download Anki Deck (.txt)&quot; below.</li>
                <li>Open Anki Desktop and click <b>File → Import</b>.</li>
                <li>Select the downloaded file. Make sure <b>Allow HTML in fields</b> is checked.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-edge-soft">
          <span className="text-xs text-ink-muted font-medium">
            <strong>{totalCards}</strong> High-Yield Cards
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-edge text-xs font-semibold text-ink-muted hover:text-ink transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={downloaded}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-accent text-xs font-bold text-white shadow-sm hover:brightness-110 transition"
            >
              {downloaded ? <Check size={14} /> : <Download size={14} />}
              <span>{downloaded ? "Deck Downloaded!" : "Download Anki Deck (.txt)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
