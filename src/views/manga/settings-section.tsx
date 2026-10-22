import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { fetchManifest } from "@/lib/manga/client";
import { normalizeBaseUrl } from "@/lib/manga/protocol";
import { addSource, removeSource, updateSource, useMangaSources } from "@/lib/manga/store";
import { useProfiles } from "@/lib/profiles";
import { useSettings } from "@/lib/settings";
import { Section, ToggleRow } from "@/views/settings/shared";

const FIELD =
  "h-10 w-full rounded-xl bg-canvas/60 px-3 text-[13px] text-ink ring-1 ring-edge-soft outline-none focus:ring-accent";

export function MangaSettings() {
  const t = useT();
  const { settings, update } = useSettings();
  const { activeProfile, updateProfile } = useProfiles();
  const sources = useMangaSources();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = !settings.hideContent.manga;

  const setEnabled = (on: boolean) => {
    const next = { ...settings.hideContent, manga: !on };
    update({ hideContent: next });
    if (activeProfile) updateProfile(activeProfile.id, { hideContent: next });
  };

  const add = async () => {
    const base = normalizeBaseUrl(url);
    if (!base) return setError(t("Enter a full http(s) address."));
    setBusy(true);
    setError(null);
    try {
      const { name } = await fetchManifest(base);
      addSource({ name, baseUrl: base });
      setUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title={t("Manga reader")}
      subtitle={t(
        "Read manga and comics from sources you add yourself, or from CBZ files on your computer. Argus ships with no sources.",
      )}
    >
      <ToggleRow
        label={t("Show the Manga tab")}
        sub={t("Adds a Manga tab with your library, a paged and webtoon reader, and reading progress.")}
        value={enabled}
        onChange={setEnabled}
      />
      {enabled && (
        <div className="flex flex-col gap-3">
          {sources.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-elevated/40 px-4 py-3 ring-1 ring-edge-soft/60"
            >
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-ink">{s.name}</div>
                <div className="truncate text-[11.5px] text-ink-subtle">{new URL(s.baseUrl).host}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.enabled}
                  onClick={() => updateSource(s.id, { enabled: !s.enabled })}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                    s.enabled ? "bg-accent/15 text-accent" : "bg-canvas/70 text-ink-subtle"
                  }`}
                >
                  {s.enabled ? t("On") : t("Off")}
                </button>
                <button
                  type="button"
                  aria-label={t("Remove")}
                  onClick={() => removeSource(s.id)}
                  className="text-ink-subtle transition-colors hover:text-ink"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-source.example"
              className={FIELD}
              aria-label={t("Source address")}
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={busy || !url.trim()}
                className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? t("Checking…") : t("Add source")}
              </button>
              {error && <span className="text-[12.5px] text-red-400">{error}</span>}
            </div>
            <p className="text-[12px] text-ink-subtle">
              {t(
                "A source is any server that answers /manifest.json, /search, /series/{id} and /chapter/{id} with JSON. Only add sources you trust and are allowed to use.",
              )}
            </p>
          </form>
        </div>
      )}
    </Section>
  );
}
