import { useState } from "react";
import {
  X,
  Plus,
  AlertTriangle,
  Check,
  Trash2,
} from "lucide-react";
import {
  loadBTRErrorItems,
  saveBTRErrorItem,
  deleteBTRErrorItem,
  markErrorReviewed,
  ERROR_CATEGORY_METADATA,
  type GTErrorItem,
  type GTErrorCategory,
} from "@/lib/education/btr-error-vault";
import { CORE_BTR_SUBJECTS } from "@/lib/education/corebtr-schedule";

interface BTRErrorLogModalProps {
  open: boolean;
  onClose: () => void;
}

export function BTRErrorLogModal({ open, onClose }: BTRErrorLogModalProps) {
  const [errorList, setErrorList] = useState<GTErrorItem[]>(() => loadBTRErrorItems());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<GTErrorCategory | "ALL">("ALL");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [gtTitle, setGtTitle] = useState("Grand Test 01");
  const [subjectId, setSubjectId] = useState("pathology");
  const [questionStem, setQuestionStem] = useState("");
  const [myChosenAnswer, setMyChosenAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [takeawayFact, setTakeawayFact] = useState("");
  const [category, setCategory] = useState<GTErrorCategory>("volatile_lapse");

  if (!open) return null;

  // Filtered list
  const filteredErrors = errorList.filter(
    (e) => activeCategoryFilter === "ALL" || e.category === activeCategoryFilter
  );

  const handleCreateError = (e: React.FormEvent) => {
    e.preventDefault();
    const subj = CORE_BTR_SUBJECTS.find((s) => s.id === subjectId);
    const item: GTErrorItem = {
      id: `err-${Date.now()}`,
      gtTitle,
      subjectId,
      subjectName: subj?.name || "General Medicine",
      questionStem,
      myChosenAnswer,
      correctAnswer,
      takeawayFact,
      category,
      dateLogged: new Date().toISOString().slice(0, 10),
      reviewedCount: 0,
      isResolved: false,
    };
    const updated = saveBTRErrorItem(item);
    setErrorList(updated);
    setShowAddForm(false);
    setQuestionStem("");
    setMyChosenAnswer("");
    setCorrectAnswer("");
    setTakeawayFact("");
  };

  const handleDelete = (id: string) => {
    const updated = deleteBTRErrorItem(id);
    setErrorList(updated);
  };

  const handleToggleResolve = (id: string, current: boolean) => {
    const updated = markErrorReviewed(id, !current);
    setErrorList(updated);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-3xl bg-surface border border-edge p-6 shadow-2xl flex flex-col gap-5 text-ink max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-edge-soft pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Grand Test (GT) Mistake Triage & Error Vault</h3>
              <p className="text-xs text-ink-muted">
                Analyze why you lost marks and compile your automated 7-Day Pre-Exam Mistake Blitz.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-xs font-bold text-white shadow-xs hover:brightness-110 transition"
            >
              <Plus size={14} />
              <span>{showAddForm ? "View Errors" : "Log Mistake"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-elevated hover:bg-raised text-ink-muted hover:text-ink transition border border-edge"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm ? (
          <form onSubmit={handleCreateError} className="flex flex-col gap-3.5 text-xs bg-canvas/60 p-5 rounded-2xl border border-edge-soft animate-in zoom-in-95 duration-100">
            <h4 className="text-sm font-bold text-ink">Log New Mistake Question</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-ink-muted block mb-1">GT / Test Name</label>
                <input
                  type="text"
                  required
                  value={gtTitle}
                  onChange={(e) => setGtTitle(e.target.value)}
                  className="w-full rounded-xl bg-surface border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="font-bold text-ink-muted block mb-1">Subject</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full rounded-xl bg-surface border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent"
                >
                  {CORE_BTR_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-ink-muted block mb-1">Mistake Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GTErrorCategory)}
                  className="w-full rounded-xl bg-surface border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent font-semibold"
                >
                  <option value="silly_reading">Silly / Reading Error</option>
                  <option value="volatile_lapse">Volatile Memory Lapse</option>
                  <option value="examiner_trap">Examiner Trap</option>
                  <option value="knowledge_gap">Knowledge Gap</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-ink-muted block mb-1">Question Stem / Clinical Scenario</label>
              <textarea
                rows={2}
                required
                placeholder="e.g. 50yo female presents with chest pain and ST elevation in II, III, aVF..."
                value={questionStem}
                onChange={(e) => setQuestionStem(e.target.value)}
                className="w-full rounded-xl bg-surface border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-red-400 block mb-1">My Chosen Option (Trap)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nitroglycerin sublingual"
                  value={myChosenAnswer}
                  onChange={(e) => setMyChosenAnswer(e.target.value)}
                  className="w-full rounded-xl bg-surface border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="font-bold text-emerald-400 block mb-1">Correct Key & Answer</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IV Normal Saline bolus (RV infarct)"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="w-full rounded-xl bg-surface border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-ink-muted block mb-1">Master Takeaway / Rule to Never Forget</label>
              <input
                type="text"
                required
                placeholder="e.g. In inferior wall MI with RV involvement, nitrates drop preload causing refractory shock."
                value={takeawayFact}
                onChange={(e) => setTakeawayFact(e.target.value)}
                className="w-full rounded-xl bg-surface border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-1.5 rounded-xl border border-edge text-ink-muted hover:text-ink font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 rounded-xl bg-accent text-white font-bold shadow-xs hover:brightness-110"
              >
                Save Mistake to Vault
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeCategoryFilter === "ALL"
                    ? "bg-accent text-white shadow-xs"
                    : "bg-elevated border border-edge-soft text-ink-muted hover:text-ink"
                }`}
              >
                All Mistakes ({errorList.length})
              </button>

              {(["volatile_lapse", "silly_reading", "examiner_trap", "knowledge_gap"] as const).map(
                (cat) => {
                  const meta = ERROR_CATEGORY_METADATA[cat];
                  const count = errorList.filter((e) => e.category === cat).length;
                  const isActive = activeCategoryFilter === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        isActive
                          ? "bg-accent text-white border-accent"
                          : `${meta.badgeColor} hover:brightness-110`
                      }`}
                    >
                      <span>{meta.label}</span>
                      <span className="ml-1 opacity-75 font-mono">({count})</span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Error Items List */}
            <div className="flex flex-col gap-3">
              {filteredErrors.map((item) => {
                const meta = ERROR_CATEGORY_METADATA[item.category];

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition ${
                      item.isResolved
                        ? "bg-surface/40 border-edge-soft opacity-60"
                        : "bg-surface/90 border-edge shadow-xs"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-ink-muted">
                            {item.gtTitle} • {item.subjectName}
                          </span>
                          <span className={`text-[10px] font-bold rounded-md px-2 py-0.5 border ${meta.badgeColor}`}>
                            {meta.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleResolve(item.id, item.isResolved)}
                            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition ${
                              item.isResolved
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-elevated border-edge text-ink-muted hover:text-ink"
                            }`}
                          >
                            <Check size={11} />
                            <span>{item.isResolved ? "Resolved" : "Mark Resolved"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-ink-muted hover:text-danger rounded-md transition"
                            title="Delete mistake"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-ink leading-relaxed">
                        {item.questionStem}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-2 text-red-300">
                          <strong className="block text-[10px] uppercase text-red-400">My Mistake:</strong>
                          {item.myChosenAnswer}
                        </div>
                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-300">
                          <strong className="block text-[10px] uppercase text-emerald-400">Correct Fact:</strong>
                          {item.correctAnswer}
                        </div>
                      </div>

                      <div className="rounded-xl bg-accent/10 border border-accent/20 p-2 text-xs text-accent">
                        <strong className="block text-[10px] uppercase text-accent font-bold">
                          Takeaway Rule:
                        </strong>
                        {item.takeawayFact}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
