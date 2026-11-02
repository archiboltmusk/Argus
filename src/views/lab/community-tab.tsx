import { useEffect, useRef, useState } from "react";
import { openExternalUrlStrict } from "@/lib/window";
import {
  COMMUNITY_ADAPTERS,
  PURULIA_PILOT,
  manualCommunityPlace,
  placeLinks,
  searchCommunityPlaces,
  type CommunityPlace,
  type CommunityLink,
} from "@/lib/community/places";
import { PuruliaPanel } from "./purulia-panel";
import { CommunityDiscovery } from "./community-discovery";

const buttonClass =
  "rounded-lg border border-edge-soft px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-50";
const inputClass = "rounded-lg border border-edge-soft bg-canvas px-3 py-2 text-sm";

export function CommunityTab({
  profileId,
  childProfile,
  active,
}: {
  profileId: string | null;
  childProfile: boolean;
  active: boolean;
}) {
  if (!profileId || childProfile !== false || active !== true) return null;
  return <WorldCommunity key={profileId} profileId={profileId} />;
}

function WorldCommunity({ profileId }: { profileId: string }) {
  const [query, setQuery] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [manualCountry, setManualCountry] = useState("");
  const [results, setResults] = useState<CommunityPlace[]>([]);
  const [selected, setSelected] = useState<CommunityPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  function choose(place: CommunityPlace | null) {
    pending.current?.abort();
    pending.current = null;
    setLoading(false);
    setSelected(place);
    setResults([]);
    setNotice("");
  }
  async function search() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setResults([]);
    setNotice("");
    try {
      const places = await searchCommunityPlaces(query, countryCode, {
        consent: true,
        signal: controller.signal,
      });
      if (pending.current !== controller || controller.signal.aborted) return;
      setResults(places);
      if (!places.length)
        setNotice(
          "No matching places found. Try a country code, a local spelling, or use the manual option below.",
        );
    } catch {
      if (pending.current === controller && !controller.signal.aborted)
        setNotice(
          "Place search could not be completed. Check the name, country code, and connection, or use the manual option.",
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
  const adapters = selected ? COMMUNITY_ADAPTERS.filter((item) => item.supports(selected)) : [];
  const links: CommunityLink[] = selected
    ? [...placeLinks(selected), ...adapters.flatMap((item) => item.links)]
    : [];

  return (
    <section className="space-y-5" aria-label="Worldwide community">
      <div className="rounded-2xl border border-edge-soft bg-surface/70 p-5">
        <h2 className="text-xl font-semibold">Community, anywhere</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          From a village in Slovakia to New York City: choose a place, explore its public
          information, and plan a local improvement. Purulia is one community implementation.
        </p>
        <p id="place-search-privacy" className="mt-3 text-sm leading-6 text-ink-subtle">
          Search sends only the place name and optional country code to Open-Meteo, which receives
          your network address. No device location, account, or private draft is sent. Nothing is
          searched as you type.
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <label className="flex flex-col gap-2 text-sm">
            City, town, village, or area
            <input
              className={inputClass}
              value={query}
              maxLength={120}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. Banská Štiavnica, New York"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Country code (optional)
            <input
              className={`${inputClass} w-28`}
              value={countryCode}
              maxLength={2}
              onChange={(event) => setCountryCode(event.target.value)}
              placeholder="SK, US, IN"
            />
          </label>
          <button
            className={buttonClass}
            disabled={loading || query.trim().length < 2}
            aria-describedby="place-search-privacy"
          >
            {loading ? "Searching places…" : "Search worldwide"}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              choose(null);
              setQuery("");
              setCountryCode("");
              setManualCountry("");
            }}
          >
            Clear / cancel community
          </button>
        </form>
        <p className="mt-3 text-xs text-ink-subtle">
          Place search: Open-Meteo / GeoNames. Coverage varies; selecting a place does not establish
          your residence or jurisdiction.
        </p>
        {notice && (
          <p className="mt-3 text-sm" role="status">
            {notice}
          </p>
        )}
        <ul className="mt-3 space-y-2" aria-label="Place search results">
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className={`${buttonClass} text-left`}
                onClick={() => choose(place)}
              >
                {place.name} · {place.region ? `${place.region}, ` : ""}
                {place.country} ({place.countryCode})
              </button>
            </li>
          ))}
        </ul>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer">
            Use a place not listed, without online search
          </summary>
          <p className="mt-2 text-xs text-ink-subtle">
            Use the place name above and enter its country. Manual entries stay local and do not
            receive automatically matched authority links.
          </p>
          <label className="mt-3 flex flex-wrap items-center gap-3">
            Country name
            <input
              className={inputClass}
              value={manualCountry}
              maxLength={120}
              onChange={(event) => setManualCountry(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={`${buttonClass} mt-3`}
            onClick={() => {
              try {
                choose(manualCommunityPlace(query, manualCountry));
              } catch {
                setNotice("Enter both a place name and country name for the local workspace.");
              }
            }}
          >
            Use this place locally
          </button>
        </details>
        <button
          type="button"
          className={`${buttonClass} mt-4`}
          onClick={() => choose(PURULIA_PILOT)}
        >
          Explore the Purulia pilot
        </button>
      </div>

      {selected && (
        <>
          <div className="rounded-2xl border border-edge-soft p-5">
            <h3 className="text-lg font-semibold">
              {selected.name} · {selected.country}
            </h3>
            {selected.region && <p className="mt-1 text-sm text-ink-muted">{selected.region}</p>}
            {selected.source === "geonames" && (
              <p className="mt-3 text-sm text-ink-subtle">
                Population in GeoNames:{" "}
                {selected.population === null
                  ? "Unknown"
                  : selected.population.toLocaleString("en-IN")}
                . Observation date unavailable; this is not a current census claim.
              </p>
            )}
            <p className="mt-3 text-sm text-ink-subtle">
              {adapters.length
                ? `Connected resources: ${adapters.map((item) => item.label).join("; ")}.`
                : "Live public web discovery is available for this place. No direct reporting service is connected; use the sources below to find the responsible authority."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {links.map((link) => (
                <article key={link.url} className="rounded-xl border border-edge-soft p-4">
                  <h4 className="font-semibold">{link.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-ink-subtle">{link.description}</p>
                  <button
                    type="button"
                    className={`${buttonClass} mt-3`}
                    onClick={() => void open(link.url)}
                  >
                    Open {link.title} ↗
                  </button>
                </article>
              ))}
            </div>
          </div>
          <CommunityDiscovery
            key={`web:${selected.id}:${selected.name}:${selected.country}`}
            place={selected}
          />
          <CommunityPlan key={`${selected.id}:${selected.name}:${selected.country}`} />
          {adapters.some((item) => item.id === "purulia") && (
            <PuruliaPanel profileId={profileId} childProfile={false} active />
          )}
        </>
      )}
      <p className="text-xs leading-5 text-ink-subtle">
        Community choices, results, and private drafts are discarded when you leave this tab or
        switch profiles. External services open in your browser under their own privacy and
        reporting rules. Argus submits nothing on your behalf.
      </p>
    </section>
  );
}

function CommunityPlan() {
  const [draft, setDraft] = useState("");
  const [steps, setSteps] = useState<boolean[]>([false, false, false, false]);
  return (
    <section
      className="rounded-2xl border border-edge-soft p-5"
      aria-label="Private community plan"
    >
      <h3 className="text-lg font-semibold">Plan a local improvement</h3>
      <label className="mt-3 flex flex-col gap-2 text-sm">
        What would help this community?
        <textarea
          className={inputClass}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          rows={3}
        />
      </label>
      <p className="mt-2 text-xs text-ink-subtle">
        Private temporary draft. Discarded when you change places or leave this tab.
      </p>
      <ul className="mt-4 space-y-3 text-sm">
        {[
          "Identify the responsible organisation or official service",
          "Check its published process and available resources",
          "Gather relevant evidence with consent and protect personal details",
          "Follow up, record the response, and correct mistakes",
        ].map((step, index) => (
          <li key={step}>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={steps[index]}
                onChange={(event) =>
                  setSteps((current) =>
                    current.map((value, i) => (i === index ? event.target.checked : value)),
                  )
                }
              />
              {step}
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${buttonClass} mt-4`}
        onClick={() => {
          setDraft("");
          setSteps([false, false, false, false]);
        }}
      >
        Clear private draft
      </button>
    </section>
  );
}
