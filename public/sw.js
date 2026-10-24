const CACHE_VERSION = "vplaycast-v5";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const MEDIA_CACHE = `${CACHE_VERSION}-media`;
const OFFLINE_URL = "/offline.html";

const cacheable = (response) => response && response.ok;

async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(new Request(request, { cache: "no-store" }));
    if (cacheable(response)) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || fallback || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (cacheable(response)) cache.put(request, response.clone());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Database reads are always network requests. The players' local storage is
  // deliberately used only as an explicit offline fallback.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, PAGE_CACHE, caches.match(OFFLINE_URL)),
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    ["script", "style", "font"].includes(request.destination)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (["image", "video", "audio"].includes(request.destination)) {
    event.respondWith(networkFirst(request, MEDIA_CACHE));
    return;
  }

  event.respondWith(networkFirst(request, PAGE_CACHE));
});
