const CACHE_NAME = "argus-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["./", "./index.html", "./manifest.json", "./favicon.png"]).catch(() => {}),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/api/") || url.pathname.includes("/proxy")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html").then((r) => r || Response.error())),
    );
    return;
  }

  if (/\.(?:js|css|woff2?|png|svg|webp)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              void caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
