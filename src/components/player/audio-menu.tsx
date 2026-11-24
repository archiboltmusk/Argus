import { Check, Languages, RotateCcw, Search, Sliders, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Flag } from "@/components/flag";
import type { TrackInfo } from "@/lib/player/bridge";
import { modalOverlayClose, modalOverlayEmitState, modalOverlayOpen } from "@/lib/modal-overlay";
import { languageName, normalizeLang, trackLanguageName } from "@/lib/subtitles/language";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useMenuSide } from "./menu-side";
import { Tooltip } from "./transport/tooltip";
import { watchOutsideMouseDown } from "@/lib/player/overlay-dismiss";

type Props = {
  tracks: TrackInfo[];
  selectedId: string | null;
  delaySec: number;
  engine: "html5" | "mpv";
  onSelect: (id: string) => void;
  onDelay: (sec: number) => void;
  onOpenChange?: (open: boolean) => void;
  useOverlayPopup?: boolean;
  iconUrl?: string;
};

function buildAudioOverlayState(props: Props) {
  return {
    tracks: props.tracks,
    selectedId: props.selectedId,
    delaySec: props.delaySec,
    engine: props.engine,
  };
}

export function AudioMenu(props: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [forceInline, setForceInline] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { measure } = useMenuSide(wrap, 360);
  const useOverlay = props.useOverlayPopup === true;
  const propsRef = useRef(props);
  propsRef.current = props;
  const onOpenChange = props.onOpenChange;
  useEffect(() => {
    onOpenChange?.(open && (forceInline || !useOverlay));
  }, [open, forceInline, useOverlay, onOpenChange]);

  useEffect(() => {
    if (useOverlay) return;
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    return watchOutsideMouseDown(close);
  }, [open, useOverlay]);

  useEffect(() => {
    if (!useOverlay) return;
    const offs: Array<Promise<UnlistenFn>> = [];
    offs.push(
      listen<{ id: string }>("modal://audio/select", (e) => {
        propsRef.current.onSelect(e.payload.id);
      }),
    );
    offs.push(
      listen<{ sec: number }>("modal://audio/delay", (e) => {
        propsRef.current.onDelay(e.payload.sec);
      }),
    );
    offs.push(listen("modal://closed", () => setOpen(false)));
    return () => offs.forEach((p) => p.then((fn) => fn()).catch(() => {}));
  }, [useOverlay]);

  useEffect(() => {
    if (!useOverlay || !open) return;
    void modalOverlayEmitState("audio", buildAudioOverlayState(props));
  }, [useOverlay, open, props.tracks, props.selectedId, props.delaySec, props.engine]);

  useEffect(() => {
    return () => {
      if (useOverlay && open) void modalOverlayClose();
    };
  }, [useOverlay, open]);

  const handleClick = () => {
    if (!open) measure();
    if (!useOverlay) {
      setOpen((v) => !v);
      return;
    }
    if (open) {
      void modalOverlayClose();
      setOpen(false);
      setForceInline(false);
    } else {
      void modalOverlayOpen("audio", buildAudioOverlayState(propsRef.current))
        .then(() => {
          setOpen(true);
          setForceInline(false);
        })
        .catch(() => {
          setOpen(true);
          setForceInline(true);
        });
    }
  };

  return (
    <div ref={wrap} className="relative">
      <Tooltip label={t("Audio tracks")}>
        <button
          type="button"
          onClick={handleClick}
          aria-label={t("Audio")}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
            open ? "bg-white/22 text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
          }`}
        >
          {props.iconUrl ? (
            <img src={props.iconUrl} alt="" className="h-[22px] w-[22px] shrink-0 select-none object-contain" draggable={false} />
          ) : (
            <Languages size={19} strokeWidth={2} />
          )}
        </button>
      </Tooltip>
      {open && (forceInline || !useOverlay) && (
        <div className="fixed end-14 bottom-[150px] flex max-h-[calc(100vh-174px)] w-[360px] max-w-[calc(100vw-72px)] flex-col overflow-hidden apple-liquid-glass animate-menu-pop z-50 text-white">
          <AudioMenuBody {...props} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

export function AudioMenuBody(props: Props & { onClose: () => void }) {
  return <MenuBody {...props} />;
}

/** Two or three tracks are read at a glance; a dozen dubs are not. */
const SEARCH_FROM = 5;

const fold = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** Finds a language typed in its own script as readily as in English. */
function trackMatches(track: TrackInfo, query: string): boolean {
  const wanted = normalizeLang(query);
  if (wanted && track.lang && normalizeLang(track.lang) === wanted) return true;
  const haystack = [track.title, track.lang && languageName(track.lang), track.codec, track.channels];
  return fold(haystack.filter(Boolean).join(" ")).includes(fold(query));
}

function MenuBody(props: Props & { onClose: () => void }) {
  const t = useT();
  const { tracks, selectedId, onSelect, onClose, delaySec, onDelay, engine } = props;
  const [query, setQuery] = useState("");
  const searchable = tracks.length >= SEARCH_FROM;
  const shown = useMemo(() => {
    const term = query.trim();
    if (!searchable || !term) return tracks;
    return tracks.filter((track) => trackMatches(track, term));
  }, [tracks, query, searchable]);
  return (
    <div className="flex h-full flex-col overflow-hidden text-white">
      <header className="flex flex-col gap-2.5 border-b border-white/10 px-4 py-3 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[13.5px] font-bold text-white">{t("Audio")}</span>
            {tracks.length > 0 && (
              <span className="text-[11.5px] tabular-nums text-ink-subtle">{shown.length}</span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t("Close")}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={13} strokeWidth={2.2} />
          </button>
        </div>
        {searchable && (
          <div className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/12 px-2.5 py-1.5 backdrop-blur-md">
            <Search size={13} strokeWidth={2.2} className="shrink-0 text-white/60" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search audio language")}
              aria-label={t("Search audio language")}
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-white outline-none placeholder:text-white/50"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label={t("Clear")}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X size={11} strokeWidth={2.4} />
              </button>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {searchable && query.trim() && shown.length === 0 ? (
          <div className="px-3 py-4 text-[12.5px] leading-relaxed text-white/70">
            {t("No audio track in that language.")}
          </div>
        ) : (
          <TrackSection
            tracks={shown}
            selectedId={selectedId}
            engine={engine}
            onSelect={(id) => {
              onSelect(id);
              onClose();
            }}
          />
        )}
      </div>

      <AudioEnhancementSection engine={engine} />
      <DelayRow delay={delaySec} onDelay={onDelay} disabled={engine === "html5"} />
    </div>
  );
}

function AudioEnhancementSection({ engine }: { engine: "html5" | "mpv" }) {
  const t = useT();
  const { settings, update } = useSettings();
  const [eqOpen, setEqOpen] = useState(false);
  if (engine === "html5") return null;

  const current = settings.audioProfile ?? "off";

  const profiles: Array<{ id: typeof settings.audioProfile; label: string }> = [
    { id: "off", label: t("Flat") },
    { id: "speech-clarity", label: t("Speech Clarity") },
    { id: "voice_clarity", label: t("Neural Voice Clarity") },
    { id: "dialogue-isolation", label: t("Dialogue Isolation") },
    { id: "night", label: t("Night Mode") },
    { id: "spatial-3d", label: t("3D Spatial Audio") },
    { id: "studio_podcast", label: t("Studio Broadcast") },
    { id: "whisper", label: t("Whisper Vocal Isolate") },
    { id: "dialogue-ducking", label: t("Dialogue Auto-Ducking") },
    { id: "bass", label: t("Bass Boost") },
  ];

  const eqFrequencies = [
    "31Hz",
    "63Hz",
    "125Hz",
    "250Hz",
    "500Hz",
    "1kHz",
    "2kHz",
    "4kHz",
    "8kHz",
    "16kHz",
  ];
  const eqBands = settings.audioEqualizerBands?.length === 10
    ? settings.audioEqualizerBands
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  const handleBandChange = (index: number, val: number) => {
    const next = [...eqBands];
    next[index] = val;
    update({ audioEqualizerBands: next, audioEqualizerEnabled: true });
  };

  const handleResetEq = () => {
    update({ audioEqualizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], audioEqualizerEnabled: false });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-3 bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-white/90">{t("Audio Enhancement")}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEqOpen(!eqOpen)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
              eqOpen || settings.audioEqualizerEnabled
                ? "bg-white/25 text-white ring-1 ring-white/30 shadow-xs"
                : "bg-white/8 text-white/70 hover:bg-white/16 hover:text-white border border-white/8"
            }`}
          >
            <Sliders className="h-3 w-3" />
            {t("10-Band EQ")}
          </button>
          <button
            type="button"
            onClick={() => update({ audioNormalize: !settings.audioNormalize })}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
              settings.audioNormalize
                ? "bg-white/25 text-white ring-1 ring-white/30 shadow-xs"
                : "bg-white/8 text-white/70 hover:bg-white/16 hover:text-white border border-white/8"
            }`}
          >
            {settings.audioNormalize ? t("Normalized") : t("Normalize")}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {profiles.map((p) => {
          const isSel = current === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => update({ audioProfile: p.id })}
              className={`flex items-center justify-center rounded-xl px-2.5 py-2 text-[11.5px] transition-all ${
                isSel
                  ? "bg-white text-black font-bold shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-1 ring-white/40"
                  : "bg-white/8 text-white/80 font-medium hover:bg-white/16 hover:text-white border border-white/8"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {eqOpen && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-black/30 p-3 border border-white/12 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold text-white flex items-center gap-1.5">
              <Sliders className="h-3 w-3 text-white" />
              {t("10-Band Graphic Equalizer")}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update({ audioEqualizerEnabled: !settings.audioEqualizerEnabled })}
                className={`text-[10.5px] font-bold transition-colors ${
                  settings.audioEqualizerEnabled ? "text-white underline" : "text-white/60 hover:text-white"
                }`}
              >
                {settings.audioEqualizerEnabled ? t("Active") : t("Bypassed")}
              </button>
              <button
                type="button"
                onClick={handleResetEq}
                className="text-[10.5px] text-white/60 hover:text-white transition-colors"
              >
                {t("Reset")}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 pt-1">
            {eqFrequencies.map((freq, idx) => {
              const gain = eqBands[idx] ?? 0;
              return (
                <div key={freq} className="flex flex-col items-center gap-1">
                  <span className="text-[9.5px] font-mono text-white/70">{freq}</span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={gain}
                    onChange={(e) => handleBandChange(idx, Number(e.target.value))}
                    className="h-16 w-3 accent-white cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                  />
                  <span className="text-[9.5px] font-mono text-white/60">
                    {gain > 0 ? `+${gain}` : gain}dB
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TrackSection({
  tracks,
  selectedId,
  engine,
  onSelect,
}: {
  tracks: TrackInfo[];
  selectedId: string | null;
  engine: "html5" | "mpv";
  onSelect: (id: string) => void;
}) {
  const tr = useT();
  if (tracks.length === 0) {
    return (
      <div className="px-3 py-4 text-[12.5px] leading-relaxed text-white/70">
        {engine === "mpv"
          ? tr("This file has one audio track.")
          : tr(
              "Track switching isn't supported on the current engine. The file's default audio is playing.",
            )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {tracks.map((t) => {
        const isSel = t.id === selectedId;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-start transition-all ${
              isSel
                ? "bg-white/20 text-white font-semibold ring-1 ring-white/25 shadow-xs"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                isSel ? "bg-white text-black" : "bg-white/15 text-white/40"
              }`}
              aria-hidden
            >
              {isSel ? <Check size={9} strokeWidth={3} /> : null}
            </span>
            {t.lang && (
              <span className="mt-0.5 shrink-0">
                <Flag language={trackLanguageName(t.lang, t.title)} size="sm" showLabel={false} />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[13px] font-semibold leading-snug text-white">
                {trackTitle(t, tr)}
              </span>
              <span className="truncate text-[10.5px] uppercase tracking-[0.1em] text-white/60">
                {trackSubtitle(t, tr)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function trackTitle(t: TrackInfo, tr: (key: string) => string): string {
  if (t.title && t.title.trim() && t.title !== t.lang) return t.title;
  if (t.lang) return languageName(t.lang);
  return t.label || tr("Track");
}

function trackSubtitle(t: TrackInfo, tr: (key: string) => string): string {
  const parts: string[] = [];
  if (t.lang) parts.push(trackLanguageName(t.lang, t.title));
  if (t.codec) parts.push(t.codec);
  if (t.channels) parts.push(t.channels);
  if (t.default) parts.push(tr("Default"));
  return parts.filter(Boolean).join(" · ");
}

function DelayRow({
  delay,
  onDelay,
  disabled,
}: {
  delay: number;
  onDelay: (sec: number) => void;
  disabled: boolean;
}) {
  const tr = useT();
  const round = (v: number) => Math.round(v * 100) / 100;
  return (
    <div
      className={`flex flex-col gap-2.5 px-4 py-3 border-t border-white/10 bg-white/[0.02] ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-white/90">
          {tr("Sync Offset")}
        </span>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[13px] font-bold tabular-nums ${delay !== 0 ? "text-white" : "text-white/60"}`}>
            {delay > 0 ? "+" : ""}
            {delay.toFixed(2)}s
          </span>
          {delay !== 0 && !disabled && (
            <button
              onClick={() => onDelay(0)}
              aria-label={tr("Reset sync")}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <RotateCcw size={12} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex items-stretch overflow-hidden rounded-lg bg-white/10 border border-white/10">
        <button
          disabled={disabled}
          onClick={() => onDelay(round(delay - 0.1))}
          className="flex-1 px-2 py-1.5 text-[12px] font-semibold tabular-nums text-white/85 transition-colors hover:bg-white/15 hover:text-white active:scale-95 disabled:cursor-not-allowed"
        >
          −0.1s
        </button>
        <div className="w-px bg-white/10" />
        <button
          disabled={disabled}
          onClick={() => onDelay(round(delay + 0.1))}
          className="flex-1 px-2 py-1.5 text-[12px] font-semibold tabular-nums text-white/85 transition-colors hover:bg-white/15 hover:text-white active:scale-95 disabled:cursor-not-allowed"
        >
          +0.1s
        </button>
      </div>
    </div>
  );
}

