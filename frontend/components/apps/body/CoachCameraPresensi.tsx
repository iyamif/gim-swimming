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
  Mic,
  MicOff,
  Sparkles,
  Sliders,
  Play,
  ClipboardList,
  Star,
  Award,
  ThumbsUp,
  GraduationCap,
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
    photo?: string;
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

  const todaySessions = relevant.filter((s) => !s.date || s.date === todayISO);

  if (todaySessions.length > 0) {
    const activeNow = todaySessions.find((s) => {
      const start = parseMin(s.timeStart);
      const end = parseMin(s.timeEnd);
      return nowMinutes >= start - 120 && nowMinutes <= end;
    });

    if (activeNow) return activeNow;

    const upcomingToday = todaySessions
      .filter((s) => parseMin(s.timeStart) >= nowMinutes)
      .sort((a, b) => parseMin(a.timeStart) - parseMin(b.timeStart));

    if (upcomingToday.length > 0) return upcomingToday[0];

    const pastToday = [...todaySessions].sort(
      (a, b) => parseMin(b.timeEnd) - parseMin(a.timeEnd)
    );
    return pastToday[0];
  }

  const futureSessions = relevant
    .filter((s) => s.date && s.date > todayISO)
    .sort((a, b) => {
      const dDiff = (a.date || "").localeCompare(b.date || "");
      if (dDiff !== 0) return dDiff;
      return parseMin(a.timeStart) - parseMin(b.timeStart);
    });

  if (futureSessions.length > 0) return futureSessions[0];

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

  const todayISO = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, "0");
    const d = String(currentDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  // Relevant schedules for this coach
  const coachSchedules = useMemo(() => {
    if (!sessionUser || sessionRole === "admin") return schedules;
    const coachLower = sessionUser.toLowerCase().trim();
    const matched = schedules.filter(
      (s) =>
        (s.coachName || "").toLowerCase().includes(coachLower) ||
        (s.title || "").toLowerCase().includes(coachLower)
    );
    return matched.length > 0 ? matched : schedules;
  }, [schedules, sessionUser, sessionRole]);

  // TODAY-ONLY schedules for this coach
  const todayCoachSchedules = useMemo(() => {
    return coachSchedules
      .filter((s) => !s.date || s.date === todayISO)
      .sort((a, b) => (a.timeStart || "").localeCompare(b.timeStart || ""));
  }, [coachSchedules, todayISO]);

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [showScheduleSelector, setShowScheduleSelector] = useState(false);

  // Auto-select schedule for today
  useEffect(() => {
    if (todayCoachSchedules.length === 1) {
      setSelectedScheduleId(todayCoachSchedules[0].id);
    } else if (todayCoachSchedules.length > 1) {
      const nearest = findNearestCoachSchedule(todayCoachSchedules, sessionUser, currentDate);
      if (nearest) {
        setSelectedScheduleId(nearest.id);
      } else {
        setSelectedScheduleId(todayCoachSchedules[0].id);
      }
    } else {
      setSelectedScheduleId("");
    }
  }, [todayCoachSchedules, sessionUser, currentDate]);

  const activeSchedule = useMemo(() => {
    if (todayCoachSchedules.length === 0) return null;
    return (
      todayCoachSchedules.find((s) => s.id === selectedScheduleId) ||
      todayCoachSchedules[0] ||
      null
    );
  }, [todayCoachSchedules, selectedScheduleId]);

  // Check if coach already checked in
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

  // Direct Smart Mode: "masuk" if not checked in, "keluar" if already checked in
  const [chosenMode, setChosenMode] = useState<"masuk" | "keluar">("masuk");
  const [showCheckoutWarningModal, setShowCheckoutWarningModal] = useState<boolean>(false);

  // Auto-sync mode when schedule or attendance state changes
  useEffect(() => {
    if (isAlreadyCheckedIn && !isAlreadyCheckedOut) {
      setChosenMode("keluar");
    } else {
      setChosenMode("masuk");
    }
  }, [isAlreadyCheckedIn, isAlreadyCheckedOut, activeSchedule]);

  // Geolocation & Radius Simulation states
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [isSimulatedGPS, setIsSimulatedGPS] = useState<boolean>(true);
  const [radiusSimPreset, setRadiusSimPreset] = useState<
    "device" | "at_pool" | "near_pool" | "radius_limit" | "out_of_radius" | "custom"
  >("at_pool");
  const [customRadiusMeters, setCustomRadiusMeters] = useState<number>(15);
  const [showGpsDrawer, setShowGpsDrawer] = useState<boolean>(false);

  const targetPoolInfo = useMemo(() => {
    return getPoolCoordinates(activeSchedule?.poolArea || "Nalendra");
  }, [activeSchedule?.poolArea]);

  const setCoordinatesFromMeters = useCallback(
    (meters: number, pool = targetPoolInfo) => {
      const offsetLat = meters / 111139;
      setCurrentLat(pool.latitude + offsetLat);
      setCurrentLon(pool.longitude);
      setIsSimulatedGPS(true);
    },
    [targetPoolInfo]
  );

  const requestGPSLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setRadiusSimPreset("at_pool");
      setCoordinatesFromMeters(15);
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
        setRadiusSimPreset("at_pool");
        setCoordinatesFromMeters(15);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [setCoordinatesFromMeters]);

  const applyRadiusPreset = useCallback(
    (
      preset: "device" | "at_pool" | "near_pool" | "radius_limit" | "out_of_radius" | "custom",
      customVal?: number
    ) => {
      setRadiusSimPreset(preset);
      if (preset === "device") {
        requestGPSLocation();
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
    [requestGPSLocation, setCoordinatesFromMeters, customRadiusMeters]
  );

  useEffect(() => {
    if (radiusSimPreset !== "device") {
      setCoordinatesFromMeters(customRadiusMeters);
    }
  }, [targetPoolInfo, setCoordinatesFromMeters]);

  const distanceKm = useMemo(() => {
    if (currentLat === null || currentLon === null) return 0.015;
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
  const [selectedStudentForReview, setSelectedStudentForReview] = useState<string>("");
  const [studentReviews, setStudentReviews] = useState<
    Record<
      string,
      {
        floating: number;
        kicking: number;
        arms: number;
        breathing: number;
        notes: string;
      }
    >
  >({});

  // Synchronize student reviews when active schedule changes
  useEffect(() => {
    if (activeSchedule?.studentNames && activeSchedule.studentNames.length > 0) {
      if (!selectedStudentForReview || !activeSchedule.studentNames.includes(selectedStudentForReview)) {
        setSelectedStudentForReview(activeSchedule.studentNames[0]);
      }
      setStudentReviews((prev) => {
        const next = { ...prev };
        activeSchedule.studentNames?.forEach((st) => {
          if (!next[st]) {
            let existing: any = null;
            if (typeof window !== "undefined") {
              const saved = localStorage.getItem(`gim_student_skills_${st.toLowerCase().trim()}`);
              if (saved) {
                try {
                  existing = JSON.parse(saved);
                } catch {}
              }
            }
            next[st] = {
              floating: existing?.floating || 5,
              kicking: existing?.kicking || 4,
              arms: existing?.arms || 5,
              breathing: existing?.breathing || 4,
              notes: existing?.notes || "",
            };
          }
        });
        return next;
      });
    } else {
      setSelectedStudentForReview("Umum / Seluruh Murid");
      setStudentReviews((prev) => {
        if (!prev["Umum / Seluruh Murid"]) {
          return {
            "Umum / Seluruh Murid": {
              floating: 5,
              kicking: 4,
              arms: 5,
              breathing: 4,
              notes: "",
            },
            ...prev,
          };
        }
        return prev;
      });
    }
  }, [activeSchedule, showCheckoutNotesModal]);

  // Voice-to-Text / Speech Recognition States
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = "id-ID";

        recog.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            const activeKey =
              selectedStudentForReview ||
              activeSchedule?.studentNames?.[0] ||
              "Umum / Seluruh Murid";
            setStudentReviews((prev) => {
              const currentNotes = prev[activeKey]?.notes || "";
              const updatedNotes = currentNotes
                ? `${currentNotes} ${finalTranscript.trim()}`
                : finalTranscript.trim();
              return {
                ...prev,
                [activeKey]: {
                  ...(prev[activeKey] || {
                    floating: 5,
                    kicking: 4,
                    arms: 5,
                    breathing: 4,
                  }),
                  notes: updatedNotes,
                },
              };
            });
            setCheckoutNotes((prev) => {
              const cleaned = prev.trim();
              return cleaned ? `${cleaned} ${finalTranscript.trim()}` : finalTranscript.trim();
            });
          }
        };

        recog.onerror = (e: any) => {
          console.warn("Speech recognition error:", e);
          setIsListeningVoice(false);
        };

        recog.onend = () => {
          setIsListeningVoice(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, [selectedStudentForReview, activeSchedule]);

  const toggleVoiceDictation = () => {
    if (!recognitionRef.current) {
      alert("Browser Anda belum mendukung input suara otomatis (Web Speech API).");
      return;
    }
    if (isListeningVoice) {
      recognitionRef.current.stop();
      setIsListeningVoice(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListeningVoice(true);
      } catch (err) {
        console.warn("Speech start error:", err);
      }
    }
  };

  // Initialize Camera Stream
  const initCamera = useCallback(async (facing: "user" | "environment") => {
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

  const flipCamera = () => {
    setCameraFacing((prev) => (prev === "user" ? "environment" : "user"));
  };

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

  const handleShutterPress = () => {
    if (!activeSchedule) return;

    if (!isLocationValid) {
      alert(
        `⚠️ PRESENSI DITOLAK (DI LUAR RADIUS)!\n\nJarak Anda saat ini: ${
          distanceMeters >= 1000 ? `${distanceKm} km` : `${distanceMeters} meter`
        } dari ${targetPoolInfo.name}.\n\nPresensi wajib berada dalam radius maksimal 2.0 km dari kolam renang.`
      );
      return;
    }

    setFlashScreenEffect(true);
    setTimeout(() => setFlashScreenEffect(false), 250);

    const snapshot = takeSnapshot();
    if (snapshot) {
      setCapturedPhotoUrl(snapshot);
    }

    if (chosenMode === "keluar") {
      setShowCheckoutNotesModal(true);
    } else {
      if (isAlreadyCheckedIn) {
        alert("Anda sudah melakukan Presensi Masuk untuk sesi ini.");
        return;
      }
      if (timeStatus.isLate && !lateReason.trim()) {
        setShowLateReasonModal(true);
        return;
      }
      submitPresensiMasuk(undefined, snapshot || undefined);
    }
  };

  const submitPresensiMasuk = async (reasonOverride?: string, snapshotOverride?: string) => {
    if (!activeSchedule) return;
    setIsSubmitting(true);
    try {
      const photoToSend = snapshotOverride || capturedPhotoUrl || undefined;
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
          photo: photoToSend,
        });
      }
      setShowLateReasonModal(false);
      setLateReason("");
      alert("✅ Presensi Masuk Berhasil Dicatat!");
      if (onClose) onClose();
    } catch (err: any) {
      alert(err?.message || "Gagal melakukan presensi masuk");
    } finally {
      setIsSubmitting(false);
    }
  };

  const SKILL_CATEGORIES = [
    {
      key: "floating" as const,
      label: "Meluncur (Floating & Streamline)",
      desc: "Keseimbangan posisi tubuh, streamlinening, dan luncuran mandiri",
    },
    {
      key: "kicking" as const,
      label: "Kayuhan Kaki (Kicking & Gaya Dada)",
      desc: "Kekuatan dorongan kaki, irama kayuhan, dan konsistensi gerak",
    },
    {
      key: "arms" as const,
      label: "Gerakan Lengan (Arms Stroke)",
      desc: "Rotasi kayuhan lengan, pull & push air, serta pemulihan tangan",
    },
    {
      key: "breathing" as const,
      label: "Pernapasan Ritmik & Stamina",
      desc: "Pengambilan napas ritmik samping/depan, daya tahan renang 25m",
    },
  ];

  const getStarLabel = (stars: number) => {
    switch (stars) {
      case 5:
        return "Sempurna / Mahir (5/5)";
      case 4:
        return "Sangat Baik (4/5)";
      case 3:
        return "Cukup Baik (3/5)";
      case 2:
        return "Berkembang (2/5)";
      case 1:
        return "Perlu Bimbingan (1/5)";
      default:
        return `${stars}/5`;
    }
  };

  const handleSkillRatingChange = (
    skillKey: "floating" | "kicking" | "arms" | "breathing",
    rating: number
  ) => {
    const activeKey =
      selectedStudentForReview ||
      activeSchedule?.studentNames?.[0] ||
      "Umum / Seluruh Murid";
    setStudentReviews((prev) => ({
      ...prev,
      [activeKey]: {
        ...(prev[activeKey] || {
          floating: 5,
          kicking: 4,
          arms: 5,
          breathing: 4,
          notes: "",
        }),
        [skillKey]: rating,
      },
    }));
  };

  const handleStudentNoteChange = (notesText: string) => {
    const activeKey =
      selectedStudentForReview ||
      activeSchedule?.studentNames?.[0] ||
      "Umum / Seluruh Murid";
    setStudentReviews((prev) => ({
      ...prev,
      [activeKey]: {
        ...(prev[activeKey] || {
          floating: 5,
          kicking: 4,
          arms: 5,
          breathing: 4,
        }),
        notes: notesText,
      },
    }));
    setCheckoutNotes(notesText);
  };

  const applyRatingsToAllStudents = () => {
    const activeKey =
      selectedStudentForReview ||
      activeSchedule?.studentNames?.[0] ||
      "Umum / Seluruh Murid";
    const currentRev = studentReviews[activeKey] || {
      floating: 5,
      kicking: 4,
      arms: 5,
      breathing: 4,
      notes: "",
    };

    setStudentReviews((prev) => {
      const next = { ...prev };
      (activeSchedule?.studentNames || []).forEach((st) => {
        next[st] = {
          ...currentRev,
          notes: next[st]?.notes || currentRev.notes,
        };
      });
      return next;
    });
    alert("✅ Nilai bintang berhasil diterapkan ke seluruh murid di sesi ini!");
  };

  const submitPresensiKeluar = async (snapshotOverride?: string) => {
    if (!activeSchedule) return;
    setIsSubmitting(true);
    try {
      const photoToSend = snapshotOverride || capturedPhotoUrl || undefined;
      const todayIsoStr = new Date().toISOString().split("T")[0];

      const studentNamesList =
        activeSchedule.studentNames && activeSchedule.studentNames.length > 0
          ? activeSchedule.studentNames
          : ["Umum / Seluruh Murid"];

      const summaryReports: string[] = [];

      studentNamesList.forEach((stName, idx) => {
        const rev = studentReviews[stName] || {
          floating: 5,
          kicking: 4,
          arms: 5,
          breathing: 4,
          notes: checkoutNotes.trim() || "Perkembangan teknik renang baik dan lancar.",
        };
        const studentId = activeSchedule.studentIds?.[idx] || "";

        const payloadToSave = {
          studentName: stName,
          studentId: studentId,
          scheduleId: activeSchedule.id,
          scheduleTitle: activeSchedule.title || `${activeSchedule.class} Class`,
          date: todayIsoStr,
          coachName: activeSchedule.coachName || sessionUser || "Pelatih GIM",
          floating: rev.floating,
          kicking: rev.kicking,
          arms: rev.arms,
          breathing: rev.breathing,
          notes:
            rev.notes.trim() ||
            checkoutNotes.trim() ||
            "Perkembangan teknik meluncur, kayuhan kaki, gerakan lengan, dan pernapasan anak sangat baik.",
          timestamp: new Date().toISOString(),
        };

        if (typeof window !== "undefined") {
          localStorage.setItem(
            `gim_student_skills_${stName.toLowerCase().trim()}`,
            JSON.stringify(payloadToSave)
          );
          if (studentId) {
            localStorage.setItem(
              `gim_student_skills_${studentId}`,
              JSON.stringify(payloadToSave)
            );
          }
        }

        summaryReports.push(
          `[${stName}] Meluncur: ${rev.floating}★, Kaki: ${rev.kicking}★, Lengan: ${rev.arms}★, Napas: ${rev.breathing}★. ${
            rev.notes.trim() ? `Catatan: ${rev.notes.trim()}` : ""
          }`
        );
      });

      // Dispatch real-time events for instant update on student/parent screens
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("student_evaluation_updated"));
        window.dispatchEvent(new Event("avatar_updated"));
      }

      const combinedNotesText = summaryReports.join("\n• ");

      if (onCheckInAttendance) {
        await onCheckInAttendance({
          schedule_id: activeSchedule.id,
          person_type: "coach",
          person_id: activeSchedule.coachId || "coach_1",
          person_name: activeSchedule.coachName || sessionUser || "Pelatih GIM",
          status: "Selesai",
          latitude: currentLat || targetPoolInfo.latitude,
          longitude: currentLon || targetPoolInfo.longitude,
          notes: combinedNotesText
            ? `Presensi Keluar | Evaluasi Sesi:\n• ${combinedNotesText}`
            : `Presensi Keluar (${distanceMeters}m dari ${targetPoolInfo.name})`,
          photo: photoToSend,
        });
      }

      setShowCheckoutNotesModal(false);
      setCheckoutNotes("");
      alert("✅ Presensi Keluar & Nilai Bintang Evaluasi Murid Berhasil Disimpan!");
      if (onClose) onClose();
    } catch (err: any) {
      alert(err?.message || "Gagal menyimpan presensi keluar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickChips = [
    "Teknik pernapasan sudah lancar",
    "Gaya dada 25m stabil tanpa henti",
    "Meluncur mandiri & streamline bagus",
    "Perlu pendalaman posisi kepala",
    "Stamina sangat baik sepanjang sesi",
  ];

  const appendQuickChip = (text: string) => {
    const activeKey =
      selectedStudentForReview ||
      activeSchedule?.studentNames?.[0] ||
      "Umum / Seluruh Murid";
    const currentRev = studentReviews[activeKey]?.notes || "";
    const updated = currentRev ? `${currentRev}\n• ${text}` : `• ${text}`;
    handleStudentNoteChange(updated);
  };

  const appendStudentTag = (studentName: string) => {
    setSelectedStudentForReview(studentName);
  };

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

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

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
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5 mx-auto"
            >
              <RotateCw size={14} />
              <span>Buka Kamera Lagi</span>
            </button>
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

      {/* Top & Bottom Cinematic Shadows */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none z-10" />

      {/* =========================================================================
          TOP FLOATING APP BAR & STATUS PILLS
          ========================================================================= */}
      <div className="relative z-20 w-full max-w-md mx-auto pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.25rem))] px-4 space-y-2">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white transition active:scale-90 cursor-pointer shadow-lg"
              title="Kembali"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white drop-shadow-md">
                  {chosenMode === "masuk" ? "Presensi Masuk" : "Presensi Keluar"}
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                    chosenMode === "masuk"
                      ? "bg-blue-500/40 text-blue-200 border border-blue-400/40"
                      : "bg-emerald-500/40 text-emerald-200 border border-emerald-400/40"
                  }`}
                >
                  {chosenMode === "masuk" ? "Awal Sesi" : "Selesai Sesi"}
                </span>
              </div>
              <p className="text-[10px] text-cyan-200 font-semibold drop-shadow-sm flex items-center gap-1 mt-0.5 font-mono">
                <Clock size={11} /> {formattedDateTime}
              </p>
            </div>
          </div>

          {/* Quick Mode & GPS Drawer Switchers */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGpsDrawer((prev) => !prev)}
              className="h-9 w-9 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg"
              title="Simulasi Radius GPS"
            >
              <Sliders size={15} />
            </button>

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
              className="px-3 py-2 rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-[11px] font-bold text-slate-100 hover:text-white transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-lg"
            >
              <span>{chosenMode === "masuk" ? "Ke Keluar" : "Ke Masuk"}</span>
            </button>
          </div>
        </div>

        {/* Floating Minimalist Capsule Info Bar */}
        <div className="rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 p-2.5 shadow-xl flex items-center justify-between gap-2">
          {/* Active Schedule Pill */}
          <button
            onClick={() => setShowScheduleSelector(true)}
            className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition cursor-pointer"
          >
            <div className="h-8 w-8 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0">
              <Waves size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-white truncate leading-tight">
                {activeSchedule ? activeSchedule.title || activeSchedule.class : "Pilih Jadwal Sesi"}
              </p>
              <p className="text-[10px] text-cyan-200 truncate mt-0.5">
                {activeSchedule?.timeStart || "--:--"} - {activeSchedule?.timeEnd || "--:--"} WIB • {activeSchedule?.poolArea || "Kolam Renang"}
              </p>
            </div>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
          </button>

          {/* Live Radius Badge */}
          <div
            className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 border flex items-center gap-1 ${
              isLocationValid
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                : "bg-rose-500/20 text-rose-300 border-rose-400/30 animate-pulse"
            }`}
          >
            <MapPin size={11} />
            <span>{distanceMeters >= 1000 ? `${distanceKm}km` : `${distanceMeters}m`}</span>
          </div>
        </div>

        {/* NO SESSION TODAY WARNING BANNER */}
        {todayCoachSchedules.length === 0 && (
          <div className="p-3 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/40 text-amber-200 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg animate-fadeIn">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <span>Tidak ada jadwal sesi latihan hari ini ({currentDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}). Presensi dinonaktifkan.</span>
          </div>
        )}

        {/* IN-SESSION SHORTCUT BANNER (If already checked in and in "keluar" mode) */}
        {isAlreadyCheckedIn && !isAlreadyCheckedOut && (
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-900/70 to-indigo-900/70 backdrop-blur-md border border-blue-400/30 flex items-center justify-between gap-2 text-white animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <p className="text-xs font-bold truncate">Sesi Renang Sedang Berlangsung</p>
            </div>
            {onSwitchToStudentChecklist && (
              <button
                type="button"
                onClick={() => onSwitchToStudentChecklist(activeSchedule?.id || "")}
                className="px-3 py-1 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-black transition cursor-pointer shrink-0 shadow-sm active:scale-95 flex items-center gap-1"
              >
                <ClipboardList size={13} />
                <span>Absen Murid</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          BOTTOM CAMERA ACTION BAR & SHUTTER BUTTON
          ========================================================================= */}
      <div className="relative z-20 w-full max-w-md mx-auto pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] px-6 flex items-center justify-around">
        {/* Flash / Torch Button */}
        <button
          onClick={toggleFlash}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl backdrop-blur-md border transition active:scale-90 cursor-pointer shadow-lg ${
            isFlashActive
              ? "bg-amber-400 text-slate-900 border-amber-300 ring-4 ring-amber-400/40"
              : "bg-black/40 hover:bg-black/60 border-white/20 text-white"
          }`}
          title="Nyalakan Lampu"
        >
          <Zap size={18} />
        </button>

        {/* Large Smart Shutter Button */}
        <div className="relative">
          <button
            onClick={handleShutterPress}
            disabled={isSubmitting || isCurrentModeCompleted}
            className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-all duration-150 cursor-pointer shadow-2xl active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${
              isCurrentModeCompleted
                ? "bg-emerald-500/80 border-emerald-300"
                : chosenMode === "keluar"
                ? "bg-emerald-500/20 hover:scale-105 border-emerald-400"
                : "bg-blue-500/20 hover:scale-105 border-blue-400"
            }`}
            title={
              chosenMode === "masuk"
                ? "Ambil Foto Selfie & Presensi Masuk"
                : "Ambil Foto Selesai Sesi & Kirim Catatan"
            }
          >
            <div
              className={`h-16 w-16 rounded-full transition-all shadow-inner flex items-center justify-center ${
                isCurrentModeCompleted
                  ? "bg-emerald-400 text-white font-black"
                  : isSubmitting
                  ? "bg-cyan-400 animate-ping"
                  : chosenMode === "keluar"
                  ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black shadow-lg shadow-emerald-500/40"
                  : "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black shadow-lg shadow-blue-500/40"
              }`}
            >
              {isCurrentModeCompleted ? (
                <Check size={28} />
              ) : chosenMode === "keluar" ? (
                <FileText size={22} />
              ) : (
                <Camera size={24} />
              )}
            </div>
          </button>
        </div>

        {/* Switch / Flip Camera Button */}
        <button
          onClick={flipCamera}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white transition active:scale-90 cursor-pointer shadow-lg"
          title="Balik Kamera Depan / Belakang"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* =========================================================================
          COLLAPSIBLE GPS DIAGNOSTIC DRAWER
          ========================================================================= */}
      {showGpsDrawer && (
        <div className="absolute inset-x-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-white/15 p-5 rounded-t-3xl space-y-3 animate-fadeIn text-white max-w-md mx-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <MapPin size={14} className="text-cyan-400" />
              <span>Pengaturan Simulasi Radius GPS</span>
            </span>
            <button
              onClick={() => setShowGpsDrawer(false)}
              className="p-1 rounded-xl text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => applyRadiusPreset("at_pool")}
              className={`py-2 px-2.5 rounded-xl border font-bold transition text-left flex items-center justify-between ${
                radiusSimPreset === "at_pool"
                  ? "bg-blue-600 text-white border-blue-400"
                  : "bg-white/5 border-white/10 text-slate-300"
              }`}
            >
              <span>🏊 Titik Kolam</span>
              <span className="opacity-70 text-[10px]">15m</span>
            </button>
            <button
              type="button"
              onClick={() => applyRadiusPreset("near_pool")}
              className={`py-2 px-2.5 rounded-xl border font-bold transition text-left flex items-center justify-between ${
                radiusSimPreset === "near_pool"
                  ? "bg-blue-600 text-white border-blue-400"
                  : "bg-white/5 border-white/10 text-slate-300"
              }`}
            >
              <span>🎯 Dekat Kolam</span>
              <span className="opacity-70 text-[10px]">150m</span>
            </button>
            <button
              type="button"
              onClick={() => applyRadiusPreset("radius_limit")}
              className={`py-2 px-2.5 rounded-xl border font-bold transition text-left flex items-center justify-between ${
                radiusSimPreset === "radius_limit"
                  ? "bg-amber-600 text-white border-amber-400"
                  : "bg-white/5 border-white/10 text-slate-300"
              }`}
            >
              <span>🚶 Batas Radius</span>
              <span className="opacity-70 text-[10px]">1.8km</span>
            </button>
            <button
              type="button"
              onClick={() => applyRadiusPreset("out_of_radius")}
              className={`py-2 px-2.5 rounded-xl border font-bold transition text-left flex items-center justify-between ${
                radiusSimPreset === "out_of_radius"
                  ? "bg-rose-600 text-white border-rose-400"
                  : "bg-white/5 border-white/10 text-slate-300"
              }`}
            >
              <span>🚫 Di Luar</span>
              <span className="opacity-70 text-[10px]">3.5km</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => applyRadiusPreset("device")}
            className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
              radiusSimPreset === "device"
                ? "bg-blue-600 text-white border-blue-400"
                : "bg-white/5 border-white/10 text-slate-300"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <RotateCw size={13} className={locationLoading ? "animate-spin" : ""} />
              <span>Gunakan GPS Asli Perangkat</span>
            </span>
            <span className="text-[10px] opacity-75">
              {locationLoading ? "Mencari..." : "Live"}
            </span>
          </button>
        </div>
      )}

      {/* =========================================================================
          MODAL: PRESENSI KELUAR & CATATAN PERKEMBANGAN SISWA (WITH VOICE INPUT)
          ========================================================================= */}
      {/* =========================================================================
          MODAL: PRESENSI KELUAR & REVIEW EVALUASI SISWA (STAR RATINGS & NOTES)
          ========================================================================= */}
      {showCheckoutNotesModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                  <Award size={22} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    Evaluasi &amp; Presensi Selesai Sesi
                  </h3>
                  <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                    {activeSchedule?.title || activeSchedule?.class} • {activeSchedule?.poolArea}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckoutNotesModal(false)}
                className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Snapshot Preview */}
            {capturedPhotoUrl && (
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                <img
                  src={capturedPhotoUrl}
                  alt="Snapshot Selfie"
                  className="h-11 w-11 rounded-xl object-cover border border-emerald-300 shadow-xs shrink-0"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-bold text-slate-900 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" /> Foto Presensi Keluar Terverifikasi
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {formattedDateTime}
                  </p>
                </div>
              </div>
            )}

            {/* Student Selector Tabs */}
            <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                  <User size={13} className="text-blue-600" />
                  <span>Pilih Siswa yang Dinilai:</span>
                </span>
                {(activeSchedule?.studentNames?.length || 0) > 1 && (
                  <button
                    type="button"
                    onClick={applyRatingsToAllStudents}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <Award size={11} />
                    <span>Terapkan ke Semua Siswa</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {(activeSchedule?.studentNames && activeSchedule.studentNames.length > 0
                  ? activeSchedule.studentNames
                  : ["Umum / Seluruh Murid"]
                ).map((stName, idx) => {
                  const isSelected = selectedStudentForReview === stName;
                  const currentReview = studentReviews[stName];
                  const avgRating = currentReview
                    ? (
                        (currentReview.floating +
                          currentReview.kicking +
                          currentReview.arms +
                          currentReview.breathing) /
                        4
                      ).toFixed(1)
                    : "4.5";

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedStudentForReview(stName);
                        if (currentReview?.notes) {
                          setCheckoutNotes(currentReview.notes);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30 scale-[1.02]"
                          : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <User size={12} className={isSelected ? "text-white" : "text-slate-400"} />
                      <span>{stName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-black flex items-center gap-0.5 ${
                          isSelected
                            ? "bg-blue-700 text-amber-300"
                            : "bg-amber-50 text-amber-700 border border-amber-200/60"
                        }`}
                      >
                        <Star size={9} className="fill-amber-400 text-amber-400" />
                        {avgRating}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Core 4 Skills Rating matching Student Progress Tab */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Star size={14} className="text-amber-500 fill-amber-400" />
                  <span>Rating Kompetensi Progres ({selectedStudentForReview || "Murid"})</span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  Klik bintang (1 - 5 ⭐)
                </span>
              </div>

              <div className="space-y-2">
                {SKILL_CATEGORIES.map((skill) => {
                  const activeStudentKey =
                    selectedStudentForReview ||
                    activeSchedule?.studentNames?.[0] ||
                    "Umum / Seluruh Murid";
                  const currentScore =
                    studentReviews[activeStudentKey]?.[skill.key] ?? 5;

                  return (
                    <div
                      key={skill.key}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/40 border border-slate-200/90 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-black text-slate-800 leading-tight">
                            {skill.label}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {skill.desc}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-100/80 text-amber-800 border border-amber-200">
                          {getStarLabel(currentScore)}
                        </span>
                      </div>

                      {/* Interactive 5-Star Row */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((starVal) => {
                            const isFilled = starVal <= currentScore;
                            return (
                              <button
                                key={starVal}
                                type="button"
                                onClick={() => handleSkillRatingChange(skill.key, starVal)}
                                className={`p-1.5 rounded-xl transition-all cursor-pointer active:scale-90 ${
                                  isFilled
                                    ? "bg-amber-50 hover:bg-amber-100 text-amber-400"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-300"
                                }`}
                                title={`${starVal} Bintang - ${skill.label}`}
                              >
                                <Star
                                  size={18}
                                  className={
                                    isFilled
                                      ? "fill-amber-400 text-amber-400 drop-shadow-2xs"
                                      : "text-slate-300"
                                  }
                                />
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-xs font-black text-slate-700 font-mono">
                          {currentScore} / 5
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Note Suggestions */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Opsi Cepat Catatan:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => appendQuickChip(chip)}
                    className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea + Voice Dictation Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Catatan Khusus untuk {selectedStudentForReview || "Murid"}:
                </label>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleVoiceDictation}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                      isListeningVoice
                        ? "bg-rose-500 text-white animate-pulse"
                        : "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                    }`}
                  >
                    {isListeningVoice ? <MicOff size={13} /> : <Mic size={13} />}
                    <span>{isListeningVoice ? "Mendengarkan..." : "Dikte Suara"}</span>
                  </button>
                )}
              </div>

              <textarea
                value={
                  selectedStudentForReview && studentReviews[selectedStudentForReview]
                    ? studentReviews[selectedStudentForReview].notes
                    : checkoutNotes
                }
                onChange={(e) => handleStudentNoteChange(e.target.value)}
                placeholder="Tulis evaluasi teknik, tips perbaikan, atau apresiasi untuk murid ini..."
                rows={2}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white leading-relaxed resize-none transition"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCheckoutNotesModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => submitPresensiKeluar()}
                disabled={isSubmitting}
                className="flex-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    <span>Menyimpan Evaluasi...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Kirim Presensi Keluar &amp; Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: LATE REASON
          ========================================================================= */}
      {showLateReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-100 p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center gap-2.5 text-amber-600 font-black">
              <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-900">Presensi Terlambat</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sesi latihan telah dimulai lebih dari 15 menit. Masukkan alasan keterlambatan:
            </p>
            <textarea
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="Contoh: Terkendala kemacetan di jalan..."
              rows={3}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowLateReasonModal(false)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => submitPresensiMasuk(lateReason || "Terlambat hadir")}
                className="flex-1 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95"
              >
                Kirim Presensi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CHECKOUT WARNING (IF NOT CHECKED IN FIRST)
          ========================================================================= */}
      {showCheckoutWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-100 p-6 space-y-4 shadow-2xl text-slate-900 text-center">
            <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-md">
              <AlertTriangle size={28} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">Belum Bisa Presensi Keluar</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda belum melakukan <strong>Presensi Masuk</strong> untuk sesi ini.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCheckoutWarningModal(false);
                  setChosenMode("masuk");
                }}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} />
                <span>Presensi Masuk Sekarang</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCheckoutWarningModal(false)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SCHEDULE SELECTOR (TODAY ONLY)
          ========================================================================= */}
      {showScheduleSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-100 p-5 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Pilih Sesi Jadwal Hari Ini</h3>
                <p className="text-[11px] text-slate-400">
                  {todayCoachSchedules.length} sesi dijadwalkan untuk hari ini ({currentDate.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })})
                </p>
              </div>
              <button
                onClick={() => setShowScheduleSelector(false)}
                className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs cursor-pointer transition"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {todayCoachSchedules.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Calendar size={32} className="text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Tidak ada jadwal sesi hari ini</p>
                  <p className="text-[11px] text-slate-400">
                    Presensi hanya dapat diambil saat ada jadwal sesi latihan hari ini.
                  </p>
                </div>
              ) : (
                todayCoachSchedules.map((s) => {
                  const isSelected = s.id === activeSchedule?.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedScheduleId(s.id);
                        setShowScheduleSelector(false);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-blue-50 border-blue-300 text-slate-900 font-bold shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-black text-slate-900">{s.title || s.class}</p>
                        <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {s.timeStart} - {s.timeEnd} WIB • <MapPin size={10} /> {s.poolArea}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {s.studentNames && s.studentNames.length > 0 ? `Siswa: ${s.studentNames.join(", ")}` : "Siswa: Belum ditentukan"}
                        </p>
                      </div>
                      {isSelected && <Check size={16} className="text-blue-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
