import { open } from "@tauri-apps/plugin-dialog";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { scanMusicFolders } from "@/lib/music/library";
import { useSettings } from "@/lib/settings";
import { ToggleRow } from "./shared";

export function MusicRows() {
  const t = useT();
  const { settings, update } = useSettings();
  const setFolders = (musicFolders: string[]) => {
    update({ musicFolders });
    void scanMusicFolders(musicFolders);
  };
  const add = async () => {
    try {
      const picked = await open({ directory: true, multiple: true });
      const list = Array.isArray(picked) ? picked : typeof picked === "string" ? [picked] : [];
      const next = [...new Set([...settings.musicFolders, ...list])];
      if (next.length !== settings.musicFolders.length) setFolders(next);
    } catch {
      /* dialog closed */
    }
  };
  return (
    <>
      <ToggleRow
        label={t("Music")}
        sub={t("Adds a Music tab with your local library, queue, playlists and lyrics. Plays files you already own; nothing is downloaded.")}
        value={settings.musicEnabled}
        onChange={(v) => update({ musicEnabled: v })}
      />
      {settings.musicEnabled && (
        <>
          <div className="flex flex-col gap-2 rounded-2xl border border-edge-soft bg-elevated/40 px-4 py-3">
            {settings.musicFolders.length === 0 && (
              <span className="text-[12.5px] text-ink-subtle">{t("No music folders yet.")}</span>
            )}
            {settings.musicFolders.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-muted">{f}</span>
                <button
                  type="button"
                  title={t("Remove")}
                  onClick={() => setFolders(settings.musicFolders.filter((x) => x !== f))}
                  className="text-ink-subtle hover:text-ink"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => void add()}
              className="w-fit rounded-lg border border-edge-soft px-3.5 py-2 text-[12.5px] font-semibold text-ink-muted hover:border-edge hover:text-ink"
            >
              {t("Add folder")}
            </button>
          </div>
          <ToggleRow
            label={t("Online lyrics")}
            sub={t("Look up missing lyrics on LRCLIB using the track title, artist and album. Off by default; local .lrc files and embedded lyrics never leave your device.")}
            value={settings.musicOnlineLyrics}
            onChange={(v) => update({ musicOnlineLyrics: v })}
          />
        </>
      )}
    </>
  );
}
