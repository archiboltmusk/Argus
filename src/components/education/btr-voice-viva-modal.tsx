import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  RotateCcw,
  ArrowRight,
  Stethoscope,
} from "lucide-react";

export interface ClinicalVivaCase {
  id: string;
  title: string;
  specialty: string;
  attendingPrompt: string;
  keyDiscriminatorKeywords: string[];
  contraindicatedTraps: string[];
  goldStandardAnswer: string;
  drZainabPearl: string;
}

export const HY_VIVA_CASES: ClinicalVivaCase[] = [
  {
    id: "viva-01",
    title: "Inferior Wall MI & The Nitrate Danger",
    specialty: "Cardiology",
    attendingPrompt:
      "Dr. Anupam, a 52-year-old male arrives in casualty with severe retrosternal pain, sweating, and nausea. ECG shows ST elevation in II, III, and aVF. His blood pressure is 85/50 mmHg with elevated JVP and clear lungs. What is the immediate diagnostic step, what must you NEVER administer, and what is your initial fluid therapy?",
    keyDiscriminatorKeywords: ["right ventricular", "v4r", "nitrate", "fluid", "normal saline", "preload"],
    contraindicatedTraps: ["nitroglycerin", "nitrate", "morphine", "diuretic", "furosemide"],
    goldStandardAnswer:
      "Right ventricular infarction complicating inferior wall MI. Order right-sided ECG leads (V4R). Strictly CONTRAINDICATE nitrates, diuretics, and morphine as RV is preload dependent. Administer IV fluid resuscitation.",
    drZainabPearl:
      "Triad of RV Infarction: Hypotension + Elevated JVP + Clear Lungs in Inferior Wall MI. Nitrates cause catastrophic cardiovascular collapse!",
  },
  {
    id: "viva-02",
    title: "Acute Severe Asthma & The 'Silent Chest'",
    specialty: "Pulmonology",
    attendingPrompt:
      "A 21-year-old known asthmatic arrives unable to speak full sentences. On auscultation, the chest is remarkably silent with no audible wheeze. ABG shows a pH of 7.34 and PaCO2 of 42 mmHg. What is the ominous clinical significance of this PaCO2, and what is your immediate rescue management?",
    keyDiscriminatorKeywords: ["silent chest", "respiratory muscle fatigue", "exhaustion", "impending arrest", "intubation", "magnesium"],
    contraindicatedTraps: ["sedative", "discharge", "mild"],
    goldStandardAnswer:
      "A normal or elevated PaCO2 in an acutely tachypneic asthmatic is an ominous sign of respiratory muscle exhaustion and impending respiratory arrest. Immediate management: High-flow oxygen, continuous nebulized salbutamol + ipratropium, IV hydrocortisone, IV magnesium sulfate 2g, and prepare for rapid sequence intubation.",
    drZainabPearl:
      "Normal PaCO2 in severe asthma is NEVER normal—it means the patient is tiring out! Wheeze disappearance ('silent chest') heralds respiratory arrest.",
  },
  {
    id: "viva-03",
    title: "Status Epilepticus & Refractory Seizures",
    specialty: "Neurology",
    attendingPrompt:
      "A 30-year-old female has been seizing continuously for 8 minutes without regaining consciousness. IV access is established. Walk me through the first-line and second-line pharmacotherapy according to the latest AES guidelines.",
    keyDiscriminatorKeywords: ["lorazepam", "diazepam", "levetiracetam", "fosphenytoin", "valproate", "5 minutes"],
    contraindicatedTraps: ["oral", "wait", "paralysis without sedation"],
    goldStandardAnswer:
      "First-line (0-5 mins): IV Lorazepam (0.1 mg/kg) or IV Diazepam. If seizures continue past 10 minutes: Second-line IV Levetiracetam (60 mg/kg), IV Fosphenytoin (20 mg PE/kg), or IV Sodium Valproate (40 mg/kg). If refractory past 30 mins: General anesthesia with Midazolam or Propofol.",
    drZainabPearl:
      "Status epilepticus threshold: > 5 minutes of continuous seizure (t1) mandates treatment. Beyond 30 minutes (t2), permanent neuronal injury begins.",
  },
];

export interface BTRVoiceVivaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BTRVoiceVivaModal({ isOpen, onClose }: BTRVoiceVivaModalProps) {
  const [caseIndex, setCaseIndex] = useState(0);
  const activeCase = HY_VIVA_CASES[caseIndex] || HY_VIVA_CASES[0];

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeakingPrompt, setIsSpeakingPrompt] = useState(false);
  const [evaluation, setEvaluation] = useState<{
    score: number; // 1 to 5
    keywordsFound: string[];
    trapsDetected: string[];
    critique: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  // Stop speech synthesis
  const stopAudio = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Speak Attending Prompt
  const speakPrompt = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    stopAudio();
    setIsSpeakingPrompt(true);

    const utterance = new SpeechSynthesisUtterance(activeCase.attendingPrompt);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    utterance.onend = () => setIsSpeakingPrompt(false);
    utterance.onerror = () => setIsSpeakingPrompt(false);
    window.speechSynthesis.speak(utterance);
  }, [activeCase.attendingPrompt, stopAudio]);

  // Speech Recognition initialization
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + " ";
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setEvaluation(null);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch {
        // Recognition already active
      }
    }
  };

  const handleEvaluateResponse = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const lowerTranscript = transcript.toLowerCase();
    const keywordsFound: string[] = [];
    const trapsDetected: string[] = [];

    for (const kw of activeCase.keyDiscriminatorKeywords) {
      if (lowerTranscript.includes(kw.toLowerCase())) {
        keywordsFound.push(kw);
      }
    }

    for (const trap of activeCase.contraindicatedTraps) {
      // Check if candidate mentioned trap in affirmative rather than avoiding it
      if (lowerTranscript.includes(trap.toLowerCase()) && !lowerTranscript.includes("avoid") && !lowerTranscript.includes("contraindicat") && !lowerTranscript.includes("never")) {
        trapsDetected.push(trap);
      }
    }

    // Compute proficiency score (1 to 5 stars)
    let score = 1;
    if (keywordsFound.length >= 4 && trapsDetected.length === 0) score = 5;
    else if (keywordsFound.length >= 3 && trapsDetected.length === 0) score = 4;
    else if (keywordsFound.length >= 2) score = 3;
    else if (keywordsFound.length >= 1) score = 2;

    let critique = "";
    if (score >= 4) {
      critique =
        "Exceptional clinical acumen, Dr. Anupam. You rapidly identified the pathognomonic mechanism and avoided fatal hemodynamic pitfalls.";
    } else if (score === 3) {
      critique =
        "Acceptable clinical foundation, but you omitted crucial secondary rescue interventions. Sharpen your drug-of-choice precision.";
    } else {
      critique =
        "Sub-optimal response. In high-stakes emergency situations, hesitation or missing contraindications carries severe clinical consequence.";
    }

    setEvaluation({
      score,
      keywordsFound,
      trapsDetected,
      critique,
    });
  };

  const handleNextCase = () => {
    stopAudio();
    setTranscript("");
    setEvaluation(null);
    setCaseIndex((prev) => (prev + 1) % HY_VIVA_CASES.length);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border border-edge bg-surface shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-elevated/70">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center">
              <Stethoscope size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-ink">{activeCase.title}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                  {activeCase.specialty}
                </span>
              </div>
              <span className="text-[11px] text-ink-muted">
                Socratic Attending Clinical Oral Viva Mode
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNextCase}
              className="p-1.5 rounded-xl bg-elevated border border-edge text-ink-muted hover:text-ink transition"
              title="Next Case"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                stopAudio();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-elevated border border-edge text-ink-muted hover:text-ink transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Attending Physician Case Card */}
          <div className="p-5 rounded-2xl bg-canvas border border-purple-500/30 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                <Sparkles size={14} />
                <span>Chief Attending Socratic Prompt</span>
              </div>
              <button
                type="button"
                onClick={speakPrompt}
                className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1.5 ${
                  isSpeakingPrompt
                    ? "bg-purple-500/20 border-purple-500 text-purple-300"
                    : "bg-elevated border-edge text-ink-muted hover:text-ink"
                }`}
                title="Speak Prompt Aloud"
              >
                {isSpeakingPrompt ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span className="text-[10px] font-mono">{isSpeakingPrompt ? "Speaking..." : "Read Aloud"}</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-ink leading-relaxed font-medium">
              &ldquo;{activeCase.attendingPrompt}&rdquo;
            </p>
          </div>

          {/* Voice Input Interaction Strip */}
          <div className="p-6 rounded-2xl bg-elevated border border-edge flex flex-col items-center justify-center gap-4 text-center">
            <button
              type="button"
              onClick={toggleListening}
              className={`h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition-transform transform active:scale-95 ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/40"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
              title={isListening ? "Stop Speaking" : "Click to Speak"}
            >
              {isListening ? <MicOff size={28} /> : <Mic size={28} />}
            </button>

            <div>
              <span className="text-xs font-bold text-ink">
                {isListening ? "Listening... Explain your clinical reasoning aloud" : "Click microphone to respond orally"}
              </span>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Speak naturally or type your rationale below
              </p>
            </div>

            {/* Live Transcript / Typed Text Area */}
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your clinical reasoning will appear here as you speak, or you can type directly..."
              className="w-full h-24 p-3 rounded-xl bg-canvas border border-edge text-xs font-mono text-ink placeholder:text-ink-muted resize-none focus:outline-none focus:border-purple-500/60"
            />

            {transcript.length > 5 && !evaluation && (
              <button
                type="button"
                onClick={handleEvaluateResponse}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md flex items-center gap-2"
              >
                <span>Submit Clinical Rationale for Critique</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* Evaluation & Socratic Critique Card */}
          {evaluation && (
            <div className="p-5 rounded-2xl bg-canvas border border-purple-500/40 flex flex-col gap-3.5 shadow-xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-purple-400" />
                  <span className="text-xs font-bold text-ink">
                    Clinical Performance Appraisal:
                  </span>
                </div>
                {/* 5-Star Rating Display */}
                <div className="flex items-center gap-1 text-amber-400 font-mono text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < evaluation.score ? "★" : "☆"}</span>
                  ))}
                  <span className="text-xs text-ink-muted ml-1">({evaluation.score}/5)</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-ink leading-relaxed font-semibold">
                {evaluation.critique}
              </p>

              {/* Identified vs Missed Key Concepts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="font-bold text-emerald-400 block mb-1">
                    Key Clinical Markers Hit ({evaluation.keywordsFound.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.keywordsFound.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                        ✓ {kw}
                      </span>
                    ))}
                    {evaluation.keywordsFound.length === 0 && (
                      <span className="text-ink-muted text-[11px]">No key discriminators mentioned</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <span className="font-bold text-purple-300 block mb-1">
                    Gold Standard Clinical Protocol:
                  </span>
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    {activeCase.goldStandardAnswer}
                  </p>
                </div>
              </div>

              {/* Dr. Zainab's Clinical Bottom Line */}
              <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 text-xs text-ink flex items-start gap-2.5">
                <Sparkles size={16} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <strong className="text-accent block">Dr. Zainab&apos;s Clinical Bottom Line:</strong>
                  <span className="text-[11.5px] leading-relaxed text-ink-muted">
                    {activeCase.drZainabPearl}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNextCase}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-md"
                >
                  <span>Next Clinical Case</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
