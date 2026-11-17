import { useState, useEffect, useRef } from "react";
import {
  X,
  Users,
  Zap,
  Play,
} from "lucide-react";
import {
  BTRLocalWarRoomMesh,
  type ClashSession,
  type ClashPlayerState,
} from "@/lib/education/btr-p2p-mesh";
import type { ClinicalQuestion } from "@/lib/education/qbank-types";
import { TOP_100_FRONTIER_VAULT } from "@/lib/education/btr-frontier-vault";

export interface BTRWarRoomClashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartQBankDrill?: (title: string, questions: ClinicalQuestion[]) => void;
}

export function BTRWarRoomClashModal({
  isOpen,
  onClose,
  onStartQBankDrill,
}: BTRWarRoomClashModalProps) {
  const [playerName, setPlayerName] = useState("Dr. Anupam Mahato");
  const [session, setSession] = useState<ClashSession | null>(null);
  const [meshInstance, setMeshInstance] = useState<BTRLocalWarRoomMesh | null>(null);
  const [sparringMode, setSparringMode] = useState<boolean>(true);
  const [botScore, setBotScore] = useState<{ score: number; questionsAnswered: number }>({
    score: 0,
    questionsAnswered: 0,
  });

  const botIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (meshInstance) {
        meshInstance.destroy();
        setMeshInstance(null);
      }
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
      return;
    }

    const mesh = new BTRLocalWarRoomMesh(playerName);
    mesh.subscribe((updatedSession) => {
      setSession({ ...updatedSession });
    });
    setMeshInstance(mesh);

    return () => {
      mesh.destroy();
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, [isOpen, playerName]);

  const handleCreateLobby = () => {
    if (!meshInstance) return;

    // Build curated 10-question tie-breaker clash deck
    const questions: ClinicalQuestion[] = TOP_100_FRONTIER_VAULT.slice(0, 10).map((f) => ({
      id: `clash-${f.id}`,
      subject: f.category,
      topic: f.title,
      vignette: `${f.clinicalContext}\n\nWhat is the absolute gold standard or pathognomonic finding?`,
      options: [
        f.mustKnowPill,
        `Trap: ${f.examinerTrap}`,
        "Non-specific incidental finding",
        "Contraindicated in all age groups",
      ],
      correctIndex: 0,
      examinerTrap: f.examinerTrap,
      highYieldTags: f.tags,
      explanation: {
        bottomLine: f.mustKnowPill,
        correctRationale: f.clinicalContext,
        distractorBreakdown: [
          { option: "B", reason: `Examiner trap: ${f.examinerTrap}` },
          { option: "C", reason: "Incorrect" },
          { option: "D", reason: "Incorrect" },
        ],
        whyCorrect: {
          mechanism: f.clinicalContext,
          clinicalRule: f.mustKnowPill,
        },
      },
    }));

    const newSession = meshInstance.createSession(questions);
    setSession(newSession);

    // If bot sparring is active, simulate AI opponent pacing
    if (sparringMode) {
      setBotScore({ score: 0, questionsAnswered: 0 });
      let currentQ = 0;
      botIntervalRef.current = setInterval(() => {
        currentQ++;
        if (currentQ <= 10) {
          const isRight = Math.random() > 0.15; // 85% AIR-50 accuracy
          setBotScore((prev) => ({
            questionsAnswered: currentQ,
            score: prev.score + (isRight ? 4 : -1),
          }));
        } else {
          clearInterval(botIntervalRef.current);
        }
      }, 12000); // answers roughly every 12-15 seconds
    }
  };

  const handleLaunchDuelDrill = () => {
    if (!session) return;
    onClose();

    const questions: ClinicalQuestion[] = TOP_100_FRONTIER_VAULT.slice(0, 10).map((f) => ({
      id: `clash-${f.id}`,
      subject: f.category,
      topic: f.title,
      vignette: `${f.clinicalContext}\n\nWhat is the absolute gold standard or pathognomonic finding?`,
      options: [
        f.mustKnowPill,
        `Trap: ${f.examinerTrap}`,
        "Non-specific incidental finding",
        "Contraindicated in all age groups",
      ],
      correctIndex: 0,
      examinerTrap: f.examinerTrap,
      highYieldTags: f.tags,
      explanation: {
        bottomLine: f.mustKnowPill,
        correctRationale: f.clinicalContext,
        distractorBreakdown: [
          { option: "B", reason: `Examiner trap: ${f.examinerTrap}` },
          { option: "C", reason: "Incorrect" },
          { option: "D", reason: "Incorrect" },
        ],
        whyCorrect: {
          mechanism: f.clinicalContext,
          clinicalRule: f.mustKnowPill,
        },
      },
    }));

    onStartQBankDrill?.("Head-to-Head War Room Duel (10 Qs)", questions);
  };

  if (!isOpen) return null;

  const players: ClashPlayerState[] = session ? Object.values(session.players) : [];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl flex flex-col rounded-3xl border border-edge bg-surface shadow-2xl overflow-hidden text-ink">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-elevated/70">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Zap size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-ink">Local War Room Head-to-Head Mesh</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono border border-rose-500/30">
                  Zero-Cloud LAN / P2P
                </span>
              </div>
              <span className="text-[11px] text-ink-muted">
                Zero-latency real-time split-second duel engine for mock grand tests
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-elevated border border-edge text-ink-muted hover:text-ink transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[75vh]">
          {/* Peer Presence Banner */}
          <div className="p-4 rounded-2xl bg-canvas border border-edge flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div>
                <span className="text-xs font-bold text-ink block">
                  Broadcast Channel: <code className="text-accent font-mono text-[11px]">argus_corebtr_clash_mesh</code>
                </span>
                <span className="text-[11px] text-ink-muted">
                  Auto-discovers other Argus apps running on this Mac or local network
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSparringMode(!sparringMode)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                  sparringMode
                    ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                    : "bg-elevated border-edge text-ink-muted"
                }`}
              >
                Sparring Bot: {sparringMode ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* Lobby Setup / Current Match */}
          {!session ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-elevated/40 border border-edge-soft text-center gap-4">
              <Users size={32} className="text-ink-muted" />
              <div>
                <h4 className="text-sm font-bold text-ink">Ready to Start a 10-Q Rapid Duel?</h4>
                <p className="text-xs text-ink-muted max-w-sm mt-1">
                  Challenge a friend on the same local Wi-Fi or spar with the AI Clinical Attending bot with instant live score updates.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your candidate name..."
                  className="w-full px-3 py-1.5 rounded-xl bg-canvas border border-edge text-xs font-semibold text-ink focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateLobby}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                <Zap size={14} />
                <span>Initialize Match Lobby</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">
                  Lobby Players ({players.length + (sparringMode ? 1 : 0)} Active):
                </span>
                <span className="text-[10px] font-mono text-ink-muted">
                  Session: {session.sessionId}
                </span>
              </div>

              {/* Connected Players Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {players.map((p) => (
                  <div
                    key={p.playerId}
                    className="p-3.5 rounded-2xl bg-canvas border border-edge flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/40 text-accent font-bold text-xs flex items-center justify-center">
                        AM
                      </div>
                      <div>
                        <span className="text-xs font-bold text-ink block">{p.displayName}</span>
                        <span className="text-[10px] text-ink-muted font-mono">You (Host)</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-400 font-mono block">
                        {p.score > 0 ? `+${p.score}` : p.score} pts
                      </span>
                      <span className="text-[10px] text-ink-muted">Q {p.currentQuestionIndex}/10</span>
                    </div>
                  </div>
                ))}

                {/* Simulated AI Sparring Bot */}
                {sparringMode && (
                  <div className="p-3.5 rounded-2xl bg-canvas border border-purple-500/30 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center">
                        AI
                      </div>
                      <div>
                        <span className="text-xs font-bold text-ink block">AI Sparring Partner</span>
                        <span className="text-[10px] text-purple-300 font-mono">AIR 45 Benchmark</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-purple-400 font-mono block">
                        {botScore.score > 0 ? `+${botScore.score}` : botScore.score} pts
                      </span>
                      <span className="text-[10px] text-ink-muted">Q {botScore.questionsAnswered}/10</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Start Duel Button */}
              <div className="pt-4 border-t border-edge flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSession(null)}
                  className="px-4 py-2 rounded-xl bg-elevated border border-edge text-xs font-semibold text-ink-muted hover:text-ink transition"
                >
                  Leave Lobby
                </button>

                <button
                  type="button"
                  onClick={handleLaunchDuelDrill}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                >
                  <Play size={14} className="fill-current" />
                  <span>Launch 10-Q Rapid Duel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
