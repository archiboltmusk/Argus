import { useState, useRef, type ChangeEvent } from "react";
import {
  Upload,
  Download,
  Plus,
  BookOpen,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  useQBankPacks,
  importQBankPack,
  exportPackAsJson,
  deletePack,
  addSingleQuestion,
} from "@/lib/education/qbank-store";
import type { QBankPack, SubjectCategory } from "@/lib/education/qbank-types";

export type QBankManagerProps = {
  onStartPackDrill?: (pack: QBankPack) => void;
  onClose: () => void;
};

const ALL_SUBJECTS: SubjectCategory[] = [
  "Pathology",
  "Pharmacology",
  "Medicine",
  "Surgery",
  "OBGYN",
  "Microbiology",
  "Radiology",
  "Biochemistry",
  "Anatomy",
  "Physiology",
  "Pediatrics",
  "Orthopedics",
  "Ophthalmology",
  "ENT",
  "Dermatology",
  "Psychiatry",
  "Anesthesia",
  "FMT",
  "PSM",
];

export function QBankManager({ onStartPackDrill, onClose }: QBankManagerProps) {
  const packs = useQBankPacks();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"packs" | "author">("packs");
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedPackId, setCopiedPackId] = useState<string | null>(null);

  // Authoring Form State
  const [subject, setSubject] = useState<SubjectCategory>("Pathology");
  const [topic, setTopic] = useState("");
  const [vignette, setVignette] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [trap, setTrap] = useState("");
  const [rationale, setRationale] = useState("");
  const [bottomLine, setBottomLine] = useState("");
  const [sourceExam] = useState("");

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importQBankPack(content);
      if (res.success) {
        setImportStatus({ success: true, message: `Successfully imported "${res.pack?.title}" with ${res.pack?.totalQuestions} questions!` });
      } else {
        setImportStatus({ success: false, message: res.error || "Failed to import pack." });
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCopyPack = (packId: string) => {
    const json = exportPackAsJson(packId);
    void navigator.clipboard.writeText(json);
    setCopiedPackId(packId);
    setTimeout(() => setCopiedPackId(null), 2000);
  };

  const handleSaveQuestion = () => {
    if (!topic.trim() || !vignette.trim() || options.some((o) => !o.trim())) {
      alert("Please fill in the topic, vignette, and all 4 options.");
      return;
    }

    addSingleQuestion({
      subject,
      topic: topic.trim(),
      vignette: vignette.trim(),
      options: options.map((o) => o.trim()),
      correctIndex,
      examinerTrap: trap.trim() || "Watch out for extreme qualifiers (always, never).",
      explanation: {
        correctRationale: rationale.trim() || "Correct answer principle.",
        distractorBreakdown: [],
        bottomLine: bottomLine.trim() || "High-yield core takeaway.",
      },
      highYieldTags: ["Community Contributed", subject],
      sourceExam: sourceExam.trim() || undefined,
    });

    // Reset fields
    setTopic("");
    setVignette("");
    setOptions(["", "", "", ""]);
    setTrap("");
    setRationale("");
    setBottomLine("");
    setActiveTab("packs");
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[820px] max-h-[85vh] mx-auto bg-surface rounded-2xl border border-edge shadow-2xl overflow-hidden text-ink animate-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-edge/60 bg-canvas/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 font-bold">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink leading-tight flex items-center gap-2">
              <span>Open QBank Data Layer</span>
              <span className="rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-semibold px-2 py-0.5">
                Decentralized & Free
              </span>
            </h3>
            <p className="text-[11px] text-ink-subtle">
              Anyone can author, import, export, and contribute clinical questions. Zero paywalls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center rounded-xl bg-raised p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("packs")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeTab === "packs" ? "bg-surface text-ink shadow-sm" : "text-ink-subtle hover:text-ink"
              }`}
            >
              Installed Packs ({packs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("author")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition ${
                activeTab === "author" ? "bg-accent text-white shadow-sm" : "text-ink-subtle hover:text-ink"
              }`}
            >
              <Plus size={13} /> Contribute Question
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-subtle hover:bg-raised hover:text-ink transition ml-2"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {importStatus && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium border ${
              importStatus.success
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-500 border-rose-500/30"
            }`}
          >
            {importStatus.success ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{importStatus.message}</span>
          </div>
        )}

        {activeTab === "packs" ? (
          <div className="flex flex-col gap-4">
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between bg-canvas/60 p-3.5 rounded-xl border border-edge">
              <div>
                <span className="text-xs font-semibold text-ink block">Import Community Pack (.json)</span>
                <span className="text-[11px] text-ink-subtle">
                  Import question files shared by medical batches, study groups, or downloaded from GitHub.
                </span>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:opacity-95 transition"
                >
                  <Upload size={13} />
                  <span>Import JSON Pack</span>
                </button>
              </div>
            </div>

            {/* Packs List */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle px-1">
                Active Question Packs
              </span>
              {packs.map((pack) => {
                const isStarter = pack.id === "argus-starter-pack";
                const isCopied = copiedPackId === pack.id;

                return (
                  <div
                    key={pack.id}
                    className="flex flex-col gap-2 rounded-xl border border-edge bg-surface p-4 hover:border-edge-soft transition shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-ink">{pack.title}</h4>
                          <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] font-mono text-ink-subtle">
                            v{pack.version}
                          </span>
                          {isStarter && (
                            <span className="rounded bg-amber-500/15 text-amber-500 px-1.5 py-0.5 text-[10px] font-semibold">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-ink-muted mt-0.5">{pack.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-ink-subtle mt-1.5">
                          <span>By: {pack.author}</span>
                          <span>•</span>
                          <span className="font-semibold text-accent">{pack.totalQuestions} Questions</span>
                          <span>•</span>
                          <span>Subject: {pack.subject || "Mixed"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onStartPackDrill && (
                          <button
                            type="button"
                            onClick={() => onStartPackDrill(pack)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1 text-xs font-semibold text-white transition shadow-sm"
                          >
                            <span>Drill Pack</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyPack(pack.id)}
                          className="flex items-center gap-1 rounded-lg bg-raised hover:bg-edge px-2.5 py-1 text-xs font-medium text-ink transition"
                          title="Export Pack JSON to share with peers"
                        >
                          {isCopied ? <Check size={12} className="text-emerald-500" /> : <Download size={12} />}
                          <span>{isCopied ? "Copied!" : "Export"}</span>
                        </button>
                        {!isStarter && (
                          <button
                            type="button"
                            onClick={() => deletePack(pack.id)}
                            className="p-1 rounded-lg text-ink-subtle hover:text-rose-500 hover:bg-rose-500/10 transition"
                            title="Delete pack"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Authoring Tab: Anyone can contribute a question */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-edge/60 pb-2">
              <div>
                <h4 className="text-sm font-bold text-ink">Contribute Clinical Vignette</h4>
                <p className="text-[11px] text-ink-subtle">
                  Author a clinical question following the Socratic 4-quadrant format. Saved directly to your local pack.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-subtle">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as SubjectCategory)}
                  className="rounded-xl border border-edge bg-canvas/70 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                >
                  {ALL_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-subtle">Topic / Disease</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Aortic Stenosis, Meningitis, DKA"
                  className="rounded-xl border border-edge bg-canvas/70 px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Vignette */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-subtle">Clinical Case Vignette</label>
              <textarea
                rows={3}
                value={vignette}
                onChange={(e) => setVignette(e.target.value)}
                placeholder="A 45-year-old male presents with sudden-onset tearing chest pain radiating to the back..."
                className="w-full resize-none rounded-xl border border-edge bg-canvas/70 p-3 text-xs text-ink outline-none focus:border-accent"
              />
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-ink-subtle">Options (Select the radio for correct answer)</label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_choice"
                    checked={correctIndex === i}
                    onChange={() => setCorrectIndex(i)}
                    className="accent-accent"
                  />
                  <span className="font-mono text-xs font-bold text-ink-subtle w-4">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[i] = e.target.value;
                      setOptions(updated);
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                    className="flex-1 rounded-xl border border-edge bg-canvas/70 px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                  />
                </div>
              ))}
            </div>

            {/* Examiner Trap */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-amber-500">⚡ Examiner Trap Radar</label>
              <input
                type="text"
                value={trap}
                onChange={(e) => setTrap(e.target.value)}
                placeholder="e.g. Do not confuse with Myocardial Infarction; tearing pain + asymmetric pulses = Aortic Dissection."
                className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-ink outline-none focus:border-amber-500"
              />
            </div>

            {/* Explanation & Bottom Line */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-subtle">Why the answer is correct</label>
                <textarea
                  rows={2}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="CT angiography is the diagnostic investigation of choice in hemodynamically stable patients..."
                  className="rounded-xl border border-edge bg-canvas/70 p-2.5 text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-subtle">Bottom Line Rule</label>
                <textarea
                  rows={2}
                  value={bottomLine}
                  onChange={(e) => setBottomLine(e.target.value)}
                  placeholder="One-liner clinical pearl to commit to memory."
                  className="rounded-xl border border-edge bg-canvas/70 p-2.5 text-xs text-ink outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white shadow hover:opacity-95 transition"
              >
                <Sparkles size={14} />
                <span>Save Question to My Pack</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
