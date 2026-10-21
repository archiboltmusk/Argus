import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { api } from "../api";

/** Mirrors argus_core::player::PlayerPrefs (camelCase). */
export type PlayerPrefs = {
  audioLangs: string; subLangs: string; subSize: number; subColor: string; subOutlineColor: string;
  subPosition: number; subOutline: number; subBold: boolean; hwdec: "auto-safe" | "no";
  volume: number; autoNext: boolean; ytdl: boolean;
};
export const PLAYER_PREFS_KEY = "player.prefs";
export const DEFAULT_PLAYER_PREFS: PlayerPrefs = {
  audioLangs: "", subLangs: "", subSize: 55, subColor: "#FFFFFF", subOutlineColor: "#000000",
  subPosition: 100, subOutline: 3, subBold: false, hwdec: "auto-safe", volume: 100, autoNext: true, ytdl: false,
};

export async function loadPlayerPrefs(profile: number): Promise<PlayerPrefs> {
  const j = await api.getSetting(profile, PLAYER_PREFS_KEY).catch(() => null);
  return { ...DEFAULT_PLAYER_PREFS, ...(j ? JSON.parse(j) : {}) };
}

const LANGS: [string, string][] = [
  ["", "Automatic"], ["eng", "English"], ["spa", "Spanish"], ["fre", "French"], ["ger", "German"], ["ita", "Italian"],
  ["por", "Portuguese"], ["rus", "Russian"], ["jpn", "Japanese"], ["kor", "Korean"], ["chi", "Chinese"], ["hin", "Hindi"],
  ["ara", "Arabic"], ["tur", "Turkish"], ["pol", "Polish"], ["dut", "Dutch"], ["swe", "Swedish"],
];

/** Settings section: how video, audio and subtitles behave. */
export function PlayerSettings({ profile, onSaved }: { profile: number; onSaved: () => void }) {
  const [p, setP] = useState<PlayerPrefs>(DEFAULT_PLAYER_PREFS);
  const [ytdlpFound, setYtdlpFound] = useState(false);
  useEffect(() => {
    loadPlayerPrefs(profile).then(setP);
    invoke<boolean>("ytdlp_available").then(setYtdlpFound).catch(() => {});
  }, [profile]);

  const set = <K extends keyof PlayerPrefs>(k: K, v: PlayerPrefs[K]) => setP((o) => ({ ...o, [k]: v }));
  const lang = (k: "audioLangs" | "subLangs", label: string, off?: boolean) => (
    <label>{label}
      <select value={p[k]} onChange={(e) => set(k, e.target.value)}>
        {LANGS.map(([c, n]) => <option key={c} value={c}>{c === "" && off ? "No subtitles" : n}</option>)}
        {p[k] && !LANGS.some(([c]) => c === p[k]) && <option value={p[k]}>{p[k]}</option>}
      </select>
    </label>
  );

  return (
    <section className="settings">
      <h3>Player</h3>
      {lang("audioLangs", "Preferred audio language")}
      {lang("subLangs", "Preferred subtitle language", true)}
      <label>Subtitle size ({p.subSize})
        <input type="range" min={30} max={100} value={p.subSize} onChange={(e) => set("subSize", Number(e.target.value))} />
      </label>
      <label>Subtitle position ({p.subPosition}% from top)
        <input type="range" min={50} max={100} value={p.subPosition} onChange={(e) => set("subPosition", Number(e.target.value))} />
      </label>
      <label>Outline thickness ({p.subOutline})
        <input type="range" min={0} max={8} value={p.subOutline} onChange={(e) => set("subOutline", Number(e.target.value))} />
      </label>
      <div className="inline">
        <label className="check">Text <input type="color" value={p.subColor} onChange={(e) => set("subColor", e.target.value)} /></label>
        <label className="check">Outline <input type="color" value={p.subOutlineColor} onChange={(e) => set("subOutlineColor", e.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={p.subBold} onChange={(e) => set("subBold", e.target.checked)} />Bold</label>
      </div>
      <div className="sub-preview" style={{ color: p.subColor, fontWeight: p.subBold ? 700 : 400, fontSize: p.subSize / 2.5, textShadow: p.subOutline ? `0 0 ${p.subOutline}px ${p.subOutlineColor}, 0 0 ${p.subOutline}px ${p.subOutlineColor}` : "none" }}>
        The quick brown fox jumps over the lazy dog
      </div>
      <label>Default volume ({p.volume}%)
        <input type="range" min={0} max={130} value={p.volume} onChange={(e) => set("volume", Number(e.target.value))} />
      </label>
      <label>Video decoding
        <select value={p.hwdec} onChange={(e) => set("hwdec", e.target.value as PlayerPrefs["hwdec"])}>
          <option value="auto-safe">Hardware (recommended)</option>
          <option value="no">Software (if video glitches)</option>
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={p.autoNext} onChange={(e) => set("autoNext", e.target.checked)} />Play the next episode automatically</label>
      <label className="check">
        <input type="checkbox" checked={p.ytdl} onChange={(e) => set("ytdl", e.target.checked)} />
        Open YouTube and other page links with my yt-dlp {ytdlpFound ? "(found)" : "(not installed — brew install yt-dlp)"}
      </label>
      {p.ytdl && <div className="small muted">Takes effect after restarting Argus.</div>}
      <button className="primary" onClick={() => api.setSetting(profile, PLAYER_PREFS_KEY, JSON.stringify(p)).then(onSaved)}>Save player settings</button>
    </section>
  );
}
