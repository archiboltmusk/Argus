import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { Section, ToggleRow } from "./shared";

export function EbookSection() {
  const t = useT();
  const { settings, update } = useSettings();
  return (
    <Section
      title={t("Books")}
      subtitle={t(
        "Read EPUB and PDF files from your computer in a Books tab inside Library. Argus ships no books and reads your files where they are.",
      )}
    >
      <ToggleRow
        label={t("Ebook reader")}
        sub={t("Adds a Books tab to Library with a reader that remembers your place.")}
        value={settings.ebookReader}
        onChange={(v) => update({ ebookReader: v })}
      />
    </Section>
  );
}
