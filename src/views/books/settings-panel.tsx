import { useT } from "@/lib/i18n";
import { setPrefs } from "@/lib/ebook/books";
import type { ReaderPrefs } from "@/lib/ebook/books-core";
import { Segmented, ToggleRow } from "@/views/settings/shared";
import { PanelTitle } from "./reader-shell";

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex justify-between text-[12.5px] text-ink-muted">
        {label}
        <span className="tabular-nums text-ink">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-current"
      />
    </label>
  );
}

export function ReadingSettings({ prefs }: { prefs: ReaderPrefs }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      <PanelTitle>{t("Reading settings")}</PanelTitle>
      <Segmented
        value={prefs.theme}
        options={[
          { value: "light", label: "Light" },
          { value: "sepia", label: "Sepia" },
          { value: "dark", label: "Dark" },
        ]}
        onChange={(theme) => setPrefs({ theme })}
      />
      <Segmented
        value={prefs.layout}
        options={[
          { value: "scroll", label: "Scroll" },
          { value: "paged", label: "Pages" },
        ]}
        onChange={(layout) => setPrefs({ layout })}
      />
      <Segmented
        value={prefs.font}
        options={[
          { value: "serif", label: "Serif" },
          { value: "sans", label: "Sans" },
        ]}
        onChange={(font) => setPrefs({ font })}
      />
      <Slider
        label={t("Text size")}
        value={prefs.fontSize}
        min={12}
        max={36}
        step={1}
        format={(v) => `${v}px`}
        onChange={(fontSize) => setPrefs({ fontSize })}
      />
      <Slider
        label={t("Line spacing")}
        value={prefs.lineHeight}
        min={1.2}
        max={2.2}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(lineHeight) => setPrefs({ lineHeight })}
      />
      <Slider
        label={t("Margins")}
        value={prefs.margin}
        min={8}
        max={160}
        step={4}
        format={(v) => `${v}px`}
        onChange={(margin) => setPrefs({ margin })}
      />
      <ToggleRow
        label={t("Use the book's own styles")}
        sub={t("Off keeps text consistent with your theme. On follows the publisher's layout.")}
        value={prefs.publisherStyles}
        onChange={(publisherStyles) => setPrefs({ publisherStyles })}
      />
    </div>
  );
}
