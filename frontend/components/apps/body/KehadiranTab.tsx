"use client";

import React, { useState, useMemo } from "react";
import { ScheduleSession, Coach, Student, AttendanceRecord } from "../types";
import {
  CalendarDays,
  Calendar,
  ClipboardList,
  Search,
  Clock,
  MapPin,
  User,
  FileText,
  AlertCircle,
  Users,
  Award,
  CheckCircle2,
  Edit2,
  X,
  Check,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { overrideAttendance } from "../../../lib/api";

interface KehadiranTabProps {
  schedules?: ScheduleSession[];
  coaches?: Coach[];
  students?: Student[];
  attendances?: AttendanceRecord[];
  sessionUser?: string;
  sessionRole?: string;
  onRefresh?: () => Promise<void>;
  setActiveTab?: (tab: string) => void;
}

export default function KehadiranTab({
  schedules = [],
  coaches = [],
  students = [],
  attendances = [],
  sessionUser = "",
  sessionRole = "admin",
  onRefresh,
  setActiveTab,
}: KehadiranTabProps) {
  const isCoachRole = sessionRole === "pelatih";

  // Person Type Switch: Pelatih vs Siswa
  const [personType, setPersonType] = useState<"coach" | "student">(
    isCoachRole ? "coach" : "coach"
  );

  // Selected coach or student filter
  const [selectedCoach, setSelectedCoach] = useState<string>(
    isCoachRole ? sessionUser : "ALL"
  );
  const [selectedStudent, setSelectedStudent] = useState<string>("ALL");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");

  const [activeSubTab, setActiveSubTab] = useState<"jadwal" | "history">("jadwal");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Attendance Override Modal State (for Admin manual corrections)
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideScheduleId, setOverrideScheduleId] = useState("");
  const [overridePersonType, setOverridePersonType] = useState<"coach" | "student">("student");
  const [overridePersonId, setOverridePersonId] = useState("");
  const [overridePersonName, setOverridePersonName] = useState("");
  const [overrideStatus, setOverrideStatus] = useState<"Hadir" | "Izin" | "Sakit" | "Tidak Hadir">("Hadir");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Filtered schedules for selected person type
  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((s) => {
        if (personType === "coach") {
          // Coach filter
          if (selectedCoach !== "ALL") {
            const coachLower = selectedCoach.toLowerCase().trim();
            const schedCoachLower = (s.coachName || "").toLowerCase().trim();
            const schedTitleLower = (s.title || "").toLowerCase().trim();
            if (!schedCoachLower.includes(coachLower) && !schedTitleLower.includes(coachLower)) {
              return false;
            }
          }
        } else {
          // Student filter
          if (selectedStudent !== "ALL") {
            const stLower = selectedStudent.toLowerCase().trim();
            const hasStudent = s.studentNames?.some((n) => n.toLowerCase().includes(stLower));
            if (!hasStudent) return false;
          }
          if (selectedClass !== "ALL") {
            if ((s.class || "").toLowerCase() !== selectedClass.toLowerCase()) return false;
          }
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (s.title || "").toLowerCase().includes(q);
          const matchClass = (s.class || "").toLowerCase().includes(q);
          const matchPool = (s.poolArea || "").toLowerCase().includes(q);
          const matchDate = (s.date || "").includes(q);
          const matchCoach = (s.coachName || "").toLowerCase().includes(q);
          const matchStudents = s.studentNames?.some((n) => n.toLowerCase().includes(q));
          if (!matchTitle && !matchClass && !matchPool && !matchDate && !matchCoach && !matchStudents) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const aDate = a.date || "";
        const bDate = b.date || "";
        return aDate.localeCompare(bDate);
      });
  }, [schedules, personType, selectedCoach, selectedStudent, selectedClass, searchQuery]);

  // Filtered attendance history for selected person type
  const filteredAttendanceHistory = useMemo(() => {
    return attendances
      .filter((att) => {
        if (att.person_type !== personType) return false;

        if (personType === "coach") {
          // Coach filter
          if (selectedCoach !== "ALL") {
            const coachLower = selectedCoach.toLowerCase().trim();
            const personLower = (att.person_name || "").toLowerCase().trim();
            if (!personLower.includes(coachLower)) {
              return false;
            }
          }
        } else {
          // Student filter
          if (selectedStudent !== "ALL") {
            const stLower = selectedStudent.toLowerCase().trim();
            const personLower = (att.person_name || "").toLowerCase().trim();
            if (!personLower.includes(stLower)) {
              return false;
            }
          }
          if (selectedClass !== "ALL") {
            const attClass = att.class || att.class_name || "";
            if (attClass.toLowerCase() !== selectedClass.toLowerCase()) return false;
          }
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (att.person_name || "").toLowerCase().includes(q);
          const matchTitle = (att.schedule_title || "").toLowerCase().includes(q);
          const matchDate = (att.date || "").includes(q);
          const matchPool = (att.pool_area || "").toLowerCase().includes(q);
          const matchStatus = (att.status || "").toLowerCase().includes(q);
          if (!matchName && !matchTitle && !matchDate && !matchPool && !matchStatus) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.created_at || a.date || "";
        const dateB = b.created_at || b.date || "";
        return dateB.localeCompare(dateA);
      });
  }, [attendances, personType, selectedCoach, selectedStudent, selectedClass, searchQuery]);

  // Open Override Modal
  const handleOpenOverrideModal = (sched?: ScheduleSession, att?: AttendanceRecord) => {
    if (sched) {
      setOverrideScheduleId(sched.id);
      setOverridePersonType(personType);
      if (personType === "coach") {
        setOverridePersonId(sched.coachId || sched.coachName);
        setOverridePersonName(sched.coachName);
      } else if (sched.studentNames && sched.studentNames.length > 0) {
        setOverridePersonId(sched.studentIds?.[0] || sched.studentNames[0]);
        setOverridePersonName(sched.studentNames[0]);
      }
    } else if (att) {
      setOverrideScheduleId(att.schedule_id);
      setOverridePersonType(att.person_type);
      setOverridePersonId(att.person_id);
      setOverridePersonName(att.person_name);
      setOverrideStatus((att.status as any) || "Hadir");
    } else {
      setOverrideScheduleId(schedules[0]?.id || "");
      setOverridePersonType(personType);
      setOverridePersonId("");
      setOverridePersonName("");
    }
    setOverrideNotes("Dikonfirmasi oleh Admin");
    setShowOverrideModal(true);
  };

  // Submit Override Attendance
  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideScheduleId || !overridePersonName) {
      alert("Pilih jadwal dan nama yang akan dikoreksi.");
      return;
    }

    try {
      setOverrideSubmitting(true);
      await overrideAttendance({
        schedule_id: overrideScheduleId,
        person_type: overridePersonType,
        person_id: overridePersonId || overridePersonName,
        person_name: overridePersonName,
        status: overrideStatus,
        notes: overrideNotes || "Dikonfirmasi oleh Admin",
      });
      setShowOverrideModal(false);
      if (onRefresh) await onRefresh();
      alert(`Presensi untuk ${overridePersonName} berhasil dikoreksi menjadi '${overrideStatus}'.`);
    } catch (err: any) {
      alert(err.message || "Gagal mengoreksi presensi.");
    } finally {
      setOverrideSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 bg-[#f8fafc] min-h-full font-sans">
      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-14 sm:pb-16 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden rounded-none">
        <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pusat Kehadiran &amp; Jadwal
            </h2>
            <p className="text-xs text-cyan-100 font-medium mt-1">
              Pantau jadwal harian dan riwayat presensi kehadiran Pelatih &amp; Siswa secara lengkap.
            </p>
          </div>

          {!isCoachRole && (
            <button
              onClick={() => handleOpenOverrideModal()}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border border-white/20 transition self-start md:self-auto"
            >
              <Edit2 size={16} className="text-cyan-300" />
              <span>Koreksi Presensi Manual</span>
            </button>
          )}
        </div>

        {/* Pelatih vs Siswa Switcher (For Admin) */}
        {!isCoachRole && (
          <div className="max-w-4xl mx-auto mt-6 flex bg-black/25 p-1.5 rounded-2xl backdrop-blur-md border border-white/15 max-w-sm">
            <button
              onClick={() => setPersonType("coach")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all ${personType === "coach"
                ? "bg-cyan-400 text-slate-950 shadow-md"
                : "text-white/80 hover:text-white"
                }`}
            >
              <Award size={15} />
              <span>Pelatih ({coaches.length})</span>
            </button>
            <button
              onClick={() => setPersonType("student")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all ${personType === "student"
                ? "bg-cyan-400 text-slate-950 shadow-md"
                : "text-white/80 hover:text-white"
                }`}
            >
              <Users size={15} />
              <span>Siswa ({students.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* ==========================================
          2. FLOATING CONTROL CAPSULE (Search & Filters)
          ========================================== */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20 space-y-3">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-3 flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Sub-tab Pill Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveSubTab("jadwal")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${activeSubTab === "jadwal"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <CalendarDays size={14} />
              <span>Jadwal ({filteredSchedules.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab("history")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${activeSubTab === "history"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <ClipboardList size={14} />
              <span>Riwayat Presensi ({filteredAttendanceHistory.length})</span>
            </button>
          </div>

          {/* Dynamic Filter dropdowns */}
          {personType === "coach" && !isCoachRole && (
            <select
              value={selectedCoach}
              onChange={(e) => setSelectedCoach(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Pelatih ({coaches.length})</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.class || "Prestasi"})
                </option>
              ))}
            </select>
          )}

          {personType === "student" && (
            <div className="flex items-center gap-2">
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[170px]"
              >
                <option value="ALL">Semua Siswa ({students.length})</option>
                {students.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.class || "Prestasi"})
                  </option>
                ))}
              </select>

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">Semua Kelas</option>
                <option value="Prestasi">Prestasi</option>
                <option value="Reguler">Reguler</option>
                <option value="Private">Private</option>
                <option value="Pemula (Water Safety)">Pemula</option>
              </select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Cari nama ${personType === "coach" ? "pelatih" : "siswa"}, kolam, atau tanggal...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* ==========================================
          3. CONTENT LIST
          ========================================== */}
      <div className="max-w-4xl mx-auto px-4 space-y-4 pt-2">
        {/* SUBTAB JADWAL */}
        {activeSubTab === "jadwal" && (
          <div className="space-y-3">
            {filteredSchedules.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
                <CalendarDays size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-700 font-bold text-sm">Tidak ada jadwal sesi ditemukan</p>
                <p className="text-slate-400 text-xs mt-1">
                  Coba sesuaikan filter pelatih/siswa atau tanggal latihan.
                </p>
              </div>
            ) : (
              filteredSchedules.map((sess) => {
                const isToday = sess.date === todayISO;

                return (
                  <div
                    key={sess.id}
                    className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm hover:border-blue-300 transition ${isToday ? "border-blue-400/80 bg-blue-50/20" : "border-slate-200/80"
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-200">
                            {sess.class || "Prestasi"}
                          </span>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black animate-pulse">
                              Hari Ini
                            </span>
                          )}
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            {sess.timeStart} - {sess.timeEnd}
                          </span>
                        </div>

                        <h4 className="text-base font-black text-slate-900 mt-1.5">
                          {sess.title}
                        </h4>

                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-slate-600">
                            <MapPin size={13} className="text-rose-500 shrink-0" />
                            {sess.poolArea}
                          </span>
                          <span className="flex items-center gap-1 font-bold text-indigo-600">
                            <Award size={13} />
                            Pelatih: {sess.coachName}
                          </span>
                          {sess.studentNames && sess.studentNames.length > 0 && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Users size={13} />
                              Siswa: {sess.studentNames.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isCoachRole && (
                        <button
                          onClick={() => handleOpenOverrideModal(sess)}
                          className="self-end sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-xs font-bold transition shrink-0"
                        >
                          <Edit2 size={13} />
                          <span>Koreksi Sesi</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SUBTAB RIWAYAT PRESENSI */}
        {activeSubTab === "history" && (
          <div className="space-y-3">
            {filteredAttendanceHistory.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
                <ClipboardList size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-700 font-bold text-sm">Belum ada riwayat presensi tercatat</p>
                <p className="text-slate-400 text-xs mt-1">
                  Riwayat check-in dan absensi otomatis akan muncul di sini.
                </p>
              </div>
            ) : (
              filteredAttendanceHistory.map((att) => {
                const isHadir = att.status === "Hadir" || att.status === "Selesai";
                const isLate = att.status === "Terlambat" || att.is_late;
                const isIzin = att.status === "Izin" || att.status === "Sakit";
                const isAlpha = att.status === "Tidak Hadir" || att.status === "Alpa";

                return (
                  <div
                    key={att.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-200 transition"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-base shrink-0 ${isHadir
                          ? "bg-emerald-50 text-emerald-600"
                          : isLate
                            ? "bg-amber-50 text-amber-600"
                            : isAlpha
                              ? "bg-rose-50 text-rose-600"
                              : "bg-blue-50 text-blue-600"
                          }`}
                      >
                        {att.person_name ? att.person_name.charAt(0).toUpperCase() : "U"}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-slate-900">{att.person_name}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {att.person_type === "coach" ? "Pelatih" : "Siswa"}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {att.date || (att.created_at ? new Date(att.created_at).toLocaleDateString("id-ID") : "-")}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-0.5">
                          {att.schedule_title || "Sesi Latihan Renang"} • {att.pool_area || "Kolam Utama"}
                        </p>

                        {att.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5 bg-slate-50 px-2 py-1 rounded-lg">
                            Catatan: {att.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                      {isHadir && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                          <CheckCircle2 size={14} />
                          <span>Hadir</span>
                        </span>
                      )}
                      {isLate && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-black border border-amber-200">
                          <Clock size={14} />
                          <span>Terlambat</span>
                        </span>
                      )}
                      {isIzin && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-black border border-blue-200">
                          <FileText size={14} />
                          <span>{att.status}</span>
                        </span>
                      )}
                      {isAlpha && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-black border border-rose-200">
                          <AlertCircle size={14} />
                          <span>Tidak Hadir (Alpa)</span>
                        </span>
                      )}

                      {!isCoachRole && (
                        <button
                          onClick={() => handleOpenOverrideModal(undefined, att)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                          title="Koreksi presensi"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ==========================================
          4. MODAL KOREKSI PRESENSI (ADMIN)
          ========================================== */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck size={20} className="text-blue-600" />
                <span>Koreksi Presensi Manual</span>
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitOverride} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Jadwal Sesi <span className="text-rose-500">*</span>
                </label>
                <select
                  value={overrideScheduleId}
                  onChange={(e) => {
                    setOverrideScheduleId(e.target.value);
                    const sched = schedules.find((s) => s.id === e.target.value);
                    if (sched) {
                      if (overridePersonType === "coach") {
                        setOverridePersonId(sched.coachId || sched.coachName);
                        setOverridePersonName(sched.coachName);
                      } else if (sched.studentNames && sched.studentNames.length > 0) {
                        setOverridePersonId(sched.studentIds?.[0] || sched.studentNames[0]);
                        setOverridePersonName(sched.studentNames[0]);
                      }
                    }
                  }}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Pilih Sesi --</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} • {s.title} ({s.timeStart} - {s.timeEnd})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipe Pengguna
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOverridePersonType("student");
                      const sched = schedules.find((s) => s.id === overrideScheduleId);
                      if (sched?.studentNames?.[0]) {
                        setOverridePersonName(sched.studentNames[0]);
                        setOverridePersonId(sched.studentIds?.[0] || sched.studentNames[0]);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${overridePersonType === "student"
                      ? "bg-blue-50 border-blue-500 text-blue-700 font-black"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    Siswa (Murid)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOverridePersonType("coach");
                      const sched = schedules.find((s) => s.id === overrideScheduleId);
                      if (sched?.coachName) {
                        setOverridePersonName(sched.coachName);
                        setOverridePersonId(sched.coachId || sched.coachName);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${overridePersonType === "coach"
                      ? "bg-blue-50 border-blue-500 text-blue-700 font-black"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    Pelatih (Coach)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama {overridePersonType === "coach" ? "Pelatih" : "Siswa"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={overridePersonName}
                  onChange={(e) => {
                    setOverridePersonName(e.target.value);
                    setOverridePersonId(e.target.value);
                  }}
                  required
                  placeholder="Masukkan nama lengkap..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Presensi <span className="text-rose-500">*</span>
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Hadir">Hadir (Hadir Penuh)</option>
                  <option value="Izin">Izin (Ada Konfirmasi Izin)</option>
                  <option value="Sakit">Sakit (Surat Dokter / Sakit)</option>
                  <option value="Tidak Hadir">Tidak Hadir (Alpa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Koreksi Admin
                </label>
                <input
                  type="text"
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="e.g. Lupa absen / kendala GPS, dikonfirmasi admin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={overrideSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {overrideSubmitting ? "Menyimpan..." : "Simpan Koreksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
