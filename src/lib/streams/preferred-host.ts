import { streamHost } from "./dead-links";

type Labelled = {
  url?: string | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
};

/** Mirrors argus-core: a host counts when the URL host matches or its leading name is in the row label. */
export function matchedPreferredHost(stream: Labelled, hosts: string[]): string | null {
  if (hosts.length === 0) return null;
  const urlHost = streamHost(stream.url)?.replace(/^www\./, "") ?? null;
  const label = `${stream.name ?? ""} ${stream.title ?? ""} ${stream.description ?? ""}`.toLowerCase();
  for (const h of hosts) {
    if (urlHost && (urlHost === h || urlHost.endsWith(`.${h}`))) return h;
    const token = h.replace(/^www\./, "").split(".")[0];
    if (token.length >= 4 && label.includes(token)) return h;
  }
  return null;
}
