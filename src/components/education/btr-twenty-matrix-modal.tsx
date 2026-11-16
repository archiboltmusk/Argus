import { useState, useMemo } from "react";
import {
  X,
  Search,
  Calculator,
  Pill,
  Trash2,
  AlertTriangle,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  calculateBiostats,
  BTR_DRUG_OF_CHOICE_CATALOG,
  BMW_2016_RULES,
  calculateGCS,
  calculateCURB65,
  type GCSInput,
  type CURB65Input,
} from "@/lib/education/btr-twenty-engine";

interface BTRTwentyMatrixModalProps {
  open: boolean;
  onClose: () => void;
}

export function BTRTwentyMatrixModal({ open, onClose }: BTRTwentyMatrixModalProps) {
  const [activeTab, setActiveTab] = useState<"biostats" | "docs" | "bmw" | "scores">("docs");

  // Biostats Inputs
  const [tp, setTp] = useState(80);
  const [fp, setFp] = useState(20);
  const [fn, setFn] = useState(10);
  const [tn, setTn] = useState(90);

  const biostats = useMemo(() => calculateBiostats({ tp, fp, fn, tn }), [tp, fp, fn, tn]);

  // Drug of Choice Search
  const [searchDoc, setSearchDoc] = useState("");
  const filteredDocs = useMemo(() => {
    if (!searchDoc.trim()) return BTR_DRUG_OF_CHOICE_CATALOG;
    const q = searchDoc.toLowerCase();
    return BTR_DRUG_OF_CHOICE_CATALOG.filter(
      (d) =>
        d.condition.toLowerCase().includes(q) ||
        d.drugOfChoice.toLowerCase().includes(q) ||
        d.system.toLowerCase().includes(q)
    );
  }, [searchDoc]);

  // GCS State
  const [gcs, setGcs] = useState<GCSInput>({ eye: 4, verbal: 5, motor: 6 });
  const gcsResult = useMemo(() => calculateGCS(gcs), [gcs]);

  // CURB-65 State
  const [curb, setCurb] = useState<CURB65Input>({
    confusion: false,
    ureaOver7mmol: false,
    respiratoryRateGe30: false,
    bloodPressureLow: false,
    ageGe65: false,
  });
  const curbResult = useMemo(() => calculateCURB65(curb), [curb]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[90vh] max-h-[850px] rounded-3xl bg-surface border border-edge flex flex-col shadow-2xl overflow-hidden text-ink">
        {/* Modal Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-edge px-5 sm:px-6 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">The &quot;20th Subject&quot; Master Matrix</h2>
              <p className="text-xs text-ink-muted">
                Dr. Zainab Vora&apos;s High-Yield Cheat Sheets • Biostatistics, DOCs, BMW & Clinical Scores
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-elevated hover:bg-raised text-ink-muted hover:text-ink transition border border-edge"
          >
            <X size={16} />
          </button>
        </header>

        {/* Navigation Tabs */}
        <div className="border-b border-edge px-6 py-2.5 bg-surface/60 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: "docs", label: "Drug of Choice (DOC)", icon: Pill },
            { id: "biostats", label: "Biostatistics 2x2 Calculator", icon: Calculator },
            { id: "bmw", label: "Bio-Medical Waste (BMW 2016)", icon: Trash2 },
            { id: "scores", label: "Staging & Clinical Scores", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? "bg-accent text-white shadow-xs"
                    : "bg-elevated border border-edge-soft text-ink-muted hover:text-ink"
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-canvas">
          {/* TAB 1: DRUG OF CHOICE DIRECTORY */}
          {activeTab === "docs" && (
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={searchDoc}
                  onChange={(e) => setSearchDoc(e.target.value)}
                  placeholder="Search condition, drug, or organ system (e.g. Anaphylaxis, Syphilis, MRSA)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface border border-edge text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                />
              </div>

              {/* DOC Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredDocs.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-surface border border-edge p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-accent/40 transition"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent px-2 py-0.5 rounded-md bg-accent/15 border border-accent/25">
                          {item.system}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-ink">{item.condition}</h4>
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 mt-1 text-xs text-emerald-400 font-bold flex items-center gap-2">
                        <Pill size={14} className="shrink-0" />
                        <span>DOC: {item.drugOfChoice}</span>
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed mt-1">
                        {item.alternativeOrNotes}
                      </p>
                    </div>

                    {item.examinerTrap && (
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-2 text-[11px] text-amber-300 leading-snug flex items-start gap-1.5">
                        <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-400" />
                        <span><strong>Trap:</strong> {item.examinerTrap}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: BIOSTATISTICS CALCULATOR */}
          {activeTab === "biostats" && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              {/* 2x2 Input Grid */}
              <div className="rounded-3xl bg-surface border border-edge p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Calculator size={16} className="text-accent" />
                    Interactive 2x2 Diagnostic & Epidemiological Contingency Table
                  </h3>
                  <span className="text-xs text-ink-muted">Live Recalculation</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 flex flex-col gap-2">
                    <label className="text-xs font-bold text-emerald-400">
                      True Positives (TP): {tp}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={500}
                      value={tp}
                      onChange={(e) => setTp(Number(e.target.value))}
                      className="accent-emerald-500 h-1.5 bg-canvas rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-ink-muted">Diseased & Tested Positive</span>
                  </div>

                  <div className="rounded-2xl bg-red-500/10 border border-red-500/25 p-4 flex flex-col gap-2">
                    <label className="text-xs font-bold text-red-400">
                      False Positives (FP): {fp}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={500}
                      value={fp}
                      onChange={(e) => setFp(Number(e.target.value))}
                      className="accent-red-500 h-1.5 bg-canvas rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-ink-muted">Healthy & Tested Positive (Type I Error)</span>
                  </div>

                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 flex flex-col gap-2">
                    <label className="text-xs font-bold text-amber-400">
                      False Negatives (FN): {fn}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={500}
                      value={fn}
                      onChange={(e) => setFn(Number(e.target.value))}
                      className="accent-amber-500 h-1.5 bg-canvas rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-ink-muted">Diseased & Tested Negative (Type II Error)</span>
                  </div>

                  <div className="rounded-2xl bg-blue-500/10 border border-blue-500/25 p-4 flex flex-col gap-2">
                    <label className="text-xs font-bold text-blue-400">
                      True Negatives (TN): {tn}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={500}
                      value={tn}
                      onChange={(e) => setTn(Number(e.target.value))}
                      className="accent-blue-500 h-1.5 bg-canvas rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] text-ink-muted">Healthy & Tested Negative</span>
                  </div>
                </div>
              </div>

              {/* Calculated Results Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-surface border border-edge p-4 text-center">
                  <span className="text-[10.5px] uppercase font-bold text-ink-muted block">Sensitivity</span>
                  <span className="text-xl font-black text-emerald-400">{biostats.sensitivity}%</span>
                  <span className="text-[10px] text-ink-muted block mt-1">TP / (TP + FN)</span>
                </div>

                <div className="rounded-2xl bg-surface border border-edge p-4 text-center">
                  <span className="text-[10.5px] uppercase font-bold text-ink-muted block">Specificity</span>
                  <span className="text-xl font-black text-blue-400">{biostats.specificity}%</span>
                  <span className="text-[10px] text-ink-muted block mt-1">TN / (TN + FP)</span>
                </div>

                <div className="rounded-2xl bg-surface border border-edge p-4 text-center">
                  <span className="text-[10.5px] uppercase font-bold text-ink-muted block">PPV</span>
                  <span className="text-xl font-black text-accent">{biostats.ppv}%</span>
                  <span className="text-[10px] text-ink-muted block mt-1">TP / (TP + FP)</span>
                </div>

                <div className="rounded-2xl bg-surface border border-edge p-4 text-center">
                  <span className="text-[10.5px] uppercase font-bold text-ink-muted block">NPV</span>
                  <span className="text-xl font-black text-purple-400">{biostats.npv}%</span>
                  <span className="text-[10px] text-ink-muted block mt-1">TN / (TN + FN)</span>
                </div>

                <div className="rounded-2xl bg-surface border border-edge p-4 text-center">
                  <span className="text-[10.5px] uppercase font-bold text-ink-muted block">Odds Ratio (OR)</span>
                  <span className="text-xl font-black text-amber-400">{biostats.oddsRatio}</span>
                  <span className="text-[10px] text-ink-muted block mt-1">(a*d) / (b*c)</span>
                </div>

                <div className="rounded-2xl bg-surface border border-edge p-4 text-center">
                  <span className="text-[10.5px] uppercase font-bold text-ink-muted block">Relative Risk (RR)</span>
                  <span className="text-xl font-black text-red-400">{biostats.relativeRisk}</span>
                  <span className="text-[10px] text-ink-muted block mt-1">Cohort Incidence Ratio</span>
                </div>

                <div className="rounded-2xl bg-surface border border-edge p-4 text-center">
                  <span className="text-[10.5px] uppercase font-bold text-ink-muted block">ARR</span>
                  <span className="text-xl font-black text-teal-400">{biostats.arr}</span>
                  <span className="text-[10px] text-ink-muted block mt-1">Abs Risk Reduction</span>
                </div>

                <div className="rounded-2xl bg-surface border border-edge p-4 text-center">
                  <span className="text-[10.5px] uppercase font-bold text-ink-muted block">NNT</span>
                  <span className="text-xl font-black text-accent">{biostats.nnt}</span>
                  <span className="text-[10px] text-ink-muted block mt-1">1 / ARR (Round up)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BIO-MEDICAL WASTE (BMW 2016) */}
          {activeTab === "bmw" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BMW_2016_RULES.map((rule) => (
                <div
                  key={rule.color}
                  className="rounded-3xl bg-surface border border-edge p-5 flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full inline-block border border-black/30"
                          style={{ backgroundColor: rule.bagColorHex }}
                        />
                        <h3 className="text-sm font-bold text-ink">{rule.color} CATEGORY</h3>
                      </div>
                      <span className="text-[11px] font-mono text-ink-muted">BMW 2016</span>
                    </div>

                    <div className="rounded-xl bg-canvas p-3 border border-edge-soft flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                        Permitted Waste Items:
                      </span>
                      <ul className="text-xs text-ink/90 flex flex-col gap-1 list-disc pl-4">
                        {rule.wasteTypes.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col gap-1 text-xs">
                      <span className="font-bold text-ink-muted">Treatment & Disposal:</span>
                      <p className="text-accent font-semibold">{rule.treatmentMethod}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-edge-soft text-[11px] text-red-400">
                    <strong>Prohibited:</strong> {rule.prohibitedItems}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: CLINICAL SCORES (GCS & CURB-65) */}
          {activeTab === "scores" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* GCS Calculator */}
              <div className="rounded-3xl bg-surface border border-edge p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-edge-soft pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Glasgow Coma Scale (GCS)</h3>
                    <p className="text-[11px] text-ink-muted">TBI Trauma Triage (Score: 3 to 15)</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-accent">{gcsResult.total}/15</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-ink-muted block mb-1">
                      Eye Opening (E1 - E4): {gcs.eye}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setGcs({ ...gcs, eye: v as GCSInput["eye"] })}
                          className={`py-1.5 rounded-lg font-bold text-xs ${
                            gcs.eye === v ? "bg-accent text-white" : "bg-elevated text-ink-muted"
                          }`}
                        >
                          E{v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-ink-muted block mb-1">
                      Verbal Response (V1 - V5): {gcs.verbal}
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setGcs({ ...gcs, verbal: v as GCSInput["verbal"] })}
                          className={`py-1.5 rounded-lg font-bold text-xs ${
                            gcs.verbal === v ? "bg-accent text-white" : "bg-elevated text-ink-muted"
                          }`}
                        >
                          V{v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-ink-muted block mb-1">
                      Motor Response (M1 - M6): {gcs.motor}
                    </label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[1, 2, 3, 4, 5, 6].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setGcs({ ...gcs, motor: v as GCSInput["motor"] })}
                          className={`py-1.5 rounded-lg font-bold text-xs ${
                            gcs.motor === v ? "bg-accent text-white" : "bg-elevated text-ink-muted"
                          }`}
                        >
                          M{v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-canvas p-3 border border-edge-soft flex flex-col gap-1">
                  <span className="text-xs font-bold text-ink">{gcsResult.severity}</span>
                  {gcsResult.intubationIndicated && (
                    <span className="text-[11px] font-bold text-red-400">
                      ⚠️ GCS &lt;= 8: Intubation and airway protection indicated.
                    </span>
                  )}
                </div>
              </div>

              {/* CURB-65 Calculator */}
              <div className="rounded-3xl bg-surface border border-edge p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-edge-soft pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink">CURB-65 Pneumonia Severity</h3>
                    <p className="text-[11px] text-ink-muted">Admission Decision Score (0 to 5)</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-accent">{curbResult.score}/5</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  {[
                    { key: "confusion", label: "C: Confusion (AMT <= 8 / disorientation)" },
                    { key: "ureaOver7mmol", label: "U: Urea > 7 mmol/L (BUN > 19 mg/dL)" },
                    { key: "respiratoryRateGe30", label: "R: Respiratory Rate >= 30 breaths/min" },
                    { key: "bloodPressureLow", label: "B: Blood Pressure < 90 SBP or <= 60 DBP" },
                    { key: "ageGe65", label: "65: Age >= 65 years" },
                  ].map((item) => {
                    const isChecked = curb[item.key as keyof CURB65Input];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setCurb({ ...curb, [item.key]: !isChecked })
                        }
                        className={`text-left p-2.5 rounded-xl border flex items-center justify-between transition ${
                          isChecked
                            ? "bg-accent/15 border-accent text-ink"
                            : "bg-canvas border-edge-soft text-ink-muted"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className={`text-xs font-bold ${isChecked ? "text-accent" : "text-ink-muted"}`}>
                          {isChecked ? "+1" : "0"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl bg-canvas p-3 border border-edge-soft flex flex-col gap-1">
                  <span className="text-xs font-bold text-ink">{curbResult.recommendation}</span>
                  <span className="text-[11px] text-ink-muted">{curbResult.mortalityRisk}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
