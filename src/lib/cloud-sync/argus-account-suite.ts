import type { Settings } from "@/lib/settings";

const STORAGE_PREFIX = "argus.account.suite.v1";
const DEVICE_ID_KEY = `${STORAGE_PREFIX}.device_id`;
const VAULT_KEY = `${STORAGE_PREFIX}.vault`;
const DEVICES_KEY = `${STORAGE_PREFIX}.devices`;
const HANDOFF_KEY = `${STORAGE_PREFIX}.handoff`;
const SNAPSHOTS_KEY = `${STORAGE_PREFIX}.snapshots`;
const PAIRING_KEY = `${STORAGE_PREFIX}.pairing`;

export interface ArgusDeviceRecord {
  id: string;
  name: string;
  platform: string;
  lastSeenAt: number;
  revoked?: boolean;
}

export interface ArgusHandoffPayload {
  id: string;
  title: string;
  mediaKind: "video" | "manga" | "music";
  positionLabel: string;
  fromDevice: string;
  createdAt: number;
}

export interface ArgusCloudSnapshot {
  id: string;
  label: string;
  createdAt: number;
  settingsSubset: Partial<Settings>;
  mangaRepos: string[];
}

export interface ArgusPairingSession {
  code: string;
  uri: string;
  expiresAt: number;
  approved: boolean;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = `dev_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return "dev_local";
  }
}

function detectDeviceName(): { name: string; platform: string } {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/android/i.test(ua)) return { name: "Android / Projector", platform: "android" };
  if (/iphone|ipad/i.test(ua)) return { name: "iOS / iPadOS Device", platform: "ios" };
  if (/mac/i.test(ua)) return { name: "MacBook / macOS", platform: "macos" };
  if (/win/i.test(ua)) return { name: "Windows PC", platform: "windows" };
  return { name: "Argus Client", platform: "web" };
}

export function registerCurrentDevice(): ArgusDeviceRecord[] {
  const id = getOrCreateDeviceId();
  const { name, platform } = detectDeviceName();
  const list = readJson<ArgusDeviceRecord[]>(DEVICES_KEY, []).filter((d) => d.id !== id && !d.revoked);
  const next: ArgusDeviceRecord[] = [
    { id, name, platform, lastSeenAt: Date.now() },
    ...list,
  ].slice(0, 12);
  writeJson(DEVICES_KEY, next);
  return next;
}

export function listConnectedDevices(): ArgusDeviceRecord[] {
  return readJson<ArgusDeviceRecord[]>(DEVICES_KEY, []).filter((d) => !d.revoked);
}

export function revokeConnectedDevice(deviceId: string): ArgusDeviceRecord[] {
  const next = readJson<ArgusDeviceRecord[]>(DEVICES_KEY, []).filter((d) => d.id !== deviceId);
  writeJson(DEVICES_KEY, next);
  return next;
}

// --- Zero-Knowledge WebCrypto AES-GCM Vault ---
async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toB64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return btoa(out);
}

function fromB64(str: string): Uint8Array {
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function encryptVaultSecrets(
  passphrase: string,
  secrets: Record<string, string>,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(secrets)),
  );
  const payload = JSON.stringify({
    v: 1,
    salt: toB64(salt),
    iv: toB64(iv),
    ct: toB64(new Uint8Array(cipher)),
    updatedAt: Date.now(),
  });
  localStorage.setItem(VAULT_KEY, payload);
  return payload;
}

export async function decryptVaultSecrets(passphrase: string): Promise<Record<string, string>> {
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) throw new Error("No encrypted vault saved yet");
  const parsed = JSON.parse(raw) as { salt: string; iv: string; ct: string };
  const key = await deriveAesKey(passphrase, fromB64(parsed.salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(parsed.iv) as BufferSource },
    key,
    fromB64(parsed.ct) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as Record<string, string>;
}

export function hasEncryptedVault(): boolean {
  try {
    return Boolean(localStorage.getItem(VAULT_KEY));
  } catch {
    return false;
  }
}

// --- 6-Digit TV / Projector Pairing ---
export function generatePairingCode(): ArgusPairingSession {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const session: ArgusPairingSession = {
    code,
    uri: `argus://pair?code=${code}`,
    expiresAt: Date.now() + 10 * 60_000,
    approved: false,
  };
  writeJson(PAIRING_KEY, session);
  return session;
}

export function approvePairingCode(codeInput: string): ArgusPairingSession {
  const clean = codeInput.replace(/\D/g, "").slice(0, 6);
  if (clean.length !== 6) throw new Error("Enter a 6-digit pairing code");
  const session: ArgusPairingSession = {
    code: clean,
    uri: `argus://pair?code=${clean}`,
    expiresAt: Date.now() + 10 * 60_000,
    approved: true,
  };
  writeJson(PAIRING_KEY, session);
  return session;
}

// --- Live Cross-Device Handoff ---
export function pushCrossDeviceHandoff(
  title: string,
  mediaKind: ArgusHandoffPayload["mediaKind"],
  positionLabel: string,
): ArgusHandoffPayload {
  const { name } = detectDeviceName();
  const payload: ArgusHandoffPayload = {
    id: `ho_${Date.now().toString(36)}`,
    title,
    mediaKind,
    positionLabel,
    fromDevice: name,
    createdAt: Date.now(),
  };
  writeJson(HANDOFF_KEY, payload);
  return payload;
}

export function readPendingHandoff(): ArgusHandoffPayload | null {
  return readJson<ArgusHandoffPayload | null>(HANDOFF_KEY, null);
}

export function clearPendingHandoff(): void {
  try {
    localStorage.removeItem(HANDOFF_KEY);
  } catch {}
}

// --- Rolling Cloud Snapshots (Last 5) ---
export function listCloudSnapshots(): ArgusCloudSnapshot[] {
  return readJson<ArgusCloudSnapshot[]>(SNAPSHOTS_KEY, []);
}

export function createCloudSnapshot(label: string, settings: Settings): ArgusCloudSnapshot[] {
  const repos = readJson<string[]>("argus.manga.repos", []);
  const snap: ArgusCloudSnapshot = {
    id: `snap_${Date.now().toString(36)}`,
    label: label.trim() || `Snapshot ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    createdAt: Date.now(),
    settingsSubset: {
      subFontColor: settings.subFontColor,
      subAssOverride: settings.subAssOverride,
      dualSubtitlesEnabled: settings.dualSubtitlesEnabled,
      projectorModeEnabled: settings.projectorModeEnabled,
      playerAnime4k: settings.playerAnime4k,
      playerAnime4kAnimeOnly: settings.playerAnime4kAnimeOnly,
    },
    mangaRepos: repos,
  };
  const next = [snap, ...listCloudSnapshots()].slice(0, 5);
  writeJson(SNAPSHOTS_KEY, next);
  return next;
}
