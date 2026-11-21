import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { SettingRow } from "../kit";
import { Section, Segmented, ToggleRow } from "../shared";
import { UpNextPreview } from "./up-next-preview";

const NEXT_EP_LEADS = [
  { value: "auto", label: "Auto", sec: -1 },
  { value: "off", label: "Off", sec: 0 },
  { value: "30", label: "30s", sec: 30 },
  { value: "45", label: "45s", sec: 45 },
  { value: "60", label: "1 min", sec: 60 },
  { value: "90", label: "1.5 min", sec: 90 },
  { value: "120", label: "2 min", sec: 120 },
] as const;

function nextEpLeadKey(sec: number): string {
  return NEXT_EP_LEADS.find((o) => o.sec === sec)?.value ?? "auto";
}

const END_SCREEN_LEADS = [
  { value: "end", label: "At the end", sec: -1 },
  { value: "off", label: "Off", sec: 0 },
  { value: "30", label: "30s", sec: 30 },
  { value: "60", label: "1 min", sec: 60 },
  { value: "120", label: "2 min", sec: 120 },
  { value: "180", label: "3 min", sec: 180 },
  { value: "300", label: "5 min", sec: 300 },
  { value: "custom", label: "Custom", sec: -2 },
] as const;

function endScreenLeadKey(sec: number): string {
  if (sec === -1) return "end";
  if (sec === 0) return "off";
  return END_SCREEN_LEADS.find((o) => o.sec === sec)?.value ?? "custom";
}

const MAX_LEAD_MIN = 30;

function LeadTimeFields({ value, onChange }: { value: number; onChange: (sec: number) => void }) {
  const t = useT();
  const [minutes, setMinutes] = useState(() => (value > 0 ? String(Math.floor(value / 60)) : ""));
  const [seconds, setSeconds] = useState(() => (value > 0 ? String(value % 60) : ""));
  const last = useRef(value);

  useEffect(() => {
    if (value === last.current) return;
    last.current = value;
    setMinutes(value > 0 ? String(Math.floor(value / 60)) : "");
    setSeconds(value > 0 ? String(value % 60) : "");
  }, [value]);

  const commit = (m: string, s: string) => {
    const rawMin = Math.floor(Number(m) || 0);
    const rawSec = Math.floor(Number(s) || 0);
    const mins = Math.max(0, Math.min(MAX_LEAD_MIN, rawMin));
    const secs = Math.max(0, Math.min(59, rawSec));
    const next = mins * 60 + secs;
    last.current = next;
    onChange(next);
    // Show the clamped value when the typed one was out of range.
    if (mins !== rawMin) setMinutes(mins ? String(mins) : "");
    if (secs !== rawSec) setSeconds(secs ? String(secs) : "");
  };

  const inputClass =
    "w-16 rounded-lg border border-edge-soft bg-canvas px-2 py-1.5 text-center text-[14px] text-ink outline-none focus:border-accent";

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={MAX_LEAD_MIN}
        inputMode="numeric"
        value={minutes}
        onChange={(e) => {
          setMinutes(e.target.value);
          commit(e.target.value, seconds);
        }}
        placeholder="0"
        aria-label={t("Minutes")}
        className={inputClass}
      />
      <span className="text-[13px] text-ink-muted">{t("min")}</span>
      <input
        type="number"
        min={0}
        max={59}
        inputMode="numeric"
        value={seconds}
        onChange={(e) => {
          setSeconds(e.target.value);
          commit(minutes, e.target.value);
        }}
        placeholder="0"
        aria-label={t("Seconds")}
        className={inputClass}
      />
      <span className="text-[13px] text-ink-muted">{t("sec")}</span>
    </div>
  );
}

const END_SCREEN_COUNTDOWNS = [5, 10, 15, 20, 30] as const;

export function UpNextTab() {
  const t = useT();
  const { settings, update } = useSettings();
  const [customLead, setCustomLead] = useState(
    () => endScreenLeadKey(settings.endScreenLeadSec) === "custom",
  );
  return (
    <>
      <Section
        title={t("Next episode prompt")}
        subtitle={t(
          "When the Up Next pill appears before an episode ends. Auto scales to the episode length, so short episodes stop prompting so early. Off hides it.",
        )}
      >
        <Segmented
          value={nextEpLeadKey(settings.nextEpisodeLeadSec)}
          options={NEXT_EP_LEADS.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(v) =>
            update({ nextEpisodeLeadSec: NEXT_EP_LEADS.find((o) => o.value === v)?.sec ?? -1 })
          }
        />
        <UpNextPreview leadSec={settings.nextEpisodeLeadSec} />
        <ToggleRow
          label={t("Auto-play next episode")}
          sub={t(
            "When an episode ends, automatically start the next one. Off lets the episode finish and stop.",
          )}
          value={settings.autoPlayNextEpisode}
          onChange={(v) => update({ autoPlayNextEpisode: v })}
        />
        {settings.autoPlayNextEpisode && (
          <ToggleRow
            label={t("Zero-wait binge preloading")}
            sub={t(
              "Pre-resolves top stream candidates for the next episode in the background during credits so playback starts instantly with 0 buffering delay.",
            )}
            value={settings.zeroWaitBinge}
            onChange={(v) => update({ zeroWaitBinge: v })}
          />
        )}
        {settings.autoPlayNextEpisode && (
          <ToggleRow
            label={t("Ask if you're still watching")}
            sub={t(
              "After several episodes auto-play in a row with no input, pause and check you're still there before continuing. Off by default.",
            )}
            value={settings.stillWatching}
            onChange={(v) => update({ stillWatching: v })}
          />
        )}
        {settings.autoPlayNextEpisode && settings.stillWatching && (
          <SettingRow
            wide
            label={t("Still watching check-in")}
            desc={t("How many episodes auto-play back to back before Argus pauses to ask.")}
          >
            <Segmented
              value={String(settings.stillWatchingAfter)}
              options={[
                { value: "2", label: t("After 2") },
                { value: "3", label: t("After 3") },
                { value: "4", label: t("After 4") },
                { value: "5", label: t("After 5") },
              ]}
              onChange={(v) => update({ stillWatchingAfter: Number(v) })}
            />
          </SettingRow>
        )}
        <ToggleRow
          label={t("Queue drives Next/Previous")}
          sub={t(
            "After the current show's episodes, Next flows into your queue. Off keeps Next/Previous within the current show only.",
          )}
          value={settings.queueDrivesNav}
          onChange={(v) => update({ queueDrivesNav: v })}
        />
      </Section>

      <Section
        title={t("More like this at the end")}
        subtitle={t(
          "Show recommendations when a movie, series finale or anime film finishes. At the end the card fills the screen; before the end the film shrinks to a corner and keeps playing behind it.",
        )}
      >
        <Segmented
          value={customLead ? "custom" : endScreenLeadKey(settings.endScreenLeadSec)}
          options={END_SCREEN_LEADS.map((o) => ({ value: o.value, label: t(o.label) }))}
          onChange={(v) => {
            if (v === "custom") {
              setCustomLead(true);
              const current = settings.endScreenLeadSec;
              const isPreset = END_SCREEN_LEADS.some((o) => o.sec === current);
              if (current <= 0 || isPreset) update({ endScreenLeadSec: 240 });
              return;
            }
            setCustomLead(false);
            update({ endScreenLeadSec: END_SCREEN_LEADS.find((o) => o.value === v)?.sec ?? -1 });
          }}
        />
        {customLead && (
          <SettingRow
            wide
            label={t("Custom lead time")}
            desc={t(
              "Type an exact time up to 30 minutes. Minutes alone count as 00 seconds; seconds alone count as 0 minutes.",
            )}
          >
            <LeadTimeFields
              value={Math.max(0, settings.endScreenLeadSec)}
              onChange={(sec) => update({ endScreenLeadSec: sec })}
            />
          </SettingRow>
        )}
        {settings.endScreenLeadSec !== 0 && (
          <>
            <ToggleRow
              label={t("Countdown")}
              sub={t("Act automatically if nothing is chosen before time runs out.")}
              value={settings.endScreenCountdownSec > 0}
              onChange={(v) => update({ endScreenCountdownSec: v ? 15 : 0 })}
            />
            {settings.endScreenCountdownSec > 0 && (
              <>
                <SettingRow
                  wide
                  label={t("Countdown length")}
                  desc={t("How long Argus waits before acting on the countdown.")}
                >
                  <Segmented
                    value={String(settings.endScreenCountdownSec)}
                    options={END_SCREEN_COUNTDOWNS.map((s) => ({
                      value: String(s),
                      label: t("{n}s", { n: s }),
                    }))}
                    onChange={(v) => update({ endScreenCountdownSec: Number(v) })}
                  />
                </SettingRow>
                <SettingRow
                  wide
                  label={t("When the countdown ends")}
                  desc={t("Close the player, or start whichever recommendation is focused.")}
                >
                  <Segmented
                    value={settings.endScreenOnZero}
                    options={[
                      { value: "close", label: t("Close player") },
                      { value: "play", label: t("Play focused") },
                    ]}
                    onChange={(v) => update({ endScreenOnZero: v === "play" ? "play" : "close" })}
                  />
                </SettingRow>
                <ToggleRow
                  label={t("Show on still-airing series")}
                  sub={t(
                    "Show More Like This recommendations after the latest aired episode, even when future episodes are scheduled or yet to air.",
                  )}
                  value={settings.endScreenStillAiring}
                  onChange={(v) => update({ endScreenStillAiring: v })}
                />
              </>
            )}
          </>
        )}
      </Section>

      <Section
        title={t("Seekr.tv Video Scrub Thumbnails")}
        subtitle={t(
          "Connect a free seekr.tv API key to stream high-speed seek thumbnail previews on the video timeline.",
        )}
      >
        <ToggleRow
          label={t("Enable Seekr.tv Thumbnails")}
          sub={t("Show video frame previews when hovering or scrubbing the progress bar.")}
          value={settings.seekrEnabled}
          onChange={(v) => update({ seekrEnabled: v })}
        />
        {settings.seekrEnabled && (
          <div className="flex flex-col gap-2 pt-2">
            <label className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
              {t("Seekr.tv API Key")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t("Enter your free Seekr API key")}
                value={settings.seekrKey}
                onChange={(e) => update({ seekrKey: e.target.value.trim() })}
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-sm text-ink outline-none transition focus:border-accent"
              />
            </div>
            <p className="text-xs text-ink-subtle">
              {t("Get a free personal API key at")}{" "}
              <a
                href="https://seekr.tv"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline"
              >
                seekr.tv
              </a>
            </p>
          </div>
        )}
      </Section>
    </>
  );
}
