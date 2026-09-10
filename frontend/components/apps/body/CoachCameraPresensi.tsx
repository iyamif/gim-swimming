"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ScheduleSession, Coach, AttendanceRecord } from "../types";
import {
  calculateDistanceKm,
  getPoolCoordinates,
  checkAttendanceTimeStatus,
} from "../../../lib/api";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Lock,
  Flag,
  Camera,
  RefreshCw,
  RotateCw,
  Zap,
  FileText,
  X,
  ChevronRight,
  User,
  Waves,
} from "lucide-react";

interface CoachCameraPresensiProps {
  schedules: ScheduleSession[];
  coaches?: Coach[];
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
  onClose?: () => void;
  onSwitchToStudentChecklist?: (scheduleId: string) => void;
}

// Helper to find the closest schedule for the coach
export function findNearestCoachSchedule(
  schedules: ScheduleSession[],
  coachName?: string,
  refDate: Date = new Date()
): ScheduleSession | null {
  if (!schedules || schedules.length === 0) return null;

  const nowMinutes = refDate.getHours() * 60 + refDate.getMinutes();
  const y = refDate.getFullYear();
  const m = String(refDate.getMonth() + 1).padStart(2, "0");
  const d = String(refDate.getDate()).padStart(2, "0");
  const todayISO = `${y}-${m}-${d}`;

  // Filter coach schedules if matching coach exists
  let relevant = schedules;
  if (coachName) {
    const coachLower = coachName.toLowerCase().trim();
    const matched = schedules.filter((s) =>
      (s.coachName || "").toLowerCase().includes(coachLower) ||
      (s.title || "").toLowerCase().includes(coachLower)
    );
    if (matched.length > 0) {
      relevant = matched;
    }
  }

  const parseMin = (timeStr?: string) => {
    if (!timeStr) return 0;
    const [h, min] = timeStr.split(":").map((n) => parseInt(n, 10) || 0);
    return h * 60 + min;
  };

  // 1. Today's schedules
  const todaySessions = relevant.filter(
    (s) => !s.date || s.date === todayISO
  );

  if (todaySessions.length > 0) {
    // A. Check if there is an active session right now (open 2h before until end)
    const activeNow = todaySessions.find((s) => {
      const start = parseMin(s.timeStart);
      const end = parseMin(s.timeEnd);
      // Opens 2 hours (120 mins) before start time until session ends
      return nowMinutes >= start - 120 && nowMinutes <= end;
    });

    if (activeNow) {
      return activeNow;
    }

    // B. Check for upcoming sessions today after current time
    const upcomingToday = todaySessions
      .filter((s) => parseMin(s.timeStart) >= nowMinutes)
      .sort((a, b) => parseMin(a.timeStart) - parseMin(b.timeStart));

    if (upcomingToday.length > 0) {
      return upcomingToday[0];
    }

    // C. If all today's sessions ended, pick the one that ended most recently
    const pastToday = [...todaySessions].sort(
      (a, b) => parseMin(b.timeEnd) - parseMin(a.timeEnd)
    );
    return pastToday[0];
  }

  // 2. If no today sessions, find future schedules sorted by date and time
  const futureSessions = relevant
    .filter((s) => s.date && s.date > todayISO)
    .sort((a, b) => {
      const dDiff = (a.date || "").localeCompare(b.date || "");
      if (dDiff !== 0) return dDiff;
      return parseMin(a.timeStart) - parseMin(b.timeStart);
    });

  if (futureSessions.length > 0) {
    return futureSessions[0];
  }

  return relevant[0] || schedules[0] || null;
}

export default function CoachCameraPresensi({
  schedules = [],
  coaches = [],
  attendances = [],
  sessionUser = "",
  sessionRole = "pelatih",
  onCheckInAttendance,
  onClose,
  onSwitchToStudentChecklist,
}: CoachCameraPresensiProps) {
  // Live Clock Tick
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine nearest schedule automatically
  const autoNearestSchedule = useMemo(() => {
    return findNearestCoachSchedule(schedules, sessionUser, currentDate);
  }, [schedules, sessionUser, currentDate]);

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [showScheduleSelector, setShowScheduleSelector] = useState(false);

  // Set default selected schedule
  useEffect(() => {
    if (!selectedScheduleId && autoNearestSchedule) {
      setSelectedScheduleId(autoNearestSchedule.id);
    }
  }, [autoNearestSchedule, selectedScheduleId]);

  const activeSchedule = useMemo(() => {
    return (
      schedules.find((s) => s.id === selectedScheduleId) ||
      autoNearestSchedule ||
      schedules[0] ||
      null
    );
  }, [schedules, selectedScheduleId, autoNearestSchedule]);

  // Initial Mode Selection Step: null means user must choose "masuk" or "keluar" first
  const [chosenMode, setChosenMode] = useState<"masuk" | "keluar" | null>(null);
  const [showCheckoutWarningModal, setShowCheckoutWarningModal] = useState<boolean>(false);

  // Check if coach already checked in for this active schedule
  const isAlreadyCheckedIn = useMemo(() => {
    if (!activeSchedule) return false;
    return attendances.some(
      (a) =>
        a.schedule_id === activeSchedule.id &&
        a.person_type === "coach" &&
        (a.status === "Hadir" || a.status === "Terlambat")
    );
  }, [attendances, activeSchedule]);

  // Check if coach already checked out (Presensi Keluar / Selesai)
  const isAlreadyCheckedOut = useMemo(() => {
    if (!activeSchedule) return false;
    return attendances.some(
      (a) =>
        a.schedule_id === activeSchedule.id &&
        a.person_type === "coach" &&
        (a.status === "Selesai" || (a.notes && a.notes.includes("Presensi Keluar")))
    );
  }, [attendances, activeSchedule]);

  // Geolocation states
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [isSimulatedGPS, setIsSimulatedGPS] = useState<boolean>(false);

  const targetPoolInfo = useMemo(() => {
    return getPoolCoordinates(activeSchedule?.poolArea || "Nalendra");
  }, [activeSchedule?.poolArea]);

  const requestGPSLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      // Fallback simulate pool coordinate
      setCurrentLat(targetPoolInfo.latitude + 0.0001);
      setCurrentLon(targetPoolInfo.longitude + 0.0001);
      setIsSimulatedGPS(true);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLat(pos.coords.latitude);
        setCurrentLon(pos.coords.longitude);
        setIsSimulatedGPS(false);
        setLocationLoading(false);
      },
      (err) => {
        console.warn("GPS error, fallback to pool radius simulation:", err);
        setCurrentLat(targetPoolInfo.latitude + 0.00012);
        setCurrentLon(targetPoolInfo.longitude + 0.00012);
        setIsSimulatedGPS(true);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [targetPoolInfo]);

  useEffect(() => {
    requestGPSLocation();
  }, [requestGPSLocation]);

  // Distance calculation
  const distanceKm = useMemo(() => {
    if (currentLat === null || currentLon === null) return 0.014;
    return calculateDistanceKm(
      currentLat,
      currentLon,
      targetPoolInfo.latitude,
      targetPoolInfo.longitude
    );
  }, [currentLat, currentLon, targetPoolInfo]);

  const distanceMeters = useMemo(() => {
    return Math.round(distanceKm * 1000);
  }, [distanceKm]);

  const isLocationValid = distanceKm <= 2.0;

  // Time window status
  const timeStatus = useMemo(() => {
    if (!activeSchedule) {
      return {
        canCheckIn: true,
        isLate: false,
        isOpen: true,
        openTimeString: "--:--",
        sessionStartTime: "--:--",
        statusBadge: "ready" as const,
        statusMessage: "Siap presensi",
      };
    }
    const todayISO = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
    return checkAttendanceTimeStatus(
      activeSchedule.date || todayISO,
      activeSchedule.timeStart || "15:00"
    );
  }, [activeSchedule, currentDate]);

  // Camera States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string>("");
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [showLateReasonModal, setShowLateReasonModal] = useState<boolean>(false);
  const [lateReason, setLateReason] = useState<string>("");
  const [flashScreenEffect, setFlashScreenEffect] = useState<boolean>(false);

  // Check-Out / Catatan Perkembangan Siswa Modal States
  const [showCheckoutNotesModal, setShowCheckoutNotesModal] = useState<boolean>(false);
  const [checkoutNotes, setCheckoutNotes] = useState<string>("");

  // Initialize Camera Stream (only when a mode has been chosen)
  const initCamera = useCallback(async (facing: "user" | "environment") => {
    if (!chosenMode) return;
    setCameraError("");
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Kamera tidak didukung pada browser ini.");
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
      setCameraError(
        "Akses kamera tidak diizinkan atau kamera sedang digunakan aplikasi lain."
      );
    }
  }, [cameraStream, chosenMode]);

  // Start camera when mode is chosen & change facing mode
  useEffect(() => {
    if (chosenMode) {
      initCamera(cameraFacing);
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [chosenMode, cameraFacing]);

  // Handlers for mode selection with VALIDATION
  const handleSelectPresensiMasuk = () => {
    setChosenMode("masuk");
  };

  const handleSelectPresensiKeluar = () => {
    // VALIDATOR: Must have already performed Presensi Masuk first
    if (!isAlreadyCheckedIn) {
      setShowCheckoutWarningModal(true);
      return;
    }
    setChosenMode("keluar");
  };

  // Toggle Torch / Flash
  const toggleFlash = () => {
    if (!cameraStream) {
      setIsFlashActive(!isFlashActive);
      return;
    }
    const track = cameraStream.getVideoTracks()[0];
    if (track && (track.getCapabilities as any)?.()?.torch) {
      try {
        (track.applyConstraints as any)({
          advanced: [{ torch: !isFlashActive }],
        });
        setIsFlashActive(!isFlashActive);
      } catch (e) {
        setIsFlashActive(!isFlashActive);
      }
    } else {
      setIsFlashActive(!isFlashActive);
    }
  };

  // Flip Camera
  const flipCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Capture frame from video to canvas
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

  // Handle Shutter Trigger
  const handleShutterPress = () => {
    if (!activeSchedule) return;

    // Trigger visual shutter flash effect
    setFlashScreenEffect(true);
    setTimeout(() => setFlashScreenEffect(false), 250);

    const snapshot = takeSnapshot();
    if (snapshot) {
      setCapturedPhotoUrl(snapshot);
    }

    if (chosenMode === "keluar") {
      // If Presensi Keluar: open notes & progress modal
      setShowCheckoutNotesModal(true);
    } else {
      // Presensi Masuk
      if (isAlreadyCheckedIn) {
        alert("Anda sudah melakukan Presensi Masuk untuk sesi ini.");
        return;
      }
      if (timeStatus.isLate && !lateReason.trim()) {
        setShowLateReasonModal(true);
        return;
      }
      submitPresensiMasuk();
    }
  };

  // Submit Presensi Masuk
  const submitPresensiMasuk = async (reasonOverride?: string) => {
    if (!activeSchedule) return;
    setIsSubmitting(true);
    try {
      if (onCheckInAttendance) {
        await onCheckInAttendance({
          schedule_id: activeSchedule.id,
          person_type: "coach",
          person_id: activeSchedule.coachId || "coach_1",
          person_name: activeSchedule.coachName || sessionUser || "Pelatih GIM",
          status: timeStatus.isLate ? "Terlambat" : "Hadir",
          late_reason: reasonOverride || lateReason || (timeStatus.isLate ? "Hadir sesi latihan" : undefined),
          latitude: currentLat || targetPoolInfo.latitude,
          longitude: currentLon || targetPoolInfo.longitude,
          notes: `Presensi Masuk Kamera (${distanceMeters}m dari ${targetPoolInfo.name})`,
        });
      }
      setShowLateReasonModal(false);
      setLateReason("");
    } catch (err: any) {
      alert(err?.message || "Gagal melakukan presensi masuk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Presensi Keluar & Catatan Perkembangan Siswa
  const submitPresensiKeluar = async () => {
    if (!activeSchedule) return;
    setIsSubmitting(true);
    try {
      const finalNotes = checkoutNotes.trim()
        ? checkoutNotes.trim()
        : "Presensi Keluar - Sesi latihan selesai";

      if (onCheckInAttendance) {
        await onCheckInAttendance({
          schedule_id: activeSchedule.id,
          person_type: "coach",
          person_id: activeSchedule.coachId || "coach_1",
          person_name: activeSchedule.coachName || sessionUser || "Pelatih GIM",
          status: "Selesai",
          latitude: currentLat || targetPoolInfo.latitude,
          longitude: currentLon || targetPoolInfo.longitude,
          notes: finalNotes,
        });
      }
      setShowCheckoutNotesModal(false);
      setCheckoutNotes("");
    } catch (err: any) {
      alert(err?.message || "Gagal melakukan presensi keluar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick chips for note input
  const quickChips = [
    "Latihan Gaya Dada 25m Selesai",
    "Ketahanan & Stamina Meningkat",
    "Latihan Gerakan Kaki & Luncuran",
    "Seluruh Siswa Aktif & Disiplin",
    "Pengenalan Gaya Bebas & Pernapasan",
    "Latihan Penguatan Otot Inti",
  ];

  const appendQuickChip = (text: string) => {
    setCheckoutNotes((prev) => {
      const cleaned = prev.trim();
      return cleaned ? `${cleaned}\n• ${text}` : `• ${text}`;
    });
  };

  const appendStudentTag = (studentName: string) => {
    setCheckoutNotes((prev) => {
      const cleaned = prev.trim();
      return cleaned ? `${cleaned} [${studentName}]: ` : `[${studentName}]: `;
    });
  };

  // Date formatted: DD/MM/YYYY HH:mm:ss
  const formattedDateTime = useMemo(() => {
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const year = currentDate.getFullYear();
    const hours = String(currentDate.getHours()).padStart(2, "0");
    const minutes = String(currentDate.getMinutes()).padStart(2, "0");
    const seconds = String(currentDate.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }, [currentDate]);

  const isCurrentModeCompleted =
    chosenMode === "masuk" ? isAlreadyCheckedIn : isAlreadyCheckedOut;

  // =========================================================================
  // STEP 1: INITIAL MODE SELECTION SCREEN (MANDATORY BEFORE CAMERA OPENS)
  // =========================================================================
  if (chosenMode === null) {
    return (
      <div className="relative w-full min-h-[100dvh] bg-slate-950 text-white flex flex-col justify-between overflow-y-auto font-sans p-4 sm:p-6 pb-20 select-none">
        {/* Background Ambient Glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-md w-full mx-auto space-y-5 pt-2 sm:pt-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition active:scale-95 cursor-pointer shadow-lg"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-right">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-bold uppercase tracking-wider">
                Presensi Pelatih
              </span>
            </div>
          </div>

          {/* Title Header */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Pilih Jenis Presensi
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Silakan pilih apakah Anda akan melakukan <strong className="text-white">Presensi Masuk</strong> di awal sesi atau <strong className="text-white">Presensi Keluar</strong> setelah sesi selesai.
            </p>
          </div>

          {/* Active Schedule Card Banner */}
          <div
            onClick={() => setShowScheduleSelector(true)}
            className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition cursor-pointer space-y-2.5 shadow-xl relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves size={16} className="text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Sesi Latihan Terpilih:
                </span>
              </div>
              <span className="text-[10px] text-cyan-400 group-hover:underline font-bold flex items-center gap-0.5">
                Ganti Sesi <ChevronRight size={12} />
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-black text-white">
                {activeSchedule ? `${activeSchedule.title || activeSchedule.class}` : "Belum Ada Jadwal"}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                <span className="font-mono font-bold text-cyan-300 flex items-center gap-1">
                  <Clock size={12} /> {activeSchedule?.timeStart || "--:--"} - {activeSchedule?.timeEnd || "--:--"} WIB
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-slate-400" /> {activeSchedule?.poolArea || "Kolam Renang"}
                </span>
              </div>
            </div>

            {/* GPS Distance info */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-cyan-400" />
                <span>Radius: {distanceMeters} meter</span>
              </span>
              <span className={isLocationValid ? "text-emerald-400 font-bold flex items-center gap-1" : "text-amber-400 font-bold flex items-center gap-1"}>
                {isLocationValid ? (
                  <>
                    <Check size={12} /> Di Lokasi Kolam
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} /> Di Luar Radius
                  </>
                )}
              </span>
            </div>
          </div>

          {/* =========================================================================
              CHOICE CARDS: PRESENSI MASUK vs PRESENSI KELUAR
              ========================================================================= */}
          <div className="space-y-3.5 pt-1">
            {/* 1. PRESENSI MASUK CARD */}
            <button
              type="button"
              onClick={handleSelectPresensiMasuk}
              className={`w-full p-5 rounded-3xl border transition-all text-left relative cursor-pointer active:scale-[0.98] group ${isAlreadyCheckedIn
                  ? "bg-slate-900/60 border-slate-800 opacity-90"
                  : "bg-gradient-to-br from-slate-900 via-slate-900/95 to-blue-950/40 border-blue-500/40 hover:border-blue-400 shadow-xl hover:shadow-blue-500/10 ring-1 ring-blue-500/20"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <span>Presensi Masuk</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold uppercase">
                        Awal Sesi
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Catat waktu tiba di kolam renang sebelum memulai sesi pelatihan.
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-400 group-hover:text-white transition shrink-0 mt-1" />
              </div>

              {/* Status Badge */}
              <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">Status Sesi Ini:</span>
                {isAlreadyCheckedIn ? (
                  <span className="px-2.5 py-0.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1">
                    <Check size={11} /> Sudah Presensi Masuk
                  </span>
                ) : (
                  <span className="text-blue-400 font-bold text-[11px] flex items-center gap-0.5">
                    Siap Presensi Masuk <ChevronRight size={12} />
                  </span>
                )}
              </div>
            </button>

            {/* 2. PRESENSI KELUAR CARD */}
            <button
              type="button"
              onClick={handleSelectPresensiKeluar}
              className={`w-full p-5 rounded-3xl border transition-all text-left relative cursor-pointer active:scale-[0.98] group ${isAlreadyCheckedOut
                  ? "bg-slate-900/60 border-slate-800 opacity-90"
                  : isAlreadyCheckedIn
                    ? "bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/40 border-emerald-500/40 hover:border-emerald-400 shadow-xl hover:shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                    : "bg-slate-900/50 border-slate-800/80 opacity-75 hover:opacity-100"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition ${isAlreadyCheckedIn
                      ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-400"
                      : "bg-slate-800 border border-slate-700 text-slate-400"
                    }`}>
                    {isAlreadyCheckedIn ? <Flag size={22} /> : <Lock size={20} />}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <span>Presensi Keluar</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                        Selesai Sesi
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Catat selesai sesi latihan disertai foto selfie &amp; catatan perkembangan siswa.
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-400 group-hover:text-white transition shrink-0 mt-1" />
              </div>

              {/* Status Badge & Validator Indicator */}
              <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">Status Sesi Ini:</span>
                {isAlreadyCheckedOut ? (
                  <span className="px-2.5 py-0.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1">
                    <Check size={11} /> Selesai (Sudah Presensi Keluar)
                  </span>
                ) : isAlreadyCheckedIn ? (
                  <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-0.5">
                    Siap Presensi Keluar &amp; Catatan Siswa <ChevronRight size={12} />
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                    <Lock size={10} /> Wajib Presensi Masuk Dulu
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* =========================================================================
            VALIDATOR MODAL: IF COACH CLICKS PRESENSI KELUAR WITHOUT PRESENSI MASUK
            ========================================================================= */}
        {showCheckoutWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-sm rounded-3xl bg-[#1a1e24] border border-rose-500/30 p-6 space-y-4 shadow-2xl text-white text-center">
              <div className="h-16 w-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-white">
                  Belum Bisa Presensi Keluar
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Anda belum melakukan <strong className="text-amber-300">Presensi Masuk</strong> untuk sesi{" "}
                  <strong className="text-white">
                    "{activeSchedule?.title || activeSchedule?.class || "Sesi Latihan"}"
                  </strong>.
                </p>
                <p className="text-[11px] text-slate-400 pt-1">
                  Untuk menjaga validitas data kehadiran, Anda wajib melakukan Presensi Masuk terlebih dahulu di awal sesi sebelum dapat melakukan Presensi Keluar.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutWarningModal(false);
                    setChosenMode("masuk");
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  <span>Lakukan Presensi Masuk Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckoutWarningModal(false)}
                  className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Selector Modal */}
        {showScheduleSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white">Pilih Sesi Jadwal Latihan</h3>
                  <p className="text-[10px] text-slate-400">Pilih sesi untuk presensi kehadiran</p>
                </div>
                <button
                  onClick={() => setShowScheduleSelector(false)}
                  className="h-7 w-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs cursor-pointer hover:bg-slate-700"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {schedules.map((s) => {
                  const isSelected = s.id === activeSchedule?.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedScheduleId(s.id);
                        setShowScheduleSelector(false);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${isSelected
                          ? "bg-cyan-500/20 border-cyan-400/50 text-white font-bold"
                          : "bg-slate-800/60 hover:bg-slate-800 border-slate-700/50 text-slate-300"
                        }`}
                    >
                      <div>
                        <p className="text-xs font-black">{s.title || s.class}</p>
                        <p className="text-[10px] text-cyan-300 flex items-center gap-1">
                          <Clock size={10} /> {s.timeStart} - {s.timeEnd} WIB • <MapPin size={10} /> {s.poolArea}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {s.date || "Setiap Hari"} • Pelatih: {s.coachName || "Coach"}
                        </p>
                      </div>
                      {isSelected && <Check size={14} className="text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STEP 2: ACTIVE CAMERA VIEWFINDER & PRESENSI STREAM
  // =========================================================================
  return (
    <div className="relative w-full h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Hidden Canvas for Snapshot Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Screen Flash Shutter Effect */}
      {flashScreenEffect && (
        <div className="absolute inset-0 bg-white z-[90] animate-fadeOut pointer-events-none" />
      )}

      {/* Torch Simulated Screen Light */}
      {isFlashActive && (
        <div className="absolute inset-0 bg-white/25 pointer-events-none z-10" />
      )}

      {/* LIVE CAMERA VIEWFINDER */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-950 flex items-center justify-center">
        {cameraError ? (
          <div className="text-center px-6 max-w-sm space-y-4">
            <div className="h-20 w-20 rounded-full bg-slate-800/80 border border-white/20 flex items-center justify-center mx-auto text-slate-400 shadow-xl">
              <Camera size={36} />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">Kamera Tidak Aktif</p>
              <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
            </div>
            <button
              onClick={() => initCamera(cameraFacing)}
              className="px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5 mx-auto"
            >
              <RotateCw size={14} />
              <span>Coba Buka Kamera Lagi</span>
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""
              }`}
          />
        )}
      </div>

      {/* Subtle Top & Bottom Gradient Shadows */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none z-10" />

      {/* TOP HEADER & INFO CONTAINER */}
      <div className="relative z-20 w-full max-w-md mx-auto pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.25rem))] px-4 space-y-2.5">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setChosenMode(null)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white transition active:scale-90 cursor-pointer shadow-lg"
              title="Kembali Pilih Jenis Presensi"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white drop-shadow-md flex items-center gap-1.5">
                {chosenMode === "masuk" ? "Presensi Masuk" : "Presensi Keluar"}
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${chosenMode === "masuk"
                    ? "bg-blue-500/30 text-blue-200 border border-blue-400/40"
                    : "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
                  }`}>
                  {chosenMode === "masuk" ? "Awal Sesi" : "Selesai Sesi"}
                </span>
              </h1>
              <p className="text-[10px] text-cyan-200 font-semibold drop-shadow-sm">
                Role Pelatih • {sessionUser || "Pelatih GIM"}
              </p>
            </div>
          </div>

          {/* Quick Mode Switcher with validation */}
          <button
            onClick={() => {
              if (chosenMode === "masuk") {
                if (!isAlreadyCheckedIn) {
                  setShowCheckoutWarningModal(true);
                  return;
                }
                setChosenMode("keluar");
              } else {
                setChosenMode("masuk");
              }
            }}
            className="px-3 py-1.5 rounded-2xl bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-bold text-slate-200 hover:text-white transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-lg"
            title="Ganti Mode Presensi"
          >
            <span>Ganti ke {chosenMode === "masuk" ? "Keluar" : "Masuk"}</span>
          </button>
        </div>

        {/* Floating Dark Glassmorphism Info Container */}
        <div className="rounded-3xl bg-[#1e2329]/80 backdrop-blur-xl border border-white/10 p-3 sm:p-3.5 shadow-2xl shadow-black/60 space-y-2 text-white">
          {/* Item 1: Waktu Kehadiran */}
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#283038]/70 border border-white/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-lg">
              <Clock size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-300 leading-tight">
                {chosenMode === "masuk" ? "Waktu Presensi Masuk" : "Waktu Presensi Keluar"}
              </p>
              <p className="text-xs sm:text-sm font-black text-white tracking-wide mt-0.5 font-mono">
                {formattedDateTime}
              </p>
            </div>
          </div>

          {/* Item 2: Radius & Lokasi GPS */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#283038]/70 border border-white/5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-lg">
                <MapPin size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-white leading-tight">
                  Radius {distanceMeters} meter dari kolam {isLocationValid ? "(di kolam)" : "(di luar area)"}
                </p>
                <p className="text-[10px] text-slate-300 truncate mt-0.5">
                  {targetPoolInfo.name} • {isSimulatedGPS ? "Mode Akurasi GPS" : "Akurasi Tinggi"}
                </p>
              </div>
            </div>
            <button
              onClick={requestGPSLocation}
              disabled={locationLoading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer border border-white/10 disabled:opacity-50"
              title="Perbarui Titik GPS"
            >
              <RotateCw size={14} className={locationLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Item 3: Kantor / Sesi Jadwal Latihan Terdekat */}
          <div
            onClick={() => setShowScheduleSelector(true)}
            className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#283038]/70 hover:bg-[#283038]/90 border border-white/5 cursor-pointer transition group"
            title="Klik untuk memilih jadwal lain"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-lg">
                <Waves size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-slate-300 leading-tight">
                  Sesi Jadwal Terdekat
                </p>
                <p className="text-xs sm:text-sm font-black text-white truncate mt-0.5">
                  {activeSchedule ? `${activeSchedule.title || activeSchedule.class} (${activeSchedule.timeStart} - ${activeSchedule.timeEnd} WIB)` : "Belum Ada Jadwal"}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:text-white shrink-0" />
          </div>

          {/* Item 4: Status / Alert Banner */}
          {chosenMode === "masuk" ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#592629]/80 border border-rose-500/30 backdrop-blur-md">
              <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 text-rose-300">
                {isAlreadyCheckedIn ? <CheckCircle2 size={16} /> : timeStatus.isLate ? <AlertTriangle size={16} /> : <Clock size={16} />}
              </div>
              <p className="text-[11px] font-bold text-rose-200 leading-snug flex-1">
                {isAlreadyCheckedIn
                  ? "Anda sudah melakukan Presensi Masuk pada sesi ini. Pilih 'Ganti ke Keluar' bila sesi telah selesai."
                  : timeStatus.isLate
                    ? "Presensi Masuk (Terlambat). Masukkan alasan keterlambatan saat submit foto presensi."
                    : "Anda hanya bisa Presensi Masuk sekali dalam satu sesi latihan."}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#1b3a32]/85 border border-emerald-500/30 backdrop-blur-md">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-300">
                {isAlreadyCheckedOut ? <CheckCircle2 size={16} /> : <FileText size={16} />}
              </div>
              <p className="text-[11px] font-bold text-emerald-200 leading-snug flex-1">
                {isAlreadyCheckedOut
                  ? "Presensi Keluar selesai! Catatan perkembangan siswa telah tersimpan untuk sesi ini."
                  : "Presensi Keluar: Klik tombol kamera di bawah untuk foto selfie & masukkan catatan perkembangan siswa."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM CAMERA CONTROLS */}
      <div className="relative z-20 w-full max-w-md mx-auto pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] px-6 flex items-center justify-around">
        {/* Flash / Torch Button */}
        <button
          onClick={toggleFlash}
          className={`flex h-13 w-13 items-center justify-center rounded-full backdrop-blur-md border transition active:scale-90 cursor-pointer shadow-lg ${isFlashActive
              ? "bg-amber-400 text-slate-900 border-amber-300 ring-4 ring-amber-400/40"
              : "bg-black/40 hover:bg-black/60 border-white/25 text-white"
            }`}
          title="Toggle Flash / Penerangan"
        >
          <Zap size={20} />
        </button>

        {/* Large Shutter Button */}
        <div className="relative">
          <button
            onClick={handleShutterPress}
            disabled={isSubmitting || isCurrentModeCompleted}
            className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-all duration-150 cursor-pointer shadow-2xl active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${isCurrentModeCompleted
                ? "bg-emerald-500/80 border-emerald-300"
                : chosenMode === "keluar"
                  ? "bg-transparent hover:scale-105 border-emerald-300"
                  : "bg-transparent hover:scale-105"
              }`}
            title={
              chosenMode === "masuk"
                ? "Ambil Foto & Presensi Masuk"
                : "Ambil Foto & Presensi Keluar + Catatan Siswa"
            }
          >
            <div
              className={`h-16 w-16 rounded-full transition-all shadow-inner flex items-center justify-center ${isCurrentModeCompleted
                  ? "bg-emerald-400 text-white font-black"
                  : isSubmitting
                    ? "bg-cyan-400 animate-ping"
                    : chosenMode === "keluar"
                      ? "bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-slate-950 font-black"
                      : "bg-white/80 hover:bg-white active:bg-cyan-400"
                }`}
            >
              {isCurrentModeCompleted ? (
                <Check size={28} />
              ) : chosenMode === "keluar" ? (
                <FileText size={22} />
              ) : null}
            </div>
          </button>
        </div>

        {/* Switch / Flip Camera Button */}
        <button
          onClick={flipCamera}
          className="flex h-13 w-13 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/25 text-white transition active:scale-90 cursor-pointer shadow-lg"
          title="Ganti Kamera Depan / Belakang"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* MODAL: PRESENSI KELUAR & CATATAN PERKEMBANGAN SISWA */}
      {showCheckoutNotesModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#181d24] border border-white/10 p-5 sm:p-6 space-y-4 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                    Presensi Keluar &amp; Catatan Sesi
                  </h3>
                  <p className="text-[11px] text-emerald-300 mt-0.5">
                    {activeSchedule?.title || activeSchedule?.class} ({activeSchedule?.timeStart} - {activeSchedule?.timeEnd} WIB)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutNotesModal(false)}
                className="h-8 w-8 rounded-full bg-white/10 text-slate-300 flex items-center justify-center text-xs hover:bg-white/20 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Snapshot Preview & Meta */}
            {capturedPhotoUrl && (
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10">
                <img
                  src={capturedPhotoUrl}
                  alt="Snapshot Selfie"
                  className="h-14 w-14 rounded-xl object-cover border border-emerald-400/40 shadow-md"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-bold text-white flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-emerald-400" /> Foto Selfie Terverifikasi
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin size={10} className="text-slate-400" /> {targetPoolInfo.name} • {formattedDateTime}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Student Mention Chips */}
            {activeSchedule?.studentNames && activeSchedule.studentNames.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  Siswa di Sesi Ini (Klik nama untuk menambahkan catatan):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeSchedule.studentNames.map((st, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => appendStudentTag(st)}
                      className="px-2.5 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 text-xs font-semibold transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <User size={12} />
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Note Suggestions */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                Opsi Cepat Catatan Latihan:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => appendQuickChip(chip)}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 text-[11px] font-medium transition cursor-pointer active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea: Catatan Perkembangan Siswa */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                Catatan Perkembangan Siswa &amp; Evaluasi Sesi Latihan:
              </label>
              <textarea
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="Contoh: Seluruh siswa hadir tepat waktu. Budi sudah mampu berenang gaya dada 25 meter dengan kayuhan stabil. Siti perlu perbaikan pada teknik pengambilan napas saat meluncur..."
                rows={4}
                className="w-full p-3.5 rounded-2xl bg-black/40 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 leading-relaxed font-sans resize-none"
              />
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <AlertCircle size={12} className="text-cyan-400 shrink-0" /> Catatan ini akan tersimpan di riwayat jadwal dan dapat dilihat oleh admin &amp; wali murid.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckoutNotesModal(false)}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitPresensiKeluar}
                disabled={isSubmitting}
                className="flex-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Kirim Presensi Keluar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LATE REASON */}
      {showLateReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={18} />
              <h3 className="text-sm font-black">Presensi Terlambat</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sesi latihan telah dimulai lebih dari 15 menit. Silakan masukkan alasan keterlambatan untuk catatan sistem:
            </p>
            <textarea
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="Contoh: Terkendala kemacetan di jalan raya menuju kolam renang..."
              rows={3}
              className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowLateReasonModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => submitPresensiMasuk(lateReason || "Terlambat hadir")}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-lg"
              >
                Kirim Presensi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
