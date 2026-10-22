export type ChatToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "code"; value: string };

export const QUICK_REACTIONS = ["👍", "😂", "😮", "😢", "❤️", "🔥"] as const;

// Notes ride in ordinary chat text, so a relay or a guest on an older build
// still shows "[12:34] great scene" and nothing breaks.
const TIMESTAMP_RX = /^\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]\s*/;

export function formatTimestamp(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function timestampTag(sec: number): string {
  return `[${formatTimestamp(sec)}] `;
}

export function parseTimestampNote(text: string): { sec: number; note: string } | null {
  const m = TIMESTAMP_RX.exec(text);
  if (!m) return null;
  const sec = Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  if (Number(m[3]) > 59) return null;
  return { sec, note: text.slice(m[0].length).trim() };
}

export function isReactionOnly(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= 8 && /^(\p{Extended_Pictographic}|‍|️)+$/u.test(t);
}

const MD_RX = /(\*\*[^*\n]+\*\*|`[^`\n]+`|(?<![*\w])\*(?=\S)[^*\n]*?(?<=\S)\*(?![*\w])|(?<![_\w])_(?=\S)[^_\n]*?(?<=\S)_(?![_\w]))/g;

/** Bold, italic and inline code only. No links, images or HTML: chat text stays inert. */
export function tokenizeChat(text: string): ChatToken[] {
  const out: ChatToken[] = [];
  let last = 0;
  for (const m of text.matchAll(MD_RX)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ kind: "text", value: text.slice(last, i) });
    const raw = m[0];
    if (raw.startsWith("**")) out.push({ kind: "bold", value: raw.slice(2, -2) });
    else if (raw.startsWith("`")) out.push({ kind: "code", value: raw.slice(1, -1) });
    else out.push({ kind: "italic", value: raw.slice(1, -1) });
    last = i + raw.length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}
