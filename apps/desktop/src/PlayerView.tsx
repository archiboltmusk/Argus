import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "./api";
import { formatTime, player, usePlayer, type Track } from "./player";

/** Default keys; users override them in Settings (stored as JSON). */
export const DEFAULT_KEYS: Record<string, string> = {
  togglePause: " ",
  back10: "ArrowLeft",
  forward10: "ArrowRight",
  subEarlier: "z",
  subLater: "x",
  fullscreen: "f",
  nextStream: "n",
  stop: "Escape",
};

function trackLabel(t: Track) {
  const parts = [t.lang?.toUpperCase(), t.title, t.codec?.toUpperCase(), t.channels ? `${t.channels}ch` : null, t.forced ? "Forced" : null, t.external ? "External" : null];
  return parts.filter(Boolean).join(" · ") || `Track ${t.id}`;
}

/** Plays the next-ranked stream from the same position (spec feature 5). */
async function switchToNext(profile: number, onError: (s: string) => void) {
  const { streams, current, clock, session } = player.get();
  const cur = streams[current]?.stream;
  const nextIdx = streams.findIndex((r, i) => i > current && !(r.stream.infoHash && r.stream.infoHash === cur?.infoHash) && !(r.stream.url && r.stream.url === cur?.url));
  if (nextIdx < 0 || !session) return onError("No other stream to try.");
  try {
    const next = streams[nextIdx].stream;
    const url = await api.resolveStream(profile, next);
    player.setCurrent(nextIdx);
    await player.load(url, clock.position, { ...session, fileKey: next.infoHash ?? url }, streams, nextIdx);
  } catch (e) {
    onError(String(e));
  }
}

export function PlayerView({ profile, onClose, onError, onNextEpisode }: {
  profile: number;
  onClose: () => void;
  onError: (s: string) => void;
  onNextEpisode: () => void;
}) {
  const visible = usePlayer((s) => s.visible);
  const position = usePlayer((s) => Math.floor(s.clock.position));
  const duration = usePlayer((s) => s.clock.duration);
  const paused = usePlayer((s) => s.clock.paused);
  const buffering = usePlayer((s) => s.clock.buffering);
  const subDelay = usePlayer((s) => s.clock.subDelayMs);
  const speed = usePlayer((s) => s.clock.speed);
  const tracks = usePlayer((s) => s.tracks);
  const stalled = usePlayer((s) => s.stalled);
  const ended = usePlayer((s) => s.ended);
  const title = usePlayer((s) => s.session?.name);
  const [keys, setKeys] = useState(DEFAULT_KEYS);
  const [menu, setMenu] = useState<null | "audio" | "subs">(null);
  const [downmix, setDownmix] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<number>(undefined);

  useEffect(() => {
    api.getSetting(profile, "player.keys").then((j) => j && setKeys({ ...DEFAULT_KEYS, ...JSON.parse(j) })).catch(() => {});
  }, [profile]);

  useEffect(() => {
    if (!ended) return;
    if (ended.error) onError(`Playback failed: ${ended.error}`);
    else if (ended.eof) onNextEpisode();
    player.clearEnded();
  }, [ended, onError, onNextEpisode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const action = Object.entries(keys).find(([, k]) => k === e.key)?.[0];
      if (!action) return;
      e.preventDefault();
      const c = player.command;
      const actions: Record<string, () => unknown> = {
        togglePause: () => c({ type: "togglePause" }),
        back10: () => c({ type: "seekRelative", seconds: -10 }),
        forward10: () => c({ type: "seekRelative", seconds: 10 }),
        subEarlier: () => c({ type: "subDelayStep", steps: -1 }),
        subLater: () => c({ type: "subDelayStep", steps: 1 }),
        fullscreen: async () => {
          const w = getCurrentWindow();
          await w.setFullscreen(!(await w.isFullscreen()));
        },
        nextStream: () => switchToNext(profile, onError),
        stop: () => c({ type: "stop" }).then(onClose),
      };
      actions[action]?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keys, profile, onClose, onError]);

  const poke = () => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 2500);
  };

  if (!visible) return null;
  const audio = tracks.filter((t) => t.kind === "audio");
  const subs = tracks.filter((t) => t.kind === "sub");

  return (
    <div className={idle && !paused ? "player idle" : "player"} onMouseMove={poke} onDoubleClick={() => getCurrentWindow().isFullscreen().then((f) => getCurrentWindow().setFullscreen(!f))}>
      <div className="player-top">
        <button onClick={() => player.command({ type: "stop" }).then(onClose)}>← Back</button>
        <span className="player-title">{title}</span>
      </div>

      {(buffering || stalled) && (
        <div className="player-center">
          {stalled ? (
            <div className="stall">
              <p>This stream is stuck buffering.</p>
              <button className="primary" onClick={() => switchToNext(profile, onError)}>Try next stream ({keys.nextStream.toUpperCase()})</button>
            </div>
          ) : (
            <div className="spinner" aria-label="Buffering" />
          )}
        </div>
      )}

      <div className="player-bottom" onClick={(e) => e.stopPropagation()}>
        <input
          className="seek"
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={1}
          value={position}
          onChange={(e) => player.command({ type: "seek", seconds: Number(e.target.value) })}
          aria-label="Seek"
        />
        <div className="player-controls">
          <button onClick={() => player.command({ type: "togglePause" })}>{paused ? "▶︎" : "❚❚"}</button>
          <button onClick={() => player.command({ type: "seekRelative", seconds: -10 })}>−10</button>
          <button onClick={() => player.command({ type: "seekRelative", seconds: 10 })}>+10</button>
          <span className="time">{formatTime(position)} / {formatTime(duration)}</span>
          <span className="spacer" />
          {subDelay !== 0 && <span className="small muted">Subs {subDelay > 0 ? "+" : ""}{subDelay} ms</span>}
          <button onClick={() => setMenu(menu === "audio" ? null : "audio")}>Audio</button>
          <button onClick={() => setMenu(menu === "subs" ? null : "subs")}>Subtitles</button>
          <select value={speed} onChange={(e) => player.command({ type: "setSpeed", speed: Number(e.target.value) })} aria-label="Speed">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </div>
        {menu === "audio" && (
          <div className="menu">
            {audio.map((t) => <button key={t.id} onClick={() => player.command({ type: "setAudio", id: t.id }).then(() => setMenu(null))}>{trackLabel(t)}</button>)}
            <label className="check">
              <input type="checkbox" checked={downmix} onChange={(e) => { setDownmix(e.target.checked); player.command({ type: "setDownmix", enabled: e.target.checked }); }} />
              Stereo downmix
            </label>
          </div>
        )}
        {menu === "subs" && (
          <div className="menu">
            <button onClick={() => player.command({ type: "setSub", id: null }).then(() => setMenu(null))}>Off</button>
            {subs.map((t) => (
              <span key={t.id} className="sub-row">
                <button onClick={() => player.command({ type: "setSub", id: t.id }).then(() => setMenu(null))}>{trackLabel(t)}</button>
                <button className="small" title="Show as second subtitle" onClick={() => player.command({ type: "setSecondarySub", id: t.id })}>+2nd</button>
              </span>
            ))}
            <div className="sub-delay">
              <button onClick={() => player.command({ type: "subDelayStep", steps: -1 })}>−50 ms</button>
              <span>{subDelay} ms</span>
              <button onClick={() => player.command({ type: "subDelayStep", steps: 1 })}>+50 ms</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
