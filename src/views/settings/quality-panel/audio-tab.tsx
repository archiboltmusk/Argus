import { Dropdown } from "@/components/dropdown";
import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { listMpvAudioDevices, type MpvAudioDevice } from "@/lib/player/mpv";
import { SettingRow } from "../kit";
import { Section, Segmented, ToggleRow } from "../shared";
import { PASSTHROUGH_CODECS, sanitizePassthroughCodecs, type PassthroughCodec } from "@/lib/player/passthrough";
import { AudioProfilePreview } from "./audio-profile-preview";
import { VolumeBoostPreview } from "./volume-boost-preview";

const VOLUME_BOOST_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "1", label: "100%" },
  { value: "1.5", label: "150%" },
  { value: "2", label: "200%" },
  { value: "3", label: "300%" },
  { value: "4", label: "400%" },
  { value: "6", label: "600%" },
];

export function AudioTab() {
  const t = useT();
  const { settings, update } = useSettings();
  return (
    <Section
      title={t("Audio")}
      subtitle={t("Shape the sound without touching your system EQ. Applies on the mpv engine; the HTML5 engine plays audio untouched.")}
    >
      <ToggleRow
        label={t("Normalize loudness")}
        sub={t("Evens out quiet dialogue and loud action scenes with a dynamic normalizer.")}
        value={settings.audioNormalize}
        onChange={(v) => update({ audioNormalize: v })}
      />
      <ToggleRow
        label={t("Mix surround sound down to stereo")}
        sub={t("Turn on if you watch on a laptop or headphones and dialogue feels too quiet next to the effects. Leave off if you have a real surround setup or a soundbar.")}
        value={settings.mpvDownmixStereo}
        onChange={(v) => update({ mpvDownmixStereo: v })}
      />
      <ToggleRow
        label={t("Bitstream passthrough")}
        sub={t("Send Dolby Digital, Dolby Digital Plus (Atmos), TrueHD and DTS to an AV receiver over HDMI or optical without decoding. Volume boost, the normalizer and sound profiles cannot change a bitstream, and passthrough needs an output device that accepts it. Leave off for speakers or headphones.")}
        value={settings.mpvPassthrough}
        onChange={(v) => update({ mpvPassthrough: v })}
      />
      {settings.mpvPassthrough && (
        <SettingRow wide label={t("Passthrough formats")} desc={t("Only the ticked formats are sent as-is. The rest are decoded normally.")}>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {PASSTHROUGH_CODECS.map((c) => {
              const active = sanitizePassthroughCodecs(settings.mpvPassthroughCodecs);
              const on = active.includes(c.id);
              return (
                <label key={c.id} className="flex items-center gap-2 text-[12.5px] text-ink">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      update({
                        mpvPassthroughCodecs: (on
                          ? active.filter((x) => x !== c.id)
                          : [...active, c.id]) as PassthroughCodec[],
                      })
                    }
                  />
                  {t(c.label)}
                </label>
              );
            })}
          </div>
        </SettingRow>
      )}
      <SettingRow
        wide
        label={t("Sound profile")}
        desc={t("Night mode gently compresses loud moments for late-night watching. Profiles take effect when the next track loads and stack with the normalizer.")}
      >
        <div className="flex w-full flex-col gap-3">
          <Segmented
            value={settings.audioProfile}
            options={[
              { value: "off", label: t("Flat") },
              { value: "bass", label: t("Bass boost") },
              { value: "voice", label: t("Vocal clarity") },
              { value: "bass-reduce", label: t("Less bass") },
              { value: "night", label: t("Night mode") },
            ]}
            onChange={(v) => update({ audioProfile: v })}
          />
          <AudioProfilePreview profile={settings.audioProfile} />
        </div>
      </SettingRow>
      <SettingRow
        wide
        label={t("Maximum volume boost")}
        desc={t("How far you can boost past 100 percent on the volume bar. Higher settings can get very loud.")}
      >
        <div className="flex w-full flex-col gap-3">
          <Segmented
            value={String(settings.volumeBoostMax)}
            options={VOLUME_BOOST_OPTIONS}
            onChange={(v) => update({ volumeBoostMax: Number(v) })}
          />
          <VolumeBoostPreview max={settings.volumeBoostMax} />
        </div>
      </SettingRow>
      <AudioOutputRow />
      <ToggleRow
        label={t("Remember audio delay per title")}
        sub={t("Keeps the sync fix you made with Alt+Z / Alt+X (50 ms steps) for that title next time you play it.")}
        value={settings.audioDelayRemember}
        onChange={(v) => update({ audioDelayRemember: v })}
      />
      <SettingRow
        wide
        label={t("Wireless output delay")}
        desc={t("Extra delay for Bluetooth or AirPlay speakers whose sound arrives late. Added to every title. Start at 0 and raise it until lips match.")}
      >
        <Segmented
          value={String(settings.audioOutputLatencyMs)}
          options={[
            { value: "0", label: t("Off") },
            { value: "100", label: "100 ms" },
            { value: "200", label: "200 ms" },
            { value: "300", label: "300 ms" },
            { value: "400", label: "400 ms" },
          ]}
          onChange={(v) => update({ audioOutputLatencyMs: Number(v) })}
        />
      </SettingRow>
    </Section>
  );
}

function AudioOutputRow() {
  const t = useT();
  const { settings, update } = useSettings();
  const [devices, setDevices] = useState<MpvAudioDevice[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    listMpvAudioDevices()
      .then((d) => alive && setDevices(d))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);
  const known = settings.audioDevice === "" || devices.some((d) => d.name === settings.audioDevice);
  return (
    <SettingRow
      wide
      label={t("Output device")}
      desc={
        loading
          ? t("Detecting devices...")
          : t("Send audio to specific speakers, headphones or a receiver. System default follows your system's audio output.")
      }
    >
      <div className="w-full max-w-[420px]">
        <Dropdown
          size="md"
          value={settings.audioDevice}
          onChange={(v) => update({ audioDevice: v })}
          options={[
            { value: "", label: t("System default") },
            ...devices.map((d) => ({ value: d.name, label: d.description || d.name })),
            ...(known ? [] : [{ value: settings.audioDevice, label: settings.audioDevice }]),
          ]}
        />
      </div>
    </SettingRow>
  );
}
