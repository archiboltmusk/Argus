import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hashProfilePassword,
  verifyProfilePassword,
} from "../src/lib/profile-password";
import {
  recordImpression,
  getImpressionFatigueDiscount,
  markUserActiveForTest,
} from "../src/lib/algo/implicit-tracker";
import {
  getSyncRevision,
  bumpSyncRevision,
} from "../src/lib/cloud-sync/unified-cloud-sync";

describe("Security Loophole Patch: Cryptographic PBKDF2 PIN Hardening", () => {
  it("generates modern PBKDF2 hash with 100,000 iterations and random salt", async () => {
    const pin = "1234";
    const hash = await hashProfilePassword(pin);

    assert.ok(hash.startsWith("pbkdf2$100000$"));
    const parts = hash.split("$");
    assert.equal(parts.length, 4);
    assert.equal(parts[1], "100000"); // 100,000 iterations
    assert.equal(parts[2].length, 32); // 16 bytes = 32 hex chars salt
    assert.equal(parts[3].length, 64); // 256 bits = 64 hex chars hash

    // Two hashes of the same PIN should differ because of unique random salts
    const hash2 = await hashProfilePassword(pin);
    assert.notEqual(hash, hash2);

    // Verify correct PIN
    const isValid = await verifyProfilePassword(pin, hash);
    assert.equal(isValid, true);

    // Verify wrong PIN
    const isWrong = await verifyProfilePassword("9999", hash);
    assert.equal(isWrong, false);
  });

  it("transparently supports legacy SHA-256 hashes for backward compatibility", async () => {
    // Generate a legacy hash manually: SHA-256("argus-profile-v1|5678")
    const legacySalt = "argus-profile-v1";
    const pin = "5678";
    const data = new TextEncoder().encode(`${legacySalt}|${pin}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const legacyHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Legacy verification should pass
    const isValid = await verifyProfilePassword(pin, legacyHash);
    assert.equal(isValid, true);

    // Wrong PIN on legacy hash should fail
    const isWrong = await verifyProfilePassword("0000", legacyHash);
    assert.equal(isWrong, false);
  });
});

describe("Privacy Loophole Patch: Idle Impression Shielding", () => {
  it("does not penalize titles when screen/device is idle", () => {
    const testMetaId = "idle_test_" + Math.random().toString(36);

    // Mark user inactive / idle (> 90s)
    markUserActiveForTest(false);
    recordImpression(testMetaId);

    // Should NOT have recorded impression fatigue
    assert.equal(getImpressionFatigueDiscount(testMetaId), 1.0);

    // Mark user active
    markUserActiveForTest(true);
    recordImpression(testMetaId);
    recordImpression(testMetaId);
    recordImpression(testMetaId);
    recordImpression(testMetaId);

    // Now fatigue penalty applies because user was active
    assert.ok(getImpressionFatigueDiscount(testMetaId) < 1.0);
  });
});

describe("Sync Loophole Patch: Monotonic Sync Revision", () => {
  it("increments sync revision monotonically", () => {
    const rev1 = getSyncRevision();
    const rev2 = bumpSyncRevision();
    assert.equal(rev2, rev1 + 1);
    const rev3 = bumpSyncRevision();
    assert.equal(rev3, rev2 + 1);
  });
});
