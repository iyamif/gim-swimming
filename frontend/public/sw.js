const CACHE_NAME = "gim-swimming-cache-v1";
const urlsToCache = [
  "/apps",
  "/manifest.json",
  "/icon.png"
];

// Install Event: Cache files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching app shell assets...");
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch Event: Cache fallbacks
self.addEventListener("fetch", (event) => {
  // Only intercept standard GET requests (e.g. bypass GraphQL/POST logins)
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});

// Activate Event: Clear old cache
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log("Clearing outdated cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
