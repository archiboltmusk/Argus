#!/usr/bin/env node
import http from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";
const sessions = new Map();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range, If-Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
};

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "::1" || host === "0.0.0.0") {
    return true;
  }
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [, a, b] = m.map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function validateTarget(raw) {
  const parsed = new URL(raw);
  if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || isPrivateHost(parsed.hostname)) {
    throw new Error("Blocked target URL");
  }
  return parsed.toString();
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) reject(new Error("Payload too large"));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (reqUrl.pathname === "/health") {
    res.writeHead(200, { ...CORS, "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "argus-companion" }));
    return;
  }

  if (req.method === "POST" && reqUrl.pathname === "/api/proxy/register") {
    try {
      const body = await readJson(req);
      const url = validateTarget(body.url);
      const sessionId = randomUUID();
      const transcode = Boolean(body.transcode);
      sessions.set(sessionId, {
        url,
        headers: body.headers && typeof body.headers === "object" ? body.headers : {},
        transcode,
        createdAt: Date.now(),
      });
      res.writeHead(200, { ...CORS, "content-type": "application/json" });
      res.end(
        JSON.stringify({
          session_id: sessionId,
          url: transcode ? `/transcode/${sessionId}` : `/stream/${sessionId}`,
        }),
      );
    } catch (err) {
      res.writeHead(400, { ...CORS, "content-type": "application/json" });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Bad request" }));
    }
    return;
  }

  if (req.method === "POST" && reqUrl.pathname === "/api/proxy/unregister") {
    try {
      const body = await readJson(req);
      if (typeof body.session_id === "string") sessions.delete(body.session_id);
      res.writeHead(204, CORS);
      res.end();
    } catch {
      res.writeHead(400, CORS);
      res.end();
    }
    return;
  }

  const streamMatch = reqUrl.pathname.match(/^\/stream\/([a-f0-9-]+)$/i);
  if (streamMatch && (req.method === "GET" || req.method === "HEAD")) {
    const session = sessions.get(streamMatch[1]);
    if (!session) {
      res.writeHead(404, CORS);
      res.end("Session not found");
      return;
    }
    try {
      const headers = new Headers(session.headers);
      if (req.headers.range) headers.set("range", req.headers.range);
      const upstream = await fetch(session.url, {
        method: req.method,
        headers,
        redirect: "follow",
      });
      const outHeaders = { ...CORS };
      for (const k of ["content-type", "content-length", "content-range", "accept-ranges"]) {
        const v = upstream.headers.get(k);
        if (v) outHeaders[k] = v;
      }
      res.writeHead(upstream.status, outHeaders);
      if (req.method === "HEAD" || !upstream.body) {
        res.end();
        return;
      }
      Readable.fromWeb(upstream.body).pipe(res);
    } catch {
      res.writeHead(502, CORS);
      res.end("Upstream error");
    }
    return;
  }

  const transcodeMatch = reqUrl.pathname.match(/^\/transcode\/([a-f0-9-]+)$/i);
  if (transcodeMatch && req.method === "GET") {
    const session = sessions.get(transcodeMatch[1]);
    if (!session) {
      res.writeHead(404, CORS);
      res.end("Session not found");
      return;
    }
    const headerLines = Object.entries(session.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    const args = ["-hide_banner", "-loglevel", "error"];
    if (headerLines) args.push("-headers", `${headerLines}\r\n`);
    args.push(
      "-i",
      session.url,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-tune",
      "zerolatency",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ac",
      "2",
      "-movflags",
      "frag_keyframe+empty_moov+default_base_moof",
      "-f",
      "mp4",
      "pipe:1",
    );
    const ff = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    res.writeHead(200, { ...CORS, "content-type": "video/mp4" });
    ff.stdout.pipe(res);
    req.on("close", () => ff.kill("SIGTERM"));
    ff.on("error", () => {
      if (!res.headersSent) res.writeHead(500, CORS);
      res.end();
    });
    return;
  }

  res.writeHead(404, CORS);
  res.end("Not found");
});

server.listen(PORT, HOST, () => {
  console.log(`[argus-companion] listening on http://${HOST}:${PORT}`);
});
