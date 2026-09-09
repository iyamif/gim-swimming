import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging, isSupported } from "firebase/messaging";

// Firebase web configuration (can be provided via NEXT_PUBLIC_FIREBASE_* environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCOHSHnYFXD-8YeM80lrCmreO3fOa_K6cs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gim-swimming.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gim-swimming",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gim-swimming.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "316130398120",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:316130398120:web:b46ef882081a464168979d",
};

// Singleton Firebase App instance
let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;

  try {
    if (!getApps().length) {
      if (firebaseConfig.apiKey || firebaseConfig.projectId) {
        app = initializeApp(firebaseConfig);
      } else {
        console.debug("[FCM] Firebase configuration not yet populated in environment variables.");
        return null;
      }
    } else {
      app = getApp();
    }
    return app;
  } catch (err) {
    console.error("[FCM] Error initializing Firebase App:", err);
    return null;
  }
}

// Retrieves Firebase Messaging instance with browser support guard
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.debug("[FCM] Firebase Messaging is not supported on this browser/platform.");
      return null;
    }

    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return null;

    return getMessaging(firebaseApp);
  } catch (err) {
    console.debug("[FCM] Failed to initialize Firebase Messaging:", err);
    return null;
  }
}

/**
 * Requests FCM Registration Token for current device
 */
export async function requestFCMToken(options: { userPrompt?: boolean } = {}): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    if (!("Notification" in window)) {
      return null;
    }

    let permission = Notification.permission;
    if (permission === "default" && options.userPrompt) {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return null;
    }

    // Ensure service worker registration is ready
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register("/sw.js");
    }
    await navigator.serviceWorker.ready;

    const vapidKey =
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
      "BGjn4ah-lAz-YPYBbXnxrkjiKopGwwbyCbUXTcrKl1DRxQbgTKZH-T9ceoLqbgWPDjY-NF-0wWAMVTGPpyQmRrA";

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKey,
    });

    if (token) {
      localStorage.setItem("gim_fcm_token", token);
      return token;
    }

    return null;
  } catch (err) {
    console.error("[FCM] Error requesting FCM token:", err);
    return null;
  }
}

/**
 * Listens for FCM notifications while the app is open in foreground
 */
export async function onForegroundMessage(callback: (payload: any) => void): Promise<(() => void) | null> {
  if (typeof window === "undefined") return null;

  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground notification received:", payload);
      callback(payload);
    });

    return unsubscribe;
  } catch (err) {
    console.debug("[FCM] Foreground listener error:", err);
    return null;
  }
}
