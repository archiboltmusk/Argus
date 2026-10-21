import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { loadPlayerPrefs, patchPlayerPrefs, DEFAULT_PLAYER_PREFS, type PlayerPrefs } from "./PlayerSettings";

type Opt = [string | number, string];

const PROFILES: Opt[] = [["off", "Flat"], ["bass", "Bass boost"], ["vocal", "Vocal clarity"], ["lessbass", "Less bass"], ["night", "Night mode"]];
const PROFILE_NOTE: Record<string, string> = {
  off: "No shaping. The track plays exactly as it was mixed.",
  bass: "Lifts low frequencies for more punch.",
  vocal: "Pushes dialogue forward and trims the rumble underneath.",
  lessbass: "Pulls the low end back for small speakers.",
  night: "Gently compresses loud moments for late-night watching.",
};
const QUALITY: [string, string, string][] = [
  ["weak", "Smooth on weak PCs", "Reduces video processing to help older computers play smoothly and use less power."],
  ["balanced", "Balanced", "Good picture quality with moderate graphics use. Recommended for most computers."],
  ["max", "Maximum quality", "Sharper upscaling and smoother color gradients. Best with a powerful graphics card."],
];
const LOOKS: [string, Partial<PlayerPrefs>][] = [
  ["Brighten dark movies", { brightness: 8, gamma: 20, contrast: 0, saturation: 0, sharpen: 0 }],
  ["Punchier color", { brightness: 0, gamma: 0, contrast: 8, saturation: 18, sharpen: 0 }],
  ["Easy on the eyes", { brightness: -6, gamma: 0, contrast: -4, saturation: -8, sharpen: 0 }],
  ["Crisp (anime & cartoons)", { brightness: 0, gamma: 0, contrast: 6, saturation: 10, sharpen: 0.6 }],
];
const RESET: Partial<PlayerPrefs> = { brightness: 0, contrast: 0, saturation: 0, gamma: 0, sharpen: 0 };

/** Settings section: audio, picture, buffering and raw mpv options. Saves as you go. */
export function PlaybackSettings({ profile, onSaved }: { profile: number; onSaved: () => void }) {
  const [p, setP] = useState<PlayerPrefs>(DEFAULT_PLAYER_PREFS);
  const [devices, setDevices] = useState<[string, string][]>([]);
  const [conf, setConf] = useState("");
  useEffect(() => {
    loadPlayerPrefs(profile).then((x) => { setP(x); setConf(x.mpvConf); });
    invoke<[string, string][]>("player_audio_devices").then(setDevices).catch(() => {});
  }, [profile]);

  const save = (patch: Partial<PlayerPrefs>) => {
    setP((o) => ({ ...o, ...patch }));
    patchPlayerPrefs(profile, patch).then(onSaved).catch(() => {});
  };
  const seg = <K extends keyof PlayerPrefs>(k: K, opts: Opt[]) => (
    <div className="seg">
      {opts.map(([v, n]) => <button key={String(v)} className={p[k] === v ? "primary" : ""} onClick={() => save({ [k]: v } as Partial<PlayerPrefs>)}>{n}</button>)}
    </div>
  );
  const slider = (k: "brightness" | "contrast" | "saturation" | "gamma", label: string, hint: string) => (
    <label>{label} ({p[k]})<span className="small muted"> {hint}</span>
      <input type="range" min={-100} max={100} value={p[k]} onChange={(e) => setP((o) => ({ ...o, [k]: Number(e.target.value) }))} onPointerUp={() => save({ [k]: p[k] })} onKeyUp={() => save({ [k]: p[k] })} />
    </label>
  );

  return (
    <section className="settings">
      <h3>Playback: audio</h3>
      <label className="check"><input type="checkbox" checked={p.normalize} onChange={(e) => save({ normalize: e.target.checked })} />Normalize loudness (evens out quiet dialogue and loud action scenes)</label>
      <label className="check"><input type="checkbox" checked={p.stereoDownmix} onChange={(e) => save({ stereoDownmix: e.target.checked })} />Mix surround sound down to stereo (laptops and headphones)</label>
      <div>Sound profile</div>
      {seg("eq", PROFILES)}
      <div className="small muted">{PROFILE_NOTE[p.eq] ?? ""} Profiles stack with the normalizer.</div>
      <div>Maximum volume boost</div>
      {seg("volumeMax", [[100, "100%"], [150, "150%"], [200, "200%"], [300, "300%"], [400, "400%"], [600, "600%"]])}
      <label>Output device
        <select value={p.audioDevice} onChange={(e) => save({ audioDevice: e.target.value })}>
          <option value="auto">System default</option>
          {devices.filter(([n]) => n !== "auto").map(([n, d]) => <option key={n} value={n}>{d}</option>)}
          {p.audioDevice !== "auto" && !devices.some(([n]) => n === p.audioDevice) && <option value={p.audioDevice}>{p.audioDevice}</option>}
        </select>
      </label>
      {devices.length === 0 && <div className="small muted">The device list fills in once something has played.</div>}

      <h3>Playback: video quality</h3>
      <div className="stack">
        {QUALITY.map(([v, n, d]) => (
          <button key={v} className={p.quality === v ? "primary" : ""} onClick={() => save({ quality: v })}><b>{n}</b><br /><span className="small">{d}</span></button>
        ))}
      </div>
      <div>Hardware acceleration</div>
      {seg("hwdec", [["auto-safe", "Auto"], ["force", "Force on"], ["no", "Off (use CPU)"]])}
      <div>Renderer <span className="small muted">(applies after restarting Argus)</span></div>
      {seg("renderer", [["gpu", "GPU (compatibility)"], ["gpu-next", "GPU next"]])}
      <label className="check"><input type="checkbox" checked={p.simpleColor} onChange={(e) => save({ simpleColor: e.target.checked })} />Simple color mode (8-bit SDR for older graphics cards; disables HDR)</label>

      <h3>Playback: picture adjustments</h3>
      <div className="inline">
        {LOOKS.map(([n, v]) => <button key={n} onClick={() => save(v)}>{n}</button>)}
        <button onClick={() => save(RESET)}>Reset picture</button>
      </div>
      {slider("brightness", "Brightness", "Lightens or darkens the whole picture.")}
      {slider("contrast", "Contrast", "Difference between dark and light areas.")}
      {slider("saturation", "Saturation", "More vivid or more muted colors.")}
      {slider("gamma", "Gamma (midtones)", "Makes dark scenes easier to see.")}
      <label>Sharpen ({p.sharpen.toFixed(2)})<span className="small muted"> Adds edge definition; high values can halo.</span>
        <input type="range" min={0} max={2} step={0.05} value={p.sharpen} onChange={(e) => setP((o) => ({ ...o, sharpen: Number(e.target.value) }))} onPointerUp={() => save({ sharpen: p.sharpen })} onKeyUp={() => save({ sharpen: p.sharpen })} />
      </label>

      <h3>Playback: buffering</h3>
      <div className="small muted">Download more of a video ahead of playback to prevent pauses on an unstable connection.</div>
      {seg("buffer", [["auto", "Auto"], ["small", "Small"], ["medium", "Medium"], ["large", "Large"], ["maximum", "Maximum"]])}

      <h3>Advanced (mpv.conf)</h3>
      <div className="small muted">One mpv option per line, like <code>brightness=5</code>. These override the video settings above. Options that run scripts or write files are ignored. Applies to the next video.</div>
      <textarea rows={6} spellCheck={false} placeholder={"tone-mapping=hable\ninverse-tone-mapping=yes\nsub-scale=1.2"} value={conf} onChange={(e) => setConf(e.target.value)} onBlur={() => conf !== p.mpvConf && save({ mpvConf: conf })} />
      <div className="small muted">{conf.trim() ? "Custom options are saved when you click away." : "No custom options. Argus uses your video settings."}</div>
    </section>
  );
}
