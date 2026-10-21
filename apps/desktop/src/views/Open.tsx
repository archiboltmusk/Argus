import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { api } from "../api";
import { player } from "../player";

const VIDEO_EXT = ["mkv", "mp4", "avi", "mov", "m4v", "webm", "ts", "m2ts", "wmv", "flv", "mpg", "mpeg", "ogv", "m3u8"];

/** Play anything: a file, a direct/stream URL, a YouTube link, or a magnet. */
export function OpenMedia({ profile, onError }: { profile: number; onError: (s: string) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const play = async (input: string, name: string) => {
    setBusy(true);
    try {
      const url = await api.resolveInput(profile, input);
      await player.load(url, 0, { profile, itemId: `open:${input}`, kind: "other", name, videoId: input, fileKey: input }, [], 0);
      setText("");
    } catch (e) {
      onError(typeof e === "string" ? e : String(e));
    } finally {
      setBusy(false);
    }
  };
  const chooseFile = async () => {
    const f = await open({ multiple: false, title: "Open a video", filters: [{ name: "Video", extensions: VIDEO_EXT }, { name: "All files", extensions: ["*"] }] });
    if (typeof f === "string") play(f, f.split("/").pop() ?? f);
  };
  const label = (t: string) => (t.startsWith("magnet:") ? new URLSearchParams(t.split("?")[1] ?? "").get("dn") ?? "Magnet" : t.split("/").pop() || t);

  return (
    <form className="inline open-bar" onSubmit={(e) => { e.preventDefault(); if (text.trim()) play(text.trim(), label(text.trim())); }}>
      <input placeholder="Paste a video link or magnet to play it…" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="primary" disabled={busy || !text.trim()}>Play</button>
      <button type="button" disabled={busy} onClick={chooseFile}>Open file…</button>
    </form>
  );
}
