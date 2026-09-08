"use client";

import React, { useState, useMemo } from "react";
import { ScheduleSession, Coach, AttendanceRecord } from "../types";

interface KehadiranTabProps {
  schedules?: ScheduleSession[];
  coaches?: Coach[];
  attendances?: AttendanceRecord[];
  sessionUser?: string;
  sessionRole?: string;
  setActiveTab?: (tab: string) => void;
}

export default function KehadiranTab({
  schedules = [],
  coaches = [],
  attendances = [],
  sessionUser = "",
  sessionRole = "admin",
  setActiveTab,
}: KehadiranTabProps) {
  const isCoachRole = sessionRole === "pelatih";

  // Selected coach filter (Pelatih locked to self, Admin can select any)
  const [selectedCoach, setSelectedCoach] = useState<string>(
    isCoachRole ? sessionUser : "ALL"
  );

  const [activeSubTab, setActiveSubTab] = useState<"jadwal" | "history">("jadwal");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Filtered schedules for selected coach
  const filteredSchedules = useMemo(() => {
    return schedules
      .filter((s) => {
        // Coach filter
        if (selectedCoach !== "ALL") {
          const coachLower = selectedCoach.toLowerCase().trim();
          const schedCoachLower = (s.coachName || "").toLowerCase().trim();
          const schedTitleLower = (s.title || "").toLowerCase().trim();
          if (!schedCoachLower.includes(coachLower) && !schedTitleLower.includes(coachLower)) {
            return false;
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
          if (!matchTitle && !matchClass && !matchPool && !matchDate && !matchCoach) {
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
  }, [schedules, selectedCoach, searchQuery]);

  // Filtered attendance history for selected coach (person_type === "coach")
  const coachAttendanceHistory = useMemo(() => {
    return attendances
      .filter((att) => {
        if (att.person_type !== "coach") return false;

        // Coach filter
        if (selectedCoach !== "ALL") {
          const coachLower = selectedCoach.toLowerCase().trim();
          const personLower = (att.person_name || "").toLowerCase().trim();
          if (!personLower.includes(coachLower)) {
            return false;
          }
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (att.person_name || "").toLowerCase().includes(q);
          const matchTitle = (att.schedule_title || "").toLowerCase().includes(q);
          const matchDate = (att.date || "").includes(q);
          const matchPool = (att.pool_area || "").toLowerCase().includes(q);
          if (!matchName && !matchTitle && !matchDate && !matchPool) {
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
  }, [attendances, selectedCoach, searchQuery]);

  return (
    <div className="space-y-4 pb-28 bg-[#f8fafc] min-h-full font-sans">
      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (MATCHING DAFTAR SISWA)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-14 sm:pb-16 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden rounded-none">
        {/* Subtle geometric circles */}
        <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25 pointer-events-none" />

        {/* Ambient Depth Glow */}
        <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 space-y-2">
          {/* Header Title & Subtitle */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Jadwal &amp; Riwayat
            </h2>
            <p className="text-xs text-cyan-100 font-medium mt-1">
              {isCoachRole
                ? `Jadwal resmi dan riwayat latihan Anda (${sessionUser})`
                : `Total ${filteredSchedules.length} Sesi Terjadwal • Data & Histori Pelatih`}
            </p>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. MAIN CONTENT (FLOATING OVERLAPPING CARDS)
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4 -mt-10 sm:-mt-12 relative z-20 animate-fadeIn">
        {/* Toggle Bar & Search Box Card */}
        <div className="p-3.5 sm:p-4 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Simple Tab Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl self-start sm:self-auto">
            <button
              onClick={() => setActiveSubTab("jadwal")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "jadwal"
                  ? "bg-white text-blue-600 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>📅</span>
              <span>Jadwal ({filteredSchedules.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "history"
                  ? "bg-white text-cyan-600 shadow-xs font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>📋</span>
              <span>Riwayat ({coachAttendanceHistory.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari jadwal, kelas, kolam..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* TAB 1: JADWAL LATIHAN */}
        {activeSubTab === "jadwal" && (
          <div className="space-y-3">
            {filteredSchedules.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-1.5">
                <span className="text-3xl">📅</span>
                <p className="text-xs font-bold text-slate-700">Belum Ada Jadwal</p>
                <p className="text-[11px] text-slate-400">
                  Tidak ada sesi latihan yang terdaftar untuk pelatih ini.
                </p>
              </div>
            ) : (
              filteredSchedules.map((sched) => {
                const isToday = sched.date === todayISO;
                const studentList = sched.studentNames || [];

                return (
                  <div
                    key={sched.id}
                    className={`p-4 sm:p-5 rounded-3xl bg-white border transition shadow-xl shadow-slate-200/40 space-y-2.5 ${
                      isToday ? "border-cyan-300 ring-2 ring-cyan-400/20 bg-cyan-50/20" : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase">
                            {sched.class}
                          </span>
                          {isToday && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black">
                              Hari Ini
                            </span>
                          )}
                          <h3 className="text-sm sm:text-base font-black text-slate-900">
                            {sched.title}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Pelatih: <span className="font-bold text-slate-700">{sched.coachName}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="px-3 py-1 rounded-xl bg-slate-100 font-mono font-bold text-slate-800">
                          ⏰ {sched.timeStart} - {sched.timeEnd} WIB
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <span>📍 {sched.poolArea}</span>
                      <span>🗓️ {sched.date || "Setiap Pekan"}</span>
                    </div>

                    {studentList.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs text-slate-500">
                        <span className="font-semibold text-slate-400">Murid:</span>
                        {studentList.map((st, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700 font-medium"
                          >
                            👤 {st}
                          </span>
                        ))}
                      </div>
                    )}

                    {sched.notes && (
                      <div className="text-xs text-slate-700 bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 space-y-1">
                        <p className="font-bold text-emerald-900 flex items-center gap-1.5 text-[11px]">
                          <span>📝</span>
                          <span>Catatan Perkembangan Siswa &amp; Evaluasi Sesi:</span>
                        </p>
                        <p className="text-slate-700 whitespace-pre-line leading-relaxed pl-5 font-medium text-xs">
                          {sched.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: RIWAYAT / HISTORY */}
        {activeSubTab === "history" && (
          <div className="space-y-3">
            {coachAttendanceHistory.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-1.5">
                <span className="text-3xl">📋</span>
                <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat</p>
                <p className="text-[11px] text-slate-400">
                  Belum ada catatan riwayat latihan yang tersimpan.
                </p>
              </div>
            ) : (
              coachAttendanceHistory.map((att) => {
                const isSelesai = att.status === "Selesai" || (att.notes && att.notes.includes("Presensi Keluar"));
                const isHadir = att.status === "Hadir";
                const isLate = att.status === "Terlambat";

                return (
                  <div
                    key={att.id}
                    className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/40 space-y-2.5"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isSelesai
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : isHadir
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : isLate
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {isSelesai ? "Selesai (Presensi Keluar)" : isHadir ? "Hadir (Presensi Masuk)" : att.status}
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-slate-900">
                            {att.schedule_title || "Latihan Renang"}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Pelatih: <span className="font-bold text-slate-700">{att.person_name}</span>
                        </p>
                      </div>

                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                        {att.created_at
                          ? new Date(att.created_at).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : att.date}{" "}
                        WIB
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <span>📍 {att.pool_area || "Kolam Renang"}</span>
                      <span className="text-[11px] text-slate-400">Jarak GPS: {att.distance_km || 0.01} km</span>
                    </div>

                    {att.notes && (
                      <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1">
                        <p className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                          <span>📝</span>
                          <span>Catatan Evaluasi / Perkembangan Siswa:</span>
                        </p>
                        <p className="text-slate-600 whitespace-pre-line leading-relaxed pl-5 font-medium">
                          {att.notes}
                        </p>
                      </div>
                    )}

                    {att.late_reason && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-2xl border border-amber-100">
                        <strong>Alasan Terlambat:</strong> {att.late_reason}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
