import { useState } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { exportDiagnostics } from "@/lib/diagnostics/export";
import { setSafeMode, useSafeMode } from "@/lib/self-heal";
import { pullSync, pushSync } from "@/lib/e2e-sync/client";
import { Section, ToggleRow } from "./shared";

const FIELD =
  "h-10 w-full rounded-lg bg-canvas/70 px-3 text-[13px] text-ink ring-1 ring-edge-soft/60 outline-none focus:ring-accent";
const BTN =
  "h-10 w-fit rounded-full bg-ink px-5 text-[13px] font-semibold text-canvas transition-opacity disabled:opacity-40";

export function SelfHealSection() {
  const t = useT();
  const { settings, update } = useSettings();
  const safe = useSafeMode();
  return (
    <Section
      title={t("Self-heal")}
      subtitle={t("If Argus fails to start cleanly three times in a row it enters safe mode and pauses background jobs. To go back to an earlier build, use Version history.")}
    >
      <ToggleRow
        label={t("Crash-loop protection")}
        sub={t("Detect repeated failed launches and offer safe mode.")}
        value={settings.selfHeal}
        onChange={(selfHeal) => update({ selfHeal })}
      />
      <ToggleRow
        label={t("Safe mode")}
        sub={t("Pauses background syncing and downloads until you turn it off.")}
        value={safe}
        onChange={setSafeMode}
      />
      <button type="button" className={BTN} onClick={() => void exportDiagnostics()}>
        {t("Export diagnostics")}
      </button>
    </Section>
  );
}

export function E2eSyncSection() {
  const t = useT();
  const { settings, update } = useSettings();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cfg = { endpoint: settings.e2eSyncEndpoint.trim(), passphrase: settings.e2eSyncPassphrase };
  const ready = /^https?:\/\//i.test(cfg.endpoint) && cfg.passphrase.length >= 8;
  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    setStatus(null);
    try {
      await fn();
      setStatus(done);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section
      title={t("Encrypted sync")}
      subtitle={t("Keeps your settings, profiles and library in sync between devices through a server you run (any WebDAV or PUT/GET file host). Everything is encrypted on this device with your passphrase; the server only sees ciphertext. Argus hosts nothing.")}
    >
      <ToggleRow
        label={t("Encrypted sync")}
        sub={t("Independent of Trakt and any account.")}
        value={settings.e2eSyncEnabled}
        onChange={(e2eSyncEnabled) => update({ e2eSyncEnabled })}
      />
      {settings.e2eSyncEnabled && (
        <div className="flex flex-col gap-2 rounded-xl bg-elevated/30 p-3 ring-1 ring-edge-soft/50">
          <input
            className={FIELD}
            placeholder={t("Folder URL on your server, e.g. https://dav.example.com/argus/")}
            value={settings.e2eSyncEndpoint}
            onChange={(e) => update({ e2eSyncEndpoint: e.target.value })}
          />
          <input
            className={FIELD}
            type="password"
            autoComplete="off"
            placeholder={t("Passphrase (8+ characters, the same on every device)")}
            value={settings.e2eSyncPassphrase}
            onChange={(e) => update({ e2eSyncPassphrase: e.target.value })}
          />
          <div className="flex gap-2">
            <button type="button" className={BTN} disabled={!ready || busy} onClick={() => void run(() => pushSync(cfg), t("Uploaded."))}>
              {t("Upload now")}
            </button>
            <button type="button" className={BTN} disabled={!ready || busy} onClick={() => void run(() => pullSync(cfg), t("Restored. Reload Argus to apply."))}>
              {t("Restore from server")}
            </button>
          </div>
          {status && <div className="text-[12.5px] text-ink-muted">{status}</div>}
        </div>
      )}
    </Section>
  );
}
