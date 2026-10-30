/**
 * DNS over HTTPS (DoH) Resolver for Argus
 *
 * Bypasses local ISP DNS tampering, NXDOMAIN hijacking, and censorship of
 * open torrent trackers, shadow libraries, and stream mirrors using
 * encrypted DNS (Cloudflare 1.1.1.1 and Google 8.8.8.8).
 */

export interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

export interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

const DOH_ENDPOINTS = [
  "https://cloudflare-dns.com/dns-query",
  "https://dns.google/resolve",
];

/** Resolves an IP address for a hostname via DNS over HTTPS */
export async function resolveDoh(hostname: string, recordType = "A"): Promise<string[]> {
  const cleanHost = hostname.trim().replace(/^https?:\/\//i, "").split(/[/:]/)[0];
  if (!cleanHost || /^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) {
    return [cleanHost];
  }

  for (const endpoint of DOH_ENDPOINTS) {
    try {
      const url = `${endpoint}?name=${encodeURIComponent(cleanHost)}&type=${recordType}`;
      const res = await fetch(url, {
        headers: { Accept: "application/dns-json" },
      });
      if (!res.ok) continue;

      const data = (await res.json()) as DohResponse;
      if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
        return data.Answer.filter((ans) => ans.type === 1 || ans.type === 28).map((ans) => ans.data);
      }
    } catch {
      // try next mirror
    }
  }

  return [];
}

/** Check if DoH is reachable from the current network */
export async function testDohConnectivity(): Promise<boolean> {
  const ips = await resolveDoh("cloudflare.com");
  return ips.length > 0;
}
