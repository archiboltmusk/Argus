import test from "node:test";
import assert from "node:assert/strict";
import {
  compareVectorClocks,
  mergeCrdtNodes,
  deriveSyncKey,
  encryptStateEnvelope,
  decryptStateEnvelope,
  type CrdtNode,
  type WatchProgressState,
} from "../src/lib/protocol/zk-sync-crdt";
import {
  StreamBloomFilter,
  StreamSieveHeap,
  type StreamCandidate,
} from "../src/lib/protocol/quic-stream-sieve";
import {
  canonicalizeManifestPayload,
  computeManifestHash,
  verifyAttestedManifest,
  type AttestedAddonManifest,
} from "../src/lib/protocol/dht-manifest-attestation";
import {
  createBlindTicket,
  verifyBlindTicket,
  sanitizeAddonUrl,
} from "../src/lib/protocol/blind-token-proxy";

test("ZK Merkle-CRDT compares vector clocks and merges nodes deterministically", () => {
  const clockA = { dev1: 1, dev2: 0 };
  const clockB = { dev1: 1, dev2: 1 };
  const clockConcurrent = { dev1: 2, dev2: 0 };

  assert.equal(compareVectorClocks(clockA, clockB), -1);
  assert.equal(compareVectorClocks(clockB, clockA), 1);
  assert.equal(compareVectorClocks(clockA, clockA), 0);
  assert.equal(compareVectorClocks(clockB, clockConcurrent), null);

  const nodeA: CrdtNode<WatchProgressState> = {
    id: "feluda_s01e01",
    clock: { mac: 2 },
    lamport: 2,
    tombstone: false,
    data: {
      contentId: "feluda",
      episode: 1,
      progressSec: 450,
      durationSec: 1800,
      completed: false,
      updatedAtLamport: 2,
    },
  };

  const nodeB: CrdtNode<WatchProgressState> = {
    id: "feluda_s01e01",
    clock: { mac: 2, phone: 1 },
    lamport: 3,
    tombstone: false,
    data: {
      contentId: "feluda",
      episode: 1,
      progressSec: 720,
      durationSec: 1800,
      completed: false,
      updatedAtLamport: 3,
    },
  };

  const merged = mergeCrdtNodes(nodeA, nodeB);
  assert.equal(merged.lamport, 3);
  assert.equal(merged.data.progressSec, 720);
  assert.equal(merged.clock.phone, 1);
  assert.equal(merged.clock.mac, 2);
});

test("ZK Merkle-CRDT encrypts and decrypts state envelopes via AES-GCM", async () => {
  const key = await deriveSyncKey("purulia-ultra-secret-passphrase", "argus-salt-2026");
  assert.ok(key);

  const nodes: Array<CrdtNode<WatchProgressState>> = [
    {
      id: "nayak_1966",
      clock: { macbook: 1 },
      lamport: 1,
      tombstone: false,
      data: {
        contentId: "tt0060742",
        progressSec: 3600,
        durationSec: 7200,
        completed: false,
        updatedAtLamport: 1,
      },
    },
  ];

  const envelope = await encryptStateEnvelope(nodes, "macbook-air", { macbook: 1 }, key);
  assert.equal(envelope.version, 2);
  assert.equal(envelope.deviceId, "macbook-air");
  assert.ok(envelope.cipherHex.length > 32);
  assert.ok(envelope.merkleRoot.length > 0);

  const decrypted = await decryptStateEnvelope<WatchProgressState>(envelope, key);
  assert.equal(decrypted.length, 1);
  assert.equal(decrypted[0].data.contentId, "tt0060742");
  assert.equal(decrypted[0].data.progressSec, 3600);
});

test("Stream Bloom Filter and Priority Sieve sift streams with zero duplicates", () => {
  const bloom = new StreamBloomFilter(1024);
  const hash = "d41d8cd98f00b204e9800998ecf8427e";
  assert.equal(bloom.contains(hash), false);
  bloom.add(hash);
  assert.equal(bloom.contains(hash), true);
  assert.equal(bloom.contains("another_different_hash"), false);

  const sieve = new StreamSieveHeap();

  const stream4kCached: StreamCandidate = {
    id: "s1",
    title: "Charulata 4K Remux",
    infoHash: "hash_4k",
    resolution: "4k",
    codec: "hevc",
    isDebridCached: true,
    latencyMs: 40,
  };

  const stream1080pP2P: StreamCandidate = {
    id: "s2",
    title: "Charulata 1080p",
    infoHash: "hash_1080p",
    resolution: "1080p",
    codec: "h264",
    isDebridCached: false,
    seeders: 50,
    latencyMs: 120,
  };

  assert.equal(sieve.push(stream1080pP2P), true);
  assert.equal(sieve.push(stream4kCached), true);
  assert.equal(sieve.push(stream4kCached), false);
  assert.equal(sieve.size, 2);

  const topStream = sieve.pop();
  assert.equal(topStream?.id, "s1");
  assert.equal(topStream?.resolution, "4k");

  const secondStream = sieve.pop();
  assert.equal(secondStream?.id, "s2");
});

test("Attested Manifest verifies integrity and blocks sequence replay attacks", async () => {
  const keyPair = (await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])) as CryptoKeyPair;
  const rawPub = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const pubHex = Array.from(new Uint8Array(rawPub))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const manifestUnsigned = {
    version: 2 as const,
    id: "bengal-cinema-feed",
    name: "Bengal Cinema Addon",
    description: "Curated Tollywood classics",
    authorPublicKey: pubHex,
    sequence: 5,
    timestamp: 1761800000,
    capabilities: ["stream:resolve" as const, "catalog:browse" as const],
    resources: ["stream", "catalog"],
    transports: ["dht://infohash_1", "https://cdn.example.com"],
  };

  const canonical = canonicalizeManifestPayload(manifestUnsigned);
  const sigBuffer = await crypto.subtle.sign(
    "Ed25519",
    keyPair.privateKey,
    new TextEncoder().encode(canonical),
  );
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const manifest: AttestedAddonManifest = {
    ...manifestUnsigned,
    signatureHex: sigHex,
  };

  const hash = computeManifestHash(manifest);
  assert.ok(hash.length === 64);

  const replayCheck = await verifyAttestedManifest(manifest, 5);
  assert.equal(replayCheck.verified, false);
  assert.ok(replayCheck.error?.includes("Replay attack"));

  const validSeqCheck = await verifyAttestedManifest(manifest, 4);
  assert.equal(validSeqCheck.verified, true);

  const tamperedManifest = { ...manifest, name: "Malicious Tampered Addon Name" };
  const tamperedCheck = await verifyAttestedManifest(tamperedManifest, 4);
  assert.equal(tamperedCheck.verified, false);
  assert.ok(tamperedCheck.error?.includes("mismatch"));
});

test("Blind Debrid Token Proxy protects API keys from third-party leakage", () => {
  const masterKey = "rd_secret_api_key_purulia_998877665544";
  const infoHash = "1234567890abcdef1234567890abcdef12345678";

  const ticket = createBlindTicket("realdebrid", infoHash, masterKey, 60);
  assert.ok(ticket.ticketId.startsWith("tkt_"));
  assert.ok(ticket.blindDigest.length === 64);

  assert.equal(verifyBlindTicket(ticket, masterKey), true);
  assert.equal(verifyBlindTicket(ticket, "wrong_attacker_key"), false);

  const rawAddonUrl = "https://torrentio.strem.fun/realdebrid=rd_secret_api_key_purulia_998877665544/manifest.json";
  const { sanitizedUrl, extractedKey, provider } = sanitizeAddonUrl(rawAddonUrl);

  assert.equal(extractedKey, "rd_secret_api_key_purulia_998877665544");
  assert.equal(provider, "realdebrid");
  assert.ok(!sanitizedUrl.includes("rd_secret_api_key"));
  assert.ok(sanitizedUrl.includes("blind_auth=enclave_managed"));
});
