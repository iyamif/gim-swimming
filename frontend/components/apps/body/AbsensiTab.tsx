"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Student,
  Coach,
  ScheduleSession,
  AttendanceRecord,
} from "../types";
import {
  calculateDistanceKm,
  getPoolCoordinates,
  checkAttendanceTimeStatus,
  POOL_VENUES,
} from "../../../lib/api";
import CoachCameraPresensi from "./CoachCameraPresensi";

interface AbsensiTabProps {
  students: Student[];
  coaches?: Coach[];
  schedules?: ScheduleSession[];
  attendances?: AttendanceRecord[];
  sessionUser?: string;
  sessionRole?: string;
  onCheckInAttendance?: (payload: {
    schedule_id: string;
    person_type: "coach" | "student";
    person_id: string;
    person_name: string;
    status?: string;
    late_reason?: string;
    latitude: number;
    longitude: number;
    notes?: string;
  }) => Promise<boolean | void>;
  onSubmitAttendance?: (
    className: string,
    attendanceMap: Record<string, "Hadir" | "Sakit" | "Izin" | "Alpa">
  ) => void;
  setActiveTab?: (tab: string) => void;
}

export default function AbsensiTab({
  students = [],
  coaches = [],
  schedules = [],
  attendances = [],
  sessionUser = "",
  sessionRole = "admin",
  onCheckInAttendance,
  onSubmitAttendance,
  setActiveTab,
}: AbsensiTabProps) {
  // Pelatih default view is Camera Presensi; Admin default view is Manual Checklist
  const [viewMode, setViewMode] = useState<"camera" | "manual">(
    sessionRole === "pelatih" ? "camera" : "manual"
  );
  const [subTab, setSubTab] = useState<"checkin" | "history">("checkin");

  // Schedule selection
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Filter schedules: active or today's schedules
  const availableSchedules = useMemo(() => {
    if (schedules.length === 0) return [];
    // Prioritize today and future active schedules
    return [...schedules].sort((a, b) => {
      const aDate = a.date || "";
      const bDate = b.date || "";
      return aDate.localeCompare(bDate);
    });
  }, [schedules]);

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    availableSchedules[0]?.id || ""
  );

  // Sync selected schedule when availableSchedules change
  useEffect(() => {
    if (!selectedScheduleId && availableSchedules.length > 0) {
      setSelectedScheduleId(availableSchedules[0].id);
    }
  }, [availableSchedules, selectedScheduleId]);

  const activeSchedule = useMemo(() => {
    return (
      availableSchedules.find((s) => s.id === selectedScheduleId) ||
      availableSchedules[0] ||
      null
    );
  }, [availableSchedules, selectedScheduleId]);

  // Geolocation states
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>("");
  const [isSimulatedGPS, setIsSimulatedGPS] = useState<boolean>(false);

  // Time state for live ticking
  const [currentTimeTick, setCurrentTimeTick] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeTick(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Request browser GPS position
  const requestCurrentLocation = (simulatePoolArea?: string) => {
    if (simulatePoolArea) {
      const poolCoords = getPoolCoordinates(simulatePoolArea);
      setCurrentLat(poolCoords.latitude);
      setCurrentLon(poolCoords.longitude);
      setIsSimulatedGPS(true);
      setLocationError("");
      return;
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Browser Anda tidak mendukung deteksi lokasi GPS.");
      // Fallback to default pool coordinate
      const def = getPoolCoordinates(activeSchedule?.poolArea || "Nalendra");
      setCurrentLat(def.latitude);
      setCurrentLon(def.longitude);
      setIsSimulatedGPS(true);
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLat(pos.coords.latitude);
        setCurrentLon(pos.coords.longitude);
        setIsSimulatedGPS(false);
        setLocationLoading(false);
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setLocationLoading(false);
        setLocationError(
          "Izin akses GPS belum diberikan atau lokasi gagal diambil. Menggunakan lokasi simulasi area kolam."
        );
        // Fallback simulate pool area
        const def = getPoolCoordinates(activeSchedule?.poolArea || "Nalendra");
        setCurrentLat(def.latitude);
        setCurrentLon(def.longitude);
        setIsSimulatedGPS(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Initial location request
  useEffect(() => {
    requestCurrentLocation();
  }, [activeSchedule?.poolArea]);

  // Calculate distance to pool venue
  const targetPoolInfo = useMemo(() => {
    return getPoolCoordinates(activeSchedule?.poolArea || "Nalendra");
  }, [activeSchedule?.poolArea]);

  const distanceToPoolKm = useMemo(() => {
    if (currentLat === null || currentLon === null) return 0;
    return calculateDistanceKm(
      currentLat,
      currentLon,
      targetPoolInfo.latitude,
      targetPoolInfo.longitude
    );
  }, [currentLat, currentLon, targetPoolInfo]);

  const isLocationValid = distanceToPoolKm <= 2.0;

  // Calculate Time Status (2h before, 15m late limit)
  const timeStatus = useMemo(() => {
    if (!activeSchedule) {
      return {
        canCheckIn: false,
        isLate: false,
        isOpen: false,
        openTimeString: "--:--",
        sessionStartTime: "--:--",
        minutesRemainingUntilOpen: 0,
        minutesPastStart: 0,
        statusBadge: "locked" as const,
        statusMessage: "Pilih sesi jadwal terlebih dahulu",
      };
    }
    return checkAttendanceTimeStatus(
      activeSchedule.date || todayStr,
      activeSchedule.timeStart || "15:00"
    );
  }, [activeSchedule, todayStr, currentTimeTick]);

  // Coach check-in states
  const [coachCheckInLoading, setCoachCheckInLoading] = useState(false);
  const [coachLateReason, setCoachLateReason] = useState("");
  const [showCoachLateModal, setShowCoachLateModal] = useState(false);

  // Student check-in states
  const [studentStatusMap, setStudentStatusMap] = useState<
    Record<string, "Hadir" | "Terlambat" | "Izin" | "Sakit" | "Alpa">
  >({});
  const [studentLateReasonMap, setStudentLateReasonMap] = useState<Record<string, string>>({});
  const [submittingStudentId, setSubmittingStudentId] = useState<string | null>(null);

  // History Filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyRoleFilter, setHistoryRoleFilter] = useState<"ALL" | "coach" | "student">("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("ALL");

  // Determine if coach is already checked in for active schedule
  const isCoachCheckedIn = useMemo(() => {
    if (!activeSchedule) return false;
    return attendances.some(
      (a) =>
        a.schedule_id === activeSchedule.id &&
        a.person_type === "coach" &&
        (a.status === "Hadir" || a.status === "Terlambat")
    );
  }, [attendances, activeSchedule]);

  // Determine students check-in map for active schedule
  const checkedInStudentIds = useMemo(() => {
    if (!activeSchedule) return new Set<string>();
    const ids = new Set<string>();
    attendances.forEach((a) => {
      if (a.schedule_id === activeSchedule.id && a.person_type === "student") {
        ids.add(a.person_id);
      }
    });
    return ids;
  }, [attendances, activeSchedule]);

  // Handle Coach Check-In
  const handleCoachCheckInSubmit = async (reasonOverride?: string) => {
    if (!activeSchedule) return;

    if (!isLocationValid) {
      alert(
        `Presensi ditolak! Jarak Anda saat ini adalah ${distanceToPoolKm} km dari ${targetPoolInfo.name}. Presensi harus berada dalam radius maksimal 2.0 km dari kolam renang.`
      );
      return;
    }

    if (!timeStatus.canCheckIn) {
      alert(timeStatus.statusMessage);
      return;
    }

    const lateReason = reasonOverride || coachLateReason;
    if (timeStatus.isLate && !lateReason.trim()) {
      setShowCoachLateModal(true);
      return;
    }

    try {
      setCoachCheckInLoading(true);
      if (onCheckInAttendance) {
        await onCheckInAttendance({
          schedule_id: activeSchedule.id,
          person_type: "coach",
          person_id: activeSchedule.coachId || "c1",
          person_name: activeSchedule.coachName || "Coach",
          status: timeStatus.isLate ? "Terlambat" : "Hadir",
          late_reason: lateReason,
          latitude: currentLat || targetPoolInfo.latitude,
          longitude: currentLon || targetPoolInfo.longitude,
          notes: `Presensi Pelatih via App (${isLocationValid ? "Radius Valid" : "Di Luar Radius"})`,
        });
      }
      setShowCoachLateModal(false);
      setCoachLateReason("");
    } catch (err: any) {
      alert(err?.message || "Gagal melakukan presensi pelatih");
    } finally {
      setCoachCheckInLoading(false);
    }
  };

  // Handle Student Check-In
  const handleStudentCheckIn = async (
    studentId: string,
    studentName: string,
    statusOverride?: "Hadir" | "Terlambat" | "Izin" | "Sakit" | "Alpa"
  ) => {
    if (!activeSchedule) return;

    const status = statusOverride || studentStatusMap[studentId] || (timeStatus.isLate ? "Terlambat" : "Hadir");
    const lateReason = studentLateReasonMap[studentId] || "";

    if (status !== "Izin" && status !== "Sakit") {
      if (!isLocationValid) {
        alert(
          `Presensi ditolak! Jarak Anda saat ini ${distanceToPoolKm} km dari ${targetPoolInfo.name}. Wajib berada dalam radius maksimal 2.0 km.`
        );
        return;
      }
      if (!timeStatus.canCheckIn) {
        alert(timeStatus.statusMessage);
        return;
      }
      if (timeStatus.isLate && status === "Terlambat" && !lateReason.trim()) {
        const inputReason = prompt(
          `Siswa ${studentName} melakukan presensi terlambat (> 15 menit setelah sesi dimulai).\n\nSilakan masukkan alasan keterlambatan:`
        );
        if (!inputReason || !inputReason.trim()) {
          alert("Alasan keterlambatan wajib diisi untuk catatan admin!");
          return;
        }
        setStudentLateReasonMap((prev) => ({ ...prev, [studentId]: inputReason.trim() }));
      }
    }

    try {
      setSubmittingStudentId(studentId);
      const effectiveReason = studentLateReasonMap[studentId] || (timeStatus.isLate ? "Terlambat hadir" : "");

      if (onCheckInAttendance) {
        await onCheckInAttendance({
          schedule_id: activeSchedule.id,
          person_type: "student",
          person_id: studentId,
          person_name: studentName,
          status,
          late_reason: effectiveReason,
          latitude: currentLat || targetPoolInfo.latitude,
          longitude: currentLon || targetPoolInfo.longitude,
          notes: `Presensi Siswa di ${activeSchedule.poolArea}`,
        });
      }
    } catch (err: any) {
      alert(err?.message || "Gagal menyimpan presensi siswa");
    } finally {
      setSubmittingStudentId(null);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return attendances.filter((att) => {
      const matchSearch =
        att.person_name.toLowerCase().includes(historySearch.toLowerCase()) ||
        (att.schedule_title || "").toLowerCase().includes(historySearch.toLowerCase()) ||
        (att.class || att.class_name || "").toLowerCase().includes(historySearch.toLowerCase()) ||
        att.date.includes(historySearch);

      const matchRole =
        historyRoleFilter === "ALL" || att.person_type === historyRoleFilter;

      const matchStatus =
        historyStatusFilter === "ALL" || att.status === historyStatusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [attendances, historySearch, historyRoleFilter, historyStatusFilter]);

  // If Camera Presensi view is active (default for pelatih)
  if (viewMode === "camera") {
    return (
      <div className="fixed inset-0 z-50 bg-black animate-fadeIn">
        <CoachCameraPresensi
          schedules={schedules}
          coaches={coaches}
          attendances={attendances}
          sessionUser={sessionUser}
          sessionRole={sessionRole}
          onCheckInAttendance={onCheckInAttendance}
          onClose={() => {
            if (sessionRole === "pelatih" && setActiveTab) {
              setActiveTab("dashboard");
            } else {
              setViewMode("manual");
            }
          }}
          onSwitchToStudentChecklist={(schedId) => {
            setSelectedScheduleId(schedId);
            setViewMode("manual");
            setSubTab("checkin");
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto font-sans pb-28">
      {/* ==========================================
          HEADER & SUB-NAV TABS
          ========================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏱️</span>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                Presensi &amp; Absensi Sesi Renang
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Validasi koordinat GPS radius 2 km dari kolam renang &amp; waktu sesi
            </p>
          </div>

          {/* Sub Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl shrink-0 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setViewMode("camera")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xs active:scale-95"
            >
              <span>📷</span>
              <span>Buka Kamera Presensi</span>
            </button>
            <button
              onClick={() => setSubTab("checkin")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                subTab === "checkin"
                  ? "bg-white text-blue-600 shadow-sm font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>⏱️</span>
              <span>Input Presensi</span>
            </button>
            <button
              onClick={() => setSubTab("history")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                subTab === "history"
                  ? "bg-white text-cyan-600 shadow-sm font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>📋</span>
              <span>Rekap &amp; Histori ({attendances.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          TAB 1: INPUT PRESENSI
          ========================================== */}
      {subTab === "checkin" && (
        <div className="space-y-4 animate-fadeIn">
          {/* 1. SELECT SCHEDULE */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">
                  1. Pilih Sesi Jadwal Latihan
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Sesi jadwal renang yang telah dibuat oleh Admin
                </p>
              </div>

              {availableSchedules.length > 0 && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {availableSchedules.length} Sesi Terjadwal
                </span>
              )}
            </div>

            {availableSchedules.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-3xl">📅</span>
                <p className="text-xs font-bold text-slate-700">Belum Ada Jadwal Sesi</p>
                <p className="text-[11px] text-slate-400">
                  Silakan buat jadwal les renang di tab Jadwal terlebih dahulu.
                </p>
                {setActiveTab && (
                  <button
                    onClick={() => setActiveTab("jadwal")}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    + Buat Jadwal Baru
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Pilih Sesi yang Akan Diabsen:
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white cursor-pointer shadow-2xs"
                >
                  {availableSchedules.map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.date} ({sch.timeStart} - {sch.timeEnd} WIB) • {sch.title} • {sch.poolArea} (Coach: {sch.coachName})
                    </option>
                  ))}
                </select>

                {/* Active Session Capsule Summary */}
                {activeSchedule && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 to-cyan-50/40 border border-blue-100 space-y-2.5">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                            {activeSchedule.class}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 text-[10px] font-bold border border-slate-200">
                            📍 {activeSchedule.poolArea}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 mt-1">
                          {activeSchedule.title}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-blue-600 block">
                          ⏰ {activeSchedule.timeStart} - {activeSchedule.timeEnd} WIB
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          📅 {activeSchedule.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-100/60 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Pelatih:</span>
                        <span className="font-bold text-slate-900">
                          {activeSchedule.coachName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Murid Terdaftar:</span>
                        <span className="font-bold text-cyan-700">
                          {activeSchedule.studentNames?.length || 0} Siswa
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. LIVE RADAR GPS & TIME STATUS CARDS */}
          {activeSchedule && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CARD A: GPS GEOLOCATION RADAR */}
              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📡</span>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">
                      Validasi Lokasi (GPS)
                    </h4>
                  </div>

                  <button
                    onClick={() => requestCurrentLocation()}
                    disabled={locationLoading}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1"
                    title="Perbarui GPS"
                  >
                    <span>🔄</span>
                    <span>{locationLoading ? "Mencari GPS..." : "Refresh GPS"}</span>
                  </button>
                </div>

                {/* Radar Metrics */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Titik Kolam Tujuan:</span>
                      <span className="font-bold text-slate-900 text-right">
                        {targetPoolInfo.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Jarak Anda ke Kolam:</span>
                      <span
                        className={`font-black text-sm ${
                          isLocationValid ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {distanceToPoolKm.toFixed(2)} km ({(distanceToPoolKm * 1000).toFixed(0)} m)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Koordinat Perangkat:</span>
                      <span className="font-mono text-slate-600">
                        {currentLat !== null && currentLon !== null
                          ? `${currentLat.toFixed(5)}, ${currentLon.toFixed(5)}`
                          : "Menunggu GPS..."}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[11px] font-bold text-slate-500">
                      Status Radius (Maks 2.0 KM):
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 ${
                        isLocationValid
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
                          : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                      }`}
                    >
                      <span>{isLocationValid ? "🟢" : "🔴"}</span>
                      <span>
                        {isLocationValid ? "DALAM RADIUS (< 2 KM)" : "DI LUAR RADIUS (> 2 KM)"}
                      </span>
                    </span>
                  </div>

                  {/* Simulator Quick Action Pill */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 italic">
                      {isSimulatedGPS ? "⚡ GPS Disimulasikan di Kolam" : "📍 GPS Akurat Perangkat"}
                    </span>
                    <button
                      type="button"
                      onClick={() => requestCurrentLocation(activeSchedule.poolArea)}
                      className="text-cyan-700 hover:text-cyan-800 font-bold underline cursor-pointer"
                      title="Set lokasi tepat di koordinat kolam renang untuk pengujian"
                    >
                      Set Lokasi di Kolam (Simulasi)
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD B: TIME WINDOW STATUS */}
              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏰</span>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">
                      Validasi Waktu Sesi
                    </h4>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Live Status
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Jadwal Sesi Mulai:</span>
                      <span className="font-bold text-blue-600">
                        {activeSchedule.timeStart} WIB
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Buka Presensi (2 Jam Sblm):</span>
                      <span className="font-bold text-slate-800">
                        {timeStatus.openTimeString} WIB
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Batas Tepat Waktu (+15 Mnt):</span>
                      <span className="font-bold text-amber-700">
                        {(() => {
                          const [h, m] = (activeSchedule.timeStart || "15:00").split(":").map(Number);
                          const total = (h || 0) * 60 + (m || 0) + 15;
                          const newH = Math.floor(total / 60) % 24;
                          const newM = total % 60;
                          return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")} WIB`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Time Badge */}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[11px] font-bold text-slate-500">Status Waktu:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black ${
                        timeStatus.statusBadge === "ready"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : timeStatus.statusBadge === "late"
                          ? "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {timeStatus.statusBadge === "ready"
                        ? "🟢 SIAP PRESENSI (TEPAT WAKTU)"
                        : timeStatus.statusBadge === "late"
                        ? `🟡 TERLAMBAT (+${timeStatus.minutesPastStart} MNT)`
                        : "⏳ BELUM DIBUKA"}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                    {timeStatus.statusMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. CHECK-IN SECTION FOR COACH & STUDENTS */}
          {activeSchedule && (
            <div className="space-y-4">
              {/* COACH CHECK-IN CARD */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-lg shadow-sm">
                      🏊‍♂️
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        Presensi Pelatih
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 capitalize">
                        {activeSchedule.coachName}
                      </h3>
                    </div>
                  </div>

                  {isCoachCheckedIn ? (
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black flex items-center gap-1.5 shadow-2xs">
                      <span>✓</span>
                      <span>Pelatih Sudah Hadir</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                      Belum Absen
                    </span>
                  )}
                </div>

                {!isCoachCheckedIn ? (
                  <div className="space-y-3 pt-1">
                    {timeStatus.isLate && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                        <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>Presensi Terlambat (&gt; 15 menit setelah sesi dimulai)</span>
                        </p>
                        <p className="text-[11px] text-amber-800">
                          Wajib mengisi alasan keterlambatan untuk catatan Admin:
                        </p>
                        <input
                          type="text"
                          value={coachLateReason}
                          onChange={(e) => setCoachLateReason(e.target.value)}
                          placeholder="Contoh: Terjebak macet / kendala teknis..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={coachCheckInLoading || !isLocationValid || !timeStatus.canCheckIn}
                      onClick={() => handleCoachCheckInSubmit()}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 active:scale-98 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span>⏱️</span>
                      <span>
                        {coachCheckInLoading
                          ? "Menyimpan Presensi..."
                          : timeStatus.isLate
                          ? "Absen Pelatih Sekarang (Terlambat)"
                          : "Absen Pelatih Sekarang (Hadir Tepat Waktu)"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 font-medium">
                    Presensi pelatih untuk sesi ini telah tercatat di sistem dan menjadi patokan pembayaran salary.
                  </p>
                )}
              </div>

              {/* STUDENTS CHECK-IN LIST */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">
                      Presensi Siswa Terdaftar
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Catat kehadiran siswa pada sesi {activeSchedule.title}
                    </p>
                  </div>

                  <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
                    {activeSchedule.studentNames?.length || 0} Siswa
                  </span>
                </div>

                {(!activeSchedule.studentNames || activeSchedule.studentNames.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    Belum ada siswa yang ditautkan ke jadwal sesi ini.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activeSchedule.studentNames.map((stName, idx) => {
                      const stId = activeSchedule.studentIds?.[idx] || `st-${idx}`;
                      const isCheckedIn = checkedInStudentIds.has(stId);
                      const currentStatus =
                        studentStatusMap[stId] || (timeStatus.isLate ? "Terlambat" : "Hadir");

                      return (
                        <div
                          key={stId}
                          className="py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-black text-xs shrink-0">
                              {stName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 capitalize">
                                {stName}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Level: {activeSchedule.class}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            {/* Status Buttons */}
                            <div className="flex gap-1">
                              {(["Hadir", "Izin", "Sakit", "Alpa"] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() =>
                                    setStudentStatusMap((prev) => ({
                                      ...prev,
                                      [stId]: st,
                                    }))
                                  }
                                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                                    currentStatus === st
                                      ? st === "Hadir"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs"
                                        : st === "Izin"
                                        ? "bg-amber-50 text-amber-700 border-amber-300 shadow-2xs"
                                        : st === "Sakit"
                                        ? "bg-blue-50 text-blue-700 border-blue-300 shadow-2xs"
                                        : "bg-rose-50 text-rose-700 border-rose-300 shadow-2xs"
                                      : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>

                            {/* Submit Button per Student */}
                            <button
                              type="button"
                              disabled={
                                submittingStudentId === stId ||
                                (!isLocationValid && currentStatus !== "Izin" && currentStatus !== "Sakit") ||
                                !timeStatus.canCheckIn
                              }
                              onClick={() => handleStudentCheckIn(stId, stName)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                                isCheckedIn
                                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                            >
                              {submittingStudentId === stId
                                ? "Menyimpan..."
                                : isCheckedIn
                                ? "✓ Absen Ulang"
                                : "Simpan Absen"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 2: REKAP & HISTORI PRESENSI
          ========================================== */}
      {subTab === "history" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filters Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Cari nama, sesi, atau tanggal..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-cyan-500 focus:bg-white transition"
              />
              <span className="absolute left-3 top-3 text-xs text-slate-400">🔍</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {/* Role Filter */}
              <select
                value={historyRoleFilter}
                onChange={(e) => setHistoryRoleFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">Semua Peran</option>
                <option value="coach">Pelatih Saja</option>
                <option value="student">Siswa Saja</option>
              </select>

              {/* Status Filter */}
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="Hadir">Hadir (Tepat Waktu)</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
              </select>
            </div>
          </div>

          {/* History List */}
          <div className="space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
                <span className="text-3xl">📋</span>
                <h4 className="text-sm font-bold text-slate-700">Belum Ada Riwayat Presensi</h4>
                <p className="text-xs text-slate-400">
                  Data presensi yang masuk akan tersimpan otomatis di sini dan dihubungkan ke pembayaran honor pelatih &amp; catatan siswa.
                </p>
              </div>
            ) : (
              filteredHistory.map((att) => {
                const isCoach = att.person_type === "coach";
                const isLate = att.is_late || att.status === "Terlambat";

                return (
                  <div
                    key={att.id}
                    className="p-4 sm:p-4.5 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white font-black text-sm ${
                            isCoach
                              ? "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-2xs"
                              : "bg-gradient-to-tr from-cyan-500 to-blue-500 shadow-2xs"
                          }`}
                        >
                          {isCoach ? "🏊‍♂️" : "👤"}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.2 rounded-md text-[9px] font-black uppercase ${
                                isCoach
                                  ? "bg-blue-50 text-blue-700 border border-blue-100"
                                  : "bg-cyan-50 text-cyan-700 border border-cyan-100"
                              }`}
                            >
                              {isCoach ? "Pelatih" : "Siswa"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {att.class}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 capitalize mt-0.5">
                            {att.person_name}
                          </h4>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${
                            isLate
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : att.status === "Hadir"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : att.status === "Izin"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isLate ? "⚠️ Terlambat" : att.status}
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                          {att.date} • {att.time_start}-{att.time_end} WIB
                        </p>
                      </div>
                    </div>

                    {/* Sesi Info & Lokasi GPS */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
                      <div className="text-[11px] text-slate-600">
                        <span className="font-bold text-slate-800">Sesi: </span>
                        <span>{att.schedule_title} ({att.pool_area})</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>📍 Jarak GPS: {att.distance_km} km</span>
                        <span className="text-emerald-600 font-bold">✓ Valid</span>
                      </div>
                    </div>

                    {/* Late Reason if available */}
                    {isLate && att.late_reason && (
                      <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
                        <span className="font-bold">Alasan Keterlambatan: </span>
                        <span>{att.late_reason}</span>
                      </div>
                    )}

                    {/* Notes / Perkembangan Siswa if available */}
                    {att.notes && (
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-0.5">
                        <span className="font-bold text-slate-800">📝 Catatan / Evaluasi: </span>
                        <span className="whitespace-pre-line">{att.notes}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: COACH LATE REASON */}
      {showCoachLateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setShowCoachLateModal(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                  <span>⚠️</span> Konfirmasi Keterlambatan Pelatih
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Presensi melewati batas 15 menit setelah sesi dimulai
                </p>
              </div>
              <button
                onClick={() => setShowCoachLateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Alasan Keterlambatan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={coachLateReason}
                onChange={(e) => setCoachLateReason(e.target.value)}
                placeholder="Masukkan alasan keterlambatan untuk catatan admin..."
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={!coachLateReason.trim()}
                onClick={() => handleCoachCheckInSubmit(coachLateReason)}
                className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50"
              >
                Simpan Presensi Terlambat
              </button>
              <button
                type="button"
                onClick={() => setShowCoachLateModal(false)}
                className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
