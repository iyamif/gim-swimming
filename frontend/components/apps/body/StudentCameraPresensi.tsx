"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ScheduleSession, Coach, Student, AttendanceRecord } from "../types";
import {
  calculateDistanceKm,
  getPoolCoordinates,
  checkAttendanceTimeStatus,
} from "../../../lib/api";
import {
  Camera,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  RefreshCw,
  X,
  User,
  Zap,
  Sparkles,
  Award,
  FileText,
  UploadCloud,
  Check,
  ArrowLeft,
  Sliders,
  Waves,
  Calendar,
  CalendarDays,
  ChevronRight,
  Info,
  Navigation,
} from "lucide-react";

interface StudentCameraPresensiProps {
  student: Student;
  coach: Coach;
  schedules: ScheduleSession[];
  attendances?: AttendanceRecord[];
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
    photo?: string;
  }) => Promise<boolean | void>;
  onRefresh?: () => void | Promise<void>;
  onClose?: () => void;
  onViewSchedule?: () => void;
}

type RadiusPreset = "device" | "at_pool" | "near_pool" | "radius_limit" | "out_of_radius";

export default function StudentCameraPresensi({
  student,
  coach,
  schedules,
  attendances = [],
  onCheckInAttendance,
  onRefresh,
  onClose,
  onViewSchedule,
}: StudentCameraPresensiProps) {
  // 1. Current Date & Time ISO
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayISO = `${y}-${m}-${d}`;

  const dayNamesFull = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const todayFormatted = `${dayNamesFull[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  // 2. Filter schedules for this student
  const studentSchedules = useMemo(() => {
    const sName = (student.name || "").toLowerCase().trim();
    const sId = String(student.id || "");
    return (schedules || []).filter((s) => {
      const matchId = (s.studentIds || []).some((id) => String(id) === sId);
      const matchName = (s.studentNames || []).some((name) =>
        (name || "").toLowerCase().trim().includes(sName) || sName.includes((name || "").toLowerCase().trim())
      );
      return matchId || matchName;
    });
  }, [schedules, student]);

  const todayStudentSchedules = useMemo(() => {
    return studentSchedules.filter((s) => s.date === todayISO);
  }, [studentSchedules, todayISO]);

  const hasScheduleToday = todayStudentSchedules.length > 0;

  // Upcoming schedules (future dates)
  const upcomingSchedules = useMemo(() => {
    return studentSchedules
      .filter((s) => s.date > todayISO)
      .sort((a, b) => (a.date + a.timeStart).localeCompare(b.date + b.timeStart));
  }, [studentSchedules, todayISO]);

  const nextUpcomingSchedule = upcomingSchedules[0] || null;

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");

  const activeSchedule: ScheduleSession | null = useMemo(() => {
    if (selectedScheduleId) {
      const found = studentSchedules.find((s) => s.id === selectedScheduleId);
      if (found) return found;
    }
    if (todayStudentSchedules.length > 0) {
      return todayStudentSchedules[0];
    }
    return nextUpcomingSchedule || studentSchedules[0] || null;
  }, [selectedScheduleId, todayStudentSchedules, nextUpcomingSchedule, studentSchedules]);

  // 3. Pool Geofence & Location Coordinates
  const targetPoolInfo = useMemo(() => {
    const poolName = activeSchedule?.poolArea || "Nalendra";
    return getPoolCoordinates(poolName);
  }, [activeSchedule]);

  // Radius Simulation Presets (Default to "at_pool" 15m so users can test attendance easily)
  const [radiusPreset, setRadiusPreset] = useState<RadiusPreset>("at_pool");
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [showGpsDrawer, setShowGpsDrawer] = useState(false);
  const [showScheduleSelector, setShowScheduleSelector] = useState(false);

  // 4. Request Real Device GPS
  const requestDeviceLocation = useCallback(() => {
    setIsLocating(true);
    setLocationError("");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation tidak didukung pada perangkat ini.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLat(pos.coords.latitude);
        setCurrentLon(pos.coords.longitude);
        setIsLocating(false);
      },
      (err) => {
        console.warn("GPS Location error:", err);
        setLocationError("Gagal mengambil GPS asli. Menggunakan estimasi kolam.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  }, []);

  // Apply Radius Preset
  const applyRadiusPreset = useCallback((preset: RadiusPreset) => {
    setRadiusPreset(preset);
    if (preset === "device") {
      requestDeviceLocation();
    } else if (preset === "at_pool") {
      // 15 meters from pool
      setCurrentLat(targetPoolInfo.latitude + 0.0001);
      setCurrentLon(targetPoolInfo.longitude + 0.0001);
    } else if (preset === "near_pool") {
      // 150 meters from pool
      setCurrentLat(targetPoolInfo.latitude + 0.0013);
      setCurrentLon(targetPoolInfo.longitude + 0.0013);
    } else if (preset === "radius_limit") {
      // 1.8 km from pool
      setCurrentLat(targetPoolInfo.latitude + 0.015);
      setCurrentLon(targetPoolInfo.longitude + 0.015);
    } else if (preset === "out_of_radius") {
      // 3.5 km from pool (out of radius)
      setCurrentLat(targetPoolInfo.latitude + 0.035);
      setCurrentLon(targetPoolInfo.longitude + 0.035);
    }
  }, [targetPoolInfo, requestDeviceLocation]);

  useEffect(() => {
    applyRadiusPreset(radiusPreset);
  }, [radiusPreset, targetPoolInfo, applyRadiusPreset]);

  // 5. Calculate Distance to Pool
  const distanceKm = useMemo(() => {
    if (currentLat === null || currentLon === null) return 0.015;
    return calculateDistanceKm(
      currentLat,
      currentLon,
      targetPoolInfo.latitude,
      targetPoolInfo.longitude
    );
  }, [currentLat, currentLon, targetPoolInfo]);

  const distanceMeters = Math.round(distanceKm * 1000);
  const isLocationValid = distanceKm <= 2.0;

  // 6. Camera Stream & Snapshot
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState("");
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [flashScreenEffect, setFlashScreenEffect] = useState(false);

  // 7. Submission & Late Reason Dialog
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLateReasonModal, setShowLateReasonModal] = useState(false);
  const [lateReason, setLateReason] = useState("");
  const [successCelebration, setSuccessCelebration] = useState(false);

  // 8. Live Clock formatted
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const n = new Date();
      setCurrentTimeFormatted(
        n.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 9. Time Status (Schedule open / late)
  const timeStatus = useMemo(() => {
    if (!activeSchedule) {
      return { isOpen: true, isLate: false, openTimeString: "", remainingMinutes: 0 };
    }
    return checkAttendanceTimeStatus(
      activeSchedule.date || todayISO,
      activeSchedule.timeStart
    );
  }, [activeSchedule, todayISO]);

  // 10. Check if already checked in today
  const existingAttendance = useMemo(() => {
    if (!activeSchedule) return null;
    return (
      (attendances || []).find(
        (a) =>
          a.person_type === "student" &&
          (String(a.person_id) === String(student.id) ||
            a.person_name.toLowerCase().trim() === student.name.toLowerCase().trim()) &&
          ((a.schedule_id && String(a.schedule_id) === String(activeSchedule.id)) ||
            a.date === (activeSchedule.date || todayISO))
      ) || null
    );
  }, [attendances, activeSchedule, student, todayISO]);

  const isAlreadyCheckedIn = Boolean(existingAttendance);

  // 11. Initialize Camera Stream
  const initCamera = useCallback(async (facing: "user" | "environment") => {
    setCameraError("");
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Kamera live tidak didukung pada browser ini. Silakan gunakan tombol upload foto.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn("Video play error:", e));
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setCameraError("Akses kamera tidak diizinkan atau sedang digunakan aplikasi lain.");
    }
  }, [cameraStream]);

  useEffect(() => {
    initCamera(cameraFacing);
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraFacing]);

  const flipCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

  const toggleFlash = () => {
    setIsFlashActive((prev) => !prev);
  };

  // Take Snapshot from live camera
  const takeSnapshot = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (cameraFacing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  // Handle Photo Upload from file
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedPhotoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Handle Shutter Press
  const handleShutterPress = () => {
    if (!hasScheduleToday || !activeSchedule) {
      alert(
        `⚠️ TIDAK ADA JADWAL HARI INI!\n\nTidak ada sesi latihan renang yang terjadwal untuk ${student.name} pada hari ini (${todayFormatted}).\n\nPresensi hanya dapat dilakukan ketika siswa memiliki jadwal aktif hari ini.`
      );
      return;
    }

    if (!isLocationValid) {
      alert(
        `⚠️ PRESENSI DITOLAK (DI LUAR RADIUS KOLAM)!\n\nJarak saat ini: ${
          distanceMeters >= 1000 ? `${distanceKm.toFixed(2)} km` : `${distanceMeters} meter`
        } dari ${targetPoolInfo.name}.\n\nPresensi wajib berada dalam radius maksimal 2.0 km dari kolam renang.\n\nGunakan opsi "Simulasi Radius" di bawah untuk mencoba absensi.`
      );
      return;
    }

    setFlashScreenEffect(true);
    setTimeout(() => setFlashScreenEffect(false), 200);

    const snapshot = takeSnapshot();
    if (snapshot) {
      setCapturedPhotoUrl(snapshot);
    }

    if (isAlreadyCheckedIn) {
      alert("Siswa sudah melakukan Presensi Masuk untuk sesi ini.");
      return;
    }

    if (timeStatus.isLate && !lateReason.trim()) {
      setShowLateReasonModal(true);
      return;
    }

    submitPresensiMasuk(undefined, snapshot || undefined);
  };

  // Submit Check In Attendance
  const submitPresensiMasuk = async (reasonOverride?: string, snapshotOverride?: string) => {
    if (!activeSchedule) return;

    setIsSubmitting(true);
    try {
      const photoToSend = snapshotOverride || capturedPhotoUrl || undefined;
      if (onCheckInAttendance) {
        await onCheckInAttendance({
          schedule_id: activeSchedule.id,
          person_type: "student",
          person_id: String(student.id || "student_1"),
          person_name: student.name || "Siswa GIM",
          status: timeStatus.isLate ? "Terlambat" : "Hadir",
          late_reason: reasonOverride || lateReason || (timeStatus.isLate ? "Hadir sesi latihan" : undefined),
          latitude: currentLat || targetPoolInfo.latitude,
          longitude: currentLon || targetPoolInfo.longitude,
          notes: `Presensi Siswa (${distanceMeters}m dari ${targetPoolInfo.name} • ${radiusPreset})`,
          photo: photoToSend,
        });
      }

      setSuccessCelebration(true);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      console.warn("Submit attendance error:", err);
      alert(err.message || "Gagal mengirim presensi siswa.");
    } finally {
      setIsSubmitting(false);
      setShowLateReasonModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] w-full h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans animate-fadeIn">
      {/* Hidden Canvas & Upload */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="user"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Screen Flash Shutter Effect */}
      {flashScreenEffect && (
        <div className="absolute inset-0 bg-white z-[90] animate-fadeOut pointer-events-none" />
      )}

      {/* Torch Simulated Screen Light */}
      {isFlashActive && (
        <div className="absolute inset-0 bg-white/25 pointer-events-none z-10" />
      )}

      {/* =========================================================================
          LIVE CAMERA VIEWFINDER (FULLSCREEN IMMERSIVE)
          ========================================================================= */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-950 flex items-center justify-center">
        {capturedPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedPhotoUrl}
            alt="Captured Selfie"
            className="w-full h-full object-cover"
          />
        ) : cameraError ? (
          <div className="text-center px-6 max-w-sm space-y-4 z-10">
            <div className="h-20 w-20 rounded-full bg-slate-800/80 border border-white/20 flex items-center justify-center mx-auto text-slate-400 shadow-xl">
              <Camera size={36} />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">Kamera Tidak Aktif</p>
              <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => initCamera(cameraFacing)}
                className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5 mx-auto"
              >
                <RotateCw size={14} />
                <span>Buka Kamera Lagi</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto border border-white/10"
              >
                <UploadCloud size={14} />
                <span>Upload Foto dari Galeri</span>
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              cameraFacing === "user" ? "scale-x-[-1]" : ""
            }`}
          />
        )}
      </div>

      {/* Top & Bottom Cinematic Gradient Shadows */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-black/90 via-black/45 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />

      {/* =========================================================================
          TOP FLOATING APP BAR
          ========================================================================= */}
      <div className="relative z-20 w-full max-w-md mx-auto pt-[max(0.75rem,env(safe-area-inset-top))] px-4 space-y-2">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white transition active:scale-90 cursor-pointer shadow-lg"
              title="Kembali ke Dashboard Siswa"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white drop-shadow-md">
                  Presensi Siswa
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                    !hasScheduleToday
                      ? "bg-slate-700/60 text-slate-300 border-slate-600"
                      : isLocationValid
                      ? "bg-emerald-500/40 text-emerald-200 border-emerald-400/50"
                      : "bg-rose-500/40 text-rose-200 border-rose-400/50"
                  }`}
                >
                  {!hasScheduleToday ? "Tidak Ada Sesi" : isLocationValid ? "Radius Valid" : "Di Luar Radius"}
                </span>
              </div>
              <p className="text-[10px] text-cyan-200 font-semibold drop-shadow-sm flex items-center gap-1 mt-0.5 font-mono">
                <Clock size={11} /> {currentTimeFormatted}
              </p>
            </div>
          </div>

          {/* Quick Flip Camera Button */}
          <button
            type="button"
            onClick={flipCamera}
            className="h-9 w-9 rounded-2xl bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg"
            title="Putar Kamera Depan/Belakang"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Floating Active Schedule Capsule */}
        <div className="rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/15 p-2.5 shadow-xl flex items-center justify-between gap-2">
          {hasScheduleToday && activeSchedule ? (
            <button
              type="button"
              onClick={() => {
                if (todayStudentSchedules.length > 1) setShowScheduleSelector(true);
              }}
              className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-90 transition cursor-pointer"
            >
              <div className="h-8 w-8 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0">
                <Waves size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-white truncate leading-tight flex items-center gap-1.5">
                  <span>{activeSchedule.title || `${activeSchedule.class} Class`}</span>
                  {todayStudentSchedules.length > 1 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
                      Ganti Sesi ▾
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-cyan-200 truncate mt-0.5">
                  {activeSchedule.timeStart} - {activeSchedule.timeEnd} WIB • {activeSchedule.poolArea || targetPoolInfo.name} • Pelatih: {activeSchedule.coachName || coach.name}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
              <div className="h-8 w-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center shrink-0">
                <Waves size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-amber-300 truncate leading-tight">
                  Saat ini tidak ada sesi latihan
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {nextUpcomingSchedule
                    ? `Sesi Berikutnya: ${nextUpcomingSchedule.date} (${nextUpcomingSchedule.timeStart} WIB)`
                    : "Tidak ada jadwal kelas renang terdaftar hari ini"}
                </p>
              </div>
            </div>
          )}

          {isAlreadyCheckedIn ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[10px] font-black shrink-0">
              ✓ Hadir
            </span>
          ) : !hasScheduleToday ? (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-black shrink-0">
              Jadwal Kosong
            </span>
          ) : (
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 border ${
                !timeStatus.isOpen
                  ? "bg-slate-800 text-slate-400 border-slate-700"
                  : timeStatus.isLate
                  ? "bg-amber-500/30 text-amber-300 border-amber-400/40"
                  : "bg-emerald-500/30 text-emerald-300 border-emerald-400/40"
              }`}
            >
              {!timeStatus.isOpen ? `Buka: ${timeStatus.openTimeString}` : timeStatus.isLate ? "Terlambat" : "Bisa Presensi"}
            </span>
          )}
        </div>
      </div>

      {/* =========================================================================
          LIVE WATERMARK OVERLAY (BOTTOM LEFT OVER VIDEO)
          ========================================================================= */}
      <div className="relative z-20 w-full max-w-md mx-auto px-4 pb-2">
        <div className="flex items-end justify-between gap-2 text-[10px] font-mono drop-shadow-md">
          <div className="space-y-0.5 bg-black/40 backdrop-blur-xs p-2 rounded-2xl border border-white/10">
            <p className="font-bold text-white text-xs tracking-tight">{student.name}</p>
            <p className="text-cyan-300 font-semibold">{activeSchedule?.poolArea || targetPoolInfo.name} • {activeSchedule?.class || student.class} Class</p>
            <p className="text-slate-300">{currentTimeFormatted}</p>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-tight shadow-md border ${
              !hasScheduleToday
                ? "bg-slate-800/80 text-slate-300 border-slate-700"
                : isLocationValid
                ? "bg-emerald-500/80 text-white border-emerald-400/50"
                : "bg-rose-500/80 text-white border-rose-400/50"
            }`}
          >
            <MapPin size={10} />
            <span>{!hasScheduleToday ? "Jadwal Tidak Aktif" : isLocationValid ? `Dalam Radius (${distanceMeters}m)` : `Di Luar Radius (${distanceMeters}m)`}</span>
          </span>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM CONTROL BAR: SHUTTER / CONFIRMATION & SMALL TESTING RADIUS TEXT
          ========================================================================= */}
      <div className="relative z-20 w-full max-w-md mx-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4 space-y-2.5">
        {isAlreadyCheckedIn ? (
          <div className="p-4 rounded-3xl bg-slate-900/90 backdrop-blur-md border border-emerald-400/30 text-center space-y-2 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-sm">
              <CheckCircle2 size={20} />
              <span>Presensi Siswa Sudah Diverifikasi</span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">
              Kehadiran <strong>{student.name}</strong> pada sesi ini telah tercatat di sistem pada pukul{" "}
              <strong>
                {existingAttendance?.created_at
                  ? new Date(existingAttendance.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Hari Ini"}{" "}
                WIB
              </strong>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer border border-white/15"
            >
              Kembali ke Menu Utama
            </button>
          </div>
        ) : capturedPhotoUrl ? (
          <div className="space-y-2 animate-fadeIn">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCapturedPhotoUrl(null)}
                className="flex-1 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <RotateCw size={14} />
                <span>Foto Ulang</span>
              </button>

              <button
                type="button"
                onClick={() => submitPresensiMasuk()}
                disabled={isSubmitting}
                className="flex-2 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-black shadow-lg shadow-blue-500/40 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw size={15} className="animate-spin" />
                    <span>Menyimpan Presensi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Kirim Presensi Sekarang</span>
                  </>
                )}
              </button>
            </div>

            {/* Small text for simulation radius testing */}
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={() => setShowGpsDrawer(true)}
                className="text-[10px] text-slate-400 hover:text-cyan-300 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer transition opacity-75 hover:opacity-100"
              >
                <span>⚙️ Simulasi: {radiusPreset === "at_pool" ? "Di Kolam (15m)" : radiusPreset === "near_pool" ? "Dekat (150m)" : radiusPreset === "radius_limit" ? "Batas (1.8km)" : radiusPreset === "out_of_radius" ? "Di Luar (3.5km)" : "GPS Asli"} (Ubah)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            {/* Big Circular Camera Shutter Button */}
            <div className="flex items-center justify-around w-full px-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!hasScheduleToday}
                className="h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition cursor-pointer active:scale-90 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                title="Upload Foto Galeri"
              >
                <UploadCloud size={20} />
              </button>

              <button
                type="button"
                onClick={handleShutterPress}
                disabled={!hasScheduleToday || isSubmitting || !timeStatus.isOpen}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white shadow-2xl transition-transform duration-150 active:scale-90 cursor-pointer ${
                  !hasScheduleToday
                    ? "bg-slate-700/80 opacity-60 cursor-not-allowed border-slate-500"
                    : !timeStatus.isOpen
                    ? "bg-slate-700 opacity-60 cursor-not-allowed"
                    : !isLocationValid
                    ? "bg-rose-600 shadow-rose-500/50"
                    : timeStatus.isLate
                    ? "bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/50"
                    : "bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 shadow-cyan-500/50"
                }`}
                title={!hasScheduleToday ? "Tidak ada jadwal latihan hari ini" : "Tekan untuk Ambil Foto & Presensi"}
              >
                <Camera size={32} className="text-white" />
              </button>

              <button
                type="button"
                onClick={toggleFlash}
                className={`h-12 w-12 rounded-full backdrop-blur-md border flex items-center justify-center transition cursor-pointer active:scale-90 shadow-lg ${
                  isFlashActive
                    ? "bg-amber-500/80 text-white border-amber-400"
                    : "bg-black/40 hover:bg-black/60 border-white/20 text-white"
                }`}
                title="Lampu Kilat / Screen Flash"
              >
                <Zap size={20} />
              </button>
            </div>

            <p className="text-[11px] text-slate-300 font-medium text-center drop-shadow-md">
              {!hasScheduleToday ? (
                <span className="text-amber-300 font-bold">⚠️ Saat ini tidak ada sesi latihan renang yang terjadwal untuk hari ini.</span>
              ) : !isLocationValid ? (
                <span className="text-rose-300 font-bold">⚠️ Di luar radius kolam ({distanceMeters}m).</span>
              ) : timeStatus.isLate ? (
                "⚠️ Waktu Latihan Telah Dimulai (Presensi Terlambat)"
              ) : (
                "Ketuk tombol kamera di atas untuk ambil foto & verifikasi kehadiran"
              )}
            </p>

            {/* Small text for simulation radius testing (Unobtrusive & Easy to remove later) */}
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={() => setShowGpsDrawer(true)}
                className="text-[10px] text-slate-400/90 hover:text-cyan-300 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer transition opacity-75 hover:opacity-100"
              >
                <span>⚙️ Simulasi: {radiusPreset === "at_pool" ? "Di Kolam (15m)" : radiusPreset === "near_pool" ? "Dekat (150m)" : radiusPreset === "radius_limit" ? "Batas (1.8km)" : radiusPreset === "out_of_radius" ? "Di Luar (3.5km)" : "GPS Asli"} (Klik untuk ubah)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: COMPACT RADIUS SIMULATION PRESETS
          ========================================================================= */}
      {showGpsDrawer && (
        <div className="fixed inset-0 z-[1150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-cyan-400/30 rounded-3xl p-5 space-y-3.5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                <Sliders size={14} />
                <span>Pengaturan Simulasi Radius GPS</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsDrawer(false)}
                className="h-7 w-7 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[11px] text-slate-300">
              Pilih jarak koordinat simulasi untuk pengujian presensi kehadiran:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  applyRadiusPreset("at_pool");
                  setShowGpsDrawer(false);
                }}
                className={`p-2.5 rounded-2xl border text-left font-bold text-xs transition cursor-pointer flex items-center justify-between ${
                  radiusPreset === "at_pool"
                    ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                }`}
              >
                <span>🏊 Di Kolam (15m)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300">Valid</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  applyRadiusPreset("near_pool");
                  setShowGpsDrawer(false);
                }}
                className={`p-2.5 rounded-2xl border text-left font-bold text-xs transition cursor-pointer flex items-center justify-between ${
                  radiusPreset === "near_pool"
                    ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                }`}
              >
                <span>🎯 Dekat (150m)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300">Valid</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  applyRadiusPreset("radius_limit");
                  setShowGpsDrawer(false);
                }}
                className={`p-2.5 rounded-2xl border text-left font-bold text-xs transition cursor-pointer flex items-center justify-between ${
                  radiusPreset === "radius_limit"
                    ? "bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/30"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                }`}
              >
                <span>🚶 Batas (1.8km)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300">Valid</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  applyRadiusPreset("out_of_radius");
                  setShowGpsDrawer(false);
                }}
                className={`p-2.5 rounded-2xl border text-left font-bold text-xs transition cursor-pointer flex items-center justify-between ${
                  radiusPreset === "out_of_radius"
                    ? "bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/30"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                }`}
              >
                <span>🚫 Di Luar (3.5km)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300">Tolak</span>
              </button>
            </div>

            {/* GPS Asli */}
            <button
              type="button"
              onClick={() => {
                applyRadiusPreset("device");
                setShowGpsDrawer(false);
              }}
              className={`w-full py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                radiusPreset === "device"
                  ? "bg-cyan-600 text-white border-cyan-400"
                  : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <RotateCw size={13} className={isLocating ? "animate-spin" : ""} />
                <span>Gunakan GPS Asli Perangkat</span>
              </span>
              <span className="text-[10px] text-cyan-300">{isLocating ? "Mencari GPS..." : "Live"}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SCHEDULE SELECTOR (IF MULTIPLE SESSIONS)
          ========================================================================= */}
      {showScheduleSelector && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-white/20 rounded-3xl p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white">Pilih Sesi Latihan Siswa</h3>
              <button
                type="button"
                onClick={() => setShowScheduleSelector(false)}
                className="h-7 w-7 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {todayStudentSchedules.map((sch) => {
                const isSelected = activeSchedule?.id === sch.id;
                return (
                  <button
                    key={sch.id}
                    type="button"
                    onClick={() => {
                      setSelectedScheduleId(sch.id);
                      setShowScheduleSelector(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-600/40 border-blue-400 text-white font-bold"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <p className="text-xs font-black text-white">{sch.title || `${sch.class} Class`}</p>
                    <p className="text-[10px] text-cyan-200 mt-0.5">
                      {sch.date} • {sch.timeStart} - {sch.timeEnd} WIB • {sch.poolArea}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: LATE REASON CONFIRMATION
          ========================================================================= */}
      {showLateReasonModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-amber-400/30 rounded-3xl p-6 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-black text-white">
                  Konfirmasi Keterlambatan Siswa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLateReasonModal(false)}
                className="h-7 w-7 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Presensi dilakukan melewati toleransi 15 menit dari jam mulai latihan (<strong>{activeSchedule?.timeStart} WIB</strong>). Silakan pilih alasan keterlambatan:
            </p>

            <div className="space-y-2">
              {[
                "Terjebak macet di perjalanan",
                "Ada kegiatan sekolah / les sebelumnya",
                "Persiapan pakaian renang memakan waktu",
                "Lainnya",
              ].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLateReason(opt)}
                  className={`w-full p-2.5 rounded-xl border text-xs text-left font-semibold transition cursor-pointer ${
                    lateReason === opt
                      ? "bg-amber-500/30 border-amber-400 text-amber-200 font-bold"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {opt}
                </button>
              ))}

              <input
                type="text"
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder="Atau tulis alasan lainnya..."
                className="w-full h-11 px-3 rounded-xl border border-white/20 bg-white/5 text-xs text-white placeholder-slate-400 outline-none focus:border-amber-400 focus:bg-white/10 transition"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={!lateReason.trim() || isSubmitting}
                onClick={() => submitPresensiMasuk(lateReason)}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-lg shadow-amber-500/25 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Menyimpan..." : "Kirim Presensi Terlambat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CELEBRATION SUCCESS MODAL
          ========================================================================= */}
      {successCelebration && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-emerald-400/50 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-cyan-400 text-white mx-auto shadow-lg shadow-emerald-500/40 animate-bounce">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 font-black uppercase tracking-wider">
                Berhasil Diverifikasi
              </span>
              <h3 className="text-base font-black text-white mt-1">
                Presensi Siswa Berhasil!
              </h3>
              <p className="text-xs text-slate-300">
                Kehadiran <strong>{student.name}</strong> di kolam renang telah tercatat secara live di sistem GIM Swimming.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSuccessCelebration(false);
                if (onClose) onClose();
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-xs shadow-lg shadow-blue-500/30 active:scale-95 transition cursor-pointer"
            >
              Selesai &amp; Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
