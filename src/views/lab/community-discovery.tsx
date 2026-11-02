import { useEffect, useRef, useState } from "react";
import { openExternalUrlStrict } from "@/lib/window";
import type { CommunityPlace } from "@/lib/community/places";
import {
  DISCOVERY_TOPICS,
  discoverPublicInformation,
  discoveryBrowserUrl,
  type DiscoveryTopic,
  type PublicFinding,
} from "@/lib/community/web-discovery";

const buttonClass =
  "rounded-lg border border-edge-soft px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-50";

export function CommunityDiscovery({ place }: { place: CommunityPlace }) {
  const [topic, setTopic] = useState<DiscoveryTopic>("services");
  const [findings, setFindings] = useState<PublicFinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  function clear() {
    pending.current?.abort();
    pending.current = null;
    setLoading(false);
    setFindings([]);
    setNotice("");
  }
  async function search() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setFindings([]);
    setNotice("");
    try {
      const result = await discoverPublicInformation(place, topic, {
        consent: true,
        signal: controller.signal,
      });
      if (pending.current !== controller || controller.signal.aborted) return;
      setFindings(result);
      if (!result.length)
        setNotice("No usable source links were returned. You can search directly in your browser.");
    } catch {
      if (pending.current === controller && !controller.signal.aborted)
        setNotice(
          "Live discovery is unavailable or rate-limited. You can search directly in your browser.",
        );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setLoading(false);
      }
    }
  }
  async function open(url: string) {
    try {
      await openExternalUrlStrict(url);
    } catch {
      setNotice("The external page could not be opened. Please try again.");
    }
  }
  return (
    <section
      className="rounded-2xl border border-edge-soft p-5"
      aria-label="Live public internet discovery"
    >
      <h3 className="text-lg font-semibold">Explore the latest public information</h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Search the web for {place.name}. Every place can use this, including an unlisted village.
        Local integrations are optional shortcuts.
      </p>
      <p id="discovery-privacy" className="mt-3 text-xs leading-5 text-ink-subtle">
        Searching sends only the chosen place and topic to Jina Reader and DuckDuckGo; those
        services receive the request and network information. No private draft, account, or device
        location is included. Nothing runs in the background.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2 text-sm">
          Public topic
          <select
            className="rounded-lg border border-edge-soft bg-canvas px-3 py-2"
            value={topic}
            onChange={(event) => {
              clear();
              setTopic(event.target.value as DiscoveryTopic);
            }}
          >
            {DISCOVERY_TOPICS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={buttonClass}
          disabled={loading}
          aria-describedby="discovery-privacy"
          onClick={() => void search()}
        >
          {loading ? "Searching public sources…" : "Search live public sources"}
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => void open(discoveryBrowserUrl(place, topic))}
        >
          Search directly in browser ↗
        </button>
        <button type="button" className={buttonClass} onClick={clear}>
          Clear / cancel web results
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-ink-subtle">
        Requests favour recent results and fresh retrieval. Publication dates and accuracy still
        require checking the original source and corroborating the claim. A government-domain hint
        is not verification.
      </p>
      {notice && (
        <p className="mt-3 text-sm" role="status">
          {notice}
        </p>
      )}
      <ul className="mt-4 space-y-3" aria-busy={loading}>
        {findings.map((finding) => (
          <li key={finding.url} className="rounded-xl border border-edge-soft p-4">
            <h4 className="font-semibold">{finding.title}</h4>
            <p className="mt-2 text-xs text-ink-subtle">
              {finding.hostname}
              {finding.governmentDomainHint ? " · Government-domain hint" : ""}
            </p>
            <p className="mt-2 text-xs text-ink-subtle">
              Unverified · Publication date unknown · Retrieved{" "}
              {new Date(finding.retrievedAt).toLocaleString()}
            </p>
            <button
              type="button"
              className={`${buttonClass} mt-3`}
              onClick={() => void open(finding.url)}
            >
              Open original source ↗
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
