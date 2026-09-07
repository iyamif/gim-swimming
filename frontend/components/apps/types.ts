export interface AttendanceLog {
  date: string;
  status: "Hadir" | "Sakit" | "Izin" | "Alpa";
}

export interface Student {
  id: string;
  name: string;
  class: string;
  attendanceRate: string;
  parent: string;
  status: string;
  avatar?: string;
  phone?: string;
  age?: string;
  logs: AttendanceLog[];
}

export interface Coach {
  id: string;
  name: string;
  spec: string;
  phone: string;
  email: string;
  class: string;
  avatar?: string;
}

export interface Invoice {
  id: string;
  studentId: string;
  name: string;
  amount: number;
  desc: string;
  status: "Belum Dibayar" | "Menunggu Konfirmasi" | "Lunas";
  uploadReceipt: string | null;
}

export interface ScheduleSession {
  id: string;
  title: string;
  class: string;
  date: string; // ISO date string "YYYY-MM-DD" e.g. "2026-10-01" or recurring pattern
  timeStart: string; // e.g. "15:00"
  timeEnd: string; // e.g. "17:00"
  poolArea: string; // e.g. "Kolam Utama A"
  coachId: string;
  coachName: string;
  coachPhone?: string;
  studentIds: string[];
  studentNames: string[];
  notes?: string;
  status: "Active" | "Completed" | "Cancelled";
}

export interface AttendanceRecord {
  id: number | string;
  schedule_id: string;
  schedule_title?: string;
  class?: string;
  class_name?: string;
  date: string;
  time_start?: string;
  time_end?: string;
  time_recorded?: string;
  pool_area?: string;
  user_id?: string;
  user_role?: string;
  person_type: "coach" | "student";
  person_id: string;
  person_name: string;
  status: "Hadir" | "Terlambat" | "Izin" | "Sakit" | "Alpa";
  is_late: boolean;
  late_reason?: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  is_valid_location: boolean;
  notes?: string;
  created_at: string;
}

export interface CheckInInput {
  schedule_id: string;
  person_type: "coach" | "student";
  person_id: string;
  person_name: string;
  class_name?: string;
  status?: string;
  late_reason?: string;
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface AdminNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface NavItem {
  id: string;
  label: string;
  fullLabel: string;
  icon: string;
}

