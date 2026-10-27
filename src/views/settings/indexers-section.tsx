import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import type { Indexer } from "@/lib/streams/indexer-feed";
import { Segmented } from "./shared";

function isHttpUrl(v: string): boolean {
  try {
    return /^https?:$/.test(new URL(v).protocol);
  } catch {
    return false;
  }
}

const FIELD =
  "h-10 w-full rounded-xl bg-canvas/60 px-3 text-[13px] text-ink ring-1 ring-edge-soft outline-none focus:ring-accent";

export function IndexersSection() {
  const t = useT();
  const { settings, update } = useSettings();
  const list = settings.indexers;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Indexer["kind"]>("torznab");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const valid = isHttpUrl(url.trim());

  const save = (next: Indexer[]) => update({ indexers: next });

  return (
    <div className="flex flex-col gap-3">
      {list.map((i) => (
        <div
          key={i.id}
          className="flex items-center justify-between gap-3 rounded-xl bg-elevated/40 px-4 py-3 ring-1 ring-edge-soft/60"
        >
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-ink">{i.name}</div>
            <div className="truncate text-[11.5px] text-ink-subtle">
              {i.kind === "torznab" ? "Torznab" : "Newznab"} · {new URL(i.url).host}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={i.enabled}
              onClick={() => save(list.map((x) => (x.id === i.id ? { ...x, enabled: !x.enabled } : x)))}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                i.enabled ? "bg-accent/15 text-accent" : "bg-canvas/70 text-ink-subtle"
              }`}
            >
              {i.enabled ? t("On") : t("Off")}
            </button>
            <button
              type="button"
              aria-label={t("Remove")}
              onClick={() => save(list.filter((x) => x.id !== i.id))}
              className="text-ink-subtle transition-colors hover:text-ink"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-2 rounded-xl bg-elevated/30 p-3 ring-1 ring-edge-soft/50">
        <Segmented
          value={kind}
          options={[
            { value: "torznab", label: "Torznab (Jackett / Prowlarr)" },
            { value: "newznab", label: "Newznab (Usenet)" },
          ]}
          onChange={setKind}
        />
        <div className="flex gap-1.5 py-0.5">
          <button
            type="button"
            onClick={() => {
              setName("Prowlarr");
              setUrl("http://localhost:9696/1/api?t=search");
            }}
            className="rounded bg-canvas/80 px-2 py-1 text-[11px] font-medium text-ink-subtle hover:text-ink border border-edge-soft"
          >
            {t("Preset: Prowlarr")}
          </button>
          <button
            type="button"
            onClick={() => {
              setName("Jackett");
              setUrl("http://localhost:9117/api/v2.0/indexers/all/results/torznab/");
            }}
            className="rounded bg-canvas/80 px-2 py-1 text-[11px] font-medium text-ink-subtle hover:text-ink border border-edge-soft"
          >
            {t("Preset: Jackett")}
          </button>
        </div>
        <input className={FIELD} placeholder={t("Name")} value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className={FIELD}
          placeholder={t("Indexer URL (e.g. Prowlarr or Jackett Torznab URL)")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className={FIELD}
          placeholder={t("API key")}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <button
          type="button"
          disabled={!valid}
          onClick={() => {
            const cleanUrl = url.trim();
            save([
              ...list,
              {
                id: crypto.randomUUID(),
                name: name.trim() || new URL(cleanUrl).host,
                kind,
                url: cleanUrl,
                apiKey: apiKey.trim(),
                enabled: true,
              },
            ]);
            setName("");
            setUrl("");
            setApiKey("");
          }}
          className="h-10 w-fit rounded-full bg-ink px-5 text-[13px] font-semibold text-canvas transition-opacity disabled:opacity-40"
        >
          {t("Add indexer")}
        </button>
      </div>
    </div>
  );
}
