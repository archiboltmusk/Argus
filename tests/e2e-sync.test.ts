import assert from "node:assert/strict";
import test from "node:test";
import { open, seal, vaultId } from "../src/lib/e2e-sync/crypto.ts";

test("seal/open round trips and hides the plaintext", async () => {
  const sealed = await seal("secret settings", "correct horse");
  assert.ok(!JSON.stringify(sealed).includes("secret"));
  assert.equal(await open(sealed, "correct horse"), "secret settings");
});

test("wrong passphrase fails", async () => {
  const sealed = await seal("x", "a");
  await assert.rejects(() => open(sealed, "b"));
});

test("vault id is stable and does not leak the passphrase", async () => {
  const id = await vaultId("pw");
  assert.equal(id, await vaultId("pw"));
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.ok(!id.includes("pw"));
});

import { nextBoot, isCrashLoop } from "../src/lib/self-heal.ts";
import { reliabilityScore } from "../src/lib/addon-health/health.ts";

test("three unhealthy boots in a row trip the crash loop", () => {
  let b = nextBoot(null, 1000);
  b = nextBoot(b, 2000);
  assert.equal(isCrashLoop(b), false);
  b = nextBoot(b, 3000);
  assert.equal(isCrashLoop(b), true);
});

test("a healthy boot resets the streak", () => {
  const b = nextBoot({ streak: 2, at: 1000, healthy: true }, 2000);
  assert.equal(b.streak, 1);
});

test("reliability score drops with failures", () => {
  const ok = Array.from({ length: 6 }, (_, i) => ({ ok: true, ms: 300, at: i }));
  const bad = ok.map((o, i) => ({ ...o, ok: i % 2 === 0 }));
  assert.equal(reliabilityScore({ outcomes: ok }), 100);
  assert.ok((reliabilityScore({ outcomes: bad }) ?? 100) < 70);
  assert.equal(reliabilityScore({ outcomes: ok.slice(0, 2) }), null);
});
