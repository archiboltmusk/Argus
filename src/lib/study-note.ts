export function formatTimestamp(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

/** A Markdown line for study notes: `[00:14:23 - Title](link)`, or plain text when there is no link. */
export function timestampNote(title: string, positionSec: number, link?: string): string {
  const label = `${formatTimestamp(positionSec)} - ${title.replace(/[\[\]]/g, "")}`;
  return link ? `[${label}](${link})` : label;
}
