import { useMemo, useState } from "react";
import { Download } from "../icons";
import { ModalButton, ROW_DESC, SettingRow, SettingsModal } from "../kit";
import { useT } from "@/lib/i18n";
import {
  addonHostLabel,
  applyStremioImport,
  fetchStremioExport,
  libraryToResume,
  libraryToWatchlist,
  newAddons,
  type ImportResult,
  type StremioExport,
} from "@/lib/stremio-import";

const INPUT =
  "h-11 w-full rounded-md bg-canvas px-3.5 text-[14px] text-ink outline-none transition-colors focus:bg-elevated disabled:opacity-50";

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5 text-[13px] text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0"
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exp, setExp] = useState<StremioExport | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [watchlist, setWatchlist] = useState(true);
  const [progress, setProgress] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);

  const addons = useMemo(() => (exp ? newAddons(exp.addons) : []), [exp]);
  const counts = useMemo(
    () => ({
      watchlist: exp ? libraryToWatchlist(exp.library).length : 0,
      progress: exp ? libraryToResume(exp.library).length : 0,
    }),
    [exp],
  );

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      setExp(await fetchStremioExport(email, password));
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Sign-in failed"));
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    if (!exp) return;
    setBusy(true);
    try {
      setResult(
        await applyStremioImport(
          { addons: addons.filter((a) => !skipped.has(a.transportUrl)), watchlist, progress },
          exp,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleAddon = (url: string, on: boolean) =>
    setSkipped((prev) => {
      const next = new Set(prev);
      if (on) next.delete(url);
      else next.add(url);
      return next;
    });

  if (result) {
    return (
      <SettingsModal
        open
        onClose={onClose}
        title={t("Import finished")}
        actions={<ModalButton onClick={onClose}>{t("Done")}</ModalButton>}
      >
        <p className={ROW_DESC}>
          {t("Added {a} addons, {w} saved titles and {p} watch positions.", {
            a: result.addonsInstalled,
            w: result.watchlist,
            p: result.progress,
          })}
        </p>
        {result.addonsFailed > 0 && (
          <p className="text-[12.5px] text-danger">
            {t("{n} addons could not be reached and were skipped. Add them again from Streaming sources.", {
              n: result.addonsFailed,
            })}
          </p>
        )}
      </SettingsModal>
    );
  }

  if (exp) {
    return (
      <SettingsModal
        open
        onClose={onClose}
        title={t("Choose what to import")}
        sub={t("Nothing is changed in your Stremio account.")}
        actions={
          <>
            <ModalButton ghost onClick={onClose}>
              {t("Cancel")}
            </ModalButton>
            <ModalButton onClick={busy ? undefined : run}>{busy ? t("Importing…") : t("Import")}</ModalButton>
          </>
        }
      >
        {addons.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-subtle">
              {t("Addons")}
            </span>
            {addons.map((a) => (
              <Check
                key={a.transportUrl}
                checked={!skipped.has(a.transportUrl)}
                onChange={(on) => toggleAddon(a.transportUrl, on)}
              >
                {a.name}
                <span className="ms-2 text-ink-subtle" dir="ltr">
                  {addonHostLabel(a.transportUrl)}
                </span>
              </Check>
            ))}
            <p className={ROW_DESC}>
              {t("Addon links can contain debrid keys. They are copied as they are and never shown or logged.")}
            </p>
          </div>
        )}
        {addons.length === 0 && <p className={ROW_DESC}>{t("All your Stremio addons are already installed.")}</p>}
        <Check checked={watchlist} onChange={setWatchlist}>
          {t("Saved library ({n})", { n: counts.watchlist })}
        </Check>
        <Check checked={progress} onChange={setProgress}>
          {t("Watch positions ({n})", { n: counts.progress })}
        </Check>
      </SettingsModal>
    );
  }

  return (
    <SettingsModal
      open
      onClose={onClose}
      dismissible={!busy}
      title={t("Import from Stremio")}
      sub={t("Signs in once to read your addons and library, then signs out. Your password is not saved.")}
      actions={
        <>
          <ModalButton ghost onClick={onClose}>
            {t("Cancel")}
          </ModalButton>
          <ModalButton onClick={busy || !email || !password ? undefined : connect}>
            {busy ? t("Reading…") : t("Continue")}
          </ModalButton>
        </>
      }
    >
      <input
        type="email"
        value={email}
        disabled={busy}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("Email")}
        autoComplete="email"
        spellCheck={false}
        className={INPUT}
      />
      <input
        type="password"
        value={password}
        disabled={busy}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("Password")}
        autoComplete="current-password"
        className={INPUT}
      />
      {error && (
        <p className="rounded-md bg-danger/10 px-3.5 py-2.5 text-[12.5px] leading-snug text-danger">{error}</p>
      )}
    </SettingsModal>
  );
}

export function StremioImportCard() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingRow
        icon={<Download size={18} strokeWidth={2} />}
        label={t("Import from Stremio")}
        desc={t("Copy your addons, saved library and watch positions into Argus without staying signed in.")}
      >
        <ModalButton ghost onClick={() => setOpen(true)}>
          {t("Import")}
        </ModalButton>
      </SettingRow>
      {open && <ImportDialog onClose={() => setOpen(false)} />}
    </>
  );
}
