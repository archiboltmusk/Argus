import { useProfiles } from "@/lib/profiles";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/settings";
import type { Settings } from "@/lib/settings/types";
import { useT } from "@/lib/i18n";
import { ACCESSIBILITY_PRESETS } from "@/lib/player/accessibility-presets";
import { clearSourceMemory } from "@/lib/player/source-memory";
export function AccessibilityPresets() {
  const { settings, update } = useSettings();
  const { activeProfile } = useProfiles();
  const t = useT();
  const previous = useRef<Partial<Settings> | null>(null);
  const [undo, setUndo] = useState(false);
  const [cleared, setCleared] = useState(false);
  useEffect(() => {
    previous.current = null;
    setUndo(false);
  }, [activeProfile?.id]);
  function apply(patch: Partial<Settings>) {
    previous.current = Object.fromEntries(
      Object.keys(patch).map((key) => [key, settings[key as keyof Settings]]),
    );
    update(patch);
    setUndo(true);
  }
  return (
    <section className="mb-6 rounded-xl border border-edge p-4">
      <h2 className="font-semibold">{t("Accessibility presets")}</h2>
      <p className="my-2 text-sm text-ink-subtle">
        {t(
          "Applies to your current settings scope. Linked profiles share these preferences; independent profiles keep their own.",
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["readable", "Readable subtitles"],
            ["dialogue", "Clear dialogue"],
            ["comfortable", "Larger controls and less motion"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="rounded-lg border border-edge px-3 py-3"
            onClick={() => apply(ACCESSIBILITY_PRESETS[id])}
          >
            {t(label)}
          </button>
        ))}
        {undo && (
          <button
            type="button"
            className="rounded-lg border border-edge px-3 py-3"
            onClick={() => {
              if (previous.current) update(previous.current);
              setUndo(false);
            }}
          >
            {t("Undo preset")}
          </button>
        )}
        <button
          type="button"
          className="rounded-lg border border-edge px-3 py-3"
          onClick={() => {
            clearSourceMemory();
            setCleared(true);
          }}
        >
          {cleared ? t("Source memory cleared") : t("Forget working source preferences")}
        </button>
      </div>
    </section>
  );
}
