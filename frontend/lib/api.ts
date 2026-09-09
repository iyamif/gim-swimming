import {
  Student,
  Coach,
  Invoice,
  ScheduleSession,
  AttendanceRecord,
  AdminNotification,
} from "../components/apps/types";

// Central API configuration for frontend-backend communication
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    // In browser, use same-origin relative path "" so requests go through Next.js reverse proxy (/api/v1/...)
    // This completely eliminates CORS errors, W3C origin wildcard issues, and mixed-content blocking
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Helper for auth headers
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("gim_swimming_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

// ================= STUDENTS & ATTENDANCE =================

export async function fetchStudents(): Promise<Student[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/students`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Gagal mengambil data siswa");
    const json = await res.json();
    return (json.data || []).map((s: any) => ({
      id: String(s.id),
      name: s.name,
      class: s.class,
      attendanceRate: s.attendanceRate || "100%",
      parent: s.parent,
      status: s.status || "Active",
      avatar: s.avatar || "",
      phone: s.phone || "",
      age: s.age || "",
      logs: (s.logs || []).map((l: any) => ({
        date: l.date,
        status: l.status,
      })),
    }));
  } catch (err) {
    console.error("fetchStudents error:", err);
    return [];
  }
}

export async function createStudent(payload: {
  name: string;
  class: string;
  parent: string;
  phone: string;
  age?: string;
  avatar?: string;
}): Promise<Student | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/students`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Gagal mendaftarkan siswa");
    const json = await res.json();
    const s = json.data;
    return {
      id: String(s.id),
      name: s.name,
      class: s.class,
      attendanceRate: s.attendanceRate || "100%",
      parent: s.parent,
      status: s.status || "Active",
      avatar: s.avatar || "",
      phone: s.phone || "",
      age: s.age || "",
      logs: [],
    };
  } catch (err) {
    console.error("createStudent error:", err);
    throw err;
  }
}

export async function submitBulkAttendance(payload: {
  class: string;
  date?: string;
  attendanceMap: Record<string, "Hadir" | "Sakit" | "Izin" | "Alpa">;
}): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/students/attendance`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Gagal menyimpan absensi");
    return true;
  } catch (err) {
    console.error("submitBulkAttendance error:", err);
    throw err;
  }
}

// ================= COACHES =================

export async function fetchCoaches(): Promise<Coach[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/coaches`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Gagal mengambil data pelatih");
    const json = await res.json();
    return (json.data || []).map((c: any) => ({
      id: String(c.id),
      name: c.name,
      spec: c.spec,
      phone: c.phone,
      email: c.email,
      class: c.class,
    }));
  } catch (err) {
    console.error("fetchCoaches error:", err);
    return [];
  }
}

export async function createCoach(payload: {
  name: string;
  spec: string;
  phone: string;
  email: string;
  class: string;
}): Promise<Coach | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/coaches`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Gagal mendaftarkan pelatih");
    const json = await res.json();
    const c = json.data;
    return {
      id: String(c.id),
      name: c.name,
      spec: c.spec,
      phone: c.phone,
      email: c.email,
      class: c.class,
    };
  } catch (err) {
    console.error("createCoach error:", err);
    throw err;
  }
}

// ================= SCHEDULES =================

export async function fetchSchedules(): Promise<ScheduleSession[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/schedules`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Gagal mengambil data jadwal");
    const json = await res.json();
    return (json.data || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      class: s.class,
      date: s.date,
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
      poolArea: s.poolArea,
      coachId: s.coachId,
      coachName: s.coachName,
      coachPhone: s.coachPhone || "",
      studentIds: s.studentIds || [],
      studentNames: s.studentNames || [],
      notes: s.notes || "",
      status: s.status || "Active",
    }));
  } catch (err) {
    console.error("fetchSchedules error:", err);
    return [];
  }
}

export async function createSchedule(payload: Omit<ScheduleSession, "id">): Promise<ScheduleSession | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/schedules`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Gagal membuat jadwal les");
    const json = await res.json();
    const s = json.data;
    return {
      id: s.id,
      title: s.title,
      class: s.class,
      date: s.date,
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
      poolArea: s.poolArea,
      coachId: s.coachId,
      coachName: s.coachName,
      coachPhone: s.coachPhone || "",
      studentIds: s.studentIds || [],
      studentNames: s.studentNames || [],
      notes: s.notes || "",
      status: s.status || "Active",
    };
  } catch (err) {
    console.error("createSchedule error:", err);
    throw err;
  }
}

export async function updateSchedule(id: string, payload: Partial<ScheduleSession>): Promise<ScheduleSession | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/schedules/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || `Gagal memperbarui jadwal les (HTTP ${res.status})`);
    }
    const json = await res.json();
    const s = json.data;
    if (!s) return null;
    return {
      id: s.id,
      title: s.title,
      class: s.class,
      date: s.date,
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
      poolArea: s.poolArea,
      coachId: s.coachId,
      coachName: s.coachName,
      coachPhone: s.coachPhone || "",
      studentIds: s.studentIds || [],
      studentNames: s.studentNames || [],
      notes: s.notes || "",
      status: s.status || "Active",
    };
  } catch (err) {
    console.error("updateSchedule error:", err);
    throw err;
  }
}

export async function deleteSchedule(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/schedules/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Gagal menghapus jadwal");
    return true;
  } catch (err) {
    console.error("deleteSchedule error:", err);
    throw err;
  }
}

// ================= INVOICES =================

export async function fetchInvoices(): Promise<Invoice[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/invoices`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Gagal mengambil data tagihan");
    const json = await res.json();
    return (json.data || []).map((i: any) => ({
      id: i.id,
      studentId: i.studentId,
      name: i.name,
      amount: Number(i.amount),
      desc: i.desc || i.description,
      status: i.status,
      uploadReceipt: i.uploadReceipt || null,
    }));
  } catch (err) {
    console.error("fetchInvoices error:", err);
    return [];
  }
}

export async function verifyInvoicePayment(id: string, confirm: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/invoices/${id}/verify`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ confirm }),
    });
    if (!res.ok) throw new Error("Gagal memverifikasi tagihan");
    return true;
  } catch (err) {
    console.error("verifyInvoicePayment error:", err);
    throw err;
  }
}

export async function uploadInvoiceReceipt(id: string, receiptUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/invoices/${id}/receipt`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ receiptUrl }),
    });
    if (!res.ok) throw new Error("Gagal mengunggah bukti pembayaran");
    return true;
  } catch (err) {
    console.error("uploadInvoiceReceipt error:", err);
    throw err;
  }
}

// ================= USER AVATAR / PROFILE =================

export function isImageAvatar(avatar?: string | null): boolean {
  if (!avatar) return false;
  const trimmed = avatar.trim();
  return (
    trimmed.startsWith("data:image") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/foto-profile") ||
    trimmed.startsWith("foto-profile") ||
    trimmed.startsWith("/uploads") ||
    trimmed.startsWith("uploads") ||
    trimmed.startsWith("/") ||
    trimmed.endsWith(".jpg") ||
    trimmed.endsWith(".jpeg") ||
    trimmed.endsWith(".png") ||
    trimmed.endsWith(".webp")
  );
}

export function getAvatarImageUrl(avatar?: string | null): string {
  if (!avatar) return "";
  const trimmed = avatar.trim();
  if (
    trimmed.startsWith("data:image") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const base = getApiBaseUrl().replace(/\/+$/, "");
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${cleanPath}`;
}

export async function fetchCurrentUser(): Promise<any> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.user || json.data || null;
  } catch (err) {
    console.error("fetchCurrentUser error:", err);
    return null;
  }
}

export async function syncCurrentUserAvatar(username: string): Promise<string> {
  try {
    const user = await fetchCurrentUser();
    if (user && user.avatar !== undefined) {
      const av = user.avatar || "";
      if (av) {
        localStorage.setItem(`gim_avatar_${username}`, av);
        localStorage.setItem(`gim_avatar_${username.toLowerCase()}`, av);
      } else {
        localStorage.removeItem(`gim_avatar_${username}`);
        localStorage.removeItem(`gim_avatar_${username.toLowerCase()}`);
      }
      window.dispatchEvent(new Event("avatar_updated"));
      return av;
    }
    return "";
  } catch (err) {
    console.error("syncCurrentUserAvatar error:", err);
    return "";
  }
}

export async function uploadAvatarFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("avatar", file);

  const headers: HeadersInit = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("gim_swimming_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/avatar`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Gagal mengunggah foto profil");
  }

  const data = await res.json();
  return data.avatar;
}

export async function updateAvatarPreset(avatar: string): Promise<string> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/avatar`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ avatar }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Gagal memperbarui avatar profil");
  }

  const data = await res.json();
  return data.avatar;
}

// ================= ATTENDANCES & NOTIFICATIONS =================

export async function fetchAttendances(): Promise<AttendanceRecord[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/attendances`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Gagal mengambil data riwayat presensi");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("fetchAttendances error:", err);
    return [];
  }
}

export async function checkInAttendance(payload: {
  schedule_id: string;
  person_type: "coach" | "student";
  person_id: string;
  person_name: string;
  status?: string;
  late_reason?: string;
  latitude: number;
  longitude: number;
  notes?: string;
}): Promise<AttendanceRecord> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/attendances/checkin`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Gagal melakukan presensi");
    }

    return json.data;
  } catch (err) {
    console.error("checkInAttendance error:", err);
    throw err;
  }
}

export async function fetchNotifications(role?: string, name?: string, userId?: string): Promise<AdminNotification[]> {
  try {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (name) params.set("name", name);
    if (userId) params.set("userId", userId);
    const queryString = params.toString() ? `?${params.toString()}` : "";

    const res = await fetch(`${getApiBaseUrl()}/api/v1/notifications${queryString}`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Gagal mengambil data notifikasi");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("fetchNotifications error:", err);
    return [];
  }
}

export async function markNotificationRead(id: number | string): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/notifications/${id}/read`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.error("markNotificationRead error:", err);
    return false;
  }
}

export async function clearAllNotifications(role?: string, name?: string, userId?: string): Promise<boolean> {
  try {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (name) params.set("name", name);
    if (userId) params.set("userId", userId);
    const queryString = params.toString() ? `?${params.toString()}` : "";

    const res = await fetch(`${getApiBaseUrl()}/api/v1/notifications${queryString}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.error("clearAllNotifications error:", err);
    return false;
  }
}

// ================= GEOLOCATION & TIME CONSTRAINTS HELPERS =================

export interface PoolVenueInfo {
  key: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export const POOL_VENUES: Record<string, PoolVenueInfo> = {
  nalendra: {
    key: "nalendra",
    name: "Hotel Nalendra Plaza Subang",
    address: "Jl. Otto Iskandardinata No. 88, Karanganyar, Subang",
    latitude: -6.565630,
    longitude: 107.761040,
  },
  wera: {
    key: "wera",
    name: "Kolam Renang Yonif 312 Wera",
    address: "Jl. Brigjen Katamso, Dangdeur, Subang",
    latitude: -6.550500,
    longitude: 107.747800,
  },
  ciater: {
    key: "ciater",
    name: "Kolam Renang Sari Ater / Ciater",
    address: "Jl. Raya Ciater, Subang",
    latitude: -6.738800,
    longitude: 107.656500,
  },
};

export function getPoolCoordinates(poolAreaName: string): { latitude: number; longitude: number; name: string } {
  const norm = (poolAreaName || "").toLowerCase().trim();
  if (norm.includes("wera") || norm.includes("312")) {
    return {
      latitude: POOL_VENUES.wera.latitude,
      longitude: POOL_VENUES.wera.longitude,
      name: POOL_VENUES.wera.name,
    };
  }
  if (norm.includes("ciater") || norm.includes("sari ater")) {
    return {
      latitude: POOL_VENUES.ciater.latitude,
      longitude: POOL_VENUES.ciater.longitude,
      name: POOL_VENUES.ciater.name,
    };
  }
  // Default Nalendra
  return {
    latitude: POOL_VENUES.nalendra.latitude,
    longitude: POOL_VENUES.nalendra.longitude,
    name: poolAreaName || POOL_VENUES.nalendra.name,
  };
}

// Calculate Haversine distance in kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 100) / 100;
}

export interface AttendanceTimeStatus {
  canCheckIn: boolean;
  isLate: boolean;
  isOpen: boolean;
  openTimeString: string;
  sessionStartTime: string;
  minutesRemainingUntilOpen: number;
  minutesPastStart: number;
  statusBadge: "locked" | "ready" | "late";
  statusMessage: string;
}

/**
 * Validates attendance time window against the rules:
 * 1. Opens 2 hours before session timeStart (e.g., 13:00 for 15:00 session)
 * 2. On-time check-in is up to 15 minutes after session timeStart (13:00 - 15:15)
 * 3. Late check-in is > 15 minutes after session timeStart (> 15:15), requiring late reason
 */
export function checkAttendanceTimeStatus(
  scheduleDateStr: string, // YYYY-MM-DD
  scheduleTimeStart: string // HH:MM
): AttendanceTimeStatus {
  const now = new Date();

  // Parse session start date
  let sessionStart: Date;
  try {
    if (scheduleDateStr && scheduleTimeStart) {
      sessionStart = new Date(`${scheduleDateStr}T${scheduleTimeStart}:00`);
    } else if (scheduleTimeStart) {
      const todayStr = now.toISOString().split("T")[0];
      sessionStart = new Date(`${todayStr}T${scheduleTimeStart}:00`);
    } else {
      sessionStart = new Date();
    }
  } catch {
    sessionStart = new Date();
  }

  // 2 hours before start
  const openTime = new Date(sessionStart.getTime() - 2 * 60 * 60 * 1000);
  // 15 minutes after start
  const lateThreshold = new Date(sessionStart.getTime() + 15 * 60 * 1000);

  const openTimeString = openTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sessionStartTime = sessionStart.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const nowMs = now.getTime();
  const openMs = openTime.getTime();
  const startMs = sessionStart.getTime();
  const lateMs = lateThreshold.getTime();

  // Check if date is on a different day than today
  const todayDateStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD local
  const isToday = scheduleDateStr === todayDateStr;

  if (scheduleDateStr && scheduleDateStr < todayDateStr) {
    return {
      canCheckIn: false,
      isLate: true,
      isOpen: false,
      openTimeString,
      sessionStartTime,
      minutesRemainingUntilOpen: 0,
      minutesPastStart: 0,
      statusBadge: "locked",
      statusMessage: "Jadwal sesi ini sudah berlalu.",
    };
  }

  if (scheduleDateStr && scheduleDateStr > todayDateStr) {
    const diffDays = Math.ceil((new Date(scheduleDateStr).getTime() - new Date(todayDateStr).getTime()) / (1000 * 3600 * 24));
    return {
      canCheckIn: false,
      isLate: false,
      isOpen: false,
      openTimeString,
      sessionStartTime,
      minutesRemainingUntilOpen: diffDays * 24 * 60,
      minutesPastStart: 0,
      statusBadge: "locked",
      statusMessage: `Sesi dijadwalkan tanggal ${scheduleDateStr}. Presensi baru dibuka 2 jam sebelum sesi.`,
    };
  }

  // Same Day: Check Hour Windows
  if (nowMs < openMs) {
    const minutesRemaining = Math.ceil((openMs - nowMs) / (60 * 1000));
    return {
      canCheckIn: false,
      isLate: false,
      isOpen: false,
      openTimeString,
      sessionStartTime,
      minutesRemainingUntilOpen: minutesRemaining,
      minutesPastStart: 0,
      statusBadge: "locked",
      statusMessage: `Presensi baru dibuka 2 jam sebelum sesi (pukul ${openTimeString} WIB). Tersisa ${minutesRemaining} menit lagi.`,
    };
  }

  if (nowMs >= openMs && nowMs <= lateMs) {
    return {
      canCheckIn: true,
      isLate: false,
      isOpen: true,
      openTimeString,
      sessionStartTime,
      minutesRemainingUntilOpen: 0,
      minutesPastStart: Math.max(0, Math.floor((nowMs - startMs) / (60 * 1000))),
      statusBadge: "ready",
      statusMessage: `Presensi dibuka! Silakan check-in (Status: Hadir Tepat Waktu).`,
    };
  }

  // After lateThreshold (> 15 minutes after start)
  const minutesPast = Math.floor((nowMs - startMs) / (60 * 1000));
  return {
    canCheckIn: true,
    isLate: true,
    isOpen: true,
    openTimeString,
    sessionStartTime,
    minutesRemainingUntilOpen: 0,
    minutesPastStart: minutesPast,
    statusBadge: "late",
    statusMessage: `Presensi terlambat (${minutesPast} menit setelah sesi dimulai). Wajib mengisi alasan keterlambatan.`,
  };
}

// ================= WEB PUSH & VAPID API HELPERS =================

export async function fetchVapidPublicKey(): Promise<string> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/push/vapid-public-key`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Gagal mengambil kunci VAPID");
    const json = await res.json();
    return json.public_key || "";
  } catch (err) {
    console.error("fetchVapidPublicKey error:", err);
    return "";
  }
}

export async function subscribePush(payload: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  role?: string;
  username?: string;
  student_name?: string;
  user_id?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/push/subscribe`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Gagal mendaftarkan push notification");
    }
    return json;
  } catch (err) {
    console.error("subscribePush error:", err);
    throw err;
  }
}

export async function unsubscribePush(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/push/unsubscribe`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ endpoint }),
    });
    return res.ok;
  } catch (err) {
    console.error("unsubscribePush error:", err);
    return false;
  }
}

export async function triggerTestPush(payload: {
  role?: string;
  username?: string;
  studentName?: string;
  userId?: string;
  title?: string;
  message?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/push/test`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        role: payload.role || "",
        username: payload.username || "",
        student_name: payload.studentName || "",
        user_id: payload.userId || "",
        title: payload.title || "GIM Swimming Push Test 🔔",
        message: payload.message || "Notifikasi Web Push + Icon Badge berhasil terhubung dengan lancar di perangkat Anda!",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Gagal mengirim notifikasi tes");
    }
    return {
      success: true,
      message: json.message || "Notifikasi tes berhasil dikirim!",
    };
  } catch (err: any) {
    console.error("triggerTestPush error:", err);
    return {
      success: false,
      message: err.message || "Gagal mengirim notifikasi tes",
    };
  }
}

export async function broadcastPushNotification(payload: {
  title: string;
  message: string;
  url?: string;
  type?: string;
}): Promise<{
  success: boolean;
  message: string;
  sent_count?: number;
  total_recipients?: number;
}> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/push/broadcast`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        title: payload.title,
        message: payload.message,
        url: payload.url || "/apps",
        type: payload.type || "announcement",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Gagal menyiarkan notifikasi");
    }
    return {
      success: true,
      message: json.message || "Pengumuman berhasil disiarkan ke semua pengguna PWA!",
      sent_count: json.sent_count,
      total_recipients: json.total_recipients,
    };
  } catch (err: any) {
    console.error("broadcastPushNotification error:", err);
    return {
      success: false,
      message: err.message || "Gagal menyiarkan notifikasi push",
    };
  }
}



