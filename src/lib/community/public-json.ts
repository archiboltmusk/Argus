export type PublicRequest = {
  consent: boolean;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  headers?: Record<string, string>;
};

/** Explicit, bounded public reads shared by community adapters. */
export async function readPublicText(
  url: string,
  { consent, signal, fetcher = fetch, headers }: PublicRequest,
): Promise<string> {
  if (consent !== true) throw new Error("Community data requires explicit consent.");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const timeout = setTimeout(cancel, 12_000);
  try {
    if (controller.signal.aborted) throw new Error("Community request cancelled.");
    const response = await fetcher(url, {
      method: "GET",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
      ...(headers ? { headers } : {}),
    });
    if (!response.ok) throw new Error("Community dataset is unavailable.");
    const body = await response.text();
    if (controller.signal.aborted) throw new Error("Community request cancelled.");
    if (body.length > 256_000) throw new Error("Community dataset exceeds the supported size.");
    return body;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

export async function readPublicJson(url: string, request: PublicRequest): Promise<unknown> {
  return JSON.parse(await readPublicText(url, request)) as unknown;
}
