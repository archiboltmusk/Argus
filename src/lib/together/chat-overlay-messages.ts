import type { ChatMessage } from "./provider-types";

export const OVERLAY_RECENT_WINDOW_MS = 7000;
export const OVERLAY_RECENT_LIMIT = 6;
export const OVERLAY_HISTORY_LIMIT = 50;
const GROUP_GAP_MS = 90_000;

export type OverlayChatEntry = { message: ChatMessage; isContinuation: boolean };

// The player overlay normally shows only messages that just arrived. With the
// history open it shows the recent backlog so earlier messages can be reread.
export function overlayMessages(
  messages: ChatMessage[],
  now: number,
  historyOpen: boolean,
): ChatMessage[] {
  if (historyOpen) return messages.slice(-OVERLAY_HISTORY_LIMIT);
  return messages.filter((m) => now - m.at < OVERLAY_RECENT_WINDOW_MS).slice(-OVERLAY_RECENT_LIMIT);
}

export function groupOverlayMessages(messages: ChatMessage[]): OverlayChatEntry[] {
  return messages.map((message, i) => {
    const prev = messages[i - 1];
    const isContinuation =
      !!prev && prev.from === message.from && message.at - prev.at < GROUP_GAP_MS;
    return { message, isContinuation };
  });
}
