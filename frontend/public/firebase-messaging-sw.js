// Firebase Cloud Messaging Background Service Worker
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

// Initialize Firebase App in Service Worker context
const urlParams = new URLSearchParams(location.search);
const projectId = urlParams.get("projectId") || "gim-swimming";

const firebaseConfig = {
  apiKey: urlParams.get("apiKey") || "AIzaSyCOHSHnYFXD-8YeM80lrCmreO3fOa_K6cs",
  authDomain: `${projectId}.firebaseapp.com`,
  projectId: projectId,
  storageBucket: `${projectId}.firebasestorage.app`,
  messagingSenderId: urlParams.get("messagingSenderId") || "316130398120",
  appId: urlParams.get("appId") || "1:316130398120:web:b46ef882081a464168979d",
};

if (firebaseConfig.apiKey || firebaseConfig.projectId) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log("[FCM-SW] Background push message received:", payload);

      const notificationTitle = payload.notification?.title || payload.data?.title || "GIM Swimming Academy 🏊‍♂️";
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || payload.data?.message || "Ada pemberitahuan baru di GIM Swimming.",
        icon: payload.notification?.icon || payload.data?.icon || "/icon.png",
        badge: "/icon.png",
        tag: payload.data?.tag || "fcm-notif-" + Date.now(),
        data: payload.data || {},
        renotify: true,
      };

      // 1. Update native app badge
      if ("setAppBadge" in self.navigator) {
        const unread = Number(payload.data?.unread_count) || 1;
        self.navigator.setAppBadge(unread).catch(() => {});
      }

      // 2. Display notification
      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (err) {
    console.warn("[FCM-SW] Firebase Messaging init in SW:", err);
  }
}

// Notification click handler
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
