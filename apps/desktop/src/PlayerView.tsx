import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { api } from "./api";
import { formatTime, player, usePlayer, type Segment, type Track } from "./player";
import { DEFAULT_KEYS } from "./keys";
import { loadKeys } from "./views/Hotkeys";
import { loadPlayerPrefs, DEFAULT_PLAYER_PREFS, type PlayerPrefs } from "./views/PlayerSettings";

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
  const [prefs, setPrefs] = useState<PlayerPrefs>(DEFAULT_PLAYER_PREFS);
  const segments = usePlayer((s) => s.segments);
  const playerSession = usePlayer((s) => s.session);
  const [loop, setLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [sleepMin, setSleepMin] = useState(0);
  const volume = useRef(100);
  const [vol, setVol] = useState(100);
  const [aspect, setAspect] = useState("auto");
  const setVolume = (v: number) => {
    volume.current = Math.min(prefs.volumeMax, Math.max(0, v));
    setVol(volume.current);
    return player.command({ type: "setVolume", volume: volume.current });
  };
  const premute = useRef(100);

  useEffect(() => {
    loadKeys(profile).then(setKeys);
    loadPlayerPrefs(profile).then((p) => { volume.current = p.volume; setVol(p.volume); setAspect(p.aspect); setPrefs(p); });
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
        back30: () => c({ type: "seekRelative", seconds: -30 }),
        forward30: () => c({ type: "seekRelative", seconds: 30 }),
        restart: () => c({ type: "seek", seconds: 0 }),
        volumeUp: () => setVolume(volume.current + 5),
        volumeDown: () => setVolume(volume.current - 5),
        mute: () => {
          if (volume.current > 0) premute.current = volume.current;
          return setVolume(volume.current > 0 ? 0 : premute.current);
        },
        speedUp: () => c({ type: "setSpeed", speed: Math.min(4, +(speed + 0.25).toFixed(2)) }),
        speedDown: () => c({ type: "setSpeed", speed: Math.max(0.25, +(speed - 0.25).toFixed(2)) }),
        speedReset: () => c({ type: "setSpeed", speed: 1 }),
        abLoop: () => cycleLoop(),
        screenshot: () => c({ type: "screenshot" }).then(() => onError("Screenshot saved to Pictures")),
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
  }, [keys, speed, profile, onClose, onError]);

  /** First press sets A, second sets B and starts looping, third clears. */
  function cycleLoop() {
    const pos = player.get().clock.position;
    const next = loop.a === null ? { a: pos, b: null } : loop.b === null ? { a: loop.a, b: pos } : { a: null, b: null };
    setLoop(next);
    return player.command({ type: "abLoop", ...next });
  }

  // Sleep timer: stop playback after N minutes.
  useEffect(() => {
    if (!sleepMin) return;
    const t = window.setTimeout(() => { player.command({ type: "stop" }).then(onClose); setSleepMin(0); }, sleepMin * 60_000);
    return () => window.clearTimeout(t);
  }, [sleepMin, onClose]);

  // Clear the loop and sleep timer when a new file loads.
  useEffect(() => { setLoop({ a: null, b: null }); }, [title]);

  const active: Segment | undefined = segments.find((s) => position >= s.start && (s.end === null ? duration - position > 5 : position < s.end - 1));
  useEffect(() => {
    if (!prefs.autoSkip || !active) return;
    // Skip once per segment; the position check above stops it re-triggering after the jump.
    player.command({ type: "seek", seconds: active.end ?? Math.max(duration - 1, 0) });
  }, [active?.start, prefs.autoSkip]); // eslint-disable-line react-hooks/exhaustive-deps

  const showSkip = !!active && (!prefs.skipHideSecs || position - active.start < prefs.skipHideSecs);
  const remaining = duration - position;
  const nextPrompt = prefs.nextPromptSecs > 0 && duration > 0 && remaining > 1 && remaining <= prefs.nextPromptSecs;

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

      {nextPrompt && (
        <button className="skip-btn primary next-ep" onClick={() => player.command({ type: "seek", seconds: Math.max(duration - 0.5, 0) })}>
          Next episode in {Math.ceil(remaining)}s ›
        </button>
      )}

      {prefs.skipButton && active && showSkip && (
        <button className="skip-btn primary" onClick={() => player.command({ type: "seek", seconds: active.end ?? Math.max(duration - 1, 0) })}>
          Skip {active.kind === "intro" ? "intro" : active.kind === "recap" ? "recap" : "credits"} ›
        </button>
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
          <button title={vol > 0 ? "Mute" : "Unmute"} onClick={() => setVolume(vol > 0 ? 0 : premute.current || 100)}>{vol === 0 ? "🔇" : vol < 60 ? "🔉" : "🔊"}</button>
          <input className="vol" type="range" min={0} max={prefs.volumeMax} value={vol} onChange={(e) => { if (vol > 0) premute.current = vol; setVolume(Number(e.target.value)); }} aria-label="Volume" />
          <span className="spacer" />
          {subDelay !== 0 && <span className="small muted">Subs {subDelay > 0 ? "+" : ""}{subDelay} ms</span>}
          <button onClick={() => setMenu(menu === "audio" ? null : "audio")}>Audio</button>
          <button onClick={() => setMenu(menu === "subs" ? null : "subs")}>Subtitles</button>
          <button className={loop.a !== null ? "primary" : ""} title="A-B loop" onClick={() => cycleLoop()}>
            {loop.a === null ? "A-B" : loop.b === null ? `A ${formatTime(loop.a)}` : "Looping"}
          </button>
          {playerSession?.kind === "series" && <button title="Next episode" onClick={onNextEpisode}>⏭</button>}
          <button title="Try another stream" onClick={() => switchToNext(profile, onError)}>⇄ Source</button>
          <button title="Fullscreen" onClick={() => getCurrentWindow().isFullscreen().then((f) => getCurrentWindow().setFullscreen(!f))}>⛶</button>
          <button title="Save screenshot" onClick={() => player.command({ type: "screenshot" }).then(() => onError("Screenshot saved to Pictures"))}>📷</button>
          <select value={sleepMin} onChange={(e) => setSleepMin(Number(e.target.value))} aria-label="Sleep timer" title="Sleep timer">
            <option value={0}>Sleep: off</option>
            {[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>Stop in {m} min</option>)}
          </select>
          <select value={aspect} onChange={(e) => { setAspect(e.target.value); player.command({ type: "aspect", mode: e.target.value }); }} aria-label="Aspect ratio" title="Aspect ratio">
            {[["auto", "Aspect: auto"], ["16:9", "16:9"], ["4:3", "4:3"], ["21:9", "21:9"], ["fill", "Fill"], ["stretch", "Stretch"]].map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
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
