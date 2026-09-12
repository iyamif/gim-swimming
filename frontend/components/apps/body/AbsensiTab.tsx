"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Camera,
  ClipboardList,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Zap,
  Award,
  User,
  Search,
  Check,
  X,
  Radio,
  RotateCw,
  Navigation,
} from "lucide-react";
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

  // Filter schedules: active or today's schedules (filtered by coach if logged in as pelatih)
  const availableSchedules = useMemo(() => {
    if (schedules.length === 0) return [];
    let relevant = schedules;
    if (sessionRole === "pelatih") {
      const coachUser = (sessionUser || "").toLowerCase().trim();
      const coachClean = coachUser.replace(/^coach\s+/i, "").trim();
      const matched = schedules.filter((s) => {
        const sCoach = (s.coachName || "").toLowerCase().trim();
        const sCoachClean = sCoach.replace(/^coach\s+/i, "").trim();
        return (
          (s.coachId && coaches.some((c) => String(c.id) === String(s.coachId) && c.name.toLowerCase().includes(coachClean))) ||
          (sCoachClean && (sCoachClean === coachClean || sCoachClean.includes(coachClean) || coachClean.includes(sCoachClean))) ||
          (s.coachPhone && s.coachPhone.includes(coachUser))
        );
      });
      if (matched.length > 0) {
        relevant = matched;
      }
    }
    // Prioritize today and future active schedules
    return [...relevant].sort((a, b) => {
      const aDate = a.date || "";
      const bDate = b.date || "";
      return aDate.localeCompare(bDate);
    });
  }, [schedules, sessionRole, sessionUser, coaches]);

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

  // Geolocation & Radius Simulation states
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>("");
  const [isSimulatedGPS, setIsSimulatedGPS] = useState<boolean>(true);
  const [radiusSimPreset, setRadiusSimPreset] = useState<
    "device" | "at_pool" | "near_pool" | "radius_limit" | "out_of_radius" | "custom"
  >("at_pool");
  const [customRadiusMeters, setCustomRadiusMeters] = useState<number>(15);

  // Time state for live ticking
  const [currentTimeTick, setCurrentTimeTick] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeTick(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Target pool venue coordinate
  const targetPoolInfo = useMemo(() => {
    return getPoolCoordinates(activeSchedule?.poolArea || "Nalendra");
  }, [activeSchedule?.poolArea]);

  // Calculate coordinates from meters
  const setCoordinatesFromMeters = useCallback(
    (meters: number, pool = targetPoolInfo) => {
      const offsetLat = meters / 111139;
      setCurrentLat(pool.latitude + offsetLat);
      setCurrentLon(pool.longitude);
      setIsSimulatedGPS(true);
      setLocationError("");
    },
    [targetPoolInfo]
  );

  // Request browser GPS position
  const requestCurrentLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Browser Anda tidak mendukung deteksi lokasi GPS.");
      setRadiusSimPreset("at_pool");
      setCoordinatesFromMeters(15);
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
        setRadiusSimPreset("at_pool");
        setCoordinatesFromMeters(15);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [setCoordinatesFromMeters]);

  const applyRadiusPreset = useCallback(
    (
      preset: "device" | "at_pool" | "near_pool" | "radius_limit" | "out_of_radius" | "custom",
      customVal?: number
    ) => {
      setRadiusSimPreset(preset);
      if (preset === "device") {
        requestCurrentLocation();
      } else if (preset === "at_pool") {
        setCustomRadiusMeters(15);
        setCoordinatesFromMeters(15);
      } else if (preset === "near_pool") {
        setCustomRadiusMeters(150);
        setCoordinatesFromMeters(150);
      } else if (preset === "radius_limit") {
        setCustomRadiusMeters(1800);
        setCoordinatesFromMeters(1800);
      } else if (preset === "out_of_radius") {
        setCustomRadiusMeters(3500);
        setCoordinatesFromMeters(3500);
      } else if (preset === "custom") {
        const val = customVal !== undefined ? customVal : customRadiusMeters;
        setCustomRadiusMeters(val);
        setCoordinatesFromMeters(val);
      }
    },
    [requestCurrentLocation, setCoordinatesFromMeters, customRadiusMeters]
  );

  // Initial location request
  useEffect(() => {
    if (radiusSimPreset !== "device") {
      setCoordinatesFromMeters(customRadiusMeters);
    }
  }, [targetPoolInfo, setCoordinatesFromMeters]);

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

  // List of students enrolled in the active schedule
  const enrolledStudents = useMemo(() => {
    if (!activeSchedule) return [];
    const scheduleStudentIds = new Set(activeSchedule.studentIds || []);
    const scheduleStudentNames = new Set((activeSchedule.studentNames || []).map((n) => n.toLowerCase()));

    const matched = students.filter(
      (s) =>
        scheduleStudentIds.has(s.id) ||
        scheduleStudentNames.has(s.name.toLowerCase()) ||
        (s.class && activeSchedule.class && s.class.toLowerCase() === activeSchedule.class.toLowerCase())
    );

    return matched.length > 0 ? matched : students;
  }, [students, activeSchedule]);

  const isStudentCheckedIn = (studentId: string) => checkedInStudentIds.has(studentId);

  const handleStudentStatusChange = (
    studentId: string,
    status: "Hadir" | "Terlambat" | "Izin" | "Sakit" | "Alpa"
  ) => {
    setStudentStatusMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const studentCheckInLoading: Record<string, boolean> = submittingStudentId
    ? { [submittingStudentId]: true }
    : {};

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
              <Clock size={20} className="text-blue-600" />
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
              <Camera size={14} />
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
              <Clock size={14} />
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
              <ClipboardList size={14} />
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
                <Calendar size={36} className="text-slate-300 mx-auto" />
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
                          <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 text-[10px] font-bold border border-slate-200 flex items-center gap-0.5">
                            <MapPin size={10} className="text-slate-500" />
                            <span>{activeSchedule.poolArea}</span>
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 mt-1">
                          {activeSchedule.title}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-blue-600 block flex items-center gap-1 justify-end">
                          <Clock size={12} className="text-blue-600" />
                          <span>{activeSchedule.timeStart} - {activeSchedule.timeEnd} WIB</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 justify-end mt-0.5">
                          <Calendar size={11} className="text-slate-400" />
                          <span>{activeSchedule.date}</span>
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
                    <Navigation size={18} className="text-cyan-600" />
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">
                      Validasi Lokasi (GPS)
                    </h4>
                  </div>

                  <button
                    onClick={() => requestCurrentLocation()}
                    disabled={locationLoading}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    title="Perbarui GPS"
                  >
                    <RotateCw size={11} className={locationLoading ? "animate-spin" : ""} />
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
                      {isLocationValid ? (
                        <CheckCircle2 size={12} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={12} className="text-rose-600" />
                      )}
                      <span>
                        {isLocationValid ? "DALAM RADIUS (< 2 KM)" : "DI LUAR RADIUS (> 2 KM)"}
                      </span>
                    </span>
                  </div>

                  {/* Interactive Radius Simulation Panel */}
                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Simulasi Radius GPS:
                      </span>
                      <span className="text-[10px] text-cyan-700 font-bold">
                        {customRadiusMeters >= 1000
                          ? `${(customRadiusMeters / 1000).toFixed(2)} km`
                          : `${customRadiusMeters} m`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => applyRadiusPreset("at_pool")}
                        className={`py-1.5 px-2 rounded-xl border font-bold transition text-left flex items-center justify-between cursor-pointer ${
                          radiusSimPreset === "at_pool"
                            ? "bg-cyan-50 border-cyan-400 text-cyan-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        <span>🏊 Kolam</span>
                        <span className="opacity-70">15m</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyRadiusPreset("near_pool")}
                        className={`py-1.5 px-2 rounded-xl border font-bold transition text-left flex items-center justify-between cursor-pointer ${
                          radiusSimPreset === "near_pool"
                            ? "bg-cyan-50 border-cyan-400 text-cyan-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        <span>🎯 Dekat</span>
                        <span className="opacity-70">150m</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyRadiusPreset("radius_limit")}
                        className={`py-1.5 px-2 rounded-xl border font-bold transition text-left flex items-center justify-between cursor-pointer ${
                          radiusSimPreset === "radius_limit"
                            ? "bg-amber-50 border-amber-400 text-amber-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        <span>🚶 Batas</span>
                        <span className="opacity-70">1.8km</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyRadiusPreset("out_of_radius")}
                        className={`py-1.5 px-2 rounded-xl border font-bold transition text-left flex items-center justify-between cursor-pointer ${
                          radiusSimPreset === "out_of_radius"
                            ? "bg-rose-50 border-rose-400 text-rose-700 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        <span>🚫 Luar</span>
                        <span className="opacity-70">3.5km</span>
                      </button>
                    </div>

                    {/* Custom Range Slider */}
                    <div className="pt-1 space-y-1">
                      <input
                        type="range"
                        min="10"
                        max="4500"
                        step="25"
                        value={customRadiusMeters}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          applyRadiusPreset("custom", val);
                        }}
                        className="w-full accent-cyan-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>10m (Di Kolam)</span>
                        <span>2.0km (Batas Maks)</span>
                        <span>4.5km (Luar)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD B: TIME WINDOW STATUS */}
              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-blue-600" />
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
                      className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 ${
                        timeStatus.statusBadge === "ready"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : timeStatus.statusBadge === "late"
                          ? "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {timeStatus.statusBadge === "ready" ? (
                        <>
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>SIAP PRESENSI (TEPAT WAKTU)</span>
                        </>
                      ) : timeStatus.statusBadge === "late" ? (
                        <>
                          <AlertTriangle size={11} className="text-amber-600" />
                          <span>TERLAMBAT (+{timeStatus.minutesPastStart} MNT)</span>
                        </>
                      ) : (
                        <>
                          <Clock size={11} className="text-slate-500" />
                          <span>BELUM DIBUKA</span>
                        </>
                      )}
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
                      <Award size={20} />
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
                      <Check size={13} />
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
                          <AlertTriangle size={14} className="text-amber-600" />
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
                      <Clock size={16} />
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
                      Presensi Siswa / Peserta Les ({enrolledStudents.length})
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Tandai status kehadiran setiap murid yang hadir pada sesi ini
                    </p>
                  </div>
                </div>

                {enrolledStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    Tidak ada siswa yang terdaftar pada sesi jadwal ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {enrolledStudents.map((student) => {
                      const currentStatus = studentStatusMap[student.id] || "Hadir";
                      const checkedIn = isStudentCheckedIn(student.id);

                      return (
                        <div
                          key={student.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-white font-black text-xs shrink-0">
                              <User size={16} />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 capitalize">
                                {student.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold">
                                Kelas: {student.class} • Wali: {student.parent || "-"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                              {(["Hadir", "Sakit", "Izin", "Alpa"] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStudentStatusChange(student.id, st)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                    currentStatus === st
                                      ? st === "Hadir"
                                        ? "bg-emerald-600 text-white shadow-2xs"
                                        : st === "Sakit"
                                        ? "bg-blue-600 text-white shadow-2xs"
                                        : st === "Izin"
                                        ? "bg-amber-500 text-white shadow-2xs"
                                        : "bg-rose-600 text-white shadow-2xs"
                                      : "text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              disabled={studentCheckInLoading[student.id]}
                              onClick={() => handleStudentCheckIn(student.id, student.name)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 ${
                                checkedIn
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                            >
                              {studentCheckInLoading[student.id]
                                ? "Menyimpan..."
                                : checkedIn
                                ? "Perbarui"
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
              <span className="absolute left-3 top-3 text-slate-400 flex items-center">
                <Search size={14} />
              </span>
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
                <ClipboardList size={38} className="text-slate-300 mx-auto" />
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
                          {isCoach ? <Award size={16} /> : <User size={16} />}
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
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            isLate
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : att.status === "Hadir"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : att.status === "Izin"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isLate ? (
                            <>
                              <AlertTriangle size={11} className="text-amber-700" />
                              <span>Terlambat</span>
                            </>
                          ) : (
                            att.status
                          )}
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
                        <span className="flex items-center gap-0.5">
                          <MapPin size={10} /> Jarak GPS: {att.distance_km} km
                        </span>
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check size={11} /> Valid
                        </span>
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
                        <span className="font-bold text-slate-800">Catatan / Evaluasi: </span>
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
                  <AlertTriangle size={15} className="text-amber-600" />
                  <span>Konfirmasi Keterlambatan Pelatih</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Presensi melewati batas 15 menit setelah sesi dimulai
                </p>
              </div>
              <button
                onClick={() => setShowCoachLateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                <X size={16} />
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
