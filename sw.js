// Offline-first service worker for Claude Usage dashboard.
// Navigaciok (HTML): network-first -> uj deploy azonnal latszik.
// Egyeb assetek: cache-first (ikon, manifest).
const CACHE = "claude-usage-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u).catch(e => console.warn("cache skip", u, e)))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigacio (HTML oldal): network-first, hogy uj deploy azonnal megjelenjen
  const isNav = event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");
  if (isNav) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          if (resp && resp.ok && resp.type === "basic") {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(event.request, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match("/index.html").then(r => r || new Response("Offline", {status: 503})))
    );
    return;
  }

  // Egyeb assetek: cache-first, fallback halozat
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(resp => {
          if (resp && resp.ok && resp.type === "basic") {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(event.request, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => cached || new Response("", {status: 503}));
    })
  );
});
