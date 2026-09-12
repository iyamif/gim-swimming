const CACHE_VERSION = "gim-swimming-v13";
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

// Activate: Delete all previous outdated caches & immediately claim control of all open windows/PWA clients
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
              console.log("[SW] Deleting stale cache bucket:", key);
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
// 3. API / Mutating / Cross-Origin requests -> Direct passthrough to browser network stack
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Bypass non-GET, non-http, and chrome-extension requests
  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  const url = new URL(request.url);

  // CRITICAL: Bypass all cross-origin requests (e.g. backend Go server on :8080 or external APIs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // CRITICAL: Bypass all backend API routes, hot-module reload, and Next.js dev server sockets
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/__nextjs")
  ) {
    return;
  }

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
});

// Push notification event listener (Standard Web Push + VAPID + Native App Badge API)
// Optimized for Mobile (Android Chrome, iOS Safari Standalone PWA, Desktop) in background / closed state
self.addEventListener("push", (event) => {
  let title = "GIM Swimming Academy 🏊‍♂️";
  let body = "Ada pemberitahuan terbaru di GIM Swimming.";
  let dataPayload = { url: "/apps" };
  let icon = "/icon.png";
  let badge = "/icon.png";
  let tag = "gim-notif-" + Date.now();
  let unreadCount = 1;

  if (event.data) {
    try {
      const parsed = event.data.json();
      // Support standard WebPush & FCM structure (parsed.notification / parsed.data)
      const notifObj = parsed.notification || {};
      const dataObj = parsed.data || {};

      title = notifObj.title || dataObj.title || parsed.title || title;
      body = notifObj.body || dataObj.body || dataObj.message || parsed.body || parsed.message || body;
      icon = notifObj.icon || dataObj.icon || parsed.icon || icon;
      badge = notifObj.badge || dataObj.badge || parsed.badge || badge;
      tag = dataObj.tag || parsed.tag || ("gim-notif-" + Date.now());
      dataPayload = dataObj.url ? dataObj : (parsed.data || parsed);

      if (dataObj.unread_count !== undefined) {
        unreadCount = Number(dataObj.unread_count);
      } else if (parsed.unread_count !== undefined) {
        unreadCount = Number(parsed.unread_count);
      }
    } catch (e) {
      try {
        body = event.data.text() || body;
      } catch (err) {}
    }
  }

  // Ensure absolute icon/badge URLs for mobile & standalone PWA compatibility
  const origin = self.location.origin || "";
  const iconUrl = icon.startsWith("http") ? icon : (origin + (icon.startsWith("/") ? icon : "/" + icon));
  const badgeUrl = badge.startsWith("http") ? badge : (origin + (badge.startsWith("/") ? badge : "/" + badge));

  // Base notification options supported universally across Android, iOS Safari 16.4+, and Desktop
  const notificationOptions = {
    body: body,
    icon: iconUrl,
    badge: badgeUrl,
    tag: tag,
    data: dataPayload,
    renotify: true,
  };

  // 1. Primary: Display system notification directly to device notification center / lock screen
  const showNotifPromise = self.registration.showNotification(title, notificationOptions)
    .catch((err) => {
      console.warn("[SW] Primary showNotification failed, attempting minimal fallback:", err);
      return self.registration.showNotification(title, {
        body: body,
        icon: iconUrl,
      });
    });

  // 2. Concurrently update App Badge Count on device homescreen icon
  const badgePromise = (async () => {
    if ("setAppBadge" in self.navigator && unreadCount > 0) {
      try {
        await self.navigator.setAppBadge(unreadCount);
      } catch (err) {
        console.debug("[SW] setAppBadge background warning:", err);
      }
    }
  })();

  // 3. Concurrently notify active foreground tabs if any are open
  const messagePromise = (async () => {
    try {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        client.postMessage({
          type: "PUSH_NOTIFICATION_RECEIVED",
          payload: {
            title,
            body,
            data: dataPayload,
            unread_count: unreadCount,
          },
        });
      }
    } catch (err) {
      console.debug("[SW] postMessage background warning:", err);
    }
  })();

  // Keep Service Worker alive until system notification is displayed
  event.waitUntil(Promise.allSettled([showNotifPromise, badgePromise, messagePromise]));
});

// Notification click event listener
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || "/apps";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/apps") && "focus" in client) {
          client.postMessage({
            type: "NOTIFICATION_CLICKED",
            payload: data,
          });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Listen for messages from frontend client
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Allow client to synchronize badge count directly through Service Worker
  if (event.data.type === "SET_BADGE") {
    const count = Number(event.data.count) || 0;
    if ("setAppBadge" in self.navigator) {
      if (count > 0) {
        self.navigator.setAppBadge(count).catch(() => {});
      } else {
        self.navigator.clearAppBadge().catch(() => {});
      }
    }
  } else if (event.data.type === "CLEAR_ALL_CACHES") {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      console.log("[SW] All caches cleared on client request.");
    });
  }
});



