import { invoke } from "@tauri-apps/api/core";
import { getMusicState, subscribeMusic } from "./player";
import { musicAdvance } from "./transport";
import type { MusicTrack } from "./types";

let armedTrackKey: string | null = null;
let crossfadeAnimationTimer: number | null = null;
let activeCrossfadeSec = 0;

/**
 * Arms and manages smooth crossfade transitions between continuous tracks in the music queue.
 */
export function setMusicCrossfadeDuration(seconds: number): void {
  activeCrossfadeSec = Math.max(0, Math.min(12, seconds));
}

export function getMusicCrossfadeDuration(): number {
  return activeCrossfadeSec;
}

function cancelCrossfadeAnimation(): void {
  if (crossfadeAnimationTimer !== null) {
    window.clearInterval(crossfadeAnimationTimer);
    crossfadeAnimationTimer = null;
  }
}

/**
 * Smoothly interpolates crossfader position between Deck 0 (1.0) and Deck 1 (0.0)
 * over durationSec seconds.
 */
export function startCrossfadeTransition(fromDeck: number, toDeck: number, durationSec: number): Promise<void> {
  cancelCrossfadeAnimation();
  if (durationSec <= 0) {
    void invoke("music_deck_primary", { deck: toDeck });
    return Promise.resolve();
  }

  const steps = Math.max(10, Math.round(durationSec * 20));
  const intervalMs = Math.round((durationSec * 1000) / steps);
  let step = 0;

  return new Promise((resolve) => {
    crossfadeAnimationTimer = window.setInterval(() => {
      step++;
      const progress = Math.min(1, step / steps);
      // Cosine / S-curve easing for natural perceived loudness
      const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      const position = fromDeck === 0 ? ease : 1.0 - ease;

      void invoke("music_deck_crossfade", { position }).catch(() => {});

      if (progress >= 1.0) {
        cancelCrossfadeAnimation();
        void invoke("music_deck_primary", { deck: toDeck }).catch(() => {});
        resolve();
      }
    }, intervalMs);
  });
}

/**
 * Checks playback progress against configured crossfade lead and prepares next deck.
 */
export function checkCrossfadeProgress(currentTime: number, duration: number, nextTrack?: MusicTrack | null): void {
  if (activeCrossfadeSec <= 0 || duration <= 0 || !nextTrack) return;
  const remaining = duration - currentTime;
  const currentKey = `${nextTrack.connectorId}:${nextTrack.id}`;

  if (remaining <= activeCrossfadeSec && remaining > 0.5 && armedTrackKey !== currentKey) {
    armedTrackKey = currentKey;
    // Pre-start standby deck and crossfade
    void invoke("music_deck_play", {
      deck: 1,
      track: nextTrack,
      volume: 0.82,
    })
      .then(() => {
        void startCrossfadeTransition(0, 1, activeCrossfadeSec);
      })
      .catch(() => {
        armedTrackKey = null;
      });
  }
}

// Global player state watcher for auto-crossfading
if (typeof window !== "undefined") {
  subscribeMusic(() => {
    const s = getMusicState();
    if (!s.current || s.phase !== "playing") {
      armedTrackKey = null;
      cancelCrossfadeAnimation();
      return;
    }
    const next = musicAdvance(s.queue, s.queueIndex, false);
    if (next) {
      checkCrossfadeProgress(s.currentTime, s.duration, next);
    }
  });
}
