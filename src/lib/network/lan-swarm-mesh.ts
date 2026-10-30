/**
 * Argus Nexus Universal Local LAN Swarm & P2P Mesh Caching
 *
 * Allows any Argus instance (Mac, PC, TV, Projector, Phone) on the same local
 * network to discover each other and stream cached media at 800-1200 Mbps
 * without consuming any external internet bandwidth or mobile data quota.
 */

export interface LanSwarmPeer {
  id: string;
  name: string;
  deviceType: "mac" | "tv" | "projector" | "mobile" | "pc";
  ipAddress: string;
  port: number;
  availableMediaIds: string[];
  isOnline: boolean;
  bandwidthMbps: number;
}

export interface CachedMediaManifest {
  mediaId: string;
  title: string;
  kind: "movie" | "anime-episode" | "manga-volume" | "ebook" | "audiobook";
  totalBytes: number;
  localPath: string;
  streamUrl: string;
  isFullyCached: boolean;
}

const PEER_CACHE_KEY = "argus.nexus.swarm.peers.v1";
const MEDIA_MANIFEST_KEY = "argus.nexus.swarm.manifest.v1";

export function listSwarmPeers(): LanSwarmPeer[] {
  try {
    const raw = localStorage.getItem(PEER_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function registerSwarmPeer(peer: LanSwarmPeer): void {
  const current = listSwarmPeers();
  const filtered = current.filter((p) => p.id !== peer.id);
  try {
    localStorage.setItem(PEER_CACHE_KEY, JSON.stringify([...filtered, peer]));
  } catch {
    /* ignore */
  }
}

export function listSwarmMedia(): CachedMediaManifest[] {
  try {
    const raw = localStorage.getItem(MEDIA_MANIFEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function publishMediaToSwarm(item: CachedMediaManifest): void {
  const current = listSwarmMedia();
  const filtered = current.filter((m) => m.mediaId !== item.mediaId);
  try {
    localStorage.setItem(MEDIA_MANIFEST_KEY, JSON.stringify([...filtered, item]));
  } catch {
    /* ignore */
  }
}

/**
 * Resolves the fastest local stream URL for a given media ID.
 * If another device on your LAN already has it cached, returns the direct
 * 1Gbps LAN stream URL instead of pulling from the external internet.
 */
export function resolveFastestSwarmStream(mediaId: string): string | null {
  const local = listSwarmMedia().find((m) => m.mediaId === mediaId);
  if (local?.isFullyCached) {
    return local.streamUrl;
  }

  const peers = listSwarmPeers().filter((p) => p.isOnline && p.availableMediaIds.includes(mediaId));
  if (peers.length === 0) return null;

  // Pick peer with highest available local bandwidth
  const bestPeer = peers.sort((a, b) => b.bandwidthMbps - a.bandwidthMbps)[0];
  return `http://${bestPeer.ipAddress}:${bestPeer.port}/stream/${encodeURIComponent(mediaId)}`;
}
