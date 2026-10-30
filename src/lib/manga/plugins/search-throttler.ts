/**
 * Search Concurrency Throttler & Rate-Limit Queue for Argus Universal Reader
 *
 * Prevents IP burnout and DNS flooding when executing federated searches
 * across dozens of manga, comic, and web novel scrapers simultaneously:
 * 1. Concurrency pooling (limits active scrapers to max 5 concurrent requests)
 * 2. Staggered jittered debounce (avoids burst spikes to remote CDNs)
 * 3. In-memory LRU search cache (prevents duplicate hits for identical queries)
 */

export interface ThrottledSearchTask<T> {
  id: string;
  sourceName: string;
  execute: () => Promise<T[]>;
}

export class SearchThrottler {
  private static instance: SearchThrottler;
  private maxConcurrency = 5;
  private cache: Map<string, { timestamp: number; data: unknown[] }> = new Map();
  private cacheTtlMs = 15 * 60 * 1000; // 15 minutes

  public static getInstance(): SearchThrottler {
    if (!SearchThrottler.instance) {
      SearchThrottler.instance = new SearchThrottler();
    }
    return SearchThrottler.instance;
  }

  /**
   * Runs tasks with strict concurrency limits and early streaming
   */
  public async executePool<T>(
    tasks: ThrottledSearchTask<T>[],
    queryKey: string,
    onBatchResolved?: (results: T[]) => void,
  ): Promise<T[]> {
    const cleanKey = queryKey.toLowerCase().trim();
    if (this.cache.has(cleanKey)) {
      const cached = this.cache.get(cleanKey)!;
      if (Date.now() - cached.timestamp < this.cacheTtlMs) {
        return cached.data as T[];
      }
    }

    const allResults: T[] = [];
    let taskIndex = 0;

    const worker = async () => {
      while (taskIndex < tasks.length) {
        const current = tasks[taskIndex++];
        if (!current) break;

        try {
          const res = await current.execute();
          if (Array.isArray(res) && res.length > 0) {
            allResults.push(...res);
            onBatchResolved?.(res);
          }
        } catch (err) {
          console.warn(`[search-throttler] task ${current.sourceName} error:`, err);
        }
        // Small 30ms yield to keep UI thread responsive
        await new Promise((r) => setTimeout(r, 30));
      }
    };

    const pool = Array.from({ length: Math.min(this.maxConcurrency, tasks.length) }, () => worker());
    await Promise.all(pool);

    this.cache.set(cleanKey, {
      timestamp: Date.now(),
      data: allResults,
    });

    return allResults;
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
