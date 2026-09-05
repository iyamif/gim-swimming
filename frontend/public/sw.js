const CACHE_VERSION = "gim-swimming-v2";
const CACHE_STATIC_NAME = `gim-static-${CACHE_VERSION}`;
const CACHE_PAGES_NAME = `gim-pages-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "/apps",
  "/manifest.json",
  "/icon.png"
];

// Install: Precache shell & immediately skip waiting to activate new SW
self.addEventListener("install", (event) => {
  console.log("[SW] Installing new service worker version:", CACHE_VERSION);
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      console.log("[SW] Precaching essential app assets...");
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Some assets failed to precache:", err);
      });
    })
  );
});

// Activate: Delete old caches & immediately claim control of all open windows/PWA clients
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating new service worker version:", CACHE_VERSION);
  const allowedCaches = [CACHE_STATIC_NAME, CACHE_PAGES_NAME];

  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (!allowedCaches.includes(key)) {
              console.log("[SW] Deleting old cache:", key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Strategy:
// 1. Navigation / HTML pages -> Network-First (always get freshest build, fallback to cache when offline)
// 2. Static assets (JS, CSS, images, fonts) -> Stale-While-Revalidate (fast load + background cache update)
// 3. API / Mutating requests -> Network-only
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Bypass non-GET and chrome-extension / non-http requests
  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  const url = new URL(request.url);

  // 1. Navigation / HTML Pages (e.g. /apps, /pendaftaran, /)
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_PAGES_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log("[SW] Network offline, serving cached page fallback for:", request.url);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const fallbackApp = await caches.match("/apps");
          return fallbackApp || Response.error();
        })
    );
    return;
  }

  // 2. Next.js Static Bundles & Media (_next/static, images, icons, fonts)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|css|js)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_STATIC_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          // Return cached version immediately if available, while fetching update in background
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Default: Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || Response.error();
      })
  );
});

// Listen for message from client to skip waiting immediately
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
