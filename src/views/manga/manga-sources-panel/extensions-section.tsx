import { Blocks, Check, Download, Globe, Loader2, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { addRepo, removeRepo, repoUrlsSync, subscribePlugins, subscribeRepos } from "@/lib/manga/plugins";
import { removeAllMangayomiRecords } from "@/lib/manga/sources/mangayomi";
import { mangayomiSourcesSync, subscribeMangayomiSources } from "@/lib/manga/sources/mangayomi/store";
import { CARD, INPUT } from "./shared";
import { RepoCard } from "./extensions/repo-card";
import { useT } from "@/lib/i18n";

export interface CommunityMangaRepoPreset {
  name: string;
  url: string;
  description: string;
  badge: string;
}

export const COMMUNITY_MANGA_REPOS: CommunityMangaRepoPreset[] = [
  {
    name: "Mangayomi Multi-Catalog Extensions",
    url: "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/index.json",
    description: "Hundreds of community scrapers running directly in Argus without external servers (MangaBat, Asura, FlameScans, Bato, Webtoons).",
    badge: "Recommended · Zero Server",
  },
  {
    name: "Mihon / Tachiyomi Extension Index",
    url: "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json",
    description: "Standard community index used across mobile and desktop manga readers.",
    badge: "Global Community",
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 px-1 text-[12.5px] font-bold uppercase tracking-[0.12em] text-ink-subtle">
      {children}
    </p>
  );
}

function Explainer() {
  const t = useT();
  return (
    <div className={`flex flex-col gap-3 px-5 py-4 ${CARD}`}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-canvas text-ink-muted ring-1 ring-edge-soft">
          <ShieldCheck size={18} />
        </span>
        <span className="text-[15.5px] font-semibold text-ink">{t("Universal In-App Extensions")}</span>
      </div>
      <p className="text-[13.5px] leading-relaxed text-ink-muted">
        {t(
          "Argus runs manga extensions natively inside isolated web workers. You do not need Java, Docker, or an external Suwayomi server. Install verified community repositories below to stream and read manga natively across all devices.",
        )}
      </p>
    </div>
  );
}

export function ExtensionsSection() {
  const t = useT();
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const u1 = subscribeRepos(bump);
    const u2 = subscribePlugins(bump);
    const u3 = subscribeMangayomiSources(bump);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [presetBusy, setPresetBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const urls = repoUrlsSync();
  const extCount = mangayomiSourcesSync().length;

  const clearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    void removeAllMangayomiRecords();
  };

  const handleAddPreset = async (presetUrl: string) => {
    setPresetBusy(presetUrl);
    setError(null);
    try {
      await addRepo(presetUrl);
    } catch {
      setError(t("Could not add repository"));
    } finally {
      setPresetBusy(null);
    }
  };

  const add = async () => {
    let value = url.trim();
    if (!/^https?:\/\/.+/i.test(value)) {
      setError(t("Enter a valid http(s):// URL"));
      return;
    }
    if (value.includes("github.com/")) {
      value = value.replace("github.com/", "raw.githubusercontent.com/").replace(/\/raw\//, "/").replace(/\/blob\//, "/");
    }
    if (value.endsWith("/index.pb") || value.endsWith("index.pb")) {
      value = value.replace(/index\.pb$/i, "index.min.json");
    } else if (value.endsWith(".pb")) {
      value = value.replace(/\.pb$/i, ".min.json");
    } else if (value.includes("keiyoushi/extensions") && !value.endsWith(".json")) {
      value = "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json";
    }
    setAdding(true);
    setError(null);
    try {
      await addRepo(value);
      setUrl("");
    } catch {
      setError(t("Could not load that repository"));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>{t("Extensions (Zero-Server)")}</SectionLabel>
      <Explainer />

      {/* 1-Click Community Repository Cards */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 px-1 text-[13px] font-semibold text-ink-muted">
          <Sparkles size={15} className="text-accent" />
          <span>{t("Verified Community Repositories (1-Click)")}</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {COMMUNITY_MANGA_REPOS.map((preset) => {
            const isInstalled = urls.some((u) => u.toLowerCase() === preset.url.toLowerCase());
            const isBusy = presetBusy === preset.url;
            return (
              <div
                key={preset.url}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl transition-all ${CARD}`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas text-accent ring-1 ring-edge-soft">
                    <Globe size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14.5px] font-bold text-ink truncate">{preset.name}</span>
                      <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10.5px] font-bold text-accent">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{preset.description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isInstalled || isBusy}
                  onClick={() => handleAddPreset(preset.url)}
                  className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-xs font-bold transition-all shadow-sm ${
                    isInstalled
                      ? "bg-raised text-ink-subtle ring-1 ring-edge-soft cursor-default"
                      : "bg-accent text-canvas hover:opacity-90 active:scale-95"
                  }`}
                >
                  {isBusy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : isInstalled ? (
                    <Check size={13} strokeWidth={2.6} />
                  ) : (
                    <Download size={13} />
                  )}
                  {isInstalled ? t("Installed") : t("1-Click Install")}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`flex flex-col gap-2.5 px-5 py-4 ${CARD}`}>
        <div className="flex items-center gap-2 text-ink-muted">
          <Blocks size={16} />
          <span className="text-[13.5px] font-semibold text-ink">{t("Add Custom Repository URL")}</span>
        </div>
        <div className="flex gap-2.5">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !adding) void add();
            }}
            placeholder="https://example.com/repo.json"
            inputMode="url"
            autoCapitalize="off"
            spellCheck={false}
            className={`${INPUT} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={add}
            disabled={adding}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-[14.5px] font-semibold text-canvas transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {adding ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} strokeWidth={2.4} />}
            {t("Add")}
          </button>
        </div>
        {error && <p className="text-[13px] font-medium text-danger">{error}</p>}
      </div>

      {urls.length === 0 ? (
        <p className="px-1 pb-1 text-[13.5px] text-ink-subtle">
          {t("No repositories installed yet. Click 1-Click Install above to add community scrapers.")}
        </p>
      ) : (
        urls.map((u) => <RepoCard key={u} url={u} onRemove={() => void removeRepo(u)} />)
      )}

      {extCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className={`mt-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold ring-1 transition-all active:scale-[0.98] ${
            confirmClear
              ? "bg-danger/15 text-danger ring-danger/40"
              : "bg-raised text-ink-subtle ring-edge-soft hover:text-danger"
          }`}
        >
          <Trash2 size={16} strokeWidth={2.2} />
          {confirmClear
            ? t("Tap again to remove all {n} extensions", { n: extCount })
            : t("Remove all extensions ({n})", { n: extCount })}
        </button>
      )}
    </div>
  );
}
