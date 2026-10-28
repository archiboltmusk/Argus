import { Download, Layers, Shield, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { CURATED_COMMUNITY_DIRECTORY, type CommunityAddonEntry } from "@/lib/community-addons-directory";
import { installAddon, loadInstalled, uninstallAddon } from "@/lib/addon-store";

export function AddonDirectoryTab() {
  const [installed, setInstalled] = useState(() => loadInstalled());
  const [filter, setFilter] = useState<string>("all");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const installedMap = new Map<string, string>();
  for (const a of installed) {
    if (a.id) installedMap.set(a.id, a.transportUrl);
  }

  const handleInstall = async (addon: CommunityAddonEntry) => {
    setWorkingId(addon.id);
    setNotice(null);
    try {
      await installAddon(addon.id, addon.manifestUrl);
      setInstalled(loadInstalled());
      setNotice(`Installed ${addon.name} successfully.`);
    } catch (e) {
      setNotice(`Failed to install ${addon.name}: ${String(e)}`);
    } finally {
      setWorkingId(null);
    }
  };

  const handleUninstall = async (addon: CommunityAddonEntry) => {
    setWorkingId(addon.id);
    setNotice(null);
    try {
      const url = installedMap.get(addon.id) || addon.manifestUrl;
      await uninstallAddon(addon.id, url);
      setInstalled(loadInstalled());
      setNotice(`Uninstalled ${addon.name}.`);
    } catch (e) {
      setNotice(`Failed to uninstall ${addon.name}: ${String(e)}`);
    } finally {
      setWorkingId(null);
    }
  };

  const filtered = CURATED_COMMUNITY_DIRECTORY.filter((item) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-edge-soft bg-surface/70 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Decentralized Community Add-on Hub</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-subtle">
              Curated, peer-reviewed open Stremio protocol integrations. Installed directly from developer manifests with granular local sandbox policies.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-edge-soft bg-canvas p-1 text-xs">
            {["all", "streams", "subtitles", "catalogs", "anime", "metadata"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`rounded-lg px-2.5 py-1 capitalize font-medium transition-colors ${
                  filter === cat ? "bg-accent text-white" : "text-ink-subtle hover:text-ink"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {notice && (
          <div className="mb-4 rounded-xl border border-accent/20 bg-accent/10 p-3 text-xs text-accent">
            {notice}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((item) => {
            const isInstalled = installedMap.has(item.id);
            const isBusy = workingId === item.id;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-edge-soft bg-surface p-4 text-xs transition-colors hover:border-edge"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-ink">{item.name}</h3>
                        <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-mono text-ink-subtle">
                          v{item.version}
                        </span>
                        {item.recommended && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                            <Sparkles size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-subtle">by {item.author}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${
                        item.sandboxMode === "safe"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      <Shield size={11} />
                      {item.sandboxMode === "safe" ? "Metadata Only" : "Direct Stream"}
                    </span>
                  </div>

                  <p className="mt-2.5 text-ink-muted leading-relaxed">{item.description}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-edge-soft/60 pt-3">
                  <span className="text-[11px] text-ink-subtle capitalize">Category: {item.category}</span>
                  {isInstalled ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleUninstall(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      {isBusy ? "Removing…" : "Uninstall"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleInstall(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                    >
                      <Download size={12} />
                      {isBusy ? "Installing…" : "Install Add-on"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
