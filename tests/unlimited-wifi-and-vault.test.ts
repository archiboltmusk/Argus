import test from "node:test";
import assert from "node:assert/strict";
import { evaluateHotspotStream, formatDataOdometer } from "../src/lib/streams/hotspot-frugal-filter";
import { getActiveNetworkProfile, shouldApplyDataSaver } from "../src/lib/network/connection-mode";
import { powerCutVault } from "../src/lib/system/power-cut-vault";
import { buildCricketHighlightMarkers, getNextHighlightJump } from "../src/lib/sports/cricket-highlights-synthesizer";
import { isIndianSerial, estimateSerialSkipSegments } from "../src/lib/player/serial-filler-skipper";
import { resolveBluetoothAudioDelaySec } from "../src/lib/player/bluetooth-latency-profiler";
import { evaluateTorrentPolicy } from "../src/lib/downloads/torrent-time-policy";
import { generateCouchHandoffUrl, parseCouchHandoffUrl } from "../src/lib/network/qr-couch-handoff";

test("unlimited Wi-Fi broadband bypasses mobile budget caps and odometer warnings", () => {
  // A 10 GB 4K remux stream
  const tenGigBytes = 10 * 1024 * 1024 * 1024;

  // On metered mobile hotspot (isUnlimited = false)
  const meteredResult = evaluateHotspotStream("Avatar.2022.2160p.UHD.Remux.mkv", tenGigBytes, 1500, false);
  assert.equal(meteredResult.exceedsDailyBudget, true);
  assert.equal(meteredResult.badgeLabel, "⚠️ Heavy Data");

  // On unlimited Wi-Fi broadband (isUnlimited = true)
  const unlimitedResult = evaluateHotspotStream("Avatar.2022.2160p.UHD.Remux.mkv", tenGigBytes, 1500, true);
  assert.equal(unlimitedResult.exceedsDailyBudget, false);
  assert.equal(unlimitedResult.badgeLabel, "⚡ Unlimited Wi-Fi");

  // Odometer check
  const odometerUnlimited = formatDataOdometer(2500, 1500, true);
  assert.equal(odometerUnlimited.remainingStr, "∞ Unlimited");
  assert.equal(odometerUnlimited.percentUsed, 0);

  const odometerMetered = formatDataOdometer(1200, 1500, false);
  assert.equal(odometerMetered.remainingStr, "300 MB");
  assert.equal(odometerMetered.percentUsed, 80);
});

test("connection profiler enforces unlimited broadband by default", () => {
  const profile = getActiveNetworkProfile("unlimited-broadband", true);
  assert.equal(profile.isUnlimitedBroadband, true);

  // Data saver should NOT apply on unlimited broadband
  const applySaver = shouldApplyDataSaver(true, true, "unlimited-broadband");
  assert.equal(applySaver, false);

  // Data saver DOES apply when switched to metered hotspot
  const applyOnMetered = shouldApplyDataSaver(true, false, "metered-hotspot");
  assert.equal(applyOnMetered, true);
});

test("power-cut vault updates and retrieves snapshots cleanly", () => {
  powerCutVault.updateSnapshot({
    metaId: "feluda_joy_baba_felunath",
    title: "Joi Baba Felunath",
    positionSec: 1250,
    durationSec: 6800,
  });

  const recovery = powerCutVault.checkOutageRecovery();
  assert.equal(recovery.hasRecovery, true);
  assert.equal(recovery.snapshot?.media.title, "Joi Baba Felunath");
  assert.equal(recovery.snapshot?.media.positionSec, 1250);

  powerCutVault.clearRecoveryCheckpoint();
  assert.equal(powerCutVault.checkOutageRecovery().hasRecovery, false);
});

test("cricket highlight synthesizer builds markers and next event jumps", () => {
  const telemetry = [
    { timestampSec: 120, ballStr: "2.4", description: "OUT! Caught at slip!", isWicket: true },
    { timestampSec: 240, ballStr: "4.1", description: "SIX over long-on!", runs: 6 },
    { timestampSec: 360, ballStr: "6.2", description: "FOUR through covers!", runs: 4 },
  ];

  const markers = buildCricketHighlightMarkers(telemetry);
  assert.equal(markers.length, 3);
  assert.equal(markers[0].type, "wicket");
  assert.equal(markers[1].type, "six");
  assert.equal(markers[2].type, "four");

  // If currently at 10s (before any highlight), next jump should lead to marker 0 start
  const jump = getNextHighlightJump(10, markers);
  assert.equal(jump.shouldJump, true);
  assert.equal(jump.jumpToSec, markers[0].startSec);
});

test("serial filler skipper detects Indian soaps and provides skip segments", () => {
  assert.equal(isIndianSerial("Star Jalsha Sreemoyee Episode 450"), true);
  assert.equal(isIndianSerial("Breaking Bad S01E01"), false);

  const segments = estimateSerialSkipSegments("Zee Bangla Mithai Episode 120", 1320);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].kind, "recap");
  assert.equal(segments[1].kind, "next_episode_preview");
});

test("bluetooth latency profiler applies negative delay to lipsync audio", () => {
  assert.equal(resolveBluetoothAudioDelaySec("boAt Airdopes 141"), -0.22);
  assert.equal(resolveBluetoothAudioDelaySec("Noise Buds VS102"), -0.20);
  assert.equal(resolveBluetoothAudioDelaySec("Boult Audio AirBass"), -0.24);
  assert.equal(resolveBluetoothAudioDelaySec("Realme Buds Air 5"), -0.18);
  assert.equal(resolveBluetoothAudioDelaySec("Built-in MacBook Speakers"), 0);
});

test("torrent policy keeps unlimited Wi-Fi uncapped 24/7", () => {
  const policyUnlimited = evaluateTorrentPolicy(true, false);
  assert.equal(policyUnlimited.isUncapped, true);
  assert.equal(policyUnlimited.uploadLimitKbps, 0);

  const policyMeteredDay = evaluateTorrentPolicy(false, true);
  // On metered daytime, upload is throttled to 1 KB/s unless in 00:00 - 06:00 window
  if (!policyMeteredDay.isUncapped) {
    assert.equal(policyMeteredDay.uploadLimitKbps, 1);
  }
});

test("QR couch handoff generates and parses payload correctly", () => {
  const url = generateCouchHandoffUrl("192.168.1.10", 11470, {
    title: "Sonar Kella",
    streamUrl: "http://192.168.1.10:11470/stream/sonar_kella",
    positionSec: 1845,
    durationSec: 7200,
  });

  const parsed = parseCouchHandoffUrl(url);
  assert.ok(parsed);
  assert.equal(parsed?.title, "Sonar Kella");
  assert.equal(parsed?.positionSec, 1845);
});
