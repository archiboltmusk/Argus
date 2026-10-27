import { useT } from "@/lib/i18n";
import { Section } from "../shared";
import { DesktopOnlyBlock, isTauri } from "../player-panel/internals";
import { AnimeRepairRow, LibraryRepairRow } from "./library-repair-rows";
import { ConnectionHealthSection } from "./connection-health-section";

export function RepairTab() {
  const t = useT();
  const rows = (
    <>
      <LibraryRepairRow />
      <AnimeRepairRow />
    </>
  );
  return (
    <div className="flex flex-col gap-10">
      <ConnectionHealthSection />
      <Section
        title={t("Stremio library repair")}
        subtitle={t(
          "Scans your Stremio library and rewrites any item whose shape doesn't match Stremio's exact schema. Safe to run anytime; only items that need fixing get touched.",
        )}
      >
        {isTauri ? (
          rows
        ) : (
          <div data-tv-skip="">
            <DesktopOnlyBlock>{rows}</DesktopOnlyBlock>
          </div>
        )}
      </Section>
    </div>
  );
}
