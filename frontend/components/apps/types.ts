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
  logs: AttendanceLog[];
}

export interface Coach {
  id: string;
  name: string;
  spec: string;
  phone: string;
  email: string;
  class: string;
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

export interface NavItem {
  id: string;
  label: string;
  fullLabel: string;
  icon: string;
}
