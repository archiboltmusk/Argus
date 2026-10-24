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
  Globe,
  Link2,
  FolderDown,
} from "lucide-react";
import {
  useQBankPacks,
  importQBankPack,
  importFromGitHubUrl,
  exportPackAsJson,
  deletePack,
  addSingleQuestion,
} from "@/lib/education/qbank-store";
import { readEducationalFileText } from "@/lib/education/json-gz-importer";
import { VERIFIED_COMMUNITY_DATASETS } from "@/lib/education/community-catalogs";
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

  const [activeTab, setActiveTab] = useState<"packs" | "directory" | "author">("packs");
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedPackId, setCopiedPackId] = useState<string | null>(null);

  // URL Import State
  const [remoteUrl, setRemoteUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [fetchingRemote, setFetchingRemote] = useState(false);

  // Authoring Form State
  const [subject, setSubject] = useState<SubjectCategory>("Pathology");
  const [topic, setTopic] = useState("");
  const [vignette, setVignette] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [trap, setTrap] = useState("");
  const [rationale, setRationale] = useState("");
  const [bottomLine, setBottomLine] = useState("");

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readEducationalFileText(file);
      const res = importQBankPack(content);
      if (res.success) {
        setImportStatus({
          success: true,
          message: `Successfully imported "${res.pack?.title}" with ${res.pack?.totalQuestions} questions!`,
        });
      } else {
        setImportStatus({ success: false, message: res.error || "Failed to import pack." });
      }
    } catch (err: any) {
      setImportStatus({ success: false, message: err?.message || "Failed to process file." });
    }
    setTimeout(() => setImportStatus(null), 4000);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportRemoteUrl = async () => {
    if (!remoteUrl.trim()) return;
    setFetchingRemote(true);
    setImportStatus(null);
    const res = await importFromGitHubUrl(remoteUrl.trim(), customTitle.trim() || undefined);
    setFetchingRemote(false);

    if (res.success) {
      setImportStatus({
        success: true,
        message: `Imported "${res.pack?.title}" (${res.pack?.totalQuestions} questions) from remote URL!`,
      });
      setRemoteUrl("");
      setCustomTitle("");
      setActiveTab("packs");
    } else {
      setImportStatus({ success: false, message: res.error || "Failed to fetch remote JSON." });
    }
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handleInstallFromCatalog = async (url: string, title: string) => {
    setFetchingRemote(true);
    const res = await importFromGitHubUrl(url, title);
    setFetchingRemote(false);
    if (res.success) {
      setImportStatus({
        success: true,
        message: `Installed "${res.pack?.title}" (${res.pack?.totalQuestions} questions)!`,
      });
      setActiveTab("packs");
    } else {
      setImportStatus({ success: false, message: res.error || "Failed to install catalog pack." });
    }
    setTimeout(() => setImportStatus(null), 4000);
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
    });

    setTopic("");
    setVignette("");
    setOptions(["", "", "", ""]);
    setTrap("");
    setRationale("");
    setBottomLine("");
    setActiveTab("packs");
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[860px] max-h-[85vh] mx-auto bg-surface rounded-2xl border border-edge shadow-2xl overflow-hidden text-ink animate-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-edge/60 bg-canvas/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 font-bold">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink leading-tight flex items-center gap-2">
              <span>Universal QBank Data Layer</span>
              <span className="rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-semibold px-2 py-0.5">
                Polyglot Ingestor
              </span>
            </h3>
            <p className="text-[11px] text-ink-subtle">
              Import from any GitHub repo, JSON/JSONL dataset, or open medical question pool.
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
              Installed ({packs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("directory")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition ${
                activeTab === "directory" ? "bg-surface text-ink shadow-sm" : "text-ink-subtle hover:text-ink"
              }`}
            >
              <Globe size={13} /> Open Repos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("author")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition ${
                activeTab === "author" ? "bg-accent text-white shadow-sm" : "text-ink-subtle hover:text-ink"
              }`}
            >
              <Plus size={13} /> Author
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
            {/* Direct GitHub URL Ingestor Box */}
            <div className="flex flex-col gap-2 rounded-xl bg-canvas/60 p-3.5 border border-edge">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Link2 size={13} className="text-accent" />
                <span>Import from any GitHub Raw URL or JSON Link</span>
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/.../questions.json (or MedQA .jsonl)"
                  className="flex-1 rounded-xl border border-edge bg-surface px-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleImportRemoteUrl}
                  disabled={!remoteUrl.trim() || fetchingRemote}
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow hover:opacity-95 disabled:opacity-40 transition"
                >
                  <FolderDown size={13} />
                  <span>{fetchingRemote ? "Ingesting…" : "Ingest URL"}</span>
                </button>
              </div>
            </div>

            {/* Local File Upload Bar */}
            <div className="flex items-center justify-between bg-canvas/30 p-3 rounded-xl border border-edge/60 text-xs">
              <span className="text-ink-muted">Have a local file? Upload JSON, JSONL, or compressed (.json.gz):</span>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,.jsonl,.gz,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg bg-raised hover:bg-edge px-3 py-1 text-xs font-medium text-ink transition"
                >
                  <Upload size={12} />
                  <span>Upload .json / .json.gz</span>
                </button>
              </div>
            </div>

            {/* Packs List */}
            <div className="flex flex-col gap-3 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle px-1">
                Installed Question Pools ({packs.length})
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
                              Verified Core
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-ink-muted mt-0.5">{pack.description}</p>
                        <div className="flex items-center gap-3 text-[11px] text-ink-subtle mt-1.5">
                          <span>Source: {pack.author}</span>
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
                          title="Export Pack JSON"
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
        ) : activeTab === "directory" ? (
          /* Open Repos Directory Tab */
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-ink">Verified Open Medical Repositories</h4>
              <p className="text-[11px] text-ink-subtle">
                Public GitHub and HuggingFace clinical datasets. Click install to pull them directly into your local Argus QBank.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {VERIFIED_COMMUNITY_DATASETS.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-edge bg-surface/70 p-4 shadow-sm hover:border-edge-soft transition gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-[13px] font-bold text-ink leading-tight">{item.title}</h5>
                      <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent shrink-0">
                        {item.subject}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-ink-muted mt-1 leading-snug">{item.description}</p>
                    <div className="flex items-center gap-2 text-[10.5px] text-ink-subtle mt-2">
                      <span>Source: {item.author}</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-500">~{item.totalQuestions} Questions</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-edge/40">
                    <div className="flex items-center gap-1">
                      {item.tags.map((t) => (
                        <span key={t} className="rounded bg-raised px-1.5 py-0.5 text-[9px] font-mono text-ink-subtle">
                          {t}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInstallFromCatalog(item.rawUrl, item.title)}
                      disabled={fetchingRemote}
                      className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-white shadow hover:opacity-95 disabled:opacity-40 transition"
                    >
                      <FolderDown size={12} />
                      <span>Install Pack</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Authoring Tab */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-edge/60 pb-2">
              <div>
                <h4 className="text-sm font-bold text-ink">Contribute Clinical Vignette</h4>
                <p className="text-[11px] text-ink-subtle">
                  Author a clinical question following the Socratic 4-quadrant format.
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
              <label className="text-xs font-medium text-ink-subtle">Options (Select radio for correct answer)</label>
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
