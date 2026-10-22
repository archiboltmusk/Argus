const ITERATIONS = 310_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export type Sealed = { v: 1; salt: string; iv: string; ct: string };

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function seal(plain: string, passphrase: string): Promise<Sealed> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain));
  return { v: 1, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}

export async function open(sealed: Sealed, passphrase: string): Promise<string> {
  if (sealed?.v !== 1) throw new Error("Unsupported sync file.");
  const key = await deriveKey(passphrase, unb64(sealed.salt));
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(sealed.iv) as BufferSource },
      key,
      unb64(sealed.ct) as BufferSource,
    );
    return dec.decode(plain);
  } catch {
    throw new Error("Wrong passphrase, or the file was changed.");
  }
}

/** Opaque file name derived from the passphrase, so the server learns neither. */
export async function vaultId(passphrase: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(`argus-sync-id:${passphrase}`));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}
