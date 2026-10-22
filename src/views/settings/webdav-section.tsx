import { useCallback, useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { useView } from "@/lib/view";
import { ModalShell, useModalExit } from "@/components/modal-shell";
import {
  isVideoName,
  listWebDav,
  webDavHeaders,
  type WebDavConfig,
  type WebDavEntry,
} from "@/lib/webdav/client";
import { Section, ToggleRow } from "./shared";

const FIELD =
  "h-10 w-full rounded-lg bg-canvas/70 px-3 text-[13px] text-ink ring-1 ring-edge-soft/60 outline-none focus:ring-accent";

function Browser({ cfg, onClose }: { cfg: WebDavConfig; onClose: () => void }) {
  const t = useT();
  const view = useView();
  const { closing, close } = useModalExit(onClose);
  const [stack, setStack] = useState<string[]>([cfg.url]);
  const [entries, setEntries] = useState<WebDavEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const here = stack[stack.length - 1];

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setError(null);
    listWebDav(cfg, here)
      .then((e) => {
        if (!cancelled) setEntries(e.filter((x) => x.isDir || isVideoName(x.name)));
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [cfg, here]);

  const play = useCallback(
    (e: WebDavEntry) => {
      const name = e.name.replace(/\.[^.]+$/, "");
      close();
      view.openPlayer({
        meta: { id: `webdav:${e.url}`, type: "movie", name },
        url: e.url,
        headers: webDavHeaders(cfg),
        title: name,
        subtitle: "WebDAV",
        notWebReady: true,
      });
    },
    [cfg, close, view],
  );

  return (
    <ModalShell closing={closing} onDismiss={close} width={560}>
      <div className="flex items-center justify-between gap-3 border-b border-edge-soft/60 px-5 py-4">
        <div className="min-w-0 truncate text-[15px] font-semibold text-ink">
          {decodeURIComponent(new URL(here).pathname) || "/"}
        </div>
        <button type="button" onClick={close} className="text-[13px] text-ink-subtle hover:text-ink">
          {t("Close")}
        </button>
      </div>
      <div className="min-h-[200px] overflow-y-auto p-2">
        {stack.length > 1 && (
          <button
            type="button"
            onClick={() => setStack((s) => s.slice(0, -1))}
            className="w-full rounded-lg px-3 py-2 text-start text-[13px] text-ink-muted hover:bg-elevated/50"
          >
            ← {t("Back")}
          </button>
        )}
        {error && <div className="px-3 py-4 text-[13px] text-red-400">{error}</div>}
        {!error && !entries && <div className="px-3 py-4 text-[13px] text-ink-subtle">{t("Loading…")}</div>}
        {entries?.length === 0 && (
          <div className="px-3 py-4 text-[13px] text-ink-subtle">{t("No videos here.")}</div>
        )}
        {entries?.map((e) => (
          <button
            key={e.url}
            type="button"
            onClick={() => (e.isDir ? setStack((s) => [...s, e.url]) : play(e))}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-[13.5px] text-ink hover:bg-elevated/50"
          >
            <span className="truncate">
              {e.isDir ? "📁 " : ""}
              {e.name}
            </span>
            {e.size ? (
              <span className="shrink-0 text-[11.5px] text-ink-subtle">
                {(e.size / 1e9).toFixed(2)} GB
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

export function WebDavSection() {
  const t = useT();
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  const url = settings.webdavUrl.trim();
  const valid = /^https?:\/\//i.test(url);
  const cfg: WebDavConfig = { url, user: settings.webdavUser, password: settings.webdavPassword };

  return (
    <Section
      title={t("WebDAV")}
      subtitle={t("Browse and play video from a WebDAV server: a NAS, a debrid service's WebDAV, or your own. Argus sends the login only to this server.")}
    >
      <ToggleRow
        label={t("WebDAV browser")}
        sub={t("Adds your WebDAV server as a place to pick videos from.")}
        value={settings.webdavEnabled}
        onChange={(webdavEnabled) => update({ webdavEnabled })}
      />
      {settings.webdavEnabled && (
        <div className="flex flex-col gap-2 rounded-xl bg-elevated/30 p-3 ring-1 ring-edge-soft/50">
          <input
            className={FIELD}
            placeholder={t("Server URL, e.g. https://dav.example.com/media/")}
            value={settings.webdavUrl}
            onChange={(e) => update({ webdavUrl: e.target.value })}
          />
          <input
            className={FIELD}
            placeholder={t("Username")}
            autoComplete="off"
            value={settings.webdavUser}
            onChange={(e) => update({ webdavUser: e.target.value })}
          />
          <input
            className={FIELD}
            type="password"
            placeholder={t("Password")}
            autoComplete="off"
            value={settings.webdavPassword}
            onChange={(e) => update({ webdavPassword: e.target.value })}
          />
          <button
            type="button"
            disabled={!valid}
            onClick={() => setOpen(true)}
            className="h-10 w-fit rounded-full bg-ink px-5 text-[13px] font-semibold text-canvas transition-opacity disabled:opacity-40"
          >
            {t("Browse")}
          </button>
        </div>
      )}
      <ToggleRow
        label={t("WebDAV and direct links only")}
        sub={t("Turns off peer-to-peer so everything plays from servers you choose. Same as disabling P2P entirely.")}
        value={settings.webdavOnly}
        onChange={(webdavOnly) =>
          update(webdavOnly ? { webdavOnly, torrentsDisabled: true } : { webdavOnly })
        }
      />
      {open && <Browser cfg={cfg} onClose={() => setOpen(false)} />}
    </Section>
  );
}
