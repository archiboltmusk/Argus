const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, If-Range, Content-Type, Accept",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
  "Access-Control-Max-Age": "86400",
};

const ALLOWED_CUSTOM_HEADERS = new Set(["referer", "origin", "user-agent", "authorization", "cookie"]);

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "::"
  ) {
    return true;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return true;
    }
  }
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return true;
  }
  return false;
}

function decodeHeadersParam(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)));
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && ALLOWED_CUSTOM_HEADERS.has(k.toLowerCase())) {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function rewriteHlsPlaylist(
  playlist: string,
  baseUrl: string,
  workerOrigin: string,
  encodedHeaders: string | null,
): string {
  const toProxy = (uri: string) => {
    const absolute = new URL(uri, baseUrl).toString();
    const params = new URLSearchParams({ url: absolute });
    if (encodedHeaders) params.set("headers", encodedHeaders);
    return `${workerOrigin}/proxy?${params.toString()}`;
  };

  return playlist
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
          try {
            return `URI="${toProxy(uri)}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
      }
      try {
        return toProxy(trimmed);
      } catch {
        return line;
      }
    })
    .join("\n");
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const reqUrl = new URL(request.url);
    if (reqUrl.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "argus-stream-relay" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "content-type": "application/json" },
      });
    }

    if (reqUrl.pathname !== "/proxy") {
      return new Response("Not found", { status: 404, headers: CORS_HEADERS });
    }

    const targetParam = reqUrl.searchParams.get("url");
    if (!targetParam) {
      return new Response("Missing url parameter", { status: 400, headers: CORS_HEADERS });
    }

    let target: URL;
    try {
      target = new URL(targetParam);
    } catch {
      return new Response("Invalid url parameter", { status: 400, headers: CORS_HEADERS });
    }

    if ((target.protocol !== "https:" && target.protocol !== "http:") || isPrivateHost(target.hostname)) {
      return new Response("Forbidden target URL", { status: 403, headers: CORS_HEADERS });
    }

    const encodedHeaders = reqUrl.searchParams.get("headers");
    const customHeaders = decodeHeadersParam(encodedHeaders);
    const upstreamHeaders = new Headers();
    for (const [k, v] of Object.entries(customHeaders)) {
      upstreamHeaders.set(k, v);
    }
    const range = request.headers.get("range");
    if (range) upstreamHeaders.set("range", range);
    const ifRange = request.headers.get("if-range");
    if (ifRange) upstreamHeaders.set("if-range", ifRange);

    const upstream = await fetch(target.toString(), {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: upstreamHeaders,
      redirect: "follow",
    });

    const responseHeaders = new Headers(CORS_HEADERS);
    for (const key of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
      const val = upstream.headers.get(key);
      if (val) responseHeaders.set(key, val);
    }

    const contentType = (upstream.headers.get("content-type") ?? "").toLowerCase();
    const isHls =
      contentType.includes("mpegurl") ||
      /\.m3u8(?:[?#]|$)/i.test(upstream.url || target.toString());

    if (isHls && upstream.ok && request.method !== "HEAD") {
      const text = await upstream.text();
      const rewritten = rewriteHlsPlaylist(
        text,
        upstream.url || target.toString(),
        reqUrl.origin,
        encodedHeaders,
      );
      responseHeaders.delete("content-length");
      responseHeaders.set("content-type", "application/vnd.apple.mpegurl; charset=utf-8");
      return new Response(rewritten, { status: upstream.status, headers: responseHeaders });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  },
};
