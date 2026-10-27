import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerSnapshot } from "@/lib/player/bridge";
import type { PlayerSrc } from "@/lib/view";
import type { DebridStore } from "@/lib/debrid/types";
import type { ScoredStream } from "@/lib/streams/types";
import { isLocalUrl } from "@/lib/player/local-url";
import { peekPickerCache, subscribePickerCache } from "@/lib/picker-cache";
import { findBestQualityUpgrade, type QualityUpgradeCandidate } from "@/lib/player/quality-upgrade";

export type QualityUpgradeOffer = {
  candidate: QualityUpgradeCandidate;
  stream: ScoredStream;
  summary: string;
};

export function useQualityUpgrade(params: {
  src: PlayerSrc;
  snap: PlayerSnapshot;
  debrids: DebridStore[];
  enabled: boolean;
  onSwitchStream: (stream: ScoredStream) => Promise<void>;
  inRoom?: boolean;
}) {
  const { src, snap, debrids, enabled, onSwitchStream, inRoom = false } = params;

  const [upgradeOffer, setUpgradeOffer] = useState<QualityUpgradeOffer | null>(null);
  const dismissedHashesRef = useRef<Set<string>>(new Set());
  const switchingRef = useRef(false);

  // Clear when changing media source (new movie/episode)
  useEffect(() => {
    setUpgradeOffer(null);
    dismissedHashesRef.current.clear();
    switchingRef.current = false;
  }, [src.meta.id, src.episode?.season, src.episode?.episode]);

  // Auditor that checks available streams in pickerCache whenever cache updates or playback settles
  const checkUpgrade = useCallback(() => {
    if (!enabled || src.isLive || inRoom || isLocalUrl(src.url)) {
      setUpgradeOffer(null);
      return;
    }

    // Only suggest upgrades when playback is healthy and active (not paused/ended/error)
    if (snap.status !== "playing" || snap.positionSec < 3) {
      return;
    }

    const cacheEntry = peekPickerCache(src.meta, src.episode);
    const candidates = cacheEntry?.result?.picker?.all ?? [];
    if (candidates.length === 0) return;

    const currentHash = src.streamRef?.infoHash;
    const currentStream = candidates.find(
      (c) =>
        (currentHash && c.infoHash && c.infoHash.toLowerCase() === currentHash.toLowerCase()) ||
        (src.url && c.url === src.url),
    );

    const upgrade = findBestQualityUpgrade(
      candidates,
      currentStream,
      src.url,
      currentHash,
      debrids,
    );

    if (upgrade) {
      const upgradeKey = upgrade.stream.infoHash ?? upgrade.stream.url ?? "";
      if (dismissedHashesRef.current.has(upgradeKey)) {
        return;
      }

      const summary = upgrade.reasons.join(" · ");
      setUpgradeOffer({
        candidate: upgrade,
        stream: upgrade.stream,
        summary,
      });
    } else {
      setUpgradeOffer(null);
    }
  }, [
    enabled,
    src.isLive,
    src.meta,
    src.episode,
    src.url,
    src.streamRef?.infoHash,
    snap.status,
    snap.positionSec,
    debrids,
    inRoom,
  ]);

  // Listen to pickerCache updates as background scrapers return
  useEffect(() => {
    return subscribePickerCache(checkUpgrade);
  }, [checkUpgrade]);

  // Re-check periodically during first 2 minutes of playback
  useEffect(() => {
    if (!enabled || src.isLive || inRoom) return;
    const interval = window.setInterval(checkUpgrade, 4000);
    return () => window.clearInterval(interval);
  }, [checkUpgrade, enabled, src.isLive, inRoom]);

  const acceptUpgrade = useCallback(async () => {
    if (!upgradeOffer || switchingRef.current) return;
    switchingRef.current = true;
    const target = upgradeOffer.stream;
    setUpgradeOffer(null);
    try {
      await onSwitchStream(target);
    } finally {
      switchingRef.current = false;
    }
  }, [upgradeOffer, onSwitchStream]);

  const dismissUpgrade = useCallback(() => {
    if (upgradeOffer) {
      const key = upgradeOffer.stream.infoHash ?? upgradeOffer.stream.url ?? "";
      if (key) dismissedHashesRef.current.add(key);
    }
    setUpgradeOffer(null);
  }, [upgradeOffer]);

  return {
    upgradeOffer,
    acceptUpgrade,
    dismissUpgrade,
  };
}
