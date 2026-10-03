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
 * Remove a cookie by name across all paths, domains, and secure flags
 */
export function removeCookie(name: string): void {
  if (typeof document === "undefined") return;
  try {
    const encodedName = encodeURIComponent(name);
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const secureVariants = isHttps ? ["", "; Secure"] : [""];

    const paths = ["/", "/apps", ""];
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    const domains = ["", hostname, `.${hostname}`].filter(Boolean);

    for (const p of paths) {
      const pathAttr = p ? `; path=${p}` : "";
      for (const d of domains) {
        const domainAttr = d ? `; domain=${d}` : "";
        for (const sec of secureVariants) {
          document.cookie = `${encodedName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0${pathAttr}${domainAttr}; SameSite=Lax${sec}`;
        }
      }
    }
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
    localStorage.removeItem("gim_swimming_logged_out");
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
  try {
    window.dispatchEvent(new Event("auth_session_changed"));
  } catch (_) {}
}

/**
 * Retrieve current user auth session
 */
export function getAuthSession(): {
  user: string | null;
  role: string | null;
  token: string | null;
} {
  if (typeof window === "undefined") {
    return { user: null, role: null, token: null };
  }

  try {
    if (localStorage.getItem("gim_swimming_logged_out") === "true") {
      return { user: null, role: null, token: null };
    }
  } catch (_) {}

  // Read from LocalStorage
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

  // Validate values (ignore "null", "undefined", or empty string)
  if (!user || user === "null" || user === "undefined" || user.trim() === "") user = null;
  if (!role || role === "null" || role === "undefined" || role.trim() === "") role = null;
  if (!token || token === "null" || token === "undefined" || token.trim() === "") token = null;

  if (!user || !role) {
    return { user: null, role: null, token: null };
  }

  return { user, role, token };
}

/**
 * Retrieve the current JWT auth token from localStorage or Cookies
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (localStorage.getItem("gim_swimming_logged_out") === "true") return null;
    const lsToken = localStorage.getItem(TOKEN_KEY);
    if (lsToken && lsToken !== "null" && lsToken !== "undefined" && lsToken.trim() !== "") return lsToken;
  } catch (_) {}
  return null;
}

/**
 * Clear all authentication session data from both LocalStorage and Cookies
 */
export function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("gim_swimming_logged_out", "true");
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.clear();
  } catch (err) {
    console.warn("Failed to clear localStorage auth session:", err);
  }

  try {
    removeCookie(USER_KEY);
    removeCookie(ROLE_KEY);
    removeCookie(TOKEN_KEY);
    removeCookie("gim_swimming_token");
    removeCookie("gim_swimming_user");
    removeCookie("gim_swimming_role");

    // Also remove any cookie starting with gim_
    if (typeof document !== "undefined" && document.cookie) {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        if (name.toLowerCase().startsWith("gim_")) {
          removeCookie(name);
        }
      }
    }
  } catch (err) {
    console.warn("Failed to clear cookie auth session:", err);
  }

  try {
    window.dispatchEvent(new Event("auth_session_changed"));
  } catch (_) {}
}
