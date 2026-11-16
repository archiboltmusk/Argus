/**
 * Argus Local LAN Mesh & Swarm Discovery
 * Discovers peer Argus players on the local Wi-Fi / subnet via zero-config beaconing.
 * Coordinates ultra-fast direct LAN peer transfers of academic courseware and video torrents.
 */

export interface LanPeer {
  id: string;
  name: string;
  ip: string;
  port: number;
  clientVersion: string;
  availableInfohashes: string[];
  lastSeen: number;
  downloadSpeedBps: number;
  uploadSpeedBps: number;
}

export interface SwarmMessage {
  type: "ANNOUNCE" | "PEER_DISCOVERY" | "PIECE_REQUEST" | "LEAVE";
  peerId: string;
  payload: {
    name?: string;
    port?: number;
    infohashes?: string[];
    requestedPiece?: number;
  };
  timestamp: number;
}

const PEER_TIMEOUT_MS = 30000; // 30 seconds inactivity timeout

export class LocalLanMeshEngine {
  private localPeerId: string;
  private localName: string;
  private localPort: number;
  private peers = new Map<string, LanPeer>();
  private sharedInfohashes = new Set<string>();
  private intervalTimer: number | null = null;

  constructor(localPort = 11470) {
    this.localPeerId = `argus-peer-${Math.random().toString(36).slice(2, 9)}`;
    this.localName = "Argus Local Node";
    this.localPort = localPort;
  }

  public getPeerId(): string {
    return this.localPeerId;
  }

  public registerSharedInfohash(infohash: string): void {
    this.sharedInfohashes.add(infohash.toLowerCase());
  }

  public unregisterSharedInfohash(infohash: string): void {
    this.sharedInfohashes.delete(infohash.toLowerCase());
  }

  public getSharedInfohashes(): string[] {
    return Array.from(this.sharedInfohashes);
  }

  /**
   * Ingests an incoming peer announcement message received via LAN broadcast.
   */
  public handleIncomingMessage(ip: string, msg: SwarmMessage): LanPeer | null {
    if (msg.peerId === this.localPeerId) return null; // Ignore self

    const now = Date.now();

    if (msg.type === "LEAVE") {
      this.peers.delete(msg.peerId);
      return null;
    }

    const existing = this.peers.get(msg.peerId);
    const updated: LanPeer = {
      id: msg.peerId,
      name: msg.payload.name || existing?.name || "Argus Peer",
      ip,
      port: msg.payload.port || existing?.port || 11470,
      clientVersion: "2.4.0-mesh",
      availableInfohashes: msg.payload.infohashes || existing?.availableInfohashes || [],
      lastSeen: now,
      downloadSpeedBps: existing?.downloadSpeedBps || 0,
      uploadSpeedBps: existing?.uploadSpeedBps || 0,
    };

    this.peers.set(msg.peerId, updated);
    return updated;
  }

  /**
   * Returns list of currently active LAN peers holding a specific torrent / courseware infohash.
   */
  public findPeersForInfohash(infohash: string): LanPeer[] {
    this.cleanStalePeers();
    const target = infohash.toLowerCase();
    const matches: LanPeer[] = [];

    for (const peer of this.peers.values()) {
      if (peer.availableInfohashes.map((h) => h.toLowerCase()).includes(target)) {
        matches.push(peer);
      }
    }

    return matches;
  }

  public getAllActivePeers(): LanPeer[] {
    this.cleanStalePeers();
    return Array.from(this.peers.values());
  }

  public cleanStalePeers(): void {
    const now = Date.now();
    for (const [id, peer] of this.peers.entries()) {
      if (now - peer.lastSeen > PEER_TIMEOUT_MS) {
        this.peers.delete(id);
      }
    }
  }

  public buildAnnouncementPayload(): SwarmMessage {
    return {
      type: "ANNOUNCE",
      peerId: this.localPeerId,
      payload: {
        name: this.localName,
        port: this.localPort,
        infohashes: Array.from(this.sharedInfohashes),
      },
      timestamp: Date.now(),
    };
  }

  public start(broadcastIntervalMs = 10000): void {
    if (this.intervalTimer) return;
    this.intervalTimer = window.setInterval(() => {
      this.cleanStalePeers();
    }, broadcastIntervalMs);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}

export const lanMesh = new LocalLanMeshEngine();
