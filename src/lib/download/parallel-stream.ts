/**
 * Multi-Part Parallel Stream & Chunk Downloader for Argus
 *
 * Accelerates large downloads by splitting HTTP GET requests into multiple
 * parallel Range requests (4-8 connections), bypassing ISP single-stream throttling.
 */

export interface ChunkProgress {
  chunkIndex: number;
  received: number;
  total: number;
}

export interface ParallelDownloadOptions {
  concurrency?: number;
  headers?: Record<string, string>;
  onProgress?: (receivedBytes: number, totalBytes: number, percent: number) => void;
  signal?: AbortSignal;
}

/** Determines whether the remote server supports HTTP Range requests */
export async function probeRangeSupport(
  url: string,
  headers?: Record<string, string>,
): Promise<{ supportsRanges: boolean; contentLength: number }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: {
        Accept: "*/*",
        ...headers,
      },
    });

    const acceptRanges = res.headers.get("accept-ranges");
    const len = parseInt(res.headers.get("content-length") || "0", 10);
    const supportsRanges = acceptRanges === "bytes" && len > 0;

    return { supportsRanges, contentLength: len };
  } catch {
    return { supportsRanges: false, contentLength: 0 };
  }
}

/** Downloads an HTTP resource using parallel chunked Range connections */
export async function downloadParallel(
  url: string,
  options: ParallelDownloadOptions = {},
): Promise<Uint8Array> {
  const concurrency = Math.max(2, Math.min(16, options.concurrency ?? 6));
  const { supportsRanges, contentLength } = await probeRangeSupport(url, options.headers);

  // If server does not support byte ranges or content is small (< 2MB), fallback to single stream
  if (!supportsRanges || contentLength < 2 * 1024 * 1024) {
    const res = await fetch(url, {
      headers: options.headers,
      signal: options.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  const chunkSize = Math.ceil(contentLength / concurrency);
  const result = new Uint8Array(contentLength);
  let totalReceived = 0;

  const tasks = Array.from({ length: concurrency }, async (_, i) => {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize - 1, contentLength - 1);
    if (start > end) return;

    const res = await fetch(url, {
      headers: {
        ...options.headers,
        Range: `bytes=${start}-${end}`,
      },
      signal: options.signal,
    });

    if (!res.ok && res.status !== 206) {
      throw new Error(`Chunk ${i} failed with HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const data = new Uint8Array(await res.arrayBuffer());
      result.set(data, start);
      totalReceived += data.length;
      options.onProgress?.(totalReceived, contentLength, Math.round((totalReceived / contentLength) * 100));
      return;
    }

    let offset = start;
    while (true) {
      if (options.signal?.aborted) throw new Error("Download aborted");
      const { done, value } = await reader.read();
      if (done) break;
      result.set(value, offset);
      offset += value.length;
      totalReceived += value.length;
      options.onProgress?.(totalReceived, contentLength, Math.round((totalReceived / contentLength) * 100));
    }
  });

  await Promise.all(tasks);
  return result;
}
