import { Bookmark } from "lucide-react";
import { isReactionOnly, parseTimestampNote, tokenizeChat, formatTimestamp } from "@/lib/together/chat-extras";

export function ChatBody({
  text,
  extras,
  onSeekTo,
}: {
  text: string;
  extras: boolean;
  onSeekTo?: (sec: number) => void;
}) {
  if (!extras) return <>{text}</>;
  if (isReactionOnly(text)) return <span className="text-[26px] leading-none">{text.trim()}</span>;
  const note = parseTimestampNote(text);
  return (
    <>
      {note && (
        <button
          type="button"
          onClick={() => onSeekTo?.(note.sec)}
          className="pointer-events-auto me-1.5 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-white transition-colors hover:bg-white/25"
        >
          <Bookmark size={11} strokeWidth={2.4} />
          {formatTimestamp(note.sec)}
        </button>
      )}
      {tokenizeChat(note ? note.note : text).map((tok, i) =>
        tok.kind === "bold" ? (
          <strong key={i}>{tok.value}</strong>
        ) : tok.kind === "italic" ? (
          <em key={i}>{tok.value}</em>
        ) : tok.kind === "code" ? (
          <code key={i} className="rounded bg-white/15 px-1 font-mono text-[12.5px]">
            {tok.value}
          </code>
        ) : (
          <span key={i}>{tok.value}</span>
        ),
      )}
    </>
  );
}
