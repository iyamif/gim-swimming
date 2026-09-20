/**
 * Biometric / Face ID Authentication Manager for GIM Swimming
 * Handles local biometric device registration, Face ID activation state per user,
 * and secure credential retrieval for one-tap biometric login.
 */

export interface FaceIdUserRecord {
  username: string;
  role: string;
  token?: string;
  avatar?: string;
  enabledAt: number;
}

const FACE_ID_STORAGE_KEY = "gim_face_id_registry";

/**
 * Check if browser environment supports biometric / media devices
 */
export function isFaceIdSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(navigator?.mediaDevices?.getUserMedia || window.PublicKeyCredential);
}

/**
 * Get all users registered with Face ID on this device
 */
export function getRegisteredFaceIdUsers(): FaceIdUserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FACE_ID_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn("Failed to parse Face ID registry:", err);
    return [];
  }
}

/**
 * Check if Face ID is enabled for a specific user
 */
export function isFaceIdEnabledForUser(username: string): boolean {
  if (!username) return false;
  const users = getRegisteredFaceIdUsers();
  const normalized = username.trim().toLowerCase();
  return users.some((u) => u.username.toLowerCase() === normalized);
}

/**
 * Get Face ID registered credential for a user (or the sole user if only 1 exists)
 */
export function getFaceIdCredential(username?: string): FaceIdUserRecord | null {
  const users = getRegisteredFaceIdUsers();
  if (users.length === 0) return null;

  if (username && username.trim()) {
    const normalized = username.trim().toLowerCase();
    return users.find((u) => u.username.toLowerCase() === normalized) || null;
  }

  // If no username specified and exactly 1 user is registered, return that user
  if (users.length === 1) {
    return users[0];
  }

  return null;
}

/**
 * Enable Face ID for a user account on this device
 */
export function enableFaceIdForUser(data: {
  username: string;
  role: string;
  token?: string;
  avatar?: string;
}): boolean {
  if (typeof window === "undefined" || !data.username) return false;
  try {
    const users = getRegisteredFaceIdUsers();
    const normalized = data.username.trim().toLowerCase();

    // Filter out existing entry for this user if updating
    const remaining = users.filter((u) => u.username.toLowerCase() !== normalized);

    const newRecord: FaceIdUserRecord = {
      username: data.username.trim(),
      role: data.role || "orang tua",
      token: data.token || "",
      avatar: data.avatar || "",
      enabledAt: Date.now(),
    };

    remaining.unshift(newRecord);
    localStorage.setItem(FACE_ID_STORAGE_KEY, JSON.stringify(remaining));

    // Dispatch global event for UI reactivity
    window.dispatchEvent(new CustomEvent("gim_face_id_changed", { detail: { username: data.username, enabled: true } }));
    return true;
  } catch (err) {
    console.error("Failed to enable Face ID for user:", err);
    return false;
  }
}

/**
 * Disable Face ID for a user account on this device
 */
export function disableFaceIdForUser(username: string): boolean {
  if (typeof window === "undefined" || !username) return false;
  try {
    const users = getRegisteredFaceIdUsers();
    const normalized = username.trim().toLowerCase();
    const updated = users.filter((u) => u.username.toLowerCase() !== normalized);

    localStorage.setItem(FACE_ID_STORAGE_KEY, JSON.stringify(updated));

    // Dispatch global event for UI reactivity
    window.dispatchEvent(new CustomEvent("gim_face_id_changed", { detail: { username, enabled: false } }));
    return true;
  } catch (err) {
    console.error("Failed to disable Face ID for user:", err);
    return false;
  }
}
