/**
 * Persistent Auth & Cookie Session Management for GIM Swimming
 * Ensures users stay logged in across sessions, browser restarts, and PWA instances
 * by synchronizing localStorage and persistent Cookies (365 days max-age).
 */

const TOKEN_KEY = "gim_swimming_token";
const USER_KEY = "gim_swimming_user";
const ROLE_KEY = "gim_swimming_role";
const COOKIE_MAX_AGE_DAYS = 365;

/**
 * Set a persistent cookie accessible across the whole domain
 */
export function setCookie(name: string, value: string, days = COOKIE_MAX_AGE_DAYS): void {
  if (typeof document === "undefined") return;
  try {
    const maxAge = days * 24 * 60 * 60;
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const secureFlag = isHttps ? "; Secure" : "";
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax${secureFlag}`;
  } catch (err) {
    console.warn("Failed to set cookie:", name, err);
  }
}

/**
 * Retrieve a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const nameEQ = encodeURIComponent(name) + "=";
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      let c = cookies[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length));
      }
    }
  } catch (err) {
    console.warn("Failed to read cookie:", name, err);
  }
  return null;
}

/**
 * Remove a cookie by name
 */
export function removeCookie(name: string): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${encodeURIComponent(name)}=; max-age=0; path=/; SameSite=Lax`;
  } catch (err) {
    console.warn("Failed to remove cookie:", name, err);
  }
}

export interface AuthSessionData {
  user: string;
  role: string;
  token?: string;
  avatar?: string;
}

/**
 * Save user authentication state to both localStorage and persistent Cookies
 */
export function saveAuthSession(data: AuthSessionData): void {
  if (typeof window === "undefined") return;

  const { user, role, token, avatar } = data;

  // 1. Save to LocalStorage
  try {
    if (user) localStorage.setItem(USER_KEY, user);
    if (role) localStorage.setItem(ROLE_KEY, role);
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (avatar && user) {
      localStorage.setItem(`gim_avatar_${user}`, avatar);
    }
  } catch (err) {
    console.warn("Failed to save session to localStorage:", err);
  }

  // 2. Save to Cookies (365 days)
  try {
    if (user) setCookie(USER_KEY, user, COOKIE_MAX_AGE_DAYS);
    if (role) setCookie(ROLE_KEY, role, COOKIE_MAX_AGE_DAYS);
    if (token) setCookie(TOKEN_KEY, token, COOKIE_MAX_AGE_DAYS);
  } catch (err) {
    console.warn("Failed to save session to cookies:", err);
  }

  // Dispatch event for UI reactivity
  window.dispatchEvent(new Event("auth_session_changed"));
}

/**
 * Retrieve current user auth session, automatically synchronizing localStorage and Cookies
 */
export function getAuthSession(): {
  user: string | null;
  role: string | null;
  token: string | null;
} {
  if (typeof window === "undefined") {
    return { user: null, role: null, token: null };
  }

  // Try reading from LocalStorage first
  let user: string | null = null;
  let role: string | null = null;
  let token: string | null = null;

  try {
    user = localStorage.getItem(USER_KEY);
    role = localStorage.getItem(ROLE_KEY);
    token = localStorage.getItem(TOKEN_KEY);
  } catch (err) {
    console.warn("Failed to read from localStorage:", err);
  }

  // Fallback to Cookies if missing from LocalStorage
  if (!user) user = getCookie(USER_KEY);
  if (!role) role = getCookie(ROLE_KEY);
  if (!token) token = getCookie(TOKEN_KEY);

  // Cross-synchronize: if found in cookies but not localStorage, restore to localStorage
  try {
    if (user && !localStorage.getItem(USER_KEY)) localStorage.setItem(USER_KEY, user);
    if (role && !localStorage.getItem(ROLE_KEY)) localStorage.setItem(ROLE_KEY, role);
    if (token && !localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, token);
  } catch (_) {}

  // Cross-synchronize: if found in localStorage but not cookies, restore to cookies
  try {
    if (user && !getCookie(USER_KEY)) setCookie(USER_KEY, user, COOKIE_MAX_AGE_DAYS);
    if (role && !getCookie(ROLE_KEY)) setCookie(ROLE_KEY, role, COOKIE_MAX_AGE_DAYS);
    if (token && !getCookie(TOKEN_KEY)) setCookie(TOKEN_KEY, token, COOKIE_MAX_AGE_DAYS);
  } catch (_) {}

  return { user, role, token };
}

/**
 * Retrieve the current JWT auth token from localStorage or Cookies
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const lsToken = localStorage.getItem(TOKEN_KEY);
    if (lsToken) return lsToken;
  } catch (_) {}
  return getCookie(TOKEN_KEY);
}

/**
 * Clear all authentication session data from both LocalStorage and Cookies
 */
export function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.warn("Failed to clear localStorage auth session:", err);
  }

  try {
    removeCookie(USER_KEY);
    removeCookie(ROLE_KEY);
    removeCookie(TOKEN_KEY);
  } catch (err) {
    console.warn("Failed to clear cookie auth session:", err);
  }

  window.dispatchEvent(new Event("auth_session_changed"));
}
