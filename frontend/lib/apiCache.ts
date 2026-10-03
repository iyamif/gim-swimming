import {
  Student,
  Coach,
  Invoice,
  ScheduleSession,
  AttendanceRecord,
  AdminNotification,
  FinancialTransaction,
  PoolVenue,
  ClassProgram,
} from "../components/apps/types";

const APP_CACHE_KEY_PREFIX = "gim_cache_v1";

export interface CachedAppData {
  students?: Student[];
  coaches?: Coach[];
  schedules?: ScheduleSession[];
  invoices?: Invoice[];
  attendances?: AttendanceRecord[];
  notifications?: AdminNotification[];
  financialTransactions?: FinancialTransaction[];
  pools?: PoolVenue[];
  classPrograms?: ClassProgram[];
  cachedAt?: number;
}

/**
 * Safely get cached app data from localStorage for instant offline/cold-start load
 */
export function getCachedAppData(userKey = "global"): CachedAppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${APP_CACHE_KEY_PREFIX}_${userKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed as CachedAppData;
  } catch (err) {
    console.warn("[Cache] Failed to read app data cache:", err);
    return null;
  }
}

/**
 * Safely persist app data to localStorage for stale-while-revalidate instant loading
 */
export function saveCachedAppData(
  data: Partial<CachedAppData>,
  userKey = "global"
): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getCachedAppData(userKey) || {};
    const updated: CachedAppData = {
      ...existing,
      ...data,
      cachedAt: Date.now(),
    };
    localStorage.setItem(
      `${APP_CACHE_KEY_PREFIX}_${userKey}`,
      JSON.stringify(updated)
    );
  } catch (err) {
    console.warn("[Cache] Failed to save app data cache (quota exceeded?):", err);
  }
}

/**
 * Clear cached app data upon logout
 */
export function clearCachedAppData(userKey?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (userKey) {
      localStorage.removeItem(`${APP_CACHE_KEY_PREFIX}_${userKey}`);
    } else {
      // Clear all cache keys starting with prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(APP_CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch (err) {
    console.warn("[Cache] Failed to clear app data cache:", err);
  }
}
