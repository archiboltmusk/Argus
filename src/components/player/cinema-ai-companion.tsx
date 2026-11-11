import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Sparkles,
  X,
  Send,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  HelpCircle,
  Film,
} from "lucide-react";
import type { Meta } from "@/lib/cinemeta";
import type { PlayerBridge, PlayerSnapshot } from "@/lib/player/bridge";
import {
  checkOllamaAvailability,
  queryOllamaCinemaCompanion,
} from "@/lib/ai/ollama-client";
import { useT } from "@/lib/i18n";

export interface CompanionMessage {
  id: string;
  role: "user" | "companion";
  text: string;
  timestampSec: number;
  model?: string;
}

function formatTimestamp(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function CinemaAiCompanion({
  meta,
  visible,
  snap,
  bridgeRef: _bridgeRef,
}: {
  meta: Meta;
  visible: boolean;
  snap: PlayerSnapshot;
  bridgeRef?: RefObject<PlayerBridge | null>;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [ollamaReady, setOllamaReady] = useState<boolean | null>(null);
  const [activeModel, setActiveModel] = useState<string>("none");
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check Ollama daemon status
  const checkStatus = async () => {
    try {
      const { available, models } = await checkOllamaAvailability();
      setOllamaReady(available && models.length > 0);
      setActiveModel(models[0] || "none");
    } catch {
      setOllamaReady(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Global Shift + A hotkey toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      checkStatus();
    }
  }, [open]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const askQuestion = async (userPrompt: string) => {
    const q = userPrompt.trim();
    if (!q || loading) return;

    const currentSec = snap.positionSec || 0;
    const userMsg: CompanionMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: q,
      timestampSec: currentSec,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await queryOllamaCinemaCompanion({
        question: q,
        filmTitle: meta.name || "Current Scene",
        currentTimestampSec: currentSec,
        preferredModel: activeModel !== "none" ? activeModel : undefined,
      });

      const companionMsg: CompanionMessage = {
        id: `ai-${Date.now()}`,
        role: "companion",
        text: result.response,
        timestampSec: currentSec,
        model: result.isLocal ? result.model : undefined,
      };

      setMessages((prev) => [...prev, companionMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "companion",
          text: t("Sorry, couldn't connect to local AI companion. Please ensure Ollama is running."),
          timestampSec: currentSec,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyOllamaCmd = () => {
    navigator.clipboard?.writeText("ollama run llama3.2");
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const quickPrompts = [
    t("Explain this scene without spoilers"),
    t("Who is currently on screen?"),
    t("Recap what happened so far"),
    t("Explain the narrative lore"),
  ];

  return (
    <>
      {/* Trigger Button in Player Overlay */}
      {visible && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("Ask Scene AI (Shift + A)")}
          title={t("Ask Scene AI (Shift + A)")}
          className="absolute left-[92px] top-20 z-20 flex items-center gap-1.5 py-1 px-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-[12.5px] font-semibold text-white/80 hover:text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] backdrop-blur-md transition-all duration-200"
        >
          <Sparkles className="h-[14px] w-[14px] text-amber-400 animate-pulse" />
          <span>{t("Scene AI")}</span>
          <span className="text-[10px] text-white/50 bg-white/10 px-1 rounded uppercase tracking-wider">
            ⇧A
          </span>
        </button>
      )}

      {/* Floating Side Companion Drawer */}
      {open && (
        <aside
          role="dialog"
          aria-label={t("Cinema AI Companion")}
          className="pointer-events-auto fixed top-16 right-6 bottom-24 w-[400px] max-w-[calc(100vw-3rem)] z-50 flex flex-col rounded-2xl bg-zinc-950/90 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.8)] text-white overflow-hidden animate-[argus-fade-in_200ms_ease-out]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    {t("Cinema Companion")}
                  </h3>
                  {ollamaReady ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                      <Cpu size={10} />
                      {activeModel.replace(/:latest$/, "")}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-400/80 bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                      {t("Ollama Offline")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <ShieldCheck size={11} className="text-amber-400/90" />
                  <span>
                    {t("Anti-spoiler guarded at")} {formatTimestamp(snap.positionSec)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={checkStatus}
                title={t("Refresh AI status")}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RefreshCw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title={t("Close (Esc)")}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Film / Scene Context Chip */}
          <div className="px-4 py-2 bg-white/[0.04] border-b border-white/5 flex items-center justify-between text-xs text-zinc-300">
            <span className="flex items-center gap-1.5 font-medium truncate max-w-[280px]">
              <Film size={12} className="text-zinc-400 shrink-0" />
              <span className="truncate">{meta.name}</span>
            </span>
            <span className="tabular-nums font-mono text-zinc-400 text-[11px]">
              {formatTimestamp(snap.positionSec)} / {formatTimestamp(snap.durationSec)}
            </span>
          </div>

          {/* Conversation & Prompts Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-2 py-6">
                <div className="h-12 w-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mb-3">
                  <Sparkles size={24} />
                </div>
                <h4 className="text-sm font-medium text-white mb-1">
                  {t("Ask about this exact moment")}
                </h4>
                <p className="text-xs text-zinc-400 max-w-[280px] mb-4">
                  {t(
                    "Argus Cinema Companion uses local on-device AI to explain lore, characters, and plot without spoiling what lies ahead.",
                  )}
                </p>

                {/* Quick Prompts */}
                <div className="grid grid-cols-1 gap-2 w-full max-w-[320px]">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => askQuestion(prompt)}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all duration-150 flex items-center justify-between group"
                    >
                      <span className="truncate">{prompt}</span>
                      <Send
                        size={11}
                        className="opacity-0 group-hover:opacity-100 text-amber-400 shrink-0 transition-opacity"
                      />
                    </button>
                  ))}
                </div>

                {!ollamaReady && (
                  <div className="mt-5 p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-left w-full max-w-[320px]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-1">
                      <HelpCircle size={13} />
                      {t("Connect Local Ollama")}
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-2">
                      {t("Run this in your terminal for 100% free, private AI:")}
                    </p>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/60 font-mono text-[11px] text-amber-200">
                      <code>ollama run llama3.2</code>
                      <button
                        type="button"
                        onClick={copyOllamaCmd}
                        className="p-1 hover:text-white transition-colors"
                        title={t("Copy command")}
                      >
                        {copiedCmd ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mb-1 px-1">
                    <span>
                      {m.role === "user" ? t("You") : t("Cinema AI")}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums font-mono">
                      {formatTimestamp(m.timestampSec)}
                    </span>
                    {m.model && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-400/80 font-mono">
                          {m.model}
                        </span>
                      </>
                    )}
                  </div>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-amber-600 text-white rounded-tr-xs"
                        : "bg-white/10 text-zinc-100 border border-white/10 rounded-tl-xs"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-amber-300 animate-pulse px-2 py-1">
                <Sparkles size={14} className="animate-spin" />
                <span>{t("Analyzing scene context safely...")}</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-white/10 bg-white/[0.02]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                askQuestion(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("Ask anything about this scene...")}
                disabled={loading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                title={t("Send question")}
                className="h-8 w-8 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-zinc-600 text-black flex items-center justify-center transition-colors shrink-0 font-semibold"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
