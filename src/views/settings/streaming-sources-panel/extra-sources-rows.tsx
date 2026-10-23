import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { Section, ToggleRow } from "../shared";
import { WebDavSection } from "../webdav-section";
import { VideoFeedsSection } from "../video-feeds-section";
import { IndexersSection } from "../indexers-section";

export function ExtraSourcesRows() {
  const t = useT();
  const { settings, update } = useSettings();
  return (
    <>
      <Section
        title={t("Your indexers")}
        subtitle={t(
          "Add your own Torznab or Newznab endpoints (Jackett, Prowlarr, a Usenet indexer). Argus ships none and only searches the ones you add.",
        )}
      >
        <IndexersSection />
        <ToggleRow
          label={t("Internet Archive")}
          sub={t("Search archive.org for public-domain films when you open a movie. Titles and years must match exactly.")}
          value={settings.internetArchive}
          onChange={(internetArchive) => update({ internetArchive })}
        />
      </Section>
      <Section title={t("Addon directories")}>
        <ToggleRow
          label={t("Community addon directories")}
          sub={t("Show addons from public directories in the addon store. Off by default; Argus lists no sources of its own. Reopen the addon store after changing.")}
          value={settings.communityAddonDirectories}
          onChange={(communityAddonDirectories) => update({ communityAddonDirectories })}
        />
      </Section>
      <WebDavSection />
      <VideoFeedsSection />
      <Section title={t("Title matching")}>
        <ToggleRow
          label={t("Match alternate and regional titles")}
          sub={t("Looks up other names for a title (TMDB, TVmaze, AniList) so differently named releases still match.")}
          value={settings.metadataFusion}
          onChange={(metadataFusion) => update({ metadataFusion })}
        />
        <ToggleRow
          label={t("English title fallback")}
          sub={t("When a title is in a non-Latin script, also show its English name on the detail page. Needs alternate-title matching.")}
          value={settings.englishTitleFallback}
          onChange={(englishTitleFallback) => update({ englishTitleFallback })}
        />
      </Section>
    </>
  );
}
