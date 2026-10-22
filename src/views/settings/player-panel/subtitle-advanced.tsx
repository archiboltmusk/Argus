import { fillStyle, SliderReset } from "@/components/slider";
import { DEFAULT } from "@/lib/settings/defaults";
import { useSettings, type Settings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { WORD_HOVER_LANGUAGES } from "@/lib/dictionary";
import { Dropdown } from "@/components/dropdown";
import { ToggleRow } from "../shared";
import { SettingGroup, SettingRow } from "../kit";

const SLIDER_WRAP = "flex h-11 w-full max-w-[520px] items-center gap-4";
const SLIDER_VALUE = "w-[64px] shrink-0 text-end text-[15.5px] tabular-nums text-ink-muted";

type NumKey = "subShadowBlur" | "subMarginX";

function NumberSlider({
  field,
  label,
  desc,
  min,
  max,
  unit,
}: {
  field: NumKey;
  label: string;
  desc: string;
  min: number;
  max: number;
  unit: string;
}) {
  const { settings, update } = useSettings();
  const value = settings[field];
  return (
    <SettingRow wide label={label} desc={desc}>
      <div className={SLIDER_WRAP}>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => update({ [field]: Number(e.target.value) } as Partial<Settings>)}
          aria-label={label}
          className="argus-slider h-11 min-w-0 flex-1"
          style={fillStyle(value, min, max, 1)}
        />
        <span className={SLIDER_VALUE}>{`${value}${unit}`}</span>
        <SliderReset
          show={value !== DEFAULT[field]}
          onReset={() => update({ [field]: DEFAULT[field] } as Partial<Settings>)}
        />
      </div>
    </SettingRow>
  );
}

export function SubtitleAdvancedGroups() {
  const t = useT();
  const { settings, update } = useSettings();
  return (
    <>
      <SettingGroup label={t("Advanced styling")}>
        <NumberSlider
          field="subShadowBlur"
          label={t("Shadow blur")}
          desc={t("Softens the shadow behind subtitles. 0 keeps the default look.")}
          min={0}
          max={12}
          unit="px"
        />
        <NumberSlider
          field="subMarginX"
          label={t("Side margin")}
          desc={t("Distance kept free at the left and right edges on the mpv engine.")}
          min={0}
          max={200}
          unit=""
        />
        <SettingRow
          wide
          label={t("ASS style overrides")}
          desc={t("Raw mpv overrides applied to styled subtitles, such as Fontname=Arial,Outline=3,Spacing=1. Invalid entries are ignored. Mpv engine only.")}
        >
          <input
            value={settings.subAssStyleOverrides}
            onChange={(e) => update({ subAssStyleOverrides: e.target.value })}
            spellCheck={false}
            placeholder="Fontname=Arial,Outline=3"
            aria-label={t("ASS style overrides")}
            className="h-10 w-full max-w-[520px] rounded-[10px] border border-edge-soft bg-elevated px-3 font-mono text-[14px] text-ink outline-none focus-visible:border-edge"
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup label={t("Word lookup")}>
        <ToggleRow
          label={t("Look up words on hover")}
          sub={t(
            "Hover a word in the subtitles to see its definition and pronunciation. Works with Argus's own subtitle display, not picture-based or styled subtitles drawn by mpv. Sends the hovered word to dictionaryapi.dev and Wiktionary.",
          )}
          value={settings.subWordHover}
          onChange={(v) => update({ subWordHover: v })}
        />
        {settings.subWordHover && (
          <SettingRow
            label={t("Subtitle language")}
            desc={t("The language of the words you are looking up. Definitions are in English.")}
          >
            <Dropdown
              value={settings.subWordHoverLang}
              options={WORD_HOVER_LANGUAGES.map((l) => ({ value: l.code, label: t(l.label) }))}
              onChange={(v) => update({ subWordHoverLang: v })}
            />
          </SettingRow>
        )}
      </SettingGroup>
    </>
  );
}
