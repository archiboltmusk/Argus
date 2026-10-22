import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Meta } from "@/lib/cinemeta";
import { useT } from "@/lib/i18n";
import { fetchGroupList } from "@/lib/library-groups/fetch";
import { MAX_GROUPS, MAX_LISTS_PER_GROUP, type LibraryGroup } from "@/lib/library-groups/types";
import { parseListUrl } from "@/lib/library-groups/urls";
import { useSettings } from "@/lib/settings";
import { Grid } from "./shared";
import { WatchlistCard } from "./watchlist-card";

const FIELD =
  "w-full rounded-xl bg-canvas/60 px-3 py-2 text-[13px] text-ink ring-1 ring-edge-soft outline-none focus:ring-accent";

export function GroupsTab() {
  const t = useT();
  const { settings, update } = useSettings();
  const groups = settings.libraryGroups;
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [urls, setUrls] = useState("");

  const open = groups.find((g) => g.id === openId);
  if (open) return <GroupDetail group={open} onBack={() => setOpenId(null)} />;

  const parsed = urls
    .split(/\s+/)
    .filter(Boolean)
    .map((u) => ({ u, ref: parseListUrl(u) }));
  const valid = parsed.filter((p) => p.ref);
  const canAdd =
    name.trim().length > 0 &&
    valid.length > 0 &&
    valid.length === parsed.length &&
    valid.length <= MAX_LISTS_PER_GROUP &&
    groups.length < MAX_GROUPS;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-2xl bg-elevated/30 p-4 ring-1 ring-edge-soft/50">
        <div className="text-[13px] font-semibold text-ink">{t("New group")}</div>
        <p className="text-[12px] text-ink-muted">
          {t("Combine MDBList and Trakt lists into one shelf. Paste one list URL per line.")}
        </p>
        <input className={`${FIELD} h-10`} placeholder={t("Group name")} value={name} onChange={(e) => setName(e.target.value)} />
        <textarea
          className={`${FIELD} min-h-20`}
          placeholder="https://mdblist.com/lists/..."
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
        />
        {parsed.length > 0 && valid.length !== parsed.length && (
          <div className="text-[12px] text-rose-300">{t("One of those is not a supported MDBList or Trakt list URL.")}</div>
        )}
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            update({
              libraryGroups: [
                ...groups,
                {
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  lists: valid.map((p) => ({ id: crypto.randomUUID(), url: p.ref!.url })),
                },
              ],
            });
            setName("");
            setUrls("");
          }}
          className="flex h-10 w-fit items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-semibold text-canvas disabled:opacity-40"
        >
          <Plus size={15} /> {t("Add group")}
        </button>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {groups.map((g) => (
          <div key={g.id} className="flex items-center justify-between gap-3 rounded-2xl bg-elevated/40 p-4 ring-1 ring-edge-soft/60">
            <button type="button" onClick={() => setOpenId(g.id)} className="min-w-0 text-start">
              <div className="truncate text-[15px] font-medium text-ink">{g.name}</div>
              <div className="text-[12px] text-ink-subtle">{t("{n} lists", { n: g.lists.length })}</div>
            </button>
            <button
              type="button"
              aria-label={t("Remove")}
              onClick={() => update({ libraryGroups: groups.filter((x) => x.id !== g.id) })}
              className="text-ink-subtle hover:text-ink"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function GroupDetail({ group, onBack }: { group: LibraryGroup; onBack: () => void }) {
  const t = useT();
  const { settings } = useSettings();
  const [items, setItems] = useState<Meta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setItems(null);
    setError(null);
    Promise.allSettled(group.lists.map((l) => fetchGroupList(l.url, settings.mdblistKey, ac.signal))).then((rs) => {
      if (ac.signal.aborted) return;
      const seen = new Set<string>();
      const merged: Meta[] = [];
      for (const r of rs) {
        if (r.status !== "fulfilled") continue;
        for (const m of r.value) if (!seen.has(m.id)) {
          seen.add(m.id);
          merged.push(m);
        }
      }
      setItems(merged);
      const failed = rs.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      if (failed) setError(String((failed.reason as Error)?.message ?? failed.reason));
    });
    return () => ac.abort();
  }, [group, settings.mdblistKey]);

  return (
    <section className="flex flex-col gap-5">
      <button type="button" onClick={onBack} className="flex w-fit items-center gap-2 text-[13px] text-ink-muted hover:text-ink">
        <ArrowLeft size={15} /> {t("Groups")}
      </button>
      <h2 className="font-display text-[28px] text-ink">{group.name}</h2>
      {error && <div className="text-[12.5px] text-rose-300">{error}</div>}
      {items === null ? (
        <div className="text-[13px] text-ink-muted">{t("Loading...")}</div>
      ) : (
        <Grid>
          {items.map((m) => (
            <WatchlistCard key={m.id} meta={m} />
          ))}
        </Grid>
      )}
    </section>
  );
}
