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
  onSwitchToHistory?: () => void;
}

export default function StudentCameraPresensi({
  student,
  coach,
  schedules,
  attendances = [],
  onCheckInAttendance,
  onRefresh,
  onSwitchToHistory,
}: StudentCameraPresensiProps) {
  // 1. Current Date & Time String
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayISO = `${y}-${m}-${d}`;

  // 2. Find student's active schedule today or closest upcoming
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

  const activeSchedule: ScheduleSession | null = useMemo(() => {
    if (todayStudentSchedules.length > 0) {
      return todayStudentSchedules[0];
    }
    // Fallback to nearest upcoming
    const upcoming = studentSchedules
      .filter((s) => s.date >= todayISO)
      .sort((a, b) => (a.date + a.timeStart).localeCompare(b.date + b.timeStart));
    return upcoming[0] || studentSchedules[0] || null;
  }, [todayStudentSchedules, studentSchedules, todayISO]);

  // 3. Pool Geofence & Location
  const targetPoolInfo = useMemo(() => {
    const poolName = activeSchedule?.poolArea || "Nalendra";
    return getPoolCoordinates(poolName);
  }, [activeSchedule]);

  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [useSimulatedPoolLocation, setUseSimulatedPoolLocation] = useState(false);

  // 4. Camera Stream & Snapshot
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState("");
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [flashScreenEffect, setFlashScreenEffect] = useState(false);

  // 5. Submission & Late Reason Dialog
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLateReasonModal, setShowLateReasonModal] = useState(false);
  const [lateReason, setLateReason] = useState("");
  const [successCelebration, setSuccessCelebration] = useState(false);

  // 6. Live Clock formatted
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeFormatted(
        now.toLocaleTimeString("id-ID", {
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

  // 7. Request Device GPS
  const requestDeviceLocation = useCallback(() => {
    if (useSimulatedPoolLocation) return;
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
        setLocationError("Gagal mengambil GPS. Menggunakan estimasi area kolam.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  }, [useSimulatedPoolLocation]);

  useEffect(() => {
    if (useSimulatedPoolLocation) {
      setCurrentLat(targetPoolInfo.latitude + 0.0001);
      setCurrentLon(targetPoolInfo.longitude + 0.0001);
    } else {
      requestDeviceLocation();
    }
  }, [useSimulatedPoolLocation, targetPoolInfo, requestDeviceLocation]);

  // 8. Distance & Radius Calculation
  const distanceKm = useMemo(() => {
    if (currentLat === null || currentLon === null) return null;
    return calculateDistanceKm(
      currentLat,
      currentLon,
      targetPoolInfo.latitude,
      targetPoolInfo.longitude
    );
  }, [currentLat, currentLon, targetPoolInfo]);

  const distanceMeters = distanceKm !== null ? Math.round(distanceKm * 1000) : 0;
  const isLocationValid = useSimulatedPoolLocation || (distanceKm !== null && distanceKm <= 2.0);

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

  // 11. Initialize Camera
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
    if (!activeSchedule) return;

    if (!isLocationValid) {
      alert(
        `⚠️ PRESENSI DITOLAK (DI LUAR RADIUS KOLAM)!\n\nJarak Anda saat ini: ${
          distanceMeters >= 1000 ? `${distanceKm?.toFixed(2)} km` : `${distanceMeters} meter`
        } dari ${targetPoolInfo.name}.\n\nPresensi wajib berada dalam radius maksimal 2.0 km dari kolam renang.`
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
          notes: `Presensi Masuk Kamera Siswa (${distanceMeters}m dari ${targetPoolInfo.name})`,
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
    <div className="-mt-10 relative z-10 space-y-4 animate-fadeIn">
      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="user"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* ==========================================
          HEADER CARD: ACTIVE SESSION & STATUS
          ========================================== */}
      <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>Presensi Kamera Siswa</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-black border border-cyan-100">
                  Live GPS
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Ambil foto selfie di kolam renang untuk verifikasi kehadiran
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestDeviceLocation}
            disabled={isLocating}
            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200/80 cursor-pointer active:scale-95"
            title="Perbarui GPS Lokasi"
          >
            <RotateCw size={12} className={isLocating ? "animate-spin text-blue-600" : "text-slate-500"} />
            <span>{isLocating ? "Mencari GPS..." : "Refresh GPS"}</span>
          </button>
        </div>

        {/* Schedule Info Box */}
        {activeSchedule ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/70 to-cyan-50/40 border border-blue-100 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-black text-[10px]">
                    {activeSchedule.class || student.class} Class
                  </span>
                  <span className="text-xs font-black text-slate-900">
                    {activeSchedule.title}
                  </span>
                </div>
                <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                  <Clock size={13} className="text-blue-600 shrink-0" />
                  <span className="font-bold">{activeSchedule.timeStart} - {activeSchedule.timeEnd} WIB</span>
                  <span className="text-slate-400">({activeSchedule.date || "Hari Ini"})</span>
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                  <MapPin size={13} className="text-rose-500 shrink-0" />
                  <span>{activeSchedule.poolArea}</span>
                  <span className="text-slate-300">•</span>
                  <User size={13} className="text-slate-400 shrink-0" />
                  <span>Pelatih: {activeSchedule.coachName || coach.name}</span>
                </p>
              </div>

              {isAlreadyCheckedIn ? (
                <span className={`px-3 py-1.5 rounded-full text-xs font-black border shrink-0 ${
                  existingAttendance?.status === "Terlambat"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {existingAttendance?.status === "Terlambat" ? "✓ Hadir (Terlambat)" : "✓ Hadir Tepat Waktu"}
                </span>
              ) : (
                <span className={`px-3 py-1.5 rounded-full text-xs font-black border shrink-0 ${
                  !timeStatus.isOpen
                    ? "bg-slate-100 text-slate-600 border-slate-200"
                    : timeStatus.isLate
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                }`}>
                  {!timeStatus.isOpen
                    ? `Buka: ${timeStatus.openTimeString} WIB`
                    : timeStatus.isLate
                    ? "Terlambat (> 15m)"
                    : "Bisa Presensi"}
                </span>
              )}
            </div>

            {/* GPS & Distance Radius Simulator Pill */}
            <div className="pt-2 border-t border-blue-100/60 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    isLocationValid ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                  }`}
                />
                <span className="text-slate-600 font-medium">
                  Jarak GPS:{" "}
                  <strong className={isLocationValid ? "text-emerald-700" : "text-rose-600"}>
                    {distanceKm !== null ? `${distanceKm.toFixed(2)} km` : "Mencari GPS..."}
                  </strong>{" "}
                  (Maks. 2.0 km)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setUseSimulatedPoolLocation(!useSimulatedPoolLocation)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                  useSimulatedPoolLocation
                    ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                {useSimulatedPoolLocation ? "✓ Simulasi Radius Aktif (< 2.0 km)" : "Mode Simulasi Kolam"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-slate-100">
            Tidak ada jadwal latihan yang aktif untuk presensi saat ini.
          </div>
        )}
      </div>

      {/* ==========================================
          LIVE CAMERA PREVIEW / CAPTURED PHOTO BOX
          ========================================== */}
      {activeSchedule && !isAlreadyCheckedIn && (
        <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
          <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center">
            {/* Flash screen effect */}
            {flashScreenEffect && (
              <div className="absolute inset-0 bg-white z-50 animate-fadeOut pointer-events-none" />
            )}

            {capturedPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturedPhotoUrl}
                alt="Captured Snapshot"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    cameraFacing === "user" ? "scale-x-[-1]" : ""
                  }`}
                />
                {cameraError && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-900/90 text-white space-y-3 z-20">
                    <Camera size={36} className="text-rose-400" />
                    <p className="text-xs text-rose-200 max-w-xs">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5"
                    >
                      <UploadCloud size={14} />
                      <span>Upload Foto dari Galeri</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Live Watermark Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white z-30 pointer-events-none flex items-end justify-between text-[10px]">
              <div className="space-y-0.5 font-mono drop-shadow">
                <p className="font-bold text-white text-xs">{student.name}</p>
                <p className="text-cyan-300 font-semibold">{activeSchedule.poolArea} • {activeSchedule.class}</p>
                <p className="text-slate-300">{currentTimeFormatted}</p>
              </div>

              <div className="text-right font-mono drop-shadow">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[9px] ${
                    isLocationValid ? "bg-emerald-500/80 text-white" : "bg-rose-500/80 text-white"
                  }`}
                >
                  <MapPin size={10} />
                  <span>{isLocationValid ? "Dalam Radius Kolam" : "Luar Radius"}</span>
                </span>
              </div>
            </div>

            {/* Top Camera Controls Overlay */}
            {!capturedPhotoUrl && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={flipCamera}
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-xs transition cursor-pointer border border-white/20 active:scale-95"
                  title="Putar Kamera Depan/Belakang"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Shutter / Action Row */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {capturedPhotoUrl ? (
              <div className="w-full flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCapturedPhotoUrl(null)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCw size={14} />
                  <span>Foto Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={() => submitPresensiMasuk()}
                  disabled={isSubmitting}
                  className="flex-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw size={14} className="animate-spin" />
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
            ) : (
              <div className="w-full flex flex-col items-center space-y-3">
                <button
                  type="button"
                  onClick={handleShutterPress}
                  disabled={isSubmitting || !timeStatus.isOpen}
                  className={`w-full py-4 rounded-2xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-98 ${
                    !timeStatus.isOpen
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                      : timeStatus.isLate
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25"
                      : "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-blue-600/30"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw size={16} className="animate-spin" />
                      <span>Memproses Presensi...</span>
                    </>
                  ) : !timeStatus.isOpen ? (
                    <>
                      <Clock size={16} />
                      <span>Presensi Belum Dibuka (Buka: {timeStatus.openTimeString} WIB)</span>
                    </>
                  ) : timeStatus.isLate ? (
                    <>
                      <Camera size={16} />
                      <span>Ambil Foto & Presensi Terlambat</span>
                    </>
                  ) : (
                    <>
                      <Camera size={16} />
                      <span>Ambil Foto & Presensi Siswa Hadir</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-slate-500 hover:text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <UploadCloud size={13} />
                  <span>Atau upload foto langsung dari perangkat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          VERIFIED ATTENDANCE CONFIRMATION CARD
          ========================================== */}
      {isAlreadyCheckedIn && (
        <div className="p-6 rounded-3xl bg-white border border-emerald-100 shadow-xl shadow-emerald-500/10 space-y-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm shrink-0">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                {existingAttendance?.status === "Terlambat" ? "Terlambat" : "Tepat Waktu"}
              </span>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                Presensi Siswa Berhasil Diverifikasi!
              </h3>
              <p className="text-xs text-slate-500">
                Kehadiran <strong>{student.name}</strong> telah tercatat pada sistem GIM Swimming.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span>Waktu Presensi:</span>
              <strong className="text-slate-900">
                {existingAttendance?.created_at
                  ? new Date(existingAttendance.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Hari Ini"}{" "}
                WIB
              </strong>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Lokasi Kolam:</span>
              <strong className="text-slate-900">{activeSchedule?.poolArea || "Nalendra"}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Pelatih Pendamping:</span>
              <strong className="text-slate-900">{activeSchedule?.coachName || coach.name}</strong>
            </div>
          </div>

          {existingAttendance?.photo && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Foto Selfie Presensi:</p>
              <div className="w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingAttendance.photo}
                  alt="Selfie Presensi"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          LATE REASON MODAL DIALOG
          ========================================== */}
      {showLateReasonModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setShowLateReasonModal(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-black text-slate-900">
                  Konfirmasi Keterlambatan Siswa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLateReasonModal(false)}
                className="h-7 w-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Waktu presensi telah melebihi toleransi 15 menit dari jam mulai latihan (<strong>{activeSchedule?.timeStart} WIB</strong>). Mohon isi alasan keterlambatan:
            </p>

            <div className="space-y-2">
              {[
                "Terjebak macet di perjalanan",
                "Ada kendala di sekolah/les",
                "Persiapan pakaian renang memakan waktu",
                "Lainnya",
              ].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLateReason(opt)}
                  className={`w-full p-2.5 rounded-xl border text-xs text-left font-semibold transition cursor-pointer ${
                    lateReason === opt
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt}
                </button>
              ))}

              <input
                type="text"
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder="Atau tulis alasan lainnya di sini..."
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition"
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

      {/* ==========================================
          RIWAYAT PRESENSI SISWA
          ========================================== */}
      <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                Riwayat Presensi Siswa
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">
                Histori catatan kehadiran yang tervalidasi
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black">
            {(student.logs || []).length} Sesi
          </span>
        </div>

        {(!student.logs || student.logs.length === 0) ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            Belum ada catatan presensi tervalidasi untuk siswa ini.
          </div>
        ) : (
          <div className="space-y-2.5">
            {student.logs.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-blue-100 transition flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900">
                      Pertemuan #{idx + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        (item.status as string) === "Terlambat"
                          ? "bg-amber-100 text-amber-800"
                          : item.status === "Hadir"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {item.date} • {student.class} Class
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  Status: {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
