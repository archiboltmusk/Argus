import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { ROW_DESC, Section, ToggleRow } from "./shared";
import { ModalButton, ROW_ACTION, SettingGroup, SettingRow, SettingsModal, Nested } from "./kit";

export function AutoSyncPanel() {
  const t = useT();
  const { settings, update } = useSettings();
  const master = settings.subtitleAutoSync;
  const priv = settings.communitySyncOptOut;
  const storedUrl = (settings.communitySyncUrl ?? "").trim();

  const [urlDraft, setUrlDraft] = useState(settings.communitySyncUrl);
  const [urlSaved, setUrlSaved] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const savedTimer = useRef<number | null>(null);
  const flashSaved = () => {
    setUrlSaved(true);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setUrlSaved(false), 1800);
  };
  useEffect(
    () => () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    },
    [],
  );

  const openServer = () => {
    setUrlDraft(settings.communitySyncUrl);
    setUrlError(false);
    setServerOpen(true);
  };
  const saveServer = () => {
    const next = urlDraft.trim();
    if (next) {
      try {
        const url = new URL(next);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('Invalid URL');
      } catch {
        setUrlError(true);
        return;
      }
    }
    if (next !== storedUrl) {
      update({ communitySyncUrl: next });
      flashSaved();
    }
    setServerOpen(false);
  };

  const serverDesc = urlSaved
    ? t("Saved.")
    : storedUrl ||
      t("Argus uses its own community server. You can point it at a server you run yourself.");

  return (
    <div className="hset-form-page">
      <Section
        title={t("Subtitle auto-sync")}
        subtitle={t(
          "Match downloaded subtitles to the audio in the mpv player. Embedded subtitle tracks keep their existing timing.",
        )}
      >
        <ToggleRow
          label={t("Auto-sync subtitles")}
          sub={t(
            "When a subtitle runs early or late, Argus measures the speech and corrects the timing on its own. Off by default.",
          )}
          value={master}
          onChange={(v) => update({ subtitleAutoSync: v })}
        />

        {master && (
          <Nested>
            <SettingGroup label={t("While auto-sync is on")}>
              <ToggleRow
                label={t("Apply audio-based corrections automatically")}
                sub={t(
                  "Apply timing corrections estimated from the audio automatically. Leave off to review these suggestions yourself. Verified exact matches still apply automatically.",
                )}
                value={settings.autoSyncApplyStructural}
                onChange={(v) => update({ autoSyncApplyStructural: v })}
              />
              <ToggleRow
                label={t("Drift monitor")}
                sub={t(
                  "Keeps watching through playback and gently re-nudges the timing if the subtitle slips out of sync partway through.",
                )}
                value={settings.autoSyncDrift}
                onChange={(v) => update({ autoSyncDrift: v })}
              />
              <ToggleRow
                label={t("Smart resync with speech recognition")}
                sub={t(
                  "For the hardest files and the Try again button, Argus transcribes a little speech on your device and lines the subtitle up to the actual words. Needs a build with the asr-whisper feature and downloads a small model the first time you use it.",
                )}
                value={settings.subtitleAutoSyncAsr}
                onChange={(v) => update({ subtitleAutoSyncAsr: v })}
              />
              {settings.subtitleAutoSyncAsr && <WhisperModelPicker />}
              <ToggleRow
                label={t("Match subtitles across languages (experimental)")}
                sub={t(
                  "When the audio and subtitle use different languages, Argus compares a release-matched subtitle in the audio language. It only offers a fix unless every safety check is measured.",
                )}
                value={settings.subtitleAutoSyncPivot}
                onChange={(v) => update({ subtitleAutoSyncPivot: v })}
              />
            </SettingGroup>
          </Nested>
        )}
      </Section>

      <Section
        title={t("Community sync")}
        subtitle={t(
          "Find and share verified timing corrections for matching video and subtitle files. Turn on Private mode to stop community lookups and contributions.",
        )}
      >
        <ToggleRow
          label={t("Use community corrections")}
          sub={t(
            "Check the shared database first. When this exact subtitle has already been synced by someone else, yours snaps into place with no analysis.",
          )}
          value={settings.subtitleAutoSyncCrowd}
          onChange={(v) => update({ subtitleAutoSyncCrowd: v })}
          lockReason={
            priv
              ? t("Private mode is on, so nothing is looked up or contributed from this device.")
              : undefined
          }
        />

        <SettingRow
          label={t("Community sync server")}
          desc={serverDesc}
          tip={t(
            "Leave blank to use Argus's own community server. Enter a URL to point at your own server instead. Private mode below stops all contact either way.",
          )}
        >
          <button type="button" onClick={openServer} className={ROW_ACTION}>
            {storedUrl ? t("Change server") : t("Use my own server")}
          </button>
        </SettingRow>
        <ToggleRow
          label={t("Private mode")}
          sub={t(
            "Never contact the community server in either direction. Nothing is looked up and nothing is contributed from this device.",
          )}
          value={priv}
          onChange={(v) => update({ communitySyncOptOut: v })}
        />

        <SettingsModal
          open={serverOpen}
          onClose={() => setServerOpen(false)}
          title={t("Community sync server")}
          sub={t(
            "Leave this blank to use Argus's own community server, or enter the address of a server you run yourself.",
          )}
          actions={<>
            <ModalButton ghost onClick={() => setServerOpen(false)}>{t("Cancel")}</ModalButton>
            <ModalButton onClick={saveServer}>{t("Save")}</ModalButton>
          </>}
        >
          <div className="flex flex-col gap-2.5">
            <input
              type="url"
              aria-label={t("Server address")}
              aria-invalid={urlError}
              value={urlDraft}
              onChange={(e) => { setUrlDraft(e.target.value); setUrlError(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveServer();
                }
              }}
              placeholder={t("https://argus.invalid")}
              spellCheck={false}
              autoComplete="off"
              className="h-11 w-full min-w-0 max-w-[520px] rounded-[10px] border border-edge-soft bg-elevated px-4 text-[16.5px] text-ink outline-none placeholder:text-ink-subtle/55 focus-visible:border-edge focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            {urlError && <p role="alert" className="text-[15px] text-danger">
              {t("Enter a full http:// or https:// address, or leave blank to use Argus's server.")}
            </p>}
            <p className={`max-w-[70ch] ${ROW_DESC}`}>
              {t("Private mode stops all contact with this server in either direction.")}
            </p>
          </div>
        </SettingsModal>
      </Section>
    </div>
  );
}

function WhisperModelPicker() {
  const t = useT();
  const [models, setModels] = useState<Array<{
    id: string;
    name: string;
    description: string;
    size_mb: number;
    downloaded: boolean;
    active: boolean;
  }>>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const load = () => {
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke<any[]>("asr_list_models")
        .then((list) => {
          if (Array.isArray(list)) setModels(list);
        })
        .catch(() => {});
    });
  };

  useEffect(() => {
    load();
    let unlisten: (() => void) | null = null;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<[number, number]>("asr-model://progress", (event) => {
        setProgress({ current: event.payload[0], total: event.payload[1] });
      }).then((u) => {
        unlisten = u;
      });
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const selectModel = async (id: string) => {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("asr_set_active_model", { modelId: id });
    setDownloading(id);
    setProgress(null);
    try {
      await invoke("asr_ensure_model");
    } finally {
      setDownloading(null);
      setProgress(null);
      load();
    }
  };

  if (models.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl bg-canvas/30 p-3 ring-1 ring-edge-soft">
      <div className="text-[12px] font-semibold text-ink-muted">
        {t("Whisper Speech Model (Mac Metal)")}
      </div>
      <div className="flex flex-col gap-1.5">
        {models.map((m) => {
          const isDownloadingThis = downloading === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={downloading != null}
              onClick={() => void selectModel(m.id)}
              className={`flex items-start justify-between gap-3 rounded-lg p-2.5 text-start transition-colors ${
                m.active
                  ? "bg-accent/15 ring-1 ring-accent text-ink"
                  : "bg-elevated/40 hover:bg-elevated text-ink-muted hover:text-ink"
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium flex items-center gap-1.5">
                  {m.name}
                  {m.active && (
                    <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      {t("Active")}
                    </span>
                  )}
                  {m.downloaded && !m.active && (
                    <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] text-ink-subtle">
                      {t("Ready")}
                    </span>
                  )}
                </span>
                <span className="text-[11.5px] text-ink-subtle leading-tight">{m.description}</span>
                {isDownloadingThis && progress && progress.total > 0 && (
                  <span className="mt-1 text-[11px] font-medium text-accent">
                    {t("Downloading…")} {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
