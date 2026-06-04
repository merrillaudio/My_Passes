/* Eastern Sierra 395 Logbook — service worker
   Bump CACHE_VERSION whenever you change index.html or assets to force an update. */
const CACHE_VERSION = "sierra-log-v1";
const FONT_CACHE   = "sierra-fonts-v1";

/* App shell — paths are relative to the service worker's location,
   so this works whether the site is at the domain root or a GitHub Pages subpath. */
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k !== FONT_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Google Fonts (cross-origin): cache-first, then update in background.
  if (url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          const network = fetch(req)
            .then((res) => { cache.put(req, res.clone()); return res; })
            .catch(() => hit);
          return hit || network;
        })
      )
    );
    return;
  }

  // Page navigations: network-first so updates show, fall back to cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Same-origin assets: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
      )
    );
  }
});
