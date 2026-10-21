import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Accounts } from "./Accounts";

type Status = { plex: string | null; jellyfin: string | null; folders: string[] };
export type LiveSource =
  | { kind: "m3u"; name: string; url: string; epgUrl?: string }
  | { kind: "xtream"; name: string; server: string; username: string; password: string };

/** Media servers, local folders and live TV playlists. */
export function Sources({ profile, onError, onSaved }: { profile: number; onError: (s: string) => void; onSaved: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [jf, setJf] = useState({ server: "", username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const refresh = () => invoke<Status>("server_status", { profile }).then(setStatus).catch((e) => onError(String(e)));
  useEffect(() => { refresh(); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFolders = (folders: string[]) =>
    invoke("set_local_folders", { profile, folders }).then(refresh).then(onSaved).catch((e) => onError(String(e)));
  const addFolder = async () => {
    const picked = await open({ directory: true, multiple: true, title: "Choose folders with videos" });
    const list = Array.isArray(picked) ? picked : picked ? [picked] : [];
    if (list.length && status) setFolders([...new Set([...status.folders, ...list])]);
  };
  const loginJf = async () => {
    setBusy(true);
    try {
      await invoke("jellyfin_login", { profile, ...jf });
      setJf({ server: "", username: "", password: "" });
      await refresh();
      onSaved();
    } catch (e) {
      onError(String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;
  return (
    <>
      <section>
        <h3>Media servers</h3>
        <ul className="addons">
          <li>
            <div><strong>Plex</strong><div className="small muted">{status.plex ? `Connected to ${status.plex}` : "Your Plex libraries as rows on Home"}</div></div>
            {status.plex && <button onClick={() => invoke("server_signout", { profile, server: "plex" }).then(refresh)}>Disconnect</button>}
          </li>
          <li>
            <div><strong>Jellyfin / Emby</strong><div className="small muted">{status.jellyfin ? `Connected to ${status.jellyfin}` : "Sign in with your server's username and password"}</div></div>
            {status.jellyfin && <button onClick={() => invoke("server_signout", { profile, server: "jellyfin" }).then(refresh)}>Disconnect</button>}
          </li>
        </ul>
        {!status.plex && <Accounts profile={profile} onError={onError} only={["plex"]} onChange={refresh} />}
        {!status.jellyfin && (
          <form className="inline wrap" onSubmit={(e) => { e.preventDefault(); loginJf(); }}>
            <input placeholder="http://192.168.1.10:8096" value={jf.server} onChange={(e) => setJf({ ...jf, server: e.target.value })} />
            <input placeholder="Username" value={jf.username} onChange={(e) => setJf({ ...jf, username: e.target.value })} />
            <input type="password" placeholder="Password" value={jf.password} onChange={(e) => setJf({ ...jf, password: e.target.value })} />
            <button className="primary" disabled={busy || !jf.server || !jf.username}>{busy ? "Connecting…" : "Connect"}</button>
          </form>
        )}
      </section>
      <section>
        <h3>Folders on this Mac</h3>
        <p className="muted small">Movies and episodes in these folders (including network drives) show up on Home and in search.</p>
        <ul className="addons">
          {status.folders.map((f) => (
            <li key={f}><div className="small">{f}</div><button onClick={() => setFolders(status.folders.filter((x) => x !== f))}>Remove</button></li>
          ))}
        </ul>
        <button onClick={addFolder}>+ Add folder</button>
      </section>
      <LiveSources profile={profile} onError={onError} onSaved={onSaved} />
    </>
  );
}

function LiveSources({ profile, onError, onSaved }: { profile: number; onError: (s: string) => void; onSaved: () => void }) {
  const [list, setList] = useState<LiveSource[]>([]);
  const [kind, setKind] = useState<"m3u" | "xtream">("m3u");
  const [f, setF] = useState({ name: "", url: "", epgUrl: "", server: "", username: "", password: "" });
  useEffect(() => { invoke<LiveSource[]>("live_sources", { profile }).then(setList).catch(() => {}); }, [profile]);

  const save = (next: LiveSource[]) =>
    invoke("set_live_sources", { profile, list: next }).then(() => { setList(next); onSaved(); }).catch((e) => onError(String(e)));
  const add = () => {
    const name = f.name.trim() || `Playlist ${list.length + 1}`;
    const src: LiveSource = kind === "m3u"
      ? { kind, name, url: f.url.trim(), epgUrl: f.epgUrl.trim() || undefined }
      : { kind, name, server: f.server.trim(), username: f.username.trim(), password: f.password };
    save([...list, src]);
    setF({ name: "", url: "", epgUrl: "", server: "", username: "", password: "" });
  };
  const ready = kind === "m3u" ? !!f.url.trim() : !!(f.server.trim() && f.username.trim());

  return (
    <section>
      <h3>Live TV</h3>
      <p className="muted small">Your own IPTV playlists. Argus ships no channels.</p>
      <ul className="addons">
        {list.map((s, i) => (
          <li key={i}>
            <div><strong>{s.name}</strong><div className="small muted">{s.kind === "m3u" ? "M3U playlist" : "Xtream account"}</div></div>
            <button onClick={() => save(list.filter((_, j) => j !== i))}>Remove</button>
          </li>
        ))}
      </ul>
      <div className="tabs">
        <button className={kind === "m3u" ? "nav active" : "nav"} onClick={() => setKind("m3u")}>M3U URL</button>
        <button className={kind === "xtream" ? "nav active" : "nav"} onClick={() => setKind("xtream")}>Xtream login</button>
      </div>
      <form className="inline wrap" onSubmit={(e) => { e.preventDefault(); if (ready) add(); }}>
        <input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        {kind === "m3u" ? (
          <>
            <input placeholder="https://…/playlist.m3u" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
            <input placeholder="Guide URL (XMLTV, optional)" value={f.epgUrl} onChange={(e) => setF({ ...f, epgUrl: e.target.value })} />
          </>
        ) : (
          <>
            <input placeholder="http://provider:8080" value={f.server} onChange={(e) => setF({ ...f, server: e.target.value })} />
            <input placeholder="Username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
            <input type="password" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </>
        )}
        <button className="primary" disabled={!ready}>Add</button>
      </form>
    </section>
  );
}
