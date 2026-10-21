import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { player } from "../player";

type Record = {
  id: string; itemId: string; videoId: string; kind: string; name: string; poster?: string;
  file: string; state: "downloading" | "paused" | "done" | "failed"; downloaded: number; total?: number; error?: string;
};
type Settings = { dir: string; capGb?: number; usedBytes: number };

const gb = (n: number) => `${(n / 2 ** 30).toFixed(2)} GB`;

/** Offline downloads: progress, pause/resume, play, remove, storage use. */
export function Downloads({ profile, onError }: { profile: number; onError: (s: string) => void }) {
  const [list, setList] = useState<Record[] | null>(null);
  const [live, setLive] = useState<Map<string, { downloaded: number; total?: number }>>(new Map());
  const [settings, setSettings] = useState<Settings | null>(null);
  const refresh = () => {
    invoke<Record[]>("download_list", { profile }).then(setList).catch((e) => onError(String(e)));
    invoke<Settings>("download_settings").then(setSettings).catch(() => {});
  };

  useEffect(() => {
    refresh();
    const subs = [
      listen("downloads://changed", refresh),
      listen<{ id: string; downloaded: number; total?: number }>("downloads://progress", (e) =>
        setLive((m) => new Map(m).set(e.payload.id, e.payload))),
    ];
    return () => { subs.forEach((s) => s.then((off) => off())); };
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = (cmd: string, id: string) => invoke(cmd, { id }).then(refresh).catch((e) => onError(String(e)));
  const play = (r: Record) =>
    player.load(r.file, 0, { profile, itemId: r.itemId, kind: r.kind, name: r.name, poster: r.poster, videoId: r.videoId, fileKey: r.file }, [], 0).catch((e) => onError(String(e)));

  if (list === null) return <div className="muted">Loading…</div>;
  return (
    <>
      <h2>Downloads</h2>
      {settings && <p className="muted small">{gb(settings.usedBytes)} used in {settings.dir}{settings.capGb ? ` · limit ${settings.capGb} GB` : ""}</p>}
      {list.length === 0 && <div className="muted">Nothing downloaded yet. Use “Download” on any stream to watch it offline.</div>}
      <ul className="addons">
        {list.map((r) => {
          const p = live.get(r.id);
          const downloaded = p?.downloaded ?? r.downloaded;
          const total = p?.total ?? r.total;
          const pct = total ? Math.min(100, Math.round((downloaded / total) * 100)) : null;
          return (
            <li key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <div className="small muted">
                  {r.state === "done" ? `Ready · ${gb(downloaded)}` : r.state === "failed" ? `Failed: ${r.error ?? "unknown error"}` : `${r.state === "paused" ? "Paused" : "Downloading"} · ${gb(downloaded)}${pct !== null ? ` (${pct}%)` : ""}`}
                </div>
                {r.state !== "done" && pct !== null && <div className="bar"><div style={{ width: `${pct}%` }} /></div>}
              </div>
              {r.state === "done" && <button className="primary" onClick={() => play(r)}>Play</button>}
              {r.state === "downloading" && <button onClick={() => act("download_pause", r.id)}>Pause</button>}
              {(r.state === "paused" || r.state === "failed") && <button onClick={() => act("download_resume", r.id)}>Resume</button>}
              <button onClick={() => window.confirm(`Delete ${r.name}?`) && act("download_remove", r.id)}>Delete</button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
