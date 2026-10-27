import { useEffect, useState } from "react";
import { useProfiles } from "@/lib/profiles";
import { useSearch } from "@/lib/search-context";
import { useT } from "@/lib/i18n";
import { loadSavedSearches, removeSavedSearch, saveSearch } from "@/lib/saved-searches";

export function SavedSearches() {
  const { activeProfile } = useProfiles();
  const profileId = activeProfile?.id ?? "default";
  const { query, setQuery } = useSearch();
  const t = useT();
  const [snapshot, setSnapshot] = useState(() => ({ profileId, queries: loadSavedSearches(profileId) }));
  const [error, setError] = useState(false);
  useEffect(() => {
    setSnapshot({ profileId, queries: loadSavedSearches(profileId) });
    setError(false);
  }, [profileId]);
  const queries = snapshot.profileId === profileId ? snapshot.queries : [];
  const trimmed = query.trim().replace(/\s+/g, " ");
  const saved = queries.some((item) => item.toLowerCase() === trimmed.toLowerCase());
  if (trimmed) return (
    <div className="flex items-center gap-3 text-sm text-ink-muted">
      <button type="button" className="rounded-lg border border-edge-soft px-3 py-1.5 hover:bg-elevated" disabled={saved || trimmed.length > 200} onClick={() => {
        const next = saveSearch(profileId, trimmed);
        setSnapshot({ profileId, queries: next });
        setError(!next.some((item) => item.toLowerCase() === trimmed.toLowerCase()));
      }}>{saved ? t("Search saved") : t("Save search")}</button>
      {error && <span role="alert">{t("Could not save this search. Please try again.")}</span>}
    </div>
  );
  if (!queries.length) return null;
  return (
    <section aria-label={t("Saved searches")} className="mb-5 flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink-muted">{t("Saved searches")}</h3>
      <div className="flex flex-wrap gap-2">{queries.map((item) => (
        <div key={item} className="flex max-w-full rounded-lg border border-edge-soft text-sm text-ink-muted">
          <button type="button" className="truncate px-3 py-2 hover:bg-elevated" onClick={() => setQuery(item)}>{item}</button>
          <button type="button" className="px-2 hover:bg-elevated" aria-label={t("Remove saved search: {query}", { query: item })} onClick={() => setSnapshot({ profileId, queries: removeSavedSearch(profileId, item) })}>×</button>
        </div>
      ))}</div>
    </section>
  );
}
