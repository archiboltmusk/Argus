import { Bookmark, History, MessageCircle, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { nameColor } from "@/lib/together/colors";
import { groupOverlayMessages, overlayMessages } from "@/lib/together/chat-overlay-messages";
import type { PanelCorner } from "@/lib/player-chrome";
import type { ChatMessage } from "@/lib/together/provider";
import type { Participant } from "@/lib/together/protocol";
import { useSelfIdentity } from "@/lib/together/use-self-identity";
import { useT } from "@/lib/i18n";
import { QUICK_REACTIONS, timestampTag } from "@/lib/together/chat-extras";
import { getPlaybackPosition } from "@/lib/player/playback-clock";
import { ChatBody } from "./chat-body";
import { FloatingReactions } from "./floating-reactions";

const COMPOSE_TIMEOUT_MS = 4500;

const CORNER_POSITION: Record<PanelCorner, string> = {
  "top-left": "top-20 left-6 items-start",
  "top-right": "top-20 right-6 items-end",
  "bottom-left": "bottom-44 left-6 items-start",
  "bottom-right": "bottom-44 right-6 items-end",
};

export function ChatOverlay({
  messages,
  onSend,
  selfId,
  participants,
  forceVisible,
  corner = "bottom-left",
  hidden = false,
  extras = false,
  onSeekTo,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  selfId: string;
  participants: Participant[];
  forceVisible: boolean;
  corner?: PanelCorner;
  hidden?: boolean;
  extras?: boolean;
  onSeekTo?: (sec: number) => void;
}) {
  const t = useT();
  const selfIdentity = useSelfIdentity();
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tickNow, setTickNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const composeTimer = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setTickNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key ?? "").toLowerCase() === "t" && !composing && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setComposing(true);
        setTimeout(() => inputRef.current?.focus(), 30);
      }
      if (e.key === "Escape") {
        if (composing) {
          setComposing(false);
          setDraft("");
        } else if (historyOpen) {
          setHistoryOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [composing, historyOpen]);

  useEffect(() => {
    if (!historyOpen || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [historyOpen, messages.length]);

  useEffect(() => {
    if (!composing) return;
    if (composeTimer.current) window.clearTimeout(composeTimer.current);
    composeTimer.current = window.setTimeout(() => {
      if (!draft.trim()) {
        setComposing(false);
        setDraft("");
      }
    }, COMPOSE_TIMEOUT_MS);
    return () => {
      if (composeTimer.current) window.clearTimeout(composeTimer.current);
    };
  }, [composing, draft]);

  const visible = useMemo(
    () => overlayMessages(messages, tickNow, historyOpen),
    [messages, tickNow, historyOpen],
  );
  const grouped = useMemo(() => groupOverlayMessages(visible), [visible]);
  const showStream = visible.length > 0 || forceVisible || composing || historyOpen;
  const align = corner.endsWith("right") ? "items-end" : "items-start";

  const submit = () => {
    const txt = draft.trim();
    if (!txt) return;
    onSend(txt);
    setDraft("");
    setComposing(false);
  };

  if (hidden) return null;
  return (
    <>
      <FloatingReactions messages={messages} />
      <div
        className={`pointer-events-none fixed ${CORNER_POSITION[corner]} z-30 flex max-w-[420px] flex-col transition-opacity duration-500 ${
          showStream ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          ref={listRef}
          className={`flex max-w-full flex-col ${align} ${
            historyOpen
              ? "pointer-events-auto max-h-[45vh] overflow-y-scroll overscroll-contain pe-1"
              : ""
          }`}
        >
          {grouped.map(({ message, isContinuation }) => {
            const isSelf = message.from === selfId;
            const ident = isSelf ? selfIdentity : participants.find((p) => p.id === message.from);
            return (
              <Bubble
                key={`${message.from}-${message.at}`}
                message={message}
                isSelf={isSelf}
                isContinuation={isContinuation}
                avatar={ident?.avatar ?? null}
                color={ident?.color ?? null}
                extras={extras}
                onSeekTo={onSeekTo}
              />
            );
          })}
        </div>
        {composing && extras && (
        <div className="pointer-events-auto mt-2 flex gap-1.5">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSend(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-black/55 text-[16px] backdrop-blur-md transition-transform hover:scale-110"
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {composing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="pointer-events-auto mt-3 flex items-center gap-2 rounded-full border border-white/15 bg-black/65 px-3.5 py-2 backdrop-blur-xl shadow-[0_18px_45px_-20px_rgba(0,0,0,0.7)]"
        >
          <MessageCircle size={14} strokeWidth={2.2} className="text-white/55" />
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("Say something…")}
            className="flex-1 bg-transparent text-[13.5px] text-white placeholder:text-white/35 outline-none"
            maxLength={300}
          />
          {extras && (
            <button
              type="button"
              onClick={() => {
                setDraft((d) => (/^\[/.test(d) ? d : timestampTag(getPlaybackPosition()) + d));
                inputRef.current?.focus();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/85 transition-colors hover:bg-white/20"
              aria-label={t("Mark this moment")}
              title={t("Mark this moment for everyone")}
            >
              <Bookmark size={12} strokeWidth={2.4} />
            </button>
          )}
          <button
            type="submit"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/85 transition-colors hover:bg-white/20"
            aria-label={t("Send")}
          >
            <Send size={12} strokeWidth={2.4} />
          </button>
        </form>
      ) : (
        <div className="pointer-events-auto mt-3 flex items-center gap-1.5">
          <button
            onClick={() => {
              setComposing(true);
              setTimeout(() => inputRef.current?.focus(), 30);
            }}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/12 bg-black/45 px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-white/65 backdrop-blur-md transition-colors hover:bg-black/65 hover:text-white"
          >
            <MessageCircle size={11} strokeWidth={2.4} />
            {t("Press T")}
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => setHistoryOpen((open) => !open)}
              aria-pressed={historyOpen}
              aria-label={t("History")}
              title={t("History")}
              className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border border-white/12 backdrop-blur-md transition-colors hover:bg-black/65 hover:text-white ${
                historyOpen ? "bg-white/20 text-white" : "bg-black/45 text-white/65"
              }`}
            >
              <History size={12} strokeWidth={2.4} />
            </button>
          )}
        </div>
      )}
    </div>
    </>
  );
}

function Bubble({
  message,
  isSelf,
  isContinuation,
  avatar,
  color,
  extras,
  onSeekTo,
}: {
  message: ChatMessage;
  isSelf: boolean;
  isContinuation: boolean;
  avatar: string | null;
  color: string | null;
  extras: boolean;
  onSeekTo?: (sec: number) => void;
}) {
  const tint = color ?? nameColor(message.name);
  if (isContinuation) {
    return (
      <div
        className={`pointer-events-auto flex max-w-full ${isSelf ? "self-end" : ""}`}
        style={{ marginTop: 2, paddingInlineStart: isSelf ? 0 : 32 }}
      >
        <span className="break-words rounded-2xl border border-white/10 bg-black/55 px-3 py-1.5 text-[13.5px] leading-snug text-white backdrop-blur-xl">
          <ChatBody text={message.text} extras={extras} onSeekTo={onSeekTo} />
        </span>
      </div>
    );
  }
  return (
    <div
      className={`pointer-events-auto mt-1.5 flex max-w-full items-start gap-2 rounded-2xl border border-white/10 bg-black/55 px-3 py-1.5 backdrop-blur-xl ${
        isSelf ? "self-end" : ""
      }`}
    >
      {avatar ? (
        <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15">
          <img src={avatar} alt="" draggable={false} className="h-full w-full object-cover" />
        </span>
      ) : (
        <span
          className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-black"
          style={{ background: tint }}
        >
          {(message.name?.[0] ?? "?").toUpperCase()}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/55">
          {message.name}
        </span>
        <span className="break-words text-[13.5px] leading-snug text-white">
          <ChatBody text={message.text} extras={extras} onSeekTo={onSeekTo} />
        </span>
      </div>
    </div>
  );
}
