import { Check, Loader2, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { fetchOpdsFeed, OPDS_SUGGESTIONS, validateOpdsUrl } from "@/lib/ebook/opds";
import { addEBookOpds } from "@/lib/ebook/sources";
import { useT } from "@/lib/i18n";

const CARD = "ebook-source-card";
const INPUT = "ebook-source-input";

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function OpdsCatalogCard() {
  const t = useT();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const add = async (rawUrl: string, label: string) => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const checked = validateOpdsUrl(rawUrl);
      const auth = {
        username: username.trim() || undefined,
        password: password || undefined,
        apiKey: apiKey.trim() || undefined,
      };
      const feed = await fetchOpdsFeed({ url: checked, auth }, checked);
      if (!addEBookOpds(label || feed.title, checked, auth)) {
        throw new Error("Could not save the catalog.");
      }
      setDone(feed.title || checked);
      setUrl("");
      setName("");
      setUsername("");
      setPassword("");
      setApiKey("");
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className={`${CARD} flex flex-col gap-3 px-4 py-4`}>
        <span className="text-[16px] font-semibold text-ink">{t("OPDS catalog")}</span>
        <span className="text-[13px] text-ink-muted">
          {t("Add the address of an OPDS feed, such as Calibre-Web, Kavita or Audiobookshelf.")}
        </span>
        <input
          className={INPUT}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/opds"
          aria-label={t("Catalog URL")}
          spellCheck={false}
          autoCapitalize="off"
        />
        <input
          className={INPUT}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("Name (optional)")}
          aria-label={t("Name (optional)")}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={INPUT}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={t("Username (optional)")}
            aria-label={t("Username (optional)")}
            autoComplete="off"
          />
          <input
            className={INPUT}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("Password (optional)")}
            aria-label={t("Password (optional)")}
            autoComplete="off"
          />
        </div>
        <input
          className={INPUT}
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={t("API key, sent as X-API-Key (optional)")}
          aria-label={t("API key (optional)")}
          autoComplete="off"
        />
        <div className="flex items-start gap-2 text-[12.5px] text-ink-subtle">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
          <span>
            {t(
              "The address and login are kept in Argus's secret store and are sent only to this server, never to download links on other sites.",
            )}
          </span>
        </div>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        {done && (
          <p className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            <Check size={14} /> {t("Added {name}", { name: done })}
          </p>
        )}
        <button
          type="button"
          disabled={busy || !url.trim()}
          onClick={() => void add(url, name.trim())}
          className="flex items-center justify-center gap-2 rounded-xl bg-raised px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {t("Add catalog")}
        </button>
      </div>
      <details className={`${CARD} px-4 py-3`}>
        <summary className="cursor-pointer text-[14px] font-medium text-ink">
          {t("Public-domain catalog suggestions")}
        </summary>
        <p className="mt-2 text-[12.5px] text-ink-subtle">
          {t("Openly licensed or public-domain libraries. Nothing is added until you tap one.")}
        </p>
        <div className="mt-2 flex flex-col divide-y divide-edge-soft">
          {OPDS_SUGGESTIONS.map((item) => (
            <button
              key={item.url}
              type="button"
              disabled={busy}
              onClick={() => void add(item.url, item.name)}
              className="flex items-center gap-3 py-2.5 text-start disabled:opacity-50"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-semibold text-ink">{item.name}</span>
                <span className="truncate text-[12.5px] text-ink-muted">{item.note}</span>
              </span>
              <Plus size={16} className="shrink-0 text-ink-muted" />
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
