/**
 * Notification Utilities for PWA & Web Client
 * Provides Web Audio API synthesised chimes, haptic feedback, and Web Notification API integrations.
 */

/**
 * Plays a pleasant modern dual-tone notification chime using the Web Audio API.
 * Synthesizes audio entirely in the browser with 0 external network requests or latency.
 */
export function playNotificationChime(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    // If context is suspended by browser autoplay policy, attempt to resume
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: High crisp initial bell note (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: Harmonious resonance note (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.22, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.6);
  } catch (err) {
    // Graceful fallback if audio context fails or user has not interacted
    console.debug("[NotificationAudio] Chime playback bypassed:", err);
  }
}

/**
 * Triggers subtle vibration pattern on mobile devices (e.g. Android PWA)
 */
export function triggerNotificationHaptic(): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch (_) {
      // Ignored if unsupported
    }
  }
}

/**
 * Requests browser permission for native Web Notifications if default
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    if (Notification.permission === "default") {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  } catch (err) {
    console.debug("[WebNotification] Permission request warning:", err);
    return "denied";
  }
}

/**
 * Displays a native browser / PWA system notification
 */
export function showWebNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            icon: "/icon.png",
            badge: "/icon.png",
            ...options,
          });
        }).catch(() => {
          new Notification(title, {
            icon: "/icon.png",
            badge: "/icon.png",
            ...options,
          });
        });
      } else {
        new Notification(title, {
          icon: "/icon.png",
          badge: "/icon.png",
          ...options,
        });
      }
    } catch (err) {
      console.debug("[WebNotification] Show notification warning:", err);
    }
  }
}
