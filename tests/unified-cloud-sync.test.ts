import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCloudSyncSnapshot,
  subscribeCloudSync,
} from "../src/lib/cloud-sync/unified-cloud-sync";

describe("Unified Cloud Sync Service", () => {
  it("provides a snapshot of initial sync state", () => {
    const snap = getCloudSyncSnapshot();
    assert.ok(snap !== null);
    assert.equal(typeof snap.isConnected, "boolean");
    assert.equal(typeof snap.isSyncing, "boolean");
    assert.ok(["nuvio", "stremio", "none"].includes(snap.provider));
  });

  it("subscribes and unsubscribes listeners cleanly", () => {
    let notified = 0;
    const unsub = subscribeCloudSync(() => {
      notified++;
    });
    assert.equal(typeof unsub, "function");
    unsub();
  });
});
