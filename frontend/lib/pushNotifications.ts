/**
 * Push Notification & App Badge API Utilities
 * Standard Web Push (RFC 8291, RFC 8292) + VAPID + Native App Badge API (iOS/Android/Desktop)
 */

import { fetchVapidPublicKey, subscribePush, unsubscribePush, triggerTestPush } from "./api";

/**
 * Converts a URL-safe Base64 string to a Uint8Array for PushManager subscription
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if browser and device support Web Push Notifications
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Checks if device supports native App Badge API (e.g. icon count on homescreen)
 */
export function isAppBadgeSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "setAppBadge" in navigator;
}

/**
 * Updates native mobile / desktop app icon badge count
 */
export async function updateAppBadge(count: number): Promise<void> {
  if (typeof window === "undefined") return;

  const validCount = Math.max(0, Math.floor(count || 0));

  // 1. Update directly via window.navigator if supported
  if ("setAppBadge" in navigator) {
    try {
      if (validCount > 0) {
        await (navigator as any).setAppBadge(validCount);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch (err) {
      console.debug("[AppBadge] Navigator badge update error:", err);
    }
  }

  // 2. Also dispatch to active Service Worker controller for background persistence
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: validCount > 0 ? "SET_BADGE" : "CLEAR_BADGE",
        count: validCount,
      });
    }
  } catch (err) {
    console.debug("[AppBadge] Service Worker badge message error:", err);
  }
}

/**
 * Clears native app icon badge count
 */
export async function clearAppBadge(): Promise<void> {
  return updateAppBadge(0);
}

export interface SubscribePushOptions {
  role?: string;
  username?: string;
  studentName?: string;
  userId?: string;
  userPrompt?: boolean; // If true, explicitly prompts user if default
}

/**
 * Subscribes current browser/device to Web Push with VAPID key and registers with backend
 */
export async function subscribeToPushNotifications(
  options: SubscribePushOptions = {}
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: "Browser atau perangkat ini belum mendukung Web Push Notifications." };
  }

  try {
    // 1. Check or Request Notification Permission
    let permission = Notification.permission;
    if (permission === "default" && options.userPrompt) {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return { success: false, error: `Izin notifikasi tidak diberikan (status: ${permission}).` };
    }

    // 2. Fetch VAPID Public Key from Backend
    const vapidPublicKey = await fetchVapidPublicKey();
    if (!vapidPublicKey) {
      return { success: false, error: "Gagal mengambil VAPID Public Key dari server." };
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // 3. Ensure Service Worker is registered and ready
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register("/sw.js");
    }
    await navigator.serviceWorker.ready;

    // 4. Retrieve existing or create new PushSubscription with key validation
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const subJson = subscription.toJSON();
      if (!subJson.keys?.p256dh || !subJson.keys?.auth) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }
    }

    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      } catch (subErr) {
        console.warn("[WebPush] Initial subscribe failed, attempting clean renewal:", subErr);
        const oldSub = await registration.pushManager.getSubscription();
        if (oldSub) {
          await oldSub.unsubscribe().catch(() => {});
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      }
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, error: "Push Subscription data tidak lengkap." };
    }

    // 5. Send subscription keys to Backend database
    await subscribePush({
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
      role: options.role || localStorage.getItem("gim_swimming_role") || "",
      username: options.username || localStorage.getItem("gim_swimming_user") || "",
      student_name: options.studentName || "",
      user_id: options.userId || "",
    });

    localStorage.setItem("gim_push_enabled", "true");
    localStorage.setItem("gim_push_endpoint", subJson.endpoint);

    return { success: true, subscription };
  } catch (err: any) {
    console.error("[WebPush] Subscription failure:", err);
    return { success: false, error: err.message || "Gagal menghubungkan push notification." };
  }
}

/**
 * Unsubscribes current device from Web Push
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await unsubscribePush(endpoint).catch(() => {});
    }

    localStorage.removeItem("gim_push_enabled");
    localStorage.removeItem("gim_push_endpoint");
    await clearAppBadge();

    return true;
  } catch (err) {
    console.error("[WebPush] Unsubscribe error:", err);
    return false;
  }
}

/**
 * Sends a test push notification to current user/device
 */
export async function sendTestPushToDevice(params: {
  role: string;
  username: string;
  studentName?: string;
  userId?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    return await triggerTestPush(params);
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal mengirim tes notifikasi." };
  }
}
