export type RemoteDownloadInstruction = {
  sourceUrl: string;
  kind: "magnet" | "direct" | "torrent";
  destinationFolder?: string;
  scheduleForMidnightWindow: boolean;
  receivedFrom: string;
  receivedAt: number;
};

/**
 * Parses remote Telegram or webhook messages into clean download instructions.
 * E.g., "/download magnet:?xt=urn:btih:..." or plain URLs.
 */
export function parseRemoteDownloadCommand(
  text: string,
  sender: string = "Telegram Bot",
): RemoteDownloadInstruction | null {
  const clean = text.trim();
  const match = clean.match(/(?:^|\s)(\/download\s+|dl\s+)?(magnet:\?[^\s]+|https?:\/\/[^\s]+)/i);
  if (!match) return null;

  const url = match[2];
  const isMagnet = url.startsWith("magnet:");

  return {
    sourceUrl: url,
    kind: isMagnet ? "magnet" : "direct",
    scheduleForMidnightWindow: true,
    receivedFrom: sender,
    receivedAt: Date.now(),
  };
}
