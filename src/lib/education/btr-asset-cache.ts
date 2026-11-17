/**
 * CoreBTR Offline Asset & High-Yield Image Caching Service
 *
 * Caches S3 question and explanation images into local browser CacheStorage
 * enabling complete 100% offline study without network access.
 */

const CACHE_NAME = "argus-btr-assets-v1";

let isCachingInProgress = false;

function hasCacheAPI(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

/**
 * Cache an array of image URLs
 */
export async function cacheQuestionImages(imageUrls: string[]): Promise<number> {
  if (!hasCacheAPI() || imageUrls.length === 0) return 0;

  try {
    const cache = await caches.open(CACHE_NAME);
    let count = 0;

    await Promise.allSettled(
      imageUrls.map(async (url) => {
        if (!url || !url.startsWith("http")) return;
        const match = await cache.match(url);
        if (!match) {
          try {
            const resp = await fetch(url, { mode: "cors" });
            if (resp.ok) {
              await cache.put(url, resp);
              count++;
            }
          } catch {
            // ignore network fail for single image
          }
        } else {
          count++;
        }
      })
    );

    return count;
  } catch (e) {
    console.warn("[btr-asset-cache] cacheQuestionImages error", e);
    return 0;
  }
}

/**
 * Check if a specific image URL is cached locally
 */
export async function isImageCached(url: string): Promise<boolean> {
  if (!hasCacheAPI() || !url) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}

/**
 * Resolves an image URL: returns local Blob object URL if cached, otherwise returns original URL
 */
export async function resolvePlayableImageUrl(url: string): Promise<string> {
  if (!hasCacheAPI() || !url || !url.startsWith("http")) return url;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    if (match) {
      const blob = await match.blob();
      return URL.createObjectURL(blob);
    }
  } catch {
    // fallback to original url
  }
  return url;
}

/**
 * Prefetch all images for a list of questions in the background
 */
export async function prefetchImagesForQuestions(
  images: string[],
  onProgress?: (cached: number, total: number) => void
): Promise<{ total: number; cached: number }> {
  if (!hasCacheAPI() || images.length === 0) {
    return { total: images.length, cached: 0 };
  }

  if (isCachingInProgress) {
    return { total: images.length, cached: 0 };
  }

  isCachingInProgress = true;
  let cached = 0;
  const uniqueUrls = Array.from(new Set(images.filter((u) => u && u.startsWith("http"))));
  const total = uniqueUrls.length;

  try {
    const cache = await caches.open(CACHE_NAME);

    // Batch in chunks of 5 to avoid browser network queue congestion
    const chunkSize = 5;
    for (let i = 0; i < uniqueUrls.length; i += chunkSize) {
      const chunk = uniqueUrls.slice(i, i + chunkSize);
      await Promise.allSettled(
        chunk.map(async (url) => {
          try {
            const match = await cache.match(url);
            if (!match) {
              const resp = await fetch(url, { mode: "cors" });
              if (resp.ok) {
                await cache.put(url, resp);
                cached++;
              }
            } else {
              cached++;
            }
          } catch {
            // ignore
          }
        })
      );
      onProgress?.(cached, total);
    }
  } finally {
    isCachingInProgress = false;
  }

  return { total, cached };
}

/**
 * Clear offline asset cache
 */
export async function clearBTRAssetCache(): Promise<boolean> {
  if (!hasCacheAPI()) return false;
  try {
    return await caches.delete(CACHE_NAME);
  } catch {
    return false;
  }
}
