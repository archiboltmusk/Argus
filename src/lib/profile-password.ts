/**
 * Profile & Parental PIN Security Module
 *
 * Implements PBKDF2 (100,000 iterations with SHA-256) and cryptographically
 * random 16-byte salts, with seamless backward-compatibility for legacy single-round SHA-256 hashes.
 */

const PBKDF2_ITERATIONS = 100_000;
const LEGACY_SALT = "argus-profile-v1";

/**
 * Derives a PBKDF2 hash using Web Crypto API.
 */
export async function hashProfilePassword(password: string): Promise<string> {
  // 16 bytes of cryptographically secure random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

/**
 * Verifies a PIN/password against stored hash with backward compatibility.
 */
export async function verifyProfilePassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash) return false;

  // Modern PBKDF2 format: pbkdf2$<iterations>$<salt_hex>$<hash_hex>
  if (storedHash.startsWith("pbkdf2$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const expectedHashHex = parts[3];

    const match = saltHex.match(/.{1,2}/g);
    if (!match) return false;
    const saltBytes = new Uint8Array(match.map((byte) => parseInt(byte, 16)));

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );

    const candidateHashHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return candidateHashHex === expectedHashHex;
  }

  // Legacy single-round SHA-256 fallback (transparent upgrade path)
  const data = new TextEncoder().encode(`${LEGACY_SALT}|${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const candidate = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return candidate === storedHash;
}
