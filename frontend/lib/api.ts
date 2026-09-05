import { Student, Coach, Invoice, ScheduleSession } from "../components/apps/types";

// Central API configuration for frontend-backend communication
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Helper for auth headers if needed
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
    const res = await fetch(`${API_BASE_URL}/api/v1/students`, {
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
}): Promise<Student | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/students`, {
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
    const res = await fetch(`${API_BASE_URL}/api/v1/students/attendance`, {
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
    const res = await fetch(`${API_BASE_URL}/api/v1/coaches`, {
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
    const res = await fetch(`${API_BASE_URL}/api/v1/coaches`, {
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
    const res = await fetch(`${API_BASE_URL}/api/v1/schedules`, {
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
    const res = await fetch(`${API_BASE_URL}/api/v1/schedules`, {
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

export async function deleteSchedule(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/schedules/${id}`, {
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
    const res = await fetch(`${API_BASE_URL}/api/v1/invoices`, {
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
    const res = await fetch(`${API_BASE_URL}/api/v1/invoices/${id}/verify`, {
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
    const res = await fetch(`${API_BASE_URL}/api/v1/invoices/${id}/receipt`, {
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
  return (
    avatar.startsWith("data:image") ||
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("/foto-profile") ||
    avatar.startsWith("/")
  );
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

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/avatar`, {
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
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/avatar`, {
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

