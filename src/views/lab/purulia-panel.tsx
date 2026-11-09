import { useEffect, useRef, useState } from "react";
import {
  COMMUNITY_RESOURCES,
  PURULIA_REVISION,
  communityResourceUrl,
  loadCommunityFacts,
  type CommunityFacts,
} from "@/lib/community/purulia";
import { openExternalUrlStrict } from "@/lib/window";

const buttonClass =
  "rounded-lg border border-edge-soft px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-50";

export function PuruliaPanel({
  profileId,
  childProfile,
  active,
}: {
  profileId: string | null;
  childProfile: boolean;
  active: boolean;
}) {
  if (!profileId || childProfile !== false || active !== true) return null;
  return <CommunityContents key={profileId} />;
}

function CommunityContents() {
  const [facts, setFacts] = useState<CommunityFacts | null>(null);
  const [district, setDistrict] = useState("purulia");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  function clear() {
    pending.current?.abort();
    pending.current = null;
    setFacts(null);
    setDistrict("purulia");
    setLoading(false);
    setNotice("");
  }

  async function load() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setNotice("");
    try {
      const result = await loadCommunityFacts({ consent: true, signal: controller.signal });
      if (pending.current !== controller || controller.signal.aborted) return;
      setFacts(result);
      setDistrict(
        result.districts.some((item) => item.slug === "purulia")
          ? "purulia"
          : result.districts[0].slug,
      );
    } catch {
      if (pending.current === controller && !controller.signal.aborted) {
        setNotice("Public data could not be loaded. Check your connection and try again.");
      }
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

  const selected = facts?.districts.find((item) => item.slug === district);
  return (
    <section className="space-y-5" aria-label="Purulia community">
      <div className="rounded-2xl border border-edge-soft bg-surface/70 p-5">
        <h2 className="text-xl font-semibold">Community · Purulia / Parishkar</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Explore sourced district facts and take part in local problem-solving. Purulia is the
          first community implementation, with data for West Bengal districts.
        </p>
        <p id="community-network-note" className="mt-3 text-sm leading-6 text-ink-subtle">
          Loading contacts GitHub for one public dataset. GitHub receives your network address;
          Argus sends no account, media history, or location. Data stays in memory until you leave
          this tab. External tools open Parishkar in your browser under its own privacy policy.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClass}
            disabled={loading}
            aria-describedby="community-network-note"
            onClick={() => void load()}
          >
            {loading ? "Loading public data…" : "Load public district data from GitHub"}
          </button>
          <button type="button" className={buttonClass} onClick={clear}>
            Clear / cancel
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => void open("https://archiboltmusk.github.io/Purulia/privacy.html")}
          >
            Parishkar privacy policy ↗
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-subtle">
          Reviewed dataset revision: {PURULIA_REVISION.slice(0, 12)}. This is a dated snapshot, not
          live monitoring.
        </p>
        {notice && (
          <p className="mt-3 text-sm text-ink-muted" role="alert">
            {notice}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-edge-soft p-5" aria-busy={loading}>
        <h3 className="text-lg font-semibold">District facts</h3>
        {!facts && (
          <p className="mt-2 text-sm text-ink-subtle" role="status">
            No public dataset loaded. You can still open the community tools below.
          </p>
        )}
        {facts && selected && (
          <>
            <label className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              District
              <select
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                className="rounded-lg border border-edge-soft bg-canvas px-3 py-2"
              >
                {facts.districts.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 text-xs leading-5 text-ink-subtle">
              Dataset generated: {facts.generated ?? "date unknown"}. Each figure keeps its original
              period and source date. Missing figures remain unknown.
              {selected.surveyScope &&
                ` NFHS survey geography: ${selected.surveyScope}; district boundaries may differ.`}
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selected.metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-edge-soft p-4">
                  <dt className="text-sm text-ink-muted">{metric.label}</dt>
                  <dd className="mt-2 text-2xl font-semibold">
                    {metric.value === null
                      ? "Unknown"
                      : `${metric.value.toLocaleString("en-IN")}${metric.unit === "%" ? "%" : ""}`}
                  </dd>
                  <dd className="mt-2 text-xs text-ink-subtle">{metric.period}</dd>
                  <dd className="mt-2 text-xs leading-5 text-ink-subtle">
                    {metric.source ? (
                      <>
                        <button
                          type="button"
                          className="text-left underline"
                          onClick={() => void open(metric.source!.url)}
                        >
                          {metric.source.name} ↗
                        </button>
                        <span className="block">
                          Source read: {metric.source.read ?? "date unknown"}
                        </span>
                      </>
                    ) : (
                      "Source unavailable"
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-5 text-ink-subtle">
              Compiled by Parishkar / Purulia from the cited sources. These aggregate facts do not
              establish individual responsibility or misconduct.
            </p>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {COMMUNITY_RESOURCES.map((resource) => (
          <article key={resource.id} className="rounded-2xl border border-edge-soft p-5">
            <h3 className="font-semibold">{resource.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-subtle">{resource.description}</p>
            <button
              type="button"
              className={`${buttonClass} mt-4`}
              onClick={() => void open(communityResourceUrl(resource.id, district))}
            >
              Open {resource.title.toLowerCase()} on Parishkar ↗
            </button>
          </article>
        ))}
      </div>
      <p className="text-xs leading-5 text-ink-subtle">
        Reporting, verification, right of reply, and moderation remain on Parishkar. Argus does not
        collect reports or assign trust scores to people.
      </p>
    </section>
  );
}
