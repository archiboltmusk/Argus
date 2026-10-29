/**
 * Multi-CDN Stream Stitcher & Mirror Failover
 *
 * Maintains a healthy pool of stream CDNs / Debrid mirrors. When local ISP routing
 * suffers packet loss, throttling, or 403/502 HTTP gateway timeouts, seamlessly fails
 * over to alternate CDNs (e.g. Cloudflare, Fastly, Bunny, Debrid edge nodes) preserving
 * the exact current playback millisecond.
 */

export interface StreamMirror {
  id: string;
  url: string;
  provider: string; // e.g. "Cloudflare CDN", "Mumbai Edge", "Torbox Direct", "Real-Debrid EU"
  priority: number;
  healthScore: number; // 0 - 100
  latencyMs?: number;
  lastErrorTime?: number;
}

export class StreamMirrorFailoverManager {
  private mirrors: Map<string, StreamMirror[]> = new Map();
  private activeMirrorIndex: Map<string, number> = new Map();

  /**
   * Registers known mirrors for a given media stream identifier.
   */
  public registerMirrors(mediaId: string, mirrorList: StreamMirror[]) {
    // Sort by priority and health score
    const sorted = [...mirrorList].sort((a, b) => {
      if (b.healthScore !== a.healthScore) return b.healthScore - a.healthScore;
      return a.priority - b.priority;
    });
    this.mirrors.set(mediaId, sorted);
    this.activeMirrorIndex.set(mediaId, 0);
  }

  /**
   * Retrieves the currently active mirror URL for the given media.
   */
  public getCurrentMirror(mediaId: string): StreamMirror | null {
    const list = this.mirrors.get(mediaId);
    if (!list || list.length === 0) return null;
    const idx = this.activeMirrorIndex.get(mediaId) ?? 0;
    return list[idx] || list[0];
  }

  /**
   * Fails over to the next best mirror when a stall or HTTP error occurs.
   * Returns the new mirror URL to resume playback from.
   */
  public triggerFailover(mediaId: string, reason: string): { failedOver: boolean; newMirror: StreamMirror | null; reason: string } {
    const list = this.mirrors.get(mediaId);
    if (!list || list.length <= 1) {
      return { failedOver: false, newMirror: null, reason: "No alternate mirrors available" };
    }

    const currentIdx = this.activeMirrorIndex.get(mediaId) ?? 0;
    const failedMirror = list[currentIdx];
    if (failedMirror) {
      failedMirror.healthScore = Math.max(0, failedMirror.healthScore - 35);
      failedMirror.lastErrorTime = Date.now();
    }

    // Pick next available mirror
    const nextIdx = (currentIdx + 1) % list.length;
    this.activeMirrorIndex.set(mediaId, nextIdx);
    const nextMirror = list[nextIdx];

    return {
      failedOver: true,
      newMirror: nextMirror,
      reason: `Switched from ${failedMirror?.provider || "primary"} to ${nextMirror.provider} (${reason})`,
    };
  }

  /**
   * Records successful chunk retrieval or healthy heartbeat to restore mirror score.
   */
  public recordSuccess(mediaId: string) {
    const mirror = this.getCurrentMirror(mediaId);
    if (mirror) {
      mirror.healthScore = Math.min(100, mirror.healthScore + 5);
    }
  }
}

export const streamMirrorManager = new StreamMirrorFailoverManager();
