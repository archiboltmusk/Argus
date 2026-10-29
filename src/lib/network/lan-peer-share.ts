export type LanPeerNode = {
  id: string;
  deviceName: string;
  ipAddress: string;
  port: number;
  availableCatalogs: string[];
  lastSeen: number;
};

/**
 * Manages local area network peer sharing for zero-data transfers (hostel/campus mesh).
 * Allows downloading 40-80 GB game archives or 4K streams from peers on the same Wi-Fi
 * at full gigabit speeds without consuming external cellular or broadband data.
 */
export function formatLanPeerTransferSpeed(bps: number): string {
  if (bps >= 1024 * 1024 * 1024) return `${(bps / (1024 * 1024 * 1024)).toFixed(1)} GB/s (Local LAN)`;
  if (bps >= 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s (Local Wi-Fi)`;
  return `${Math.round(bps / 1024)} KB/s`;
}

export function isLocalSubnetAddress(ip: string): boolean {
  return (
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip === "127.0.0.1" ||
    ip === "localhost"
  );
}
