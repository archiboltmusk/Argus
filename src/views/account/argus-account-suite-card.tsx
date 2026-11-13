import { useEffect, useState } from "react";
import { KeyRound, Laptop, QrCode, RotateCcw, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { Section } from "@/views/settings/shared";
import {
  approvePairingCode,
  clearPendingHandoff,
  createCloudSnapshot,
  decryptVaultSecrets,
  encryptVaultSecrets,
  generatePairingCode,
  getOrCreateDeviceId,
  hasEncryptedVault,
  listCloudSnapshots,
  pushCrossDeviceHandoff,
  readPendingHandoff,
  registerCurrentDevice,
  revokeConnectedDevice,
  type ArgusCloudSnapshot,
  type ArgusDeviceRecord,
  type ArgusHandoffPayload,
  type ArgusPairingSession,
} from "@/lib/cloud-sync/argus-account-suite";

export function ArgusAccountSuiteCard() {
  const t = useT();
  const { settings, update } = useSettings();
  const currentDeviceId = getOrCreateDeviceId();

  const [devices, setDevices] = useState<ArgusDeviceRecord[]>(() => registerCurrentDevice());
  const [pairing, setPairing] = useState<ArgusPairingSession | null>(null);
  const [approveInput, setApproveInput] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [vaultSaved, setVaultSaved] = useState(() => hasEncryptedVault());
  const [vaultNotice, setVaultNotice] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<ArgusHandoffPayload | null>(() => readPendingHandoff());
  const [snapshots, setSnapshots] = useState<ArgusCloudSnapshot[]>(() => listCloudSnapshots());

  useEffect(() => {
    setDevices(registerCurrentDevice());
  }, []);

  const handleEncryptVault = async () => {
    if (passphrase.trim().length < 4) {
      setVaultNotice(t("Enter a passphrase (at least 4 characters)."));
      return;
    }
    try {
      await encryptVaultSecrets(passphrase, {
        tmdbKey: settings.tmdbKey || "",
        traktAccessToken: settings.traktAccessToken || "",
      });
      setVaultSaved(true);
      setVaultNotice(t("Encrypted vault saved locally (AES-GCM 256)."));
    } catch {
      setVaultNotice(t("Could not encrypt vault."));
    }
  };

  const handleDecryptVault = async () => {
    try {
      const secrets = await decryptVaultSecrets(passphrase);
      update({
        ...(secrets.tmdbKey ? { tmdbKey: secrets.tmdbKey } : {}),
        ...(secrets.traktAccessToken ? { traktAccessToken: secrets.traktAccessToken } : {}),
      });
      setVaultNotice(t("Vault unlocked and keys restored."));
    } catch {
      setVaultNotice(t("Wrong passphrase or no vault found."));
    }
  };

  return (
    <Section
      title={t("Argus Account Suite")}
      subtitle={t("Pair TVs & projectors, encrypt API keys locally, hand off playback, manage active devices, and keep rolling setup snapshots.")}
    >
      <div className="flex flex-col gap-5">
        {/* 1. TV / Projector 6-Digit Pairing */}
        <div className="rounded-xl border border-edge-soft bg-raised/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <QrCode size={17} className="text-accent" />
              <div>
                <div className="text-[14px] font-semibold text-ink">{t("TV & Projector Pairing")}</div>
                <div className="text-[12px] text-ink-subtle">
                  {pairing
                    ? `${t("Code")}: ${pairing.code} (${pairing.approved ? t("Approved") : t("Waiting")})`
                    : t("Generate a 6-digit pairing code or approve one from another screen.")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPairing(generatePairingCode())}
                className="rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-canvas hover:opacity-90"
              >
                {t("Generate Code")}
              </button>
              <input
                value={approveInput}
                onChange={(e) => setApproveInput(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                className="w-28 rounded-lg border border-edge-soft bg-canvas px-2.5 py-1.5 text-[12.5px] text-ink outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    setPairing(approvePairingCode(approveInput));
                    setApproveInput("");
                  } catch {}
                }}
                className="rounded-lg bg-raised px-3 py-1.5 text-[12.5px] font-semibold text-ink ring-1 ring-edge-soft hover:bg-elevated"
              >
                {t("Approve")}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Zero-Knowledge Encrypted Key Vault */}
        <div className="rounded-xl border border-edge-soft bg-raised/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <KeyRound size={17} className="text-accent" />
              <div>
                <div className="text-[14px] font-semibold text-ink">
                  {t("Zero-Knowledge Key Vault")} {vaultSaved ? "✓" : ""}
                </div>
                <div className="text-[12px] text-ink-subtle">
                  {vaultNotice ?? t("Encrypts TMDB, Trakt, and Debrid tokens on-device with AES-GCM.")}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t("Vault passphrase")}
                className="w-40 rounded-lg border border-edge-soft bg-canvas px-2.5 py-1.5 text-[12.5px] text-ink outline-none"
              />
              <button
                type="button"
                onClick={() => void handleEncryptVault()}
                className="rounded-lg bg-raised px-3 py-1.5 text-[12.5px] font-semibold text-ink ring-1 ring-edge-soft hover:bg-elevated"
              >
                {t("Encrypt & Save")}
              </button>
              {vaultSaved && (
                <button
                  type="button"
                  onClick={() => void handleDecryptVault()}
                  className="rounded-lg bg-raised px-3 py-1.5 text-[12.5px] font-semibold text-accent ring-1 ring-edge-soft hover:bg-elevated"
                >
                  {t("Unlock")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Cross-Device Handoff */}
        <div className="rounded-xl border border-edge-soft bg-raised/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Send size={17} className="text-accent" />
              <div>
                <div className="text-[14px] font-semibold text-ink">{t("Cross-Device Handoff")}</div>
                <div className="text-[12px] text-ink-subtle">
                  {handoff
                    ? `${handoff.title} (${handoff.positionLabel}) · ${handoff.fromDevice}`
                    : t("No active handoff queued.")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHandoff(pushCrossDeviceHandoff("Current Session", "video", "Ready on Projector"))}
                className="rounded-lg bg-raised px-3 py-1.5 text-[12.5px] font-semibold text-ink ring-1 ring-edge-soft hover:bg-elevated"
              >
                {t("Queue Handoff")}
              </button>
              {handoff && (
                <button
                  type="button"
                  onClick={() => {
                    clearPendingHandoff();
                    setHandoff(null);
                  }}
                  className="rounded-lg bg-raised px-3 py-1.5 text-[12.5px] font-semibold text-ink-subtle ring-1 ring-edge-soft hover:text-ink"
                >
                  {t("Clear")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Connected Devices & Remote Revoke */}
        <div className="rounded-xl border border-edge-soft bg-raised/50 p-4">
          <div className="mb-2.5 flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Laptop size={17} className="text-accent" />
            <span>{t("Connected Devices")}</span>
          </div>
          <div className="flex flex-col gap-2">
            {devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg bg-canvas/60 px-3 py-2 text-[12.5px]"
              >
                <div>
                  <span className="font-semibold text-ink">{d.name}</span>
                  {d.id === currentDeviceId && (
                    <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10.5px] font-semibold text-accent">
                      {t("This device")}
                    </span>
                  )}
                  <span className="ml-2 text-ink-subtle">
                    {new Date(d.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {d.id !== currentDeviceId && (
                  <button
                    type="button"
                    onClick={() => setDevices(revokeConnectedDevice(d.id))}
                    className="flex items-center gap-1 text-[12px] font-semibold text-danger hover:opacity-80"
                  >
                    <Trash2 size={13} />
                    {t("Revoke")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 5. Rolling Setup Snapshots */}
        <div className="rounded-xl border border-edge-soft bg-raised/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <ShieldCheck size={17} className="text-accent" />
              <span>{t("Rolling Setup Snapshots (Last 5)")}</span>
            </div>
            <button
              type="button"
              onClick={() => setSnapshots(createCloudSnapshot("", settings))}
              className="rounded-lg bg-raised px-3 py-1.5 text-[12.5px] font-semibold text-ink ring-1 ring-edge-soft hover:bg-elevated"
            >
              {t("Save Snapshot")}
            </button>
          </div>
          {snapshots.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center justify-between rounded-lg bg-canvas/60 px-3 py-2 text-[12.5px]"
                >
                  <span className="text-ink">{snap.label}</span>
                  <button
                    type="button"
                    onClick={() => update(snap.settingsSubset)}
                    className="flex items-center gap-1 text-[12px] font-semibold text-accent hover:opacity-80"
                  >
                    <RotateCcw size={13} />
                    {t("Restore")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
