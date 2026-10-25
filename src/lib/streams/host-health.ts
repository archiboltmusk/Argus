import { streamHost } from "./dead-links";

const STORAGE_KEY = "argus:host-health-ewma:v1";
const EWMA_ALPHA = 0.3; // Weight of recent speed sample vs historical baseline
const HOST_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours retention
const MIN_SAMPLES_FOR_BONUS = 2;

export type HostMetric = {
  ewmaMbps: number;
  ewmaLatencyMs: number;
  sampleCount: number;
  consecutiveFailures: number;
  lastFailureAt?: number;
  updatedAt: number;
};

type HostStore = Record<string, HostMetric>;

let inMemoryStore: HostStore | null = null;

function loadStore(): HostStore {
  if (inMemoryStore) return inMemoryStore;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      inMemoryStore = {};
      return inMemoryStore;
    }
    const parsed = JSON.parse(raw) as HostStore;
    const now = Date.now();
    const clean: HostStore = {};
    for (const [host, m] of Object.entries(parsed)) {
      if (m && typeof m.ewmaMbps === "number" && now - m.updatedAt < HOST_TTL_MS) {
        clean[host] = m;
      }
    }
    inMemoryStore = clean;
    return clean;
  } catch {
    inMemoryStore = {};
    return inMemoryStore;
  }
}

function persistStore(store: HostStore): void {
  inMemoryStore = store;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  } catch {}
}

/** Record successful transmission / probe throughput for a CDN hostname */
export function recordHostThroughput(url: string | null | undefined, mbps: number, latencyMs = 100): void {
  const host = streamHost(url);
  if (!host || mbps <= 0) return;

  const store = loadStore();
  const existing = store[host];
  const now = Date.now();

  if (!existing) {
    store[host] = {
      ewmaMbps: Math.round(mbps * 10) / 10,
      ewmaLatencyMs: Math.round(latencyMs),
      sampleCount: 1,
      consecutiveFailures: 0,
      updatedAt: now,
    };
  } else {
    store[host] = {
      ewmaMbps: Math.round((EWMA_ALPHA * mbps + (1 - EWMA_ALPHA) * existing.ewmaMbps) * 10) / 10,
      ewmaLatencyMs: Math.round(EWMA_ALPHA * latencyMs + (1 - EWMA_ALPHA) * existing.ewmaLatencyMs),
      sampleCount: existing.sampleCount + 1,
      consecutiveFailures: 0,
      updatedAt: now,
    };
  }
  persistStore(store);
}

/** Record playback stall, timeout or socket abort against a CDN hostname */
export function recordHostFailure(url: string | null | undefined): void {
  const host = streamHost(url);
  if (!host) return;

  const store = loadStore();
  const existing = store[host];
  const now = Date.now();

  if (!existing) {
    store[host] = {
      ewmaMbps: 0.5,
      ewmaLatencyMs: 1500,
      sampleCount: 1,
      consecutiveFailures: 1,
      lastFailureAt: now,
      updatedAt: now,
    };
  } else {
    store[host] = {
      ...existing,
      consecutiveFailures: existing.consecutiveFailures + 1,
      // Penalize EWMA speed on failure
      ewmaMbps: Math.max(0.2, Math.round(existing.ewmaMbps * 0.5 * 10) / 10),
      lastFailureAt: now,
      updatedAt: now,
    };
  }
  persistStore(store);
}

/** Calculate an algorithmic score delta based on the host's EWMA health history (-80 to +40) */
export function getHostScoreBonus(url: string | null | undefined): number {
  const host = streamHost(url);
  if (!host) return 0;

  const store = loadStore();
  const metric = store[host];
  if (!metric) return 0;

  // Circuit breaker: Host has failed 2+ times recently (within 20 mins)
  const now = Date.now();
  if (metric.consecutiveFailures >= 2 && metric.lastFailureAt && now - metric.lastFailureAt < 20 * 60 * 1000) {
    return -75; // Heavily de-rank unviable CDN host
  }

  if (metric.consecutiveFailures >= 1 && metric.lastFailureAt && now - metric.lastFailureAt < 5 * 60 * 1000) {
    return -40;
  }

  // Consistent fast host with adequate samples
  if (metric.sampleCount >= MIN_SAMPLES_FOR_BONUS) {
    if (metric.ewmaMbps >= 15 && metric.ewmaLatencyMs < 300) {
      return 35; // Stellar CDN host
    }
    if (metric.ewmaMbps >= 6) {
      return 15; // Reliable host
    }
    if (metric.ewmaMbps < 1.5) {
      return -30; // Chronic low throughput host
    }
  }

  return 0;
}

/** Reset host health history (testing/maintenance) */
export function clearHostHealthStore(): void {
  inMemoryStore = {};
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}
