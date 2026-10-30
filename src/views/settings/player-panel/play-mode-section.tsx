import { Timer } from "../icons";
import { useSettings } from "@/lib/settings";
import { isAndroid } from "@/lib/platform";
import { useT } from "@/lib/i18n";
import { STALL_WAIT_OPTIONS, stallWaitSec } from "@/lib/player/stall-wait";
import { SettingGroup, SettingRow } from "../kit";
import { RowDesc, RowTitle, Segmented, ToggleRow, useRegisterRowTitle } from "../shared";
import { Dropdown } from "@/components/dropdown";
import { mediaServerConnections } from "@/lib/media-server/connections";
import { Anchored, Nested } from "./choice";
import { PressPlayPreview } from "./press-play-preview";
import { PlaybackCacheFolder } from "./playback-cache-folder";
import {
  RememberStreamArt,
  ResumeArt,
  ResumePromptArt,
  SeasonLockArt,
  StallSkipArt,
} from "./setting-art";

export function PlayModeChoice() {
  const { settings, update } = useSettings();
  const t = useT();
  useRegisterRowTitle(t("When you press Play"));
  return (
    <div className="hset-row hset-play-choice">
      <div className="flex min-w-0 flex-col items-start gap-3">
        <div className="flex flex-col gap-1">
          <RowTitle>{t("When you press Play")}</RowTitle>
          <RowDesc>{t("Instant starts the best-ranked stream straight away. Pick a source opens the stream list every time, so you choose the release, quality and provider yourself.")}</RowDesc>
        </div>
        <Segmented<"instant" | "manual">
          value={settings.instantPlay ? "instant" : "manual"}
          options={[
            { value: "instant", label: t("Instant") },
            { value: "manual", label: t("Pick a source") },
          ]}
          onChange={(v) => update({ instantPlay: v === "instant" })}
        />
      </div>
      <PressPlayPreview instant={settings.instantPlay} />
    </div>
  );
}

export function PlayModePanel() {
  const { settings, update } = useSettings();
  const t = useT();

  return (
    <div className="flex flex-col gap-5">
      <SettingGroup label={t("Picture in picture")}>
        <SettingRow
          label={t("Picture in picture style")}
          desc={t(
            "Resize shrinks the Argus window itself, so the app goes with it. Detached moves the video into its own floating window and hands Argus back to you, so you can keep browsing while it plays.",
          )}
        >
          <Segmented<"resize" | "native">
            value={settings.pipBehavior}
            options={[
              { value: "resize", label: t("Resize") },
              { value: "native", label: t("Detached") },
            ]}
            onChange={(value) => update({ pipBehavior: value })}
          />
        </SettingRow>
      </SettingGroup>
      <SettingGroup label={t("Playback")}>
        <SettingRow
          label={t("Where Play looks first")}
          desc={t(
            "Choose whether Play asks you, prefers this device, prefers online sources, or goes straight to one of your home servers.",
          )}
        >
          <Dropdown
            className="w-[280px] max-w-full"
            value={settings.playbackSourcePreference}
            onChange={(value) =>
              update({
                playbackSourcePreference: value as typeof settings.playbackSourcePreference,
              })
            }
            options={[
              { value: "ask", label: t("Ask every time") },
              { value: "online", label: t("Prefer online streams") },
              { value: "local", label: t("Prefer this device") },
              { value: "home-server", label: t("Prefer a home server") },
            ]}
          />
        </SettingRow>
        {settings.playbackSourcePreference === "home-server" && (
          <SettingRow
            wide
            label={t("Preferred home server")}
            desc={t(
              "Ask when more than one server has a copy, or always prefer a specific server.",
            )}
          >
            <div className="w-full max-w-[420px]">
              <Dropdown
                value={settings.preferredMediaServerId ?? ""}
                onChange={(value) => update({ preferredMediaServerId: value || null })}
                options={[
                  { value: "", label: t("Ask which server") },
                  ...mediaServerConnections()
                    .filter((connection) => connection.enabled)
                    .map((connection) => ({ value: connection.id, label: connection.name })),
                ]}
              />
            </div>
          </SettingRow>
        )}
        <PlayModeChoice />
        <ToggleRow
          label={t("Stay on one source for a season")}
          preview={<SeasonLockArt />}
          sub={t(
            "For series and anime, keep playing the rest of the season from the release you first picked. Applies whether Play is instant or manual.",
          )}
          value={settings.seasonSourceLock}
          onChange={(v) => update({ seasonSourceLock: v })}
        />
        <Anchored id="set-instant-playback-preparation">
          <ToggleRow
            label={t("Instant playback preparation")}
            sub={t(
              "Prepares cached debrid sources while you browse the picker so Play can start sooner. May create or update transfers on your debrid account before you press Play. P2P sources are excluded.",
            )}
            value={settings.instantPlaybackPreparation}
            onChange={(v) => update({ instantPlaybackPreparation: v })}
          />
        </Anchored>
        <Anchored id="set-remember-last-stream">
          <ToggleRow
            label={t("Remember last stream")}
            preview={<RememberStreamArt />}
            sub={t(
              "When you resume something you were watching, replay the exact stream you last used (same addon and source) instead of opening the picker again. Turn off to always choose fresh.",
            )}
            value={settings.rememberLastStream}
            onChange={(v) => update({ rememberLastStream: v })}
          />
        </Anchored>
        <ToggleRow
          label={t("Ambient edge glow (Ambilight)")}
          sub={t(
            "Casts a soft, dynamic ambient backlight behind the video player reflecting the colors of the media. Turn off for a pure pitch-black backdrop.",
          )}
          value={settings.ambientGlow}
          onChange={(v) => update({ ambientGlow: v })}
        />
      </SettingGroup>

      <SettingGroup label={t("Resume")}>
        <ToggleRow
          label={t("Resume where you left off")}
          preview={<ResumeArt />}
          sub={t(
            "Pick up partly-watched episodes and movies at your saved spot. Anything watched past 80% always restarts. Turn this off to always start from the beginning, handy if you rewatch shows.",
          )}
          value={settings.resumePlayback}
          onChange={(v) => update({ resumePlayback: v })}
        />
        <ToggleRow
          label={t("Ask to resume or start over")}
          preview={<ResumePromptArt />}
          sub={t(
            "When you hit Play on something you've partly watched, show a prompt to resume from where you left off or start over. Also covers items synced from Stremio or Trakt.",
          )}
          value={settings.resumePrompt}
          onChange={(v) => update({ resumePrompt: v })}
        />
        <ToggleRow
          label={t("Smart resume 5-second rewind")}
          sub={t(
            "Automatically rewinds 5 seconds when resuming playback (past 15 seconds) so you can catch up on dialogue and context effortlessly, matching Netflix and Apple TV+.",
          )}
          value={settings.resumeMicroRewind}
          onChange={(v) => update({ resumeMicroRewind: v })}
        />
      </SettingGroup>

      <SettingGroup label={t("Streams")}>
        <Anchored id="set-auto-skip-stalled-streams">
          <ToggleRow
            label={t("Auto-skip stalled streams")}
            preview={<StallSkipArt />}
            sub={t(
              "If a stream hasn't started playing in time (a dead source or an addon that's down), automatically try the next available stream. Off by default.",
            )}
            value={settings.autoNextStreamOnStall}
            onChange={(v) => update({ autoNextStreamOnStall: v })}
          />
        </Anchored>
        {settings.autoNextStreamOnStall && (
          <Nested>
            <SettingRow
              wide
              icon={<Timer size={18} />}
              label={t("How long to wait first")}
              desc={t(
                "Slow addons and P2P sources often need more than 10 seconds to start. Raise this if streams are being skipped before they get a fair chance.",
              )}
            >
              <Segmented
                value={String(stallWaitSec(settings.autoNextStreamOnStallSec))}
                options={STALL_WAIT_OPTIONS.map((sec) => ({
                  value: String(sec),
                  label: sec >= 60 ? t("1 min") : t("{n} sec", { n: sec }),
                }))}
                onChange={(v) => update({ autoNextStreamOnStallSec: Number(v) })}
              />
            </SettingRow>
          </Nested>
        )}
        <ToggleRow
          label={t("Suggest higher quality streams when found")}
          sub={t(
            "If slower addons or debrid sources finish resolving a better quality release (4K UHD, HDR, Dolby Atmos, or Remux) while watching, suggest switching with one click.",
          )}
          value={settings.suggestQualityUpgrade}
          onChange={(v) => update({ suggestQualityUpgrade: v })}
        />
        <ToggleRow
          label={t("Keep same source on next episode")}
          sub={t(
            "When auto-playing the next episode, keep the same release/source you were just watching instead of Argus's top-ranked stream. Falls back to the best stream if that source isn't available.",
          )}
          value={settings.keepSourceNextEpisode}
          onChange={(v) => update({ keepSourceNextEpisode: v })}
        />
        <ToggleRow
          label={t("Download the whole file while streaming")}
          sub={t(
            "Buffers the whole file in the background as you watch, even while paused, so big remuxes pre-load and you can scrub a cached file with no re-buffering. Works for debrid and P2P streams. Uses more disk and bandwidth; cleared when you switch or close.",
          )}
          value={settings.torrentFullDownload}
          onChange={(v) => update({ torrentFullDownload: v })}
        />
        {!isAndroid() && <PlaybackCacheFolder />}
      </SettingGroup>

      <SettingGroup label={t("Projector & Big Screen")}>
        <ToggleRow
          label={t("Projector display optimization")}
          sub={t(
            "Tuned for LED projectors (Portronics Beem, Wanbo, Egate) and home cinema beams. Boosts midtone contrast, enhances gamma, and activates fast deband to eliminate washed-out projection on walls.",
          )}
          value={settings.projectorModeEnabled}
          onChange={(v) => update({ projectorModeEnabled: v })}
        />
        {settings.projectorModeEnabled && (
          <Nested>
            <SettingRow
              label={t("Midtone contrast boost")}
              desc={t("Compensates for ambient light and low ANSI lumens projection.")}
            >
              <Segmented
                value={String(settings.projectorContrastBoost)}
                options={[
                  { value: "4", label: t("+4 dB") },
                  { value: "8", label: t("+8 dB (Recommended)") },
                  { value: "12", label: t("+12 dB (Daylight)") },
                ]}
                onChange={(v) => update({ projectorContrastBoost: Number(v) })}
              />
            </SettingRow>
            <SettingRow
              label={t("Keystone edge overscan safe-area")}
              desc={t("Shrinks picture margins slightly (0-10%) so physical keystone distortion does not crop video or subtitles.")}
            >
              <Segmented
                value={String(settings.projectorKeystoneOverscan)}
                options={[
                  { value: "0", label: t("None (0%)") },
                  { value: "5", label: t("5% (Standard)") },
                  { value: "8", label: t("8% (High keystone)") },
                ]}
                onChange={(v) => update({ projectorKeystoneOverscan: Number(v) })}
              />
            </SettingRow>
            <ToggleRow
              label={t("Wall high-contrast amber subtitles")}
              sub={t(
                "Renders subtitles with a bold outline and anti-glare warm cream/amber tone to prevent projector light leakage from washing out text.",
              )}
              value={settings.projectorHighContrastSubs}
              onChange={(v) => update({ projectorHighContrastSubs: v })}
            />
          </Nested>
        )}
      </SettingGroup>
    </div>
  );
}
