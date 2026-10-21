import { useEffect, useState } from "react";
import { loadPlayerPrefs, patchPlayerPrefs, DEFAULT_PLAYER_PREFS, type PlayerPrefs } from "./PlayerSettings";

type Opt = [string, string];

const FONTS = ["", "Helvetica Neue", "Arial", "Georgia", "Menlo", "Verdana", "Trebuchet MS", "Courier New"];

/** Settings section: when subtitles show and how they look. Saves as you go. */
export function SubtitleSettings({ profile, onSaved }: { profile: number; onSaved: () => void }) {
  const [p, setP] = useState<PlayerPrefs>(DEFAULT_PLAYER_PREFS);
  useEffect(() => { loadPlayerPrefs(profile).then(setP); }, [profile]);

  const save = (patch: Partial<PlayerPrefs>) => {
    setP((o) => ({ ...o, ...patch }));
    patchPlayerPrefs(profile, patch).then(onSaved).catch(() => {});
  };
  const check = (k: keyof PlayerPrefs, label: string) => (
    <label className="check"><input type="checkbox" checked={p[k] as boolean} onChange={(e) => save({ [k]: e.target.checked } as Partial<PlayerPrefs>)} />{label}</label>
  );
  const seg = (k: keyof PlayerPrefs, opts: Opt[]) => (
    <div className="seg">
      {opts.map(([v, n]) => <button key={v} className={p[k] === v ? "primary" : ""} onClick={() => save({ [k]: v } as Partial<PlayerPrefs>)}>{n}</button>)}
    </div>
  );
  const shadow = p.subStyle === "shadow" ? `2px 2px 3px ${p.subOutlineColor}` : p.subStyle === "outline" && p.subOutline ? `0 0 ${p.subOutline}px ${p.subOutlineColor}, 0 0 ${p.subOutline}px ${p.subOutlineColor}` : "none";

  return (
    <section className="settings">
      <h3>Subtitles: behavior</h3>
      {check("subsStartOff", "Start with subtitles off")}
      {check("dualSubs", "Show two subtitle languages at once (your first and second preferred language)")}
      {check("preferEmbedded", "Prefer subtitles inside the file over downloaded ones")}
      {check("forcedSubs", "Show forced subtitles (foreign dialogue, signs) when the audio is in the original language")}
      {check("hideSdh", "Hide sound descriptions for the hard of hearing, like [music]")}

      <h3>Subtitles: look</h3>
      <div>Text background</div>
      {seg("subStyle", [["outline", "Outline"], ["shadow", "Drop shadow"], ["box", "Black bar"]])}
      <label>Text opacity ({p.subOpacity}%)
        <input type="range" min={10} max={100} step={5} value={p.subOpacity} onChange={(e) => setP((o) => ({ ...o, subOpacity: Number(e.target.value) }))} onPointerUp={() => save({ subOpacity: p.subOpacity })} onKeyUp={() => save({ subOpacity: p.subOpacity })} />
      </label>
      <div>Alignment</div>
      {seg("subAlign", [["left", "Left"], ["center", "Center"], ["right", "Right"]])}
      <label>Font
        <select value={p.subFont} onChange={(e) => save({ subFont: e.target.value })}>
          {FONTS.map((f) => <option key={f} value={f}>{f || "Default"}</option>)}
          {p.subFont && !FONTS.includes(p.subFont) && <option value={p.subFont}>{p.subFont}</option>}
        </select>
      </label>
      <label>Or type any installed font name
        <input type="text" value={p.subFont} maxLength={80} onChange={(e) => setP((o) => ({ ...o, subFont: e.target.value }))} onBlur={() => save({ subFont: p.subFont })} />
      </label>
      <div className="sub-preview" style={{ color: p.subColor, opacity: p.subOpacity / 100, fontWeight: p.subBold ? 700 : 400, fontFamily: p.subFont || undefined, textAlign: p.subAlign as "left" | "center" | "right", fontSize: p.subSize / 2.5, textShadow: shadow, background: p.subStyle === "box" ? "rgba(0,0,0,.75)" : undefined }}>
        The quick brown fox jumps over the lazy dog
      </div>

      <h3>Subtitles: styled (ASS/SSA) tracks</h3>
      <div>When a track brings its own fonts and colors</div>
      {seg("assMode", [["keep", "Keep its look"], ["resize", "Use my size"], ["mine", "Use my style"]])}
      {check("subScaleWindow", "Keep embedded subtitle size consistent when the window resizes")}
    </section>
  );
}
