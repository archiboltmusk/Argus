import { isTrustedGroup } from "../parser";
import type { ParsedStream, ScoredStream, ScoreReason } from "../types";
import { addonPriorityPoints, trustedAddonPoints } from "./scoring-addons";
import { capabilityAdjust } from "./scoring-capability";
import { audioPoints, playabilityPenalty } from "./scoring-audio";
import { bitrateBudgetPenalty, expectedMinSizeBytes } from "./scoring-bitrate";
import { isCachedOnActive } from "./scoring-debrid";
import { freshTheatricalAdjust } from "./scoring-recency";
import { resolutionPoints, tierOf } from "./scoring-resolution";
import {
  camInFilenamePenalty,
  impossiblySmallMoviePenalty,
  sizeMislabelPenalty,
  undersizedNewReleasePenalty,
} from "./scoring-size";
import type { CorpusStats, ScoreOptions } from "./scoring-types";
import { calculateRatingScoreAdjustment } from "../stream-ratings";
import { disambiguateRelease } from "../disambiguation";

export function scoreStream(
  s: ParsedStream,
  opts: ScoreOptions,
  corpus?: CorpusStats,
): ScoredStream {
  const reasons: ScoreReason[] = [];
  let score = 0;

  const cached = isCachedOnActive(s, opts.activeDebrids);
  const directPlayable = !!s.url;
  const isEasynews = /easynews/i.test(s.addonName ?? "") || /easynews/i.test(s.parsedTitle ?? "");
  const hasDebridConfigured = !!opts.activeDebrids && opts.activeDebrids.length > 0;

  if (cached || isEasynews) {
    score += 60;
    reasons.push({ signal: cached ? "cached" : "easynews-direct", delta: 60 });
  } else if (directPlayable) {
    // When user has no debrid, direct free HTTP web streams are the #1 best option
    const delta = hasDebridConfigured ? 25 : 60;
    score += delta;
    reasons.push({ signal: hasDebridConfigured ? "direct url" : "direct-free-stream", delta });
  }

  const resBoost = resolutionPoints(s);
  if (resBoost.delta) {
    score += resBoost.delta;
    reasons.push(resBoost);
  }

  if (s.hdrFormat) {
    const hdrDelta = s.hdrFormat === "DV+HDR10" || s.hdrFormat === "DV" ? 6 : 5;
    score += hdrDelta;
    reasons.push({ signal: s.hdrFormat, delta: hdrDelta });
    const cap = capabilityAdjust(s, opts.capabilities);
    if (cap) {
      score += cap.delta;
      reasons.push(cap);
    }
  }

  const isBandwidthConstrained =
    opts.bandwidthMbps != null && opts.bandwidthMbps > 0 && opts.bandwidthMbps <= 30;
  if (s.codec === "AV1") {
    const delta = isBandwidthConstrained ? 18 : 4;
    score += delta;
    reasons.push({ signal: "AV1-efficiency", delta });
  } else if (s.codec === "HEVC") {
    const delta = isBandwidthConstrained ? 12 : 3;
    score += delta;
    reasons.push({ signal: "HEVC-efficiency", delta });
  }

  const audioDelta = audioPoints(s);
  if (audioDelta.delta) {
    score += audioDelta.delta;
    reasons.push(audioDelta);
  }

  if (s.audio.channels >= 6) {
    score += 2;
    reasons.push({ signal: `${s.audio.channels}.0 channels`, delta: 2 });
  }

  if (!cached && s.seeders != null) {
    const seedDelta = Math.min(Math.floor(s.seeders / 10), 10);
    if (seedDelta > 0) {
      score += seedDelta;
      reasons.push({ signal: `seeders=${s.seeders}`, delta: seedDelta });
    } else if (!s.url && s.infoHash && s.seeders === 0) {
      const deadPenalty = hasDebridConfigured ? -20 : -80;
      score += deadPenalty;
      reasons.push({ signal: "zero-seeders-stale-meta", delta: deadPenalty });
    }
  }
  if (s.infoHash && s.seeders === 0 && !cached) {
    const deadPenalty = hasDebridConfigured ? -8 : -40;
    score += deadPenalty;
    reasons.push({ signal: "zero-seeders-soft", delta: deadPenalty });
  }

  const expectedYear = opts.releaseDate
    ? parseInt(opts.releaseDate.slice(0, 4), 10)
    : null;
  if (
    expectedYear != null &&
    Number.isFinite(expectedYear) &&
    s.year != null
  ) {
    const diff = Math.abs(s.year - expectedYear);
    if (diff !== 0) {
      const releaseMs = opts.releaseDate ? Date.parse(opts.releaseDate) : NaN;
      const daysFromRelease = Number.isFinite(releaseMs)
        ? Math.abs(Date.now() - releaseMs) / 86_400_000
        : Infinity;
      const isRecent = daysFromRelease < 365;
      if (diff === 1) {
        const delta = isRecent ? -75 : -18;
        score += delta;
        reasons.push({ signal: `year-off-by-1:${s.year}vs${expectedYear}${isRecent ? "-recent" : ""}`, delta });
      } else {
        const delta = isRecent ? -150 : -70;
        score += delta;
        reasons.push({ signal: `year-mismatch:${s.year}vs${expectedYear}${isRecent ? "-recent" : ""}`, delta });
      }
    }
  }

  if (isTrustedGroup(s.releaseGroupNormalized)) {
    score += 2;
    reasons.push({ signal: `group:${s.releaseGroupNormalized}`, delta: 2 });
  }

  if (s.releaseGroupNormalized && opts.preferredGroups?.includes(s.releaseGroupNormalized)) {
    score += 8;
    reasons.push({ signal: `group-pref:${s.releaseGroupNormalized}`, delta: 8 });
  }

  if (opts.bitrateSweetSpot && s.size && opts.runtimeMinutes) {
    const mbps = (s.size * 8) / (opts.runtimeMinutes * 60) / 1_000_000;
    const [lo, hi] = s.resolution === "4K" ? [14, 30] : s.resolution === "1080p" ? [4, 8] : [0, 0];
    if (mbps >= lo && mbps <= hi && hi > 0) {
      score += 6;
      reasons.push({ signal: `bitrate-sweet-spot:${Math.round(mbps)}Mbps`, delta: 6 });
    }
  }

  if (opts.penalizeDubs) {
    const hay = [s.name, s.title, s.description].filter(Boolean).join(" \n ");
    if (/[\s._\-[(](?:rus|ukr|pol|tur|ita)[\s._-]?dub(?:bed)?\b/i.test(hay)) {
      score -= 40;
      reasons.push({ signal: "regional-dub", delta: -40 });
    }
  }

  const targetKey = s.infoHash
    ? s.infoHash.toLowerCase()
    : s.url
      ? (() => {
          try {
            const u = new URL(s.url);
            return `u:${u.hostname}${u.pathname}`.toLowerCase();
          } catch {
            return `u:${s.url.toLowerCase()}`;
          }
        })()
      : s.title || s.name
        ? `t:${s.addonId ? `${s.addonId}:` : ""}${s.title || s.name}`.toLowerCase()
        : null;

  if (targetKey && opts.demotedHashes?.includes(targetKey)) {
    score -= 200;
    reasons.push({ signal: "dead-link", delta: -200 });
  }

  if (targetKey && opts.verifiedHashes?.includes(targetKey)) {
    score += 150;
    reasons.push({ signal: "verified-correct-link", delta: 150 });
  }

  if (
    opts.preferredReleaseGroup &&
    s.releaseGroupNormalized &&
    s.releaseGroupNormalized === opts.preferredReleaseGroup
  ) {
    score += 8;
    reasons.push({ signal: `prev-episode-group:${s.releaseGroupNormalized}`, delta: 8 });
  }

  if (s.remux) {
    score += 3;
    reasons.push({ signal: "REMUX", delta: 3 });
  }

  if (s.source === "CAM") {
    score -= 80;
    reasons.push({ signal: "CAM penalty", delta: -80 });
  } else if (s.source === "TS" || s.source === "HDTS") {
    score -= 60;
    reasons.push({ signal: "Telesync penalty", delta: -60 });
  } else if (s.source === "TC") {
    score -= 50;
    reasons.push({ signal: "Telecine penalty", delta: -50 });
  } else if (s.source === "SCR") {
    score -= 40;
    reasons.push({ signal: "Screener penalty", delta: -40 });
  }

  if (s.proper || s.repackIteration > 0) {
    const r = Math.min(2, s.repackIteration || 1);
    score += r;
    reasons.push({ signal: s.proper ? "PROPER" : `REPACK${s.repackIteration}`, delta: r });
  }

  if (opts.preferredLanguages?.length) {
    if (s.audioLanguages.length === 0) {
      score -= 3;
      reasons.push({ signal: "language-unknown", delta: -3 });
    } else {
      const isMulti = s.audioLanguages.includes("Multi");
      const match = s.audioLanguages.some((l) =>
        opts.preferredLanguages!.some(
          (p) => l.toLowerCase() === p.toLowerCase() || l.toLowerCase().startsWith(p.toLowerCase()),
        ),
      );
      if (match) {
        score += 12;
        reasons.push({ signal: "preferred-language", delta: 12 });
      } else if (isMulti) {
        if (opts.preferSingleAudioTrack) {
          score -= 18;
          reasons.push({ signal: "html5-multi-audio-penalty", delta: -18 });
        } else {
          score += 4;
          reasons.push({ signal: "multi-language", delta: 4 });
        }
      } else {
        score -= 14;
        reasons.push({ signal: "language-mismatch", delta: -14 });
      }
    }
  } else if (opts.preferSingleAudioTrack && s.audioLanguages.includes("Multi")) {
    score -= 12;
    reasons.push({ signal: "html5-multi-audio-penalty", delta: -12 });
  }

  if (s.scamScore > 0) {
    score -= s.scamScore;
    reasons.push({ signal: "scam-penalty", delta: -s.scamScore });
  }

  if (s.url && !cached) {
    score += 4;
    reasons.push({ signal: "prelinked-url", delta: 4 });
  }

  if (opts.preferAddonId && s.addonId === opts.preferAddonId) {
    score += 250;
    reasons.push({ signal: "origin-addon", delta: 250 });
  }

  const trustedAddonBoost = trustedAddonPoints(s);
  if (trustedAddonBoost.delta > 0) {
    score += trustedAddonBoost.delta;
    reasons.push(trustedAddonBoost);
  }

  const addonPriorityBoost = addonPriorityPoints(s);
  if (addonPriorityBoost.delta > 0) {
    score += addonPriorityBoost.delta;
    reasons.push(addonPriorityBoost);
  }

  const playabilityDelta = playabilityPenalty(s);
  if (playabilityDelta < 0) {
    score += playabilityDelta;
    reasons.push({ signal: "webview2-unfriendly", delta: playabilityDelta });
  }

  // Web Browser sandbox auto-profile:
  // In the browser, native HTML5 cannot play MKV containers, DTS audio, or HEVC on many platforms.
  // Heavily promote standard web-friendly MP4/HLS streams (+40) and demote difficult MKV/DTS (-50)
  // so web users get an instant, flawless playback experience without VLC error cards.
  if (opts.capabilities?.isWeb) {
    const isWebNativeContainer =
      s.container === "mp4" || s.container === "m4v" || s.container === "webm" || !!s.url?.includes(".m3u8");
    const isWebNativeAudio =
      s.audio.codec === "AAC" || s.audio.codec === "Opus" || s.audio.codec === "Other" || !s.audio.codec;
    if (isWebNativeContainer && isWebNativeAudio) {
      score += 40;
      reasons.push({ signal: "web-friendly-stream", delta: 40 });
    } else if (s.container === "mkv" || s.audio.codec === "DTS" || s.audio.codec === "TrueHD") {
      score -= 50;
      reasons.push({ signal: "web-incompatible-format", delta: -50 });
    }
  }

  const bitratePenalty = bitrateBudgetPenalty(s, opts, cached);
  if (bitratePenalty.delta < 0) {
    score += bitratePenalty.delta;
    reasons.push(bitratePenalty);
  }

  const expectedMin = opts.runtimeMinutes ? expectedMinSizeBytes(s.resolution, opts.runtimeMinutes) : null;
  const hasValidSize = !!s.size && !!expectedMin && s.size >= expectedMin;

  const sizePenalty = sizeMislabelPenalty(s, expectedMin);
  if (sizePenalty < 0) {
    score += sizePenalty;
    reasons.push({ signal: "size-mismatch", delta: sizePenalty });
  }

  const desyncPenalty = camInFilenamePenalty(s);
  if (desyncPenalty < 0) {
    score += desyncPenalty;
    reasons.push({ signal: "title-says-hires-filename-says-cam", delta: desyncPenalty });
  }

  const undersizedPenalty = undersizedNewReleasePenalty(s, opts);
  if (undersizedPenalty.delta < 0) {
    score += undersizedPenalty.delta;
    reasons.push(undersizedPenalty);
  }

  const tinyPenalty = impossiblySmallMoviePenalty(s, opts);
  if (tinyPenalty.delta < 0) {
    score += tinyPenalty.delta;
    reasons.push(tinyPenalty);
  }

  const recency = freshTheatricalAdjust(s, opts, hasValidSize, corpus);
  if (recency.delta !== 0) {
    score += recency.delta;
    reasons.push(recency);
  }

  // Same-Name & Same-Year Movie Disambiguation
  if (opts.canonicalTitle || opts.director) {
    const expectedYear = opts.releaseDate ? parseInt(opts.releaseDate.slice(0, 4), 10) : null;
    const disambig = disambiguateRelease(s, {
      canonicalTitle: opts.canonicalTitle,
      expectedYear,
      runtimeMinutes: opts.runtimeMinutes,
      director: opts.director,
    });
    for (const p of disambig.penalties) {
      score += p.delta;
      reasons.push({ signal: p.reason, delta: p.delta });
    }
    for (const b of disambig.bonuses) {
      score += b.delta;
      reasons.push({ signal: b.reason, delta: b.delta });
    }
  }

  // Community / Local Ratings & Report Flags (Upvotes / Downvotes / Wrong movie reports)
  const ratingAdjust = calculateRatingScoreAdjustment(s);
  if (ratingAdjust.delta !== 0) {
    score += ratingAdjust.delta;
    reasons.push({
      signal: ratingAdjust.isVerifiedGood
        ? "community-verified-pristine"
        : ratingAdjust.isFlaggedWrong
          ? "reported-wrong-movie"
          : ratingAdjust.isFlaggedDead
            ? "reported-bad-link"
            : "community-feedback",
      delta: ratingAdjust.delta,
    });
  }

  return { ...s, score, reasons, tier: tierOf(s) };
}
