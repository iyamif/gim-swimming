import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Student, Coach, Invoice, ScheduleSession, AttendanceRecord, CheckInInput, AdminNotification } from "../types";
import EditProfileModal from "../EditProfileModal";
import PushNotificationCard from "../PushNotificationCard";
import {
  isImageAvatar,
  getAvatarImageUrl,
  updateAvatarPreset,
  POOL_VENUES,
  calculateDistanceKm,
  checkAttendanceTimeStatus,
  changeUserPassword,
  fetchCurrentUser,
  requestPasswordResetOTP,
  resetPasswordWithOTP,
} from "../../../lib/api";
import {
  Home,
  CalendarDays,
  Calendar,
  TrendingUp,
  User,
  Award,
  Camera,
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  CreditCard,
  Copy,
  Upload,
  FileText,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  MessageCircle,
  Download,
  LogOut,
  X,
  MapPin,
  RotateCw,
  Lightbulb,
  Megaphone,
  Send,
  Star,
  Sparkles,
  DollarSign,
  Info,
  Lock,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Shield,
  ShieldAlert,
  ExternalLink,
  Mail,
} from "lucide-react";

// Helper to compress and convert any uploaded image to an ultra-lightweight WebP/JPEG Base64 Data URL (~15-30KB)
function compressImage(file: File, maxDimension = 400, quality = 0.85): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ file, dataUrl: "" });
    };
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        resolve({ file, dataUrl: (e.target?.result as string) || "" });
      };
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve({ file, dataUrl: (e.target?.result as string) || "" });
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL("image/webp", quality);
          if (!dataUrl.startsWith("data:image/webp")) {
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
        } catch {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({ file, dataUrl });
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const optimizedFile = new File([blob], cleanName, {
              type: blob.type || "image/webp",
              lastModified: Date.now(),
            });
            resolve({ file: optimizedFile, dataUrl });
          },
          "image/webp",
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface ParentBodyProps {
  sessionUser?: string;
  sessionRole?: string;
  student: Student;
  coach: Coach;
  invoice?: Invoice;
  schedules?: ScheduleSession[];
  coaches?: Coach[];
  attendances?: AttendanceRecord[];
  notifications?: AdminNotification[];
  onUploadReceipt: (invoiceId: string) => void;
  onCheckInAttendance?: (input: CheckInInput) => Promise<boolean | void>;
  onMarkNotificationRead?: (id: number | string) => Promise<void>;
  onClearAllNotifications?: () => Promise<void>;
  showInstallBtn?: boolean;
  onInstallClick?: () => void;
  onLogout?: () => void;
  onRefresh?: () => Promise<void> | void;
}

export default function ParentBody({
  sessionUser,
  sessionRole = "orang tua",
  student,
  coach,
  invoice,
  schedules = [],
  coaches = [],
  attendances = [],
  notifications = [],
  onUploadReceipt,
  onCheckInAttendance,
  onMarkNotificationRead,
  onClearAllNotifications,
  showInstallBtn,
  onInstallClick,
  onLogout,
  onRefresh,
}: ParentBodyProps) {
  // Navigation tab state: home, jadwal, presensi, progres, profile, keuangan, reschedule, pengumuman
  const [parentActiveTab, setParentActiveTab] = useState<
    "home" | "jadwal" | "presensi" | "progres" | "profile" | "keuangan" | "reschedule" | "pengumuman"
  >("home");

  React.useEffect(() => {
    const handleSwitchTab = (e: any) => {
      if (
        e.detail &&
        [
          "home",
          "jadwal",
          "presensi",
          "progres",
          "profile",
          "keuangan",
          "reschedule",
          "pengumuman",
        ].includes(e.detail)
      ) {
        setParentActiveTab(e.detail);
      }
    };
    window.addEventListener("parent_switch_tab", handleSwitchTab);
    return () => window.removeEventListener("parent_switch_tab", handleSwitchTab);
  }, []);

  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Profile Sub-View Navigation: "main" | "profilku" | "password" | "notifikasi" | "faq"
  const [profileView, setProfileView] = useState<"main" | "profilku" | "password" | "notifikasi" | "faq">("main");
  const [profileLanguage, setProfileLanguage] = useState<"ID" | "EN">("ID");
  const [showProfileLogoutModal, setShowProfileLogoutModal] = useState(false);
  const [showProfileEmojiDrawer, setShowProfileEmojiDrawer] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(null);

  // Password Sub-View Modes: "direct" | "otp"
  const [profilePasswordMode, setProfilePasswordMode] = useState<"direct" | "otp">("direct");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [showProfileCurrentPassword, setShowProfileCurrentPassword] = useState(false);
  const [showProfileNewPassword, setShowProfileNewPassword] = useState(false);
  const [showProfileConfirmPassword, setShowProfileConfirmPassword] = useState(false);
  const [isProfileChangingPassword, setIsProfileChangingPassword] = useState(false);
  const [profilePasswordError, setProfilePasswordError] = useState("");
  const [profilePasswordSuccess, setProfilePasswordSuccess] = useState(false);

  // Email OTP Reset Password States
  const [profileResetEmail, setProfileResetEmail] = useState("");
  const [profileResetOtp, setProfileResetOtp] = useState("");
  const [profileResetNewPassword, setProfileResetNewPassword] = useState("");
  const [profileResetConfirmPassword, setProfileResetConfirmPassword] = useState("");
  const [showProfileResetNewPassword, setShowProfileResetNewPassword] = useState(false);
  const [showProfileResetConfirmPassword, setShowProfileResetConfirmPassword] = useState(false);
  const [isProfileSendingOtp, setIsProfileSendingOtp] = useState(false);
  const [isProfileResettingOtp, setIsProfileResettingOtp] = useState(false);
  const [profileOtpCountdown, setProfileOtpCountdown] = useState(0);
  const [profileOtpSentSuccess, setProfileOtpSentSuccess] = useState(false);
  const [profileMaskedEmailDisplay, setProfileMaskedEmailDisplay] = useState("");
  const [profileResetPasswordError, setProfileResetPasswordError] = useState("");
  const [profileResetPasswordSuccess, setProfileResetPasswordSuccess] = useState(false);

  const [expandedProfileFaq, setExpandedProfileFaq] = useState<number | null>(0);

  // Direct Avatar Upload from Gallery States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarSaveSuccess, setAvatarSaveSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Reschedule Form States
  const [rescheduleSessionId, setRescheduleSessionId] = useState("");
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState("");
  const [rescheduleTargetTime, setRescheduleTargetTime] = useState("08:00");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleSent, setRescheduleSent] = useState(false);

  // GPS Geolocation & Attendance States
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [useSimulatedPoolLocation, setUseSimulatedPoolLocation] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lateReasonModalSchedule, setLateReasonModalSchedule] = useState<ScheduleSession | null>(null);
  const [lateReasonText, setLateReasonText] = useState("");

  const requestDeviceLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Browser tidak mendukung GPS Geolocation");
      return;
    }
    setIsLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn("GPS error:", err.message);
        setLocationError("Gagal mendeteksi lokasi GPS perangkat");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    requestDeviceLocation();
  }, []);

  // Progress Report (Rapor) States & Past Evaluations
  const [showAllPastEvaluations, setShowAllPastEvaluations] = useState(false);
  const [selectedPastEval, setSelectedPastEval] = useState<{
    period: string;
    level: string;
    attendance: string;
    skills: { name: string; stars: number }[];
    notes: string;
  } | null>(null);

  const pastEvaluations = [
    {
      period: "Agustus 2026",
      level: student?.class || "Intermediate",
      attendance: "95%",
      skills: [
        { name: "Floating", stars: 5 },
        { name: "Kicking", stars: 5 },
        { name: "Arms", stars: 5 },
        { name: "Breathing", stars: 4 },
      ],
      notes: `Coach ${coach.name}: "Latihan gerakan lengan dan pernapasan menunjukkan kemajuan pesat pada periode ini."`,
    },
    {
      period: "Juli 2026",
      level: student?.class || "Intermediate",
      attendance: "90%",
      skills: [
        { name: "Floating", stars: 4 },
        { name: "Kicking", stars: 4 },
        { name: "Arms", stars: 4 },
        { name: "Breathing", stars: 3 },
      ],
      notes: `Coach ${coach.name}: "Pengenalan teknik dasar berjalan lancar, anak sangat antusias dan berani di dalam air."`,
    },
  ];

  const handleDownloadPDF = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Load avatar for current student / user
  const effectiveUsername = sessionUser || student.name;
  const loadAvatar = () => {
    if (effectiveUsername) {
      const saved = localStorage.getItem(`gim_avatar_${effectiveUsername}`) || "";
      setUserAvatar(saved);
    }
  };

  useEffect(() => {
    loadAvatar();
    const handleAvatarUpdate = () => loadAvatar();
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, [effectiveUsername]);

  const initialLetter = effectiveUsername ? effectiveUsername.charAt(0).toUpperCase() : "S";
  const isCustomImage = isImageAvatar(userAvatar);

  // Save new avatar directly to PostgreSQL database
  const saveAvatarDirectly = async (avatarDataUrl: string) => {
    if (!effectiveUsername) return;
    try {
      setIsSavingAvatar(true);
      setAvatarError("");

      const finalAvatar = await updateAvatarPreset(avatarDataUrl);

      if (finalAvatar) {
        localStorage.setItem(`gim_avatar_${effectiveUsername}`, finalAvatar);
        localStorage.setItem(`gim_avatar_${effectiveUsername.toLowerCase()}`, finalAvatar);
        localStorage.setItem(
          `gim_avatar_${effectiveUsername.charAt(0).toUpperCase() + effectiveUsername.slice(1)}`,
          finalAvatar
        );
        if (student.name && student.name !== effectiveUsername) {
          localStorage.setItem(`gim_avatar_${student.name}`, finalAvatar);
        }
      } else {
        localStorage.removeItem(`gim_avatar_${effectiveUsername}`);
        localStorage.removeItem(`gim_avatar_${effectiveUsername.toLowerCase()}`);
      }

      setUserAvatar(finalAvatar);
      window.dispatchEvent(new Event("avatar_updated"));

      setAvatarSaveSuccess(true);
      setTimeout(() => setAvatarSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error("Save avatar error:", err);
      setAvatarError(err.message || "Gagal memperbarui foto profil");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // Instant upload from gallery selection when user clicks avatar
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    try {
      setIsSavingAvatar(true);
      setAvatarError("");
      const { dataUrl } = await compressImage(rawFile, 400, 0.85);
      await saveAvatarDirectly(dataUrl);
    } catch (err: any) {
      console.error("Error processing avatar image file:", err);
      setAvatarError("Gagal memproses gambar foto");
      setIsSavingAvatar(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Manual Refresh Handler
  const handleManualRefresh = async () => {
    if (onRefresh && !isRefreshingLocal) {
      setIsRefreshingLocal(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshingLocal(false), 600);
      }
    }
  };

  // Copy BCA Account
  const handleCopyBCA = () => {
    navigator.clipboard.writeText("88921-2291");
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  // OTP Countdown timer for profile reset
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (profileOtpCountdown > 0) {
      timer = setTimeout(() => setProfileOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [profileOtpCountdown]);

  // Load current user details from API
  useEffect(() => {
    fetchCurrentUser()
      .then((u) => {
        if (u) {
          setCurrentUserData(u);
          if (u.email && !profileResetEmail) {
            setProfileResetEmail(u.email);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Direct Change Password in Profile
  const handleProfileChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfilePasswordError("");
    setProfilePasswordSuccess(false);

    if (!profileCurrentPassword) {
      setProfilePasswordError("Masukkan kata sandi saat ini");
      return;
    }
    if (profileNewPassword.length < 6) {
      setProfilePasswordError("Kata sandi baru minimal 6 karakter");
      return;
    }
    if (profileNewPassword !== profileConfirmPassword) {
      setProfilePasswordError("Konfirmasi kata sandi baru tidak cocok");
      return;
    }
    if (profileNewPassword === profileCurrentPassword) {
      setProfilePasswordError("Kata sandi baru tidak boleh sama dengan kata sandi saat ini");
      return;
    }

    try {
      setIsProfileChangingPassword(true);
      await changeUserPassword(profileCurrentPassword, profileNewPassword);
      setProfilePasswordSuccess(true);
      setProfileCurrentPassword("");
      setProfileNewPassword("");
      setProfileConfirmPassword("");
      setTimeout(() => setProfilePasswordSuccess(false), 4000);
    } catch (err: any) {
      setProfilePasswordError(err.message || "Gagal memperbarui kata sandi. Pastikan kata sandi saat ini benar.");
    } finally {
      setIsProfileChangingPassword(false);
    }
  };

  // Send Reset Password OTP via Email in Profile
  const handleProfileSendResetOTP = async () => {
    const studentEmailFallback = student.email || `${student.name.toLowerCase().replace(/\s+/g, "")}@gimswimming.com`;
    const emailToUse = profileResetEmail.trim() || currentUserData?.email || studentEmailFallback;
    if (!emailToUse) {
      setProfileResetPasswordError("Alamat email tidak ditemukan. Masukkan alamat email akun Anda.");
      return;
    }
    setProfileResetPasswordError("");
    try {
      setIsProfileSendingOtp(true);
      const res = await requestPasswordResetOTP(emailToUse);
      setProfileOtpSentSuccess(true);
      setProfileMaskedEmailDisplay(res.data?.masked_email || emailToUse);
      setProfileOtpCountdown(60);
    } catch (err: any) {
      setProfileResetPasswordError(err.message || "Gagal mengirim kode verifikasi ke email");
    } finally {
      setIsProfileSendingOtp(false);
    }
  };

  // Reset Password using OTP & New Password in Profile
  const handleProfileResetPasswordWithOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileResetPasswordError("");
    setProfileResetPasswordSuccess(false);

    const studentEmailFallback = student.email || `${student.name.toLowerCase().replace(/\s+/g, "")}@gimswimming.com`;
    const emailToUse = profileResetEmail.trim() || currentUserData?.email || studentEmailFallback;
    if (!emailToUse) {
      setProfileResetPasswordError("Alamat email tidak ditemukan. Masukkan email Anda.");
      return;
    }
    if (!profileResetOtp.trim() || profileResetOtp.trim().length !== 6) {
      setProfileResetPasswordError("Masukkan 6-digit kode verifikasi yang dikirim ke email");
      return;
    }
    if (profileResetNewPassword.length < 6) {
      setProfileResetPasswordError("Kata sandi baru minimal 6 karakter");
      return;
    }
    if (profileResetNewPassword !== profileResetConfirmPassword) {
      setProfileResetPasswordError("Konfirmasi kata sandi baru tidak cocok");
      return;
    }

    try {
      setIsProfileResettingOtp(true);
      await resetPasswordWithOTP(emailToUse, profileResetOtp.trim(), profileResetNewPassword);
      setProfileResetPasswordSuccess(true);
      setProfileResetOtp("");
      setProfileResetNewPassword("");
      setProfileResetConfirmPassword("");
      setTimeout(() => {
        setProfileResetPasswordSuccess(false);
      }, 5000);
    } catch (err: any) {
      setProfileResetPasswordError(err.message || "Gagal mereset kata sandi. Pastikan kode verifikasi benar.");
    } finally {
      setIsProfileResettingOtp(false);
    }
  };

  // Week & Month View State for Calendar
  const [calendarViewMode, setCalendarViewMode] = useState<"week" | "month">("week");
  const [weekAnchorDate, setWeekAnchorDate] = useState<Date>(new Date());
  const [monthAnchorDate, setMonthAnchorDate] = useState<Date>(new Date());
  const [selectedDateDetails, setSelectedDateDetails] = useState<{
    dateISO: string;
    dayNumber: number;
    dayName: string;
    fullDateStr: string;
    dayOfWeek: number;
  } | null>(null);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const dayNamesShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const dayNamesFull = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const toLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // 7 Days of the Week
  const getWeekDates = (anchor: Date) => {
    const curr = new Date(anchor);
    const day = curr.getDay();
    const firstDay = new Date(curr);
    firstDay.setDate(curr.getDate() - day);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDay);
      d.setDate(firstDay.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDays = getWeekDates(weekAnchorDate);

  // Month Matrix
  const getMonthDays = (anchor: Date) => {
    const year = anchor.getFullYear();
    const month = anchor.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();

    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const days: { dateObj: Date; isCurrentMonth: boolean }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDate - i);
      days.push({ dateObj: d, isCurrentMonth: false });
    }

    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      days.push({ dateObj: d, isCurrentMonth: true });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ dateObj: d, isCurrentMonth: false });
    }

    return days;
  };

  const monthDays = getMonthDays(monthAnchorDate);

  const handlePrev = () => {
    if (calendarViewMode === "week") {
      const prev = new Date(weekAnchorDate);
      prev.setDate(weekAnchorDate.getDate() - 7);
      setWeekAnchorDate(prev);
    } else {
      const prev = new Date(monthAnchorDate);
      prev.setMonth(monthAnchorDate.getMonth() - 1);
      setMonthAnchorDate(prev);
    }
  };

  const handleNext = () => {
    if (calendarViewMode === "week") {
      const next = new Date(weekAnchorDate);
      next.setDate(weekAnchorDate.getDate() + 7);
      setWeekAnchorDate(next);
    } else {
      const next = new Date(monthAnchorDate);
      next.setMonth(monthAnchorDate.getMonth() + 1);
      setMonthAnchorDate(next);
    }
  };

  const handleCurrent = () => {
    const now = new Date();
    setWeekAnchorDate(now);
    setMonthAnchorDate(now);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const handleDateClick = (dateObj: Date) => {
    const dayOfWeek = dateObj.getDay();
    const dayName = dayNamesFull[dayOfWeek];
    const fullDateStr = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    const dateISO = toLocalISO(dateObj);

    setSelectedDateDetails({
      dateISO,
      dayNumber: dateObj.getDate(),
      dayName,
      fullDateStr,
      dayOfWeek,
    });
  };

  // Filter schedules relevant to this student
  const isScheduleForThisStudent = (s: ScheduleSession) => {
    if (!student) return false;
    const stId = String(student.id || "");
    const stName = (student.name || "").toLowerCase().trim();
    const stClass = (student.class || "").toLowerCase().trim();

    if (s.studentIds && s.studentIds.some((id) => String(id) === stId)) {
      return true;
    }
    if (
      s.studentNames &&
      s.studentNames.some(
        (name) =>
          name.toLowerCase().trim() === stName ||
          name.toLowerCase().includes(stName) ||
          stName.includes(name.toLowerCase().trim())
      )
    ) {
      return true;
    }
    if (
      (!s.studentNames || s.studentNames.length === 0) &&
      (!s.studentIds || s.studentIds.length === 0) &&
      s.class &&
      s.class.toLowerCase().trim() === stClass
    ) {
      return true;
    }
    return false;
  };

  const studentSchedules = schedules.filter(isScheduleForThisStudent);

  const getSchedulesForSelectedDate = (dateISO: string) => {
    const customForDate = studentSchedules.filter((s) => s.date === dateISO);
    return customForDate.map((cs) => {
      const coachObj =
        coaches.find((c) => c.id === cs.coachId || c.name === cs.coachName) || coach;
      return {
        id: cs.id,
        time: `${cs.timeStart} - ${cs.timeEnd} WIB`,
        sessionTitle: cs.title,
        poolArea: cs.poolArea,
        coach: {
          name: cs.coachName || coachObj?.name || "Pelatih GIM",
          spec: cs.class || coachObj?.spec || "Instruktur Renang",
          phone: cs.coachPhone || coachObj?.phone || "08123456780",
        },
        type: cs.class,
        notes: cs.notes,
      };
    });
  };

  const firstWeekMonth = monthNames[weekDays[0].getMonth()];
  const lastWeekMonth = monthNames[weekDays[6].getMonth()];
  const weekMonthLabel =
    firstWeekMonth === lastWeekMonth
      ? `${firstWeekMonth} ${weekDays[0].getFullYear()}`
      : `${firstWeekMonth} - ${lastWeekMonth} ${weekDays[6].getFullYear()}`;
  const currentMonthLabel = `${monthNames[monthAnchorDate.getMonth()]} ${monthAnchorDate.getFullYear()}`;
  const activeCalendarLabel =
    calendarViewMode === "week" ? weekMonthLabel : currentMonthLabel;

  const todayISO = toLocalISO(new Date());
  const now = new Date();
  const todayFormatted = `${dayNamesFull[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  const todayStudentSchedules = studentSchedules.filter((s) => s.date === todayISO);

  // Student Attendances from DB
  const studentAttendances = attendances.filter(
    (a) =>
      a.person_type === "student" &&
      (String(a.person_id) === String(student.id) ||
        a.person_name?.toLowerCase().trim() === student.name.toLowerCase().trim() ||
        a.person_name?.toLowerCase().includes(student.name.toLowerCase().trim()) ||
        student.name.toLowerCase().includes(a.person_name?.toLowerCase().trim() || ""))
  );

  // Computed real session history from admin schedules & attendances (past and today)
  const parentStudentHistory = useMemo(() => {
    const pastAndTodaySchedules = studentSchedules.filter((s) => !s.date || s.date <= todayISO);

    const scheduleItems = pastAndTodaySchedules.map((sch) => {
      const att = attendances.find((a) => {
        const isStudentMatch =
          a.person_type === "student" &&
          (String(a.person_id) === String(student.id) ||
            a.person_name?.toLowerCase().trim() === student.name.toLowerCase().trim() ||
            a.person_name?.toLowerCase().includes(student.name.toLowerCase().trim()) ||
            student.name.toLowerCase().includes(a.person_name?.toLowerCase().trim() || ""));

        const isScheduleMatch =
          (a.schedule_id && String(a.schedule_id) === String(sch.id)) ||
          (a.date && sch.date && a.date === sch.date);

        return isStudentMatch && isScheduleMatch;
      });

      const status = att ? att.status : "Hadir";
      const isLate = att?.is_late || status === "Terlambat";

      return {
        id: sch.id,
        date: sch.date || todayISO,
        title: sch.title || `${sch.class} Class`,
        time: sch.timeStart ? `${sch.timeStart} - ${sch.timeEnd} WIB` : "Selesai",
        poolArea: sch.poolArea || "Kolam Renang",
        coachName: sch.coachName || coach.name,
        status: status,
        isLate: isLate,
        lateReason: att?.late_reason || "",
        distance_km: att?.distance_km,
      };
    });

    const standalone = studentAttendances
      .filter(
        (a) =>
          !pastAndTodaySchedules.some(
            (sch) => String(sch.id) === String(a.schedule_id) || sch.date === a.date
          )
      )
      .map((att) => ({
        id: `att-${att.id}`,
        date: att.date || todayISO,
        title: att.schedule_title || att.class || `${student.class} Class`,
        time:
          att.time_recorded ||
          (att.created_at
            ? `${new Date(att.created_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })} WIB`
            : "Selesai"),
        poolArea: att.pool_area || "Kolam Renang",
        coachName: coach.name,
        status: att.status || (att.is_late ? "Terlambat" : "Hadir"),
        isLate: att.is_late || att.status === "Terlambat",
        lateReason: att.late_reason || "",
        distance_km: att.distance_km,
      }));

    return [...scheduleItems, ...standalone].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [studentSchedules, studentAttendances, todayISO, coach.name, student.name, student.id, student.class, attendances]);

  const lastSession = parentStudentHistory[0]
    ? { date: parentStudentHistory[0].date, status: parentStudentHistory[0].status }
    : { date: "-", status: "-" };
  const completedSessionsCount = parentStudentHistory.length;
  // Muncul setelah sesi ke-3 dilakukan (completedSessionsCount >= 3) dan jika memang belum lunas
  const showSPPReminder = completedSessionsCount >= 3 && invoice && invoice.status !== "Lunas";

  // Sesi yang sudah benar-benar dihadiri / diselesaikan oleh siswa
  const attendedSessions = useMemo(() => {
    return parentStudentHistory.filter(
      (s) => s.status === "Hadir" || s.status === "Terlambat" || s.status === "Selesai"
    );
  }, [parentStudentHistory]);

  // Catatan evaluasi / laporan perkembangan dari pelatih (dari checkout pelatih saat selesai absen, jadwal, dan absensi)
  const coachEvaluationsList = useMemo(() => {
    const list: {
      id: string;
      date: string;
      title: string;
      coachName: string;
      notes: string;
      status: string;
      rawDate: string;
    }[] = [];

    const seenNotes = new Set<string>();

    // 1. Dari data checkout / presensi pelatih & siswa untuk jadwal yang diikuti siswa ini
    attendances.forEach((att) => {
      if (att.notes && att.notes.trim() !== "") {
        // Cek apakah presensi ini terkait dengan jadwal siswa atau nama siswa
        const isStudentSchedule = studentSchedules.some((s) => String(s.id) === String(att.schedule_id));
        const isStudentDirect =
          att.person_type === "student" &&
          (String(att.person_id) === String(student.id) ||
            att.person_name?.toLowerCase().includes(student.name.toLowerCase().trim()) ||
            student.name.toLowerCase().includes(att.person_name?.toLowerCase().trim() || ""));

        if (isStudentSchedule || isStudentDirect) {
          // Bersihkan prefix "Presensi Keluar: " jika ada agar teks laporan rapi
          const cleanNotes = att.notes.replace(/^Presensi Keluar:\s*/i, "").trim();
          const key = `${att.date || ""}-${cleanNotes}`;
          if (cleanNotes && !seenNotes.has(key)) {
            seenNotes.add(key);
            list.push({
              id: `att-${att.id}`,
              date: att.date || (att.created_at ? att.created_at.split("T")[0] : todayISO),
              title: att.schedule_title || att.class || `${student.class} Class`,
              coachName: att.person_type === "coach" ? att.person_name : coach.name,
              notes: cleanNotes,
              status: att.status || "Selesai",
              rawDate: att.created_at || att.date || todayISO,
            });
          }
        }
      }
    });

    // 2. Dari catatan pada jadwal sesi (schedule.notes) yang diikuti siswa
    studentSchedules.forEach((sch) => {
      if (sch.notes && sch.notes.trim() !== "") {
        const cleanNotes = sch.notes.replace(/^Presensi Keluar:\s*/i, "").trim();
        const key = `${sch.date || ""}-${cleanNotes}`;
        if (cleanNotes && !seenNotes.has(key)) {
          seenNotes.add(key);
          list.push({
            id: `sch-${sch.id}`,
            date: sch.date || todayISO,
            title: sch.title || `${sch.class} Class`,
            coachName: sch.coachName || coach.name,
            notes: cleanNotes,
            status: "Selesai",
            rawDate: sch.date || todayISO,
          });
        }
      }
    });

    // 3. Dari catatan student.notes jika ada
    if (student.notes && student.notes.trim() !== "") {
      const cleanNotes = student.notes.trim();
      const key = `student-note-${cleanNotes}`;
      if (!seenNotes.has(key)) {
        seenNotes.add(key);
        list.push({
          id: `student-note`,
          date: todayISO,
          title: `${student.class} Class`,
          coachName: coach.name,
          notes: cleanNotes,
          status: "Selesai",
          rawDate: todayISO,
        });
      }
    }

    // Urutkan dari laporan terbaru ke terlama
    return list.sort((a, b) => (b.rawDate || b.date).localeCompare(a.rawDate || a.date));
  }, [attendances, studentSchedules, student.id, student.name, student.notes, student.class, coach.name, todayISO]);

  const latestCoachEvaluation = coachEvaluationsList[0] || null;

  // Real-time listener & state for student skills evaluated by coach
  const [evaluationRevision, setEvaluationRevision] = useState<number>(0);

  useEffect(() => {
    const handleEvalUpdate = () => {
      setEvaluationRevision((v) => v + 1);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("student_evaluation_updated", handleEvalUpdate);
      window.addEventListener("storage", handleEvalUpdate);
      return () => {
        window.removeEventListener("student_evaluation_updated", handleEvalUpdate);
        window.removeEventListener("storage", handleEvalUpdate);
      };
    }
  }, []);

  const latestSavedSkillReview = useMemo(() => {
    if (typeof window === "undefined") return null;
    const rawById = student.id ? localStorage.getItem(`gim_student_skills_${student.id}`) : null;
    if (rawById) {
      try {
        return JSON.parse(rawById);
      } catch {}
    }
    const rawByName = student.name ? localStorage.getItem(`gim_student_skills_${student.name.toLowerCase().trim()}`) : null;
    if (rawByName) {
      try {
        return JSON.parse(rawByName);
      } catch {}
    }
    return null;
  }, [student.id, student.name, evaluationRevision]);

  const studentSkillRatings = useMemo(() => {
    // 1. Saved review from Coach Checkout
    if (latestSavedSkillReview) {
      return {
        floating: Number(latestSavedSkillReview.floating) || 5,
        kicking: Number(latestSavedSkillReview.kicking) || 4,
        arms: Number(latestSavedSkillReview.arms) || 5,
        breathing: Number(latestSavedSkillReview.breathing) || 4,
        notes: latestSavedSkillReview.notes || latestCoachEvaluation?.notes || "",
        coachName: latestSavedSkillReview.coachName || latestCoachEvaluation?.coachName || coach.name,
        date: latestSavedSkillReview.date || latestCoachEvaluation?.date || todayISO,
      };
    }

    // 2. Parse from latestCoachEvaluation.notes if formatted with stars
    if (latestCoachEvaluation?.notes) {
      const text = latestCoachEvaluation.notes;
      const getStarMatch = (keyword: string, fallback: number) => {
        const regex = new RegExp(`${keyword}[:\\s]+([1-5])(?:★|\\s*bintang|\\s*star|/5)?`, "i");
        const match = text.match(regex);
        return match ? parseInt(match[1], 10) : fallback;
      };

      const hasAnyMatch = /Meluncur|Kaki|Lengan|Napas|Pernapasan/i.test(text);
      if (hasAnyMatch) {
        return {
          floating: getStarMatch("Meluncur", 5),
          kicking: getStarMatch("Kaki", 4),
          arms: getStarMatch("Lengan", 5),
          breathing: getStarMatch("Napas|Pernapasan", 4),
          notes: latestCoachEvaluation.notes,
          coachName: latestCoachEvaluation.coachName,
          date: latestCoachEvaluation.date,
        };
      }
    }

    // 3. Fallback based on completed/attended sessions
    const count = attendedSessions.length;
    return {
      floating: Math.min(5, Math.max(3, count >= 3 ? 5 : 4)),
      kicking: Math.min(5, Math.max(3, count >= 2 ? 5 : 4)),
      arms: Math.min(5, Math.max(3, count >= 4 ? 5 : 4)),
      breathing: Math.min(5, Math.max(2, count >= 5 ? 5 : 4)),
      notes: latestCoachEvaluation?.notes || "",
      coachName: latestCoachEvaluation?.coachName || coach.name,
      date: latestCoachEvaluation?.date || todayISO,
    };
  }, [latestSavedSkillReview, latestCoachEvaluation, attendedSessions.length, coach.name, todayISO]);

  const hasEverAttendedSession = coachEvaluationsList.length > 0 || !!latestSavedSkillReview;

  // Today's scheduled session created by admin for this student
  const todayScheduleObj = studentSchedules.find((s) => s.date === todayISO) || null;
  const todaySession = todayScheduleObj
    ? {
      title: todayScheduleObj.title,
      class: todayScheduleObj.class,
      time: todayScheduleObj.timeStart && todayScheduleObj.timeEnd ? `${todayScheduleObj.timeStart} - ${todayScheduleObj.timeEnd} WIB` : todayScheduleObj.timeStart ? `${todayScheduleObj.timeStart} WIB` : "",
      poolArea: todayScheduleObj.poolArea,
      coach: {
        name: todayScheduleObj.coachName || coach.name,
        spec: todayScheduleObj.class || coach.spec,
        phone: todayScheduleObj.coachPhone || coach.phone,
      },
    }
    : null;

  // Upcoming scheduled session
  const upcomingScheduleObj =
    studentSchedules.find((s) => s.date && s.date >= todayISO) || todayScheduleObj || null;
  const upcomingSession = todaySession || (upcomingScheduleObj
    ? {
      title: upcomingScheduleObj.title,
      class: upcomingScheduleObj.class,
      time: upcomingScheduleObj.timeStart && upcomingScheduleObj.timeEnd ? `${upcomingScheduleObj.timeStart} - ${upcomingScheduleObj.timeEnd} WIB` : "",
      poolArea: upcomingScheduleObj.poolArea,
      coach: {
        name: upcomingScheduleObj.coachName || coach.name,
        spec: upcomingScheduleObj.class || coach.spec,
        phone: upcomingScheduleObj.coachPhone || coach.phone,
      },
    }
    : null);

  const getVenueCoords = (poolArea?: string) => {
    const p = poolArea?.toLowerCase() || "";
    if (p.includes("312") || p.includes("wera")) {
      return { lat: POOL_VENUES.wera.latitude, lng: POOL_VENUES.wera.longitude };
    }
    return { lat: POOL_VENUES.nalendra.latitude, lng: POOL_VENUES.nalendra.longitude };
  };

  const getEffectiveCoords = (schedulePoolArea?: string) => {
    if (useSimulatedPoolLocation) {
      const venue = getVenueCoords(schedulePoolArea);
      return { lat: venue.lat + 0.0002, lng: venue.lng + 0.0002 };
    }
    return deviceCoords;
  };

  const calculateScheduleDistance = (schedule: ScheduleSession) => {
    const coords = getEffectiveCoords(schedule.poolArea);
    if (!coords) return null;
    const venue = getVenueCoords(schedule.poolArea);
    return calculateDistanceKm(coords.lat, coords.lng, venue.lat, venue.lng);
  };

  const getScheduleAttendance = (scheduleId?: string, scheduleDate?: string) => {
    return studentAttendances.find(
      (a) =>
        (scheduleId && String(a.schedule_id) === String(scheduleId)) ||
        (scheduleDate && a.date === scheduleDate)
    );
  };

  const isAccountInactive =
    (student?.status || "").toLowerCase().trim() === "inactive" ||
    (student?.status || "").toLowerCase().trim() === "tidak aktif";

  const handlePerformCheckIn = async (schedule: ScheduleSession, lateReason?: string) => {
    if (!onCheckInAttendance) return;
    if (isAccountInactive) {
      alert("Akun Anda saat ini berstatus non-aktif. Fitur presensi tidak dapat digunakan.");
      return;
    }
    const effectiveLoc = getEffectiveCoords(schedule.poolArea);
    if (!effectiveLoc) {
      alert("Harap aktifkan GPS perangkat atau gunakan mode simulasi kolam untuk tes.");
      return;
    }

    const timeStat = checkAttendanceTimeStatus(schedule.date || todayISO, schedule.timeStart);
    if (!timeStat.isOpen) {
      alert(timeStat.statusMessage);
      return;
    }

    const dist = calculateScheduleDistance(schedule);
    if (dist !== null && dist > 2.0) {
      alert(
        `Lokasi Anda berjarak ${dist.toFixed(2)} km dari kolam renang (Maksimal 2.0 km).\nHarap berada di lokasi kolam untuk melakukan presensi.`
      );
      return;
    }

    if (timeStat.isLate && !lateReason) {
      setLateReasonModalSchedule(schedule);
      return;
    }

    setIsCheckingIn(true);
    try {
      await onCheckInAttendance({
        schedule_id: schedule.id,
        person_type: "student",
        person_id: String(student.id),
        person_name: student.name,
        class_name: schedule.class || student.class,
        latitude: effectiveLoc.lat,
        longitude: effectiveLoc.lng,
        late_reason: lateReason || "",
      });
      setLateReasonModalSchedule(null);
      setLateReasonText("");
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert(err.message || "Gagal melakukan presensi");
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Filter student-relevant notifications
  const studentNotifications = notifications.filter((n) => {
    if (!n.target_role || n.target_role === "all") return true;
    if (n.target_role === "orang tua" || n.target_role === "student") {
      if (!n.target_name) return true;
      return (
        n.target_name.toLowerCase().includes(student.name.toLowerCase()) ||
        student.name.toLowerCase().includes(n.target_name.toLowerCase())
      );
    }
    return false;
  });

  // Notifications Count
  const unreadNotifsCount = studentNotifications.filter((n) => !n.is_read).length;
  const notificationCount =
    unreadNotifsCount +
    (showSPPReminder ? 1 : 0) +
    (todayStudentSchedules.length > 0 ? 1 : 0);

  // Portal mount state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Navigation items config
  const navTabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "jadwal", label: "Jadwal", icon: CalendarDays },
    { id: "presensi", label: "Presensi", icon: CheckCircle2 },
    { id: "progres", label: "Progres Report", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
  ] as const;

  return (
    <div className="space-y-4 pb-28 bg-[#f8fafc] min-h-full font-sans">
      {/* Hidden File Input for Instant Profile Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleAvatarFileUpload}
        className="hidden"
      />

      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (FULL WIDTH)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 rounded-none">
        {/* Subtle Decorative Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Subtle Concentric Decorative Rings */}
          <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15" />
          <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20" />
          <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25" />

          {/* Soft Ambient Depth Glow at Bottom */}
          <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl" />
          <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl" />
        </div>

        {parentActiveTab === "home" ? (
          /* Main Dashboard Header (with Profile Capsule & Notification Bell) */
          <div className="max-w-3xl mx-auto flex items-center justify-between relative z-30">
            {/* User Profile Capsule */}
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => setParentActiveTab("profile")}
                className="relative shrink-0 group cursor-pointer text-left"
                title="Lihat profil siswa"
              >
                <div className="flex h-13 w-13 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white text-white font-black text-lg shadow-md overflow-hidden group-hover:ring-2 group-hover:ring-cyan-300 transition">
                  {isCustomImage && userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAvatarImageUrl(userAvatar)}
                      alt={student.name}
                      className="h-full w-full object-cover"
                    />
                  ) : userAvatar ? (
                    <span className="text-2xl">{userAvatar}</span>
                  ) : (
                    <span>{initialLetter}</span>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-blue-700 shadow-2xs" />
                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-cyan-500 text-white opacity-0 group-hover:opacity-100 transition shadow-xs border border-white">
                  <Camera size={10} />
                </span>
              </button>

              <div>
                <p className="text-xs font-medium text-cyan-100 leading-tight flex items-center gap-1.5 flex-wrap">
                  <span>WALI MURID • Dashboard Siswa</span>
                  <span className="px-2 py-0.2 rounded-full bg-white/20 text-white font-bold text-[9px] border border-white/25">
                    {student.class} Class
                  </span>
                </p>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug capitalize">
                  {student.name}
                </h2>
              </div>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-2 relative z-50">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotificationPopup(!showNotificationPopup)}
                  className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white transition active:scale-95 cursor-pointer shadow-sm"
                  title="Notifikasi"
                >
                  <Bell size={18} />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white shadow-sm">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </button>

                {/* Backdrop for closing notification dropdown on click outside */}
                {showNotificationPopup && (
                  <div
                    className="fixed inset-0 z-40 bg-black/5"
                    onClick={() => setShowNotificationPopup(false)}
                  />
                )}

                {/* Notification Dropdown */}
                {showNotificationPopup && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto bg-white/75 backdrop-blur-2xl rounded-3xl p-4 shadow-2xl border border-white/60 text-slate-800 z-50 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-2.5 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Pemberitahuan</span>
                        {notificationCount > 0 && (
                          <span className="text-[10px] font-bold text-cyan-600">
                            {notificationCount} Pengingat
                          </span>
                        )}
                      </div>
                      {notificationCount > 0 && onClearAllNotifications && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await onClearAllNotifications();
                          }}
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50/80 hover:bg-blue-100 text-blue-700 hover:text-blue-800 transition cursor-pointer active:scale-95 border border-blue-100/60 shadow-xs"
                          title="Hapus Semua Pemberitahuan"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Real-time Targeted Notifications for Student */}
                      {studentNotifications.map((notif) => {
                        const isSchedule = notif.type?.includes("schedule") || notif.title?.toLowerCase().includes("jadwal");
                        const isLate = notif.title?.includes("Terlambat");
                        const notifIcon = isSchedule ? (
                          <CalendarDays size={13} className="text-emerald-600 shrink-0" />
                        ) : isLate ? (
                          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                        ) : notif.type?.includes("attendance") ? (
                          <Clock size={13} className="text-cyan-600 shrink-0" />
                        ) : (
                          <Bell size={13} className="text-blue-600 shrink-0" />
                        );

                        let cardBg = "bg-white/60 border-slate-200/50 opacity-80";
                        if (!notif.is_read) {
                          if (isSchedule) {
                            cardBg = "bg-emerald-50/90 border-emerald-200/90 shadow-xs";
                          } else if (isLate) {
                            cardBg = "bg-amber-50/90 border-amber-200/90 shadow-xs";
                          } else {
                            cardBg = "bg-blue-50/90 border-blue-200/90 shadow-xs";
                          }
                        }

                        return (
                          <div
                            key={notif.id}
                            onClick={async () => {
                              if (onMarkNotificationRead && !notif.is_read) {
                               await onMarkNotificationRead(notif.id);
                              }
                              setShowNotificationPopup(false);
                              if (isSchedule) {
                                setParentActiveTab("jadwal");
                              }
                            }}
                            className={`p-2.5 rounded-2xl border transition text-left cursor-pointer backdrop-blur-md ${cardBg}`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                {notifIcon}
                                <span className="truncate">{notif.title}</span>
                              </span>
                              {!notif.is_read && (
                                <span className={`h-2 w-2 rounded-full shrink-0 ${isSchedule ? "bg-emerald-600" : isLate ? "bg-amber-600" : "bg-blue-600"}`} />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">
                              {notif.message}
                            </p>
                            <p className="text-[9px] text-slate-400 font-medium mt-1">
                              {notif.created_at ? new Date(notif.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "Baru saja"} WIB
                            </p>
                          </div>
                        );
                      })}

                      {invoice && invoice.status === "Belum Dibayar" && (
                        <div className="p-2.5 bg-rose-50/80 backdrop-blur-md rounded-2xl border border-rose-200/60 text-left">
                          <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-rose-600 shrink-0" />
                            <span>Tagihan SPP Belum Dibayar</span>
                          </p>
                          <p className="text-[10px] text-rose-600 mt-0.5">
                            {invoice.desc} • Rp {invoice.amount.toLocaleString("id-ID")}
                          </p>
                        </div>
                      )}

                      {invoice && invoice.status === "Menunggu Konfirmasi" && (
                        <div className="p-2.5 bg-amber-50/80 backdrop-blur-md rounded-2xl border border-amber-200/60 text-left">
                          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            <Clock size={13} className="text-amber-600 shrink-0" />
                            <span>Bukti SPP Sedang Diverifikasi</span>
                          </p>
                          <p className="text-[10px] text-amber-600 mt-0.5">
                            Admin sedang mengecek transfer pembayaran Anda.
                          </p>
                        </div>
                      )}

                      {todayStudentSchedules.length > 0 && (
                        <div className="p-2.5 bg-blue-50/80 backdrop-blur-md rounded-2xl border border-blue-200/60 text-left">
                          <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                            <CalendarDays size={13} className="text-blue-600 shrink-0" />
                            <span>Ada Jadwal Latihan Hari Ini!</span>
                          </p>
                          <p className="text-[10px] text-blue-600 mt-0.5">
                            {todayStudentSchedules[0].timeStart} - {todayStudentSchedules[0].timeEnd} WIB di {todayStudentSchedules[0].poolArea}
                          </p>
                        </div>
                      )}

                      {studentNotifications.length === 0 && !showSPPReminder && todayStudentSchedules.length === 0 && (
                        <p className="text-xs text-slate-400 py-3 text-center italic">
                          Tidak ada pemberitahuan baru.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : parentActiveTab === "profile" ? (
          /* Sub-Menu Header for Profile (matching Jadwal style) */
          <div className="max-w-3xl mx-auto flex items-center justify-between relative z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (profileView !== "main") {
                    setProfileView("main");
                  } else {
                    setParentActiveTab("home");
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white transition active:scale-95 cursor-pointer shadow-sm"
                title="Kembali"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">
                  Menu Siswa • GIM Swimming
                </p>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug">
                  {profileView === "main" && "Profil & Pengaturan Akun"}
                  {profileView === "profilku" && "Profil Siswa"}
                  {profileView === "password" && "Ubah Password"}
                  {profileView === "notifikasi" && "Pengaturan Notifikasi"}
                  {profileView === "faq" && "FAQ & Panduan"}
                </h2>
              </div>
            </div>
          </div>
        ) : (
          /* Clean Sub-Menu Header (Avatar and Notification Bell Hidden) */
          <div className="max-w-3xl mx-auto flex items-center justify-between relative z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setParentActiveTab("home")}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white transition active:scale-95 cursor-pointer shadow-sm"
                title="Kembali ke Beranda"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">
                  Menu Siswa • GIM Swimming
                </p>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug">
                  {parentActiveTab === "jadwal" && "Jadwal Latihan Renang"}
                  {parentActiveTab === "presensi" && "Presensi Kehadiran Siswa"}
                  {parentActiveTab === "progres" && "Progres Report Siswa"}
                  {parentActiveTab === "keuangan" && "Keuangan & Riwayat SPP"}
                  {parentActiveTab === "reschedule" && "Pengajuan Reschedule Jadwal"}
                  {parentActiveTab === "pengumuman" && "Pengumuman Akademik"}
                </h2>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          CONTENT SECTION WRAPPER
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4 relative z-10">
        {/* ==========================================
            TAB 1: HOME (BERANDA / OVERVIEW)
            ========================================== */}
        {parentActiveTab === "home" && (
          <>
            {/* Account Inactive Alert Banner */}
            {isAccountInactive && (
              <div className="-mt-10 p-4 rounded-3xl bg-gradient-to-r from-red-500/10 via-rose-500/10 to-amber-500/10 border border-red-200 text-red-800 shadow-sm flex items-start gap-3 animate-fadeIn relative z-20">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-500 text-white shrink-0 shadow-md shadow-red-500/20">
                  <ShieldAlert size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-red-900">
                      Akun Anda Berstatus Non-Aktif
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                      Fitur Dibatasi
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-red-700 leading-relaxed mt-0.5">
                    Akun siswa saat ini telah dinonaktifkan oleh Administrator. Seluruh fitur presensi, pengajuan reschedule, dan transaksi pembayaran dinonaktifkan sementara.
                  </p>
                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                      `Halo Admin GIM Swimming, akun siswa saya (${student.name}) saat ini berstatus non-aktif. Mohon bantuannya untuk mengaktifkan kembali akun saya. Terima kasih.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo/wa.png" alt="WhatsApp" className="h-4 w-4 object-contain" />
                    <span>Hubungi Admin via WhatsApp</span>
                  </a>
                </div>
              </div>
            )}

            {/* Calendar Card Overview */}
            <div className={isAccountInactive ? "relative z-10" : "-mt-10 relative z-10"}>
              <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-cyan-600 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900">
                          Jadwal Latihan Renang
                        </h3>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {activeCalendarLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCurrent}
                      className="px-2.5 py-1 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[10px] font-bold transition cursor-pointer"
                    >
                      Hari Ini
                    </button>
                    <button
                      onClick={handlePrev}
                      className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                      title={calendarViewMode === "week" ? "Minggu Sebelumnya" : "Bulan Sebelumnya"}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                      title={calendarViewMode === "week" ? "Minggu Berikutnya" : "Bulan Berikutnya"}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                {calendarViewMode === "week" ? (
                  /* 7-Days Weekly Strip Capsules */
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {weekDays.map((dateObj) => {
                      const today = isSameDay(dateObj, new Date());
                      const dayOfWeek = dateObj.getDay();
                      const dayNum = dateObj.getDate();
                      const dayName = dayNamesShort[dayOfWeek];
                      const dateISO = toLocalISO(dateObj);
                      const hasSession = studentSchedules.some((s) => s.date === dateISO);

                      return (
                        <button
                          key={dateObj.toISOString()}
                          onClick={() => handleDateClick(dateObj)}
                          className={`flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl transition-all duration-200 relative cursor-pointer active:scale-95 group ${today
                            ? "bg-gradient-to-b from-blue-600 to-cyan-500 text-white font-black shadow-md shadow-cyan-500/30 scale-102"
                            : "bg-slate-50/80 hover:bg-cyan-50/80 text-slate-700 hover:text-cyan-700 border border-slate-100/80"
                            }`}
                        >
                          <span
                            className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-0.5 ${today
                              ? "text-cyan-100"
                              : dayOfWeek === 0 || dayOfWeek === 6
                                ? "text-cyan-600"
                                : "text-slate-400"
                              }`}
                          >
                            {dayName}
                          </span>
                          <span className="text-xs sm:text-sm font-black">
                            {dayNum}
                          </span>
                          {hasSession && (
                            <span
                              className={`h-1.5 w-1.5 rounded-full mt-1 ${today ? "bg-white" : "bg-cyan-400"
                                }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Full Monthly Calendar Grid (Bulan Berjalan) */
                  <div className="space-y-1.5 pt-1">
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
                      {dayNamesShort.map((dayName, idx) => (
                        <span
                          key={dayName}
                          className={`text-[10px] font-bold uppercase py-1 ${idx === 0 || idx === 6 ? "text-cyan-600" : "text-slate-400"
                            }`}
                        >
                          {dayName}
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                      {monthDays.map(({ dateObj, isCurrentMonth }, idx) => {
                        const today = isSameDay(dateObj, new Date());
                        const dayNum = dateObj.getDate();
                        const dayOfWeek = dateObj.getDay();
                        const dateISO = toLocalISO(dateObj);
                        const hasSession = studentSchedules.some((s) => s.date === dateISO);

                        return (
                          <button
                            key={`${dateObj.toISOString()}-${idx}`}
                            onClick={() => handleDateClick(dateObj)}
                            className={`flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl transition-all duration-200 relative cursor-pointer active:scale-95 group ${today
                              ? "bg-gradient-to-b from-blue-600 to-cyan-500 text-white font-black shadow-md shadow-cyan-500/30 scale-102 ring-2 ring-cyan-400/40"
                              : isCurrentMonth
                                ? "bg-slate-50/80 hover:bg-cyan-50/80 text-slate-700 hover:text-cyan-700 border border-slate-100/80"
                                : "bg-slate-50/30 text-slate-300 hover:text-slate-500 hover:bg-slate-100/60 border border-transparent opacity-60"
                              }`}
                          >
                            <span
                              className={`text-xs font-bold ${today
                                ? "text-white"
                                : isCurrentMonth
                                  ? dayOfWeek === 0 || dayOfWeek === 6
                                    ? "text-cyan-600"
                                    : "text-slate-700"
                                  : "text-slate-300"
                                }`}
                            >
                              {dayNum}
                            </span>

                            {hasSession && (
                              <span
                                className={`h-1.5 w-1.5 rounded-full mt-0.5 ${today
                                  ? "bg-white"
                                  : isCurrentMonth
                                    ? "bg-cyan-500"
                                    : "bg-slate-300"
                                  }`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100/80 pt-2.5">
                  <span className="flex items-center gap-1.5">
                    <Lightbulb size={13} className="text-amber-500 shrink-0" />
                    <span>Klik salah satu hari untuk melihat rincian</span>
                  </span>
                  <button
                    onClick={() => {
                      setCalendarViewMode((prev) => (prev === "week" ? "month" : "week"));
                      if (calendarViewMode === "week") {
                        setMonthAnchorDate(new Date());
                      }
                    }}
                    className="font-bold text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    {calendarViewMode === "week" ? (
                      <>
                        <Calendar size={12} />
                        <span>Bulanan</span>
                        <ChevronRight size={12} />
                      </>
                    ) : (
                      <>
                        <ChevronLeft size={12} />
                        <span>Mingguan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ==========================================
                PASTEL CONTAINER MENU: KEUANGAN, RESCHEDULE, PENGUMUMAN
                ========================================== */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1 rounded-full bg-blue-600" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Menu Akses Cepat Siswa
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  Layanan Siswa
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                {/* 1. Keuangan */}
                <button
                  onClick={() => setParentActiveTab("keuangan")}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/70 hover:bg-blue-50/80 border border-slate-100 hover:border-blue-200 transition-all duration-200 group cursor-pointer active:scale-95 text-center"
                >
                  <div className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/80 shadow-2xs group-hover:scale-105 group-hover:shadow-md transition-all duration-200 mb-1.5">
                    <CreditCard size={22} className="text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition">
                    Keuangan
                  </span>
                  <span className="text-[10px] text-slate-400 group-hover:text-blue-600 font-medium truncate max-w-full mt-0.5">
                    Riwayat &amp; SPP
                  </span>
                </button>

                {/* 2. Reschedule */}
                <button
                  onClick={() => setParentActiveTab("reschedule")}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/70 hover:bg-teal-50/80 border border-slate-100 hover:border-teal-200 transition-all duration-200 group cursor-pointer active:scale-95 text-center"
                >
                  <div className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100/80 shadow-2xs group-hover:scale-105 group-hover:shadow-md transition-all duration-200 mb-1.5">
                    <RotateCw size={22} className="text-teal-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition">
                    Reschedule
                  </span>
                  <span className="text-[10px] text-slate-400 group-hover:text-teal-600 font-medium truncate max-w-full mt-0.5">
                    Ajukan Jadwal
                  </span>
                </button>

                {/* 3. Pengumuman */}
                <button
                  onClick={() => setParentActiveTab("pengumuman")}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/70 hover:bg-amber-50/80 border border-slate-100 hover:border-amber-200 transition-all duration-200 group cursor-pointer active:scale-95 text-center"
                >
                  <div className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/80 shadow-2xs group-hover:scale-105 group-hover:shadow-md transition-all duration-200 mb-1.5">
                    <Megaphone size={22} className="text-amber-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition">
                    Pengumuman
                  </span>
                  <span className="text-[10px] text-slate-400 group-hover:text-amber-600 font-medium truncate max-w-full mt-0.5">
                    Info &amp; Berita
                  </span>
                </button>
              </div>
            </div>

            {/* ==========================================
                JADWAL LATIHAN (HARI INI / SESI MENDATANG)
                ========================================== */}
            {(todaySession || upcomingSession) && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap animate-fadeIn">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100/60 shadow-2xs">
                    <CalendarDays size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-700 border border-cyan-100/80">
                        {(todaySession || upcomingSession)?.class || student.class}
                      </span>
                      {todaySession ? (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Hari Ini
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          Sesi Mendatang
                        </span>
                      )}
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {(todaySession || upcomingSession)?.time || "Sesi Latihan"}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span>{(todaySession || upcomingSession)?.poolArea || "Kolam Renang"}</span>
                      <span className="text-slate-300">•</span>
                      <User size={11} className="text-slate-400 shrink-0" />
                      <span>{(todaySession || upcomingSession)?.coach?.name || coach.name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                  <button
                    type="button"
                    onClick={() => setParentActiveTab("presensi")}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs hover:shadow-md cursor-pointer active:scale-95"
                    title="Masuk ke menu presensi"
                  >
                    <Clock size={13} />
                    <span>Presensi</span>
                  </button>

                  <a
                    href={`https://wa.me/${(todaySession || upcomingSession)?.coach?.phone || coach.phone}?text=Halo%20${(todaySession || upcomingSession)?.coach?.name || coach.name},%20saya%20orang%20tua%20dari%20${student.name}%20ingin%20bertanya%20mengenai%20jadwal%20latihan%20renang`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1.5 border border-emerald-100 shrink-0 cursor-pointer shadow-2xs"
                    title="Hubungi Pelatih via WhatsApp"
                  >
                    <MessageCircle size={14} className="text-emerald-600" />
                    <span>Hubungi Pelatih</span>
                  </a>
                </div>
              </div>
            )}

            {/* ==========================================
                PENGINGAT SPP BULAN SELANJUTNYA (ULTRA COMPACT)
                Hanya muncul setelah sesi ke-3 dilakukan dan jika belum lunas
                ========================================== */}
            {showSPPReminder && invoice && (
              <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/80 border border-amber-200/90 shadow-2xs flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap animate-fadeIn">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700 shrink-0 border border-amber-200/80">
                    <CreditCard size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-amber-950 truncate">
                      SPP Bulan Depan: Rp {invoice.amount.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[10px] text-amber-800 font-medium truncate">
                      Sesi ke-{completedSessionsCount} selesai • Rek. BCA: <span className="font-mono font-bold select-all">88921-2291</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                  <button
                    onClick={handleCopyBCA}
                    className="text-[10px] font-bold text-amber-900 bg-white hover:bg-amber-100/60 px-2.5 py-1.5 rounded-lg border border-amber-200 transition cursor-pointer flex items-center gap-1"
                    title="Salin No. Rekening BCA"
                  >
                    {copiedBank ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Salin</span>
                      </>
                    )}
                  </button>

                  {invoice.status === "Belum Dibayar" ? (
                    <button
                      disabled={isAccountInactive}
                      onClick={() => !isAccountInactive && onUploadReceipt(invoice.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-white text-[11px] font-bold transition flex items-center gap-1 ${
                        isAccountInactive
                          ? "bg-slate-300 cursor-not-allowed opacity-60"
                          : "bg-amber-500 hover:bg-amber-600 cursor-pointer shadow-xs"
                      }`}
                    >
                      <Upload size={12} />
                      <span>{isAccountInactive ? "Non-Aktif" : "Bayar"}</span>
                    </button>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-amber-200/80 text-amber-900 text-[10px] font-black uppercase tracking-wider border border-amber-300">
                      Menunggu Verifikasi
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick Progress Report Snippet */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-cyan-600 shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">
                      Progres Evaluasi Kemampuan
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Diambil dari data report evaluasi pelatih pasca absensi
                    </p>
                  </div>
                </div>

                {latestCoachEvaluation ? (
                  <button
                    onClick={() => setParentActiveTab("progres")}
                    className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100 cursor-pointer flex items-center gap-1"
                  >
                    <span>Detail Laporan</span>
                    <ChevronRight size={11} />
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100">
                    Menunggu Laporan
                  </span>
                )}
              </div>

              {!latestCoachEvaluation ? (
                <div className="py-6 text-center space-y-2 bg-slate-50/50 rounded-2xl border border-slate-100/80">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200/60 shadow-2xs">
                    <TrendingUp size={20} className="text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Belum Ada Catatan Evaluasi Pelatih</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Evaluasi kemampuan akan otomatis terisi dari data report yang diisi oleh pelatih ketika selesai melakukan absensi.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Coach Evaluation Report Card */}
                  <div className="p-3.5 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[10px] font-black text-cyan-800 uppercase tracking-wider flex items-center gap-1">
                        <Award size={12} className="text-cyan-600" />
                        <span>Laporan Pelatih • Coach {latestCoachEvaluation.coachName}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {latestCoachEvaluation.date}
                      </span>
                    </div>

                    {latestCoachEvaluation.notes.includes("\n") || latestCoachEvaluation.notes.includes("•") ? (
                      <div className="space-y-1 pt-0.5">
                        {latestCoachEvaluation.notes
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line, idx) => (
                            <p
                              key={idx}
                              className="text-xs text-slate-700 font-medium leading-relaxed flex items-start gap-1.5"
                            >
                              <span className="text-cyan-600 font-bold shrink-0">•</span>
                              <span>{line.replace(/^•\s*/, "")}</span>
                            </p>
                          ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-700 italic font-medium leading-relaxed">
                        &ldquo;{latestCoachEvaluation.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Skills Progress Bars derived from coach review data (4 Core Competencies) */}
                  <div className="space-y-2.5 pt-0.5">
                    {[
                      {
                        name: "Meluncur & Streamline",
                        rating: studentSkillRatings.floating,
                        percentage: Math.round((studentSkillRatings.floating / 5) * 100),
                      },
                      {
                        name: "Kayuhan Kaki & Gaya Dada",
                        rating: studentSkillRatings.kicking,
                        percentage: Math.round((studentSkillRatings.kicking / 5) * 100),
                      },
                      {
                        name: "Gerakan Lengan & Stroke",
                        rating: studentSkillRatings.arms,
                        percentage: Math.round((studentSkillRatings.arms / 5) * 100),
                      },
                      {
                        name: "Pernapasan Ritmik & Stamina",
                        rating: studentSkillRatings.breathing,
                        percentage: Math.round((studentSkillRatings.breathing / 5) * 100),
                      },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span>{item.name}</span>
                            <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-0.5">
                              <Star size={10} className="fill-amber-400 text-amber-400" />
                              {item.rating}/5
                            </span>
                          </span>
                          <span className="text-cyan-600 font-mono font-black">{item.percentage}%</span>
                        </div>
                        <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Announcements */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <Megaphone size={16} className="text-cyan-600" />
                <span>Pengumuman Akademik</span>
              </h3>
              <div className="p-4 rounded-2xl bg-cyan-50/40 border border-cyan-100/50 space-y-1">
                <p className="text-xs font-bold text-slate-800">Ujian Naik Tingkatan Renang</p>
                <p className="text-slate-600 leading-relaxed text-xs">
                  Dilaksanakan pada tanggal 14 September 2026. Mohon untuk memantau kesiapan stamina anak dan instruksi pakaian renang ujian dari pelatih.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ==========================================
            TAB 2: JADWAL (JADWAL LES & KALENDER)
            ========================================== */}
        {parentActiveTab === "jadwal" && (
          <div className="-mt-10 relative z-10 space-y-4 animate-fadeIn">
            {/* Calendar Card Full */}
            <div className="rounded-3xl bg-white p-5 md:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <CalendarDays size={18} className="text-cyan-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Kalender Jadwal Latihan Siswa
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{activeCalendarLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCurrent}
                    className="px-2.5 py-1 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-bold transition cursor-pointer"
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={handlePrev}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* View Switcher Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  {calendarViewMode === "week" ? "Tampilan 7 Hari Mingguan" : "Tampilan Kalender Bulanan"}
                </span>
                <button
                  onClick={() => setCalendarViewMode(calendarViewMode === "week" ? "month" : "week")}
                  className="px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-700 text-xs font-bold hover:bg-cyan-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  {calendarViewMode === "week" ? (
                    <>
                      <span>Tampilan Bulan</span>
                      <ChevronRight size={13} />
                    </>
                  ) : (
                    <>
                      <ChevronLeft size={13} />
                      <span>Tampilan Minggu</span>
                    </>
                  )}
                </button>
              </div>

              {calendarViewMode === "week" ? (
                /* Weekly Strip */
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2">
                  {weekDays.map((dateObj) => {
                    const today = isSameDay(dateObj, new Date());
                    const dayOfWeek = dateObj.getDay();
                    const dayNum = dateObj.getDate();
                    const dayName = dayNamesShort[dayOfWeek];
                    const dateISO = toLocalISO(dateObj);
                    const hasSession = studentSchedules.some((s) => s.date === dateISO);

                    return (
                      <button
                        key={dateObj.toISOString()}
                        onClick={() => handleDateClick(dateObj)}
                        className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition-all duration-200 relative cursor-pointer active:scale-95 ${today
                          ? "bg-gradient-to-b from-blue-600 to-cyan-500 text-white font-black shadow-md shadow-cyan-500/30 scale-102"
                          : "bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 border border-slate-100"
                          }`}
                      >
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${today
                            ? "text-cyan-100"
                            : dayOfWeek === 0 || dayOfWeek === 6
                              ? "text-cyan-600"
                              : "text-slate-400"
                            }`}
                        >
                          {dayName}
                        </span>
                        <span className="text-sm sm:text-base font-black">{dayNum}</span>
                        {hasSession && (
                          <span
                            className={`h-2 w-2 rounded-full mt-1.5 ${today ? "bg-white" : "bg-cyan-500"
                              }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Monthly Calendar */
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {dayNamesShort.map((dayName, idx) => (
                      <span
                        key={dayName}
                        className={`text-xs font-bold uppercase py-1 ${idx === 0 || idx === 6 ? "text-cyan-600" : "text-slate-400"
                          }`}
                      >
                        {dayName}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {monthDays.map(({ dateObj, isCurrentMonth }, idx) => {
                      const today = isSameDay(dateObj, new Date());
                      const dayNum = dateObj.getDate();
                      const dateISO = toLocalISO(dateObj);
                      const hasSession = studentSchedules.some((s) => s.date === dateISO);

                      return (
                        <button
                          key={`${dateObj.toISOString()}-${idx}`}
                          onClick={() => handleDateClick(dateObj)}
                          className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition cursor-pointer active:scale-95 ${today
                            ? "bg-gradient-to-b from-blue-600 to-cyan-500 text-white font-black shadow-md shadow-cyan-500/30"
                            : isCurrentMonth
                              ? "bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 border border-slate-100"
                              : "bg-slate-50/30 text-slate-300 border border-transparent opacity-60"
                            }`}
                        >
                          <span className={`text-xs font-bold ${today ? "text-white" : ""}`}>
                            {dayNum}
                          </span>
                          {hasSession && (
                            <span
                              className={`h-1.5 w-1.5 rounded-full mt-0.5 ${today ? "bg-white" : "bg-cyan-500"
                                }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sesi Latihan Terdaftar */}
            {(() => {
              const upcomingStudentSchedules = studentSchedules.filter(
                (s) => !s.date || s.date >= todayISO
              );

              return (
                <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <CalendarDays size={16} className="text-cyan-600" />
                    <span>Daftar Sesi Latihan Renang</span>
                  </h4>

                  {upcomingStudentSchedules.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <Calendar size={32} className="text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-medium">
                        Belum ada jadwal khusus yang akan datang.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Jadwal rutin kelas {student.class}: Setiap Sabtu, 15:00 - 17:00 WIB.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingStudentSchedules.map((s) => (
                        <div
                          key={s.id}
                          className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2.5 hover:bg-cyan-50/30 transition"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-800 text-[10px] font-black uppercase">
                                {s.class}
                              </span>
                              <h5 className="text-xs sm:text-sm font-black text-slate-900">{s.title}</h5>
                            </div>
                            <span className="text-xs font-black text-blue-600 bg-white px-2.5 py-1 rounded-xl border border-slate-200/80">
                              {s.date || "Setiap Pekan"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 pt-1 flex-wrap gap-2">
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              <span>{s.timeStart} - {s.timeEnd} WIB</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400" />
                              <span>{s.poolArea}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <User size={12} className="text-slate-400" />
                              <span>{s.coachName || coach.name}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Pool Area & Information Card */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <MapPin size={16} className="text-cyan-600" />
                <span>Informasi Kolam Renang &amp; Perlengkapan</span>
              </h4>
              <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                <p>• <strong>Lokasi:</strong> Kolam Renang Nalendra (Jl. Sukajadi No. 12)</p>
                <p>• <strong>Waktu Datang:</strong> Harap hadir 10 menit sebelum sesi latihan dimulai untuk pemanasan.</p>
                <p>• <strong>Perlengkapan Wajib:</strong> Pakaian renang standar, kacamata renang, dan handuk pribadi.</p>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB: PRESENSI KEHADIRAN SISWA
            ========================================== */}
        {parentActiveTab === "presensi" && (
          <div className="-mt-10 relative z-10 space-y-4 animate-fadeIn">
            {/* Header & Status Card */}
            <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/80 shadow-2xs">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Presensi Siswa Hari Ini
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Verifikasi kehadiran latihan sesuai jadwal yang ditetapkan
                    </p>
                  </div>
                </div>

                <button
                  onClick={requestDeviceLocation}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 border border-slate-200/80 cursor-pointer"
                  title="Perbarui GPS Lokasi"
                >
                  <RotateCw size={12} className={isLocating ? "animate-spin text-blue-600" : "text-slate-500"} />
                  <span>{isLocating ? "Mencari GPS..." : "Refresh GPS"}</span>
                </button>
              </div>

              {/* Sesi Hari Ini Card */}
              {(() => {
                const targetSchedule = todayStudentSchedules[0] || upcomingScheduleObj;
                if (!targetSchedule) {
                  return (
                    <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-slate-100">
                      Tidak ada jadwal latihan yang aktif untuk presensi saat ini.
                    </div>
                  );
                }

                const existingAtt = getScheduleAttendance(targetSchedule.id, targetSchedule.date);
                const timeStat = checkAttendanceTimeStatus(targetSchedule.date || todayISO, targetSchedule.timeStart);
                const distanceKm = calculateScheduleDistance(targetSchedule);
                const isWithinRadius = distanceKm !== null && distanceKm <= 2.0;

                return (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/70 to-cyan-50/40 border border-blue-100 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-black text-[10px]">
                              {targetSchedule.class || student.class} Class
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              {targetSchedule.title}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                            <Clock size={13} className="text-blue-600 shrink-0" />
                            <span className="font-bold">{targetSchedule.timeStart} - {targetSchedule.timeEnd} WIB</span>
                            <span className="text-slate-400">({targetSchedule.date || "Hari Ini"})</span>
                          </p>
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                            <MapPin size={13} className="text-rose-500 shrink-0" />
                            <span>{targetSchedule.poolArea}</span>
                            <span className="text-slate-300">•</span>
                            <User size={13} className="text-slate-400 shrink-0" />
                            <span>Pelatih: {targetSchedule.coachName || coach.name}</span>
                          </p>
                        </div>

                        {existingAtt ? (
                          <span className={`px-3 py-1.5 rounded-full text-xs font-black border shrink-0 ${existingAtt.status === "Terlambat"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                            {existingAtt.status === "Terlambat" ? "✓ Hadir (Terlambat)" : "✓ Hadir Tepat Waktu"}
                          </span>
                        ) : (
                          <span className={`px-3 py-1.5 rounded-full text-xs font-black border shrink-0 ${!timeStat.isOpen
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : timeStat.isLate
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}>
                            {!timeStat.isOpen
                              ? `Buka: ${timeStat.openTimeString} WIB`
                              : timeStat.isLate
                                ? "Terlambat (> 15m)"
                                : "Bisa Presensi"}
                          </span>
                        )}
                      </div>

                      {/* GPS & Distance Radius Simulator Pill */}
                      <div className="pt-2 border-t border-blue-100/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isWithinRadius ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                          <span className="text-slate-600 font-medium">
                            Jarak GPS: <strong className={isWithinRadius ? "text-emerald-700" : "text-rose-600"}>{distanceKm !== null ? `${distanceKm.toFixed(2)} km` : "Mencari GPS..."}</strong> (Maks. 2.0 km)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setUseSimulatedPoolLocation(!useSimulatedPoolLocation)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer ${useSimulatedPoolLocation
                              ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                              : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                        >
                          {useSimulatedPoolLocation ? "✓ Simulasi Radius Aktif (< 2.0 km)" : "Mode Simulasi Kolam"}
                        </button>
                      </div>
                    </div>

                    {/* Check In Action Button */}
                    {existingAtt ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-black">Presensi Berhasil Diverifikasi</p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Kehadiran siswa {student.name} telah tersimpan di sistem GIM Swimming pada {existingAtt.created_at ? new Date(existingAtt.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "hari ini"} WIB.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePerformCheckIn(targetSchedule)}
                        disabled={isCheckingIn || !timeStat.isOpen}
                        className={`w-full py-3.5 rounded-2xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-md cursor-pointer ${!timeStat.isOpen
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                            : timeStat.isLate
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25"
                              : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-blue-600/25"
                          }`}
                      >
                        {isCheckingIn ? (
                          <>
                            <RotateCw size={15} className="animate-spin" />
                            <span>Memproses Presensi...</span>
                          </>
                        ) : !timeStat.isOpen ? (
                          <>
                            <Clock size={15} />
                            <span>Presensi Belum Dibuka (Buka: {timeStat.openTimeString} WIB)</span>
                          </>
                        ) : timeStat.isLate ? (
                          <>
                            <AlertTriangle size={15} />
                            <span>Presensi Terlambat (Isi Alasan)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} />
                            <span>Presensi Siswa Hadir Sekarang</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Riwayat Kehadiran Siswa */}
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
                  {parentStudentHistory.length} Sesi
                </span>
              </div>

              {parentStudentHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Belum ada catatan presensi tervalidasi untuk siswa ini.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {parentStudentHistory.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-blue-100 transition flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900">
                            {item.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${item.status === "Terlambat"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                            }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {item.date} • {item.time} • {item.poolArea}
                        </p>
                        {item.lateReason && (
                          <p className="text-[10px] text-amber-700 italic">
                            Alasan: {item.lateReason}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        Pelatih: {item.coachName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: PROGRES REPORT (RAPOR RENANG)
            ========================================== */}
        {parentActiveTab === "progres" && (
          <div className="-mt-10 relative z-10 space-y-3.5 animate-fadeIn">
            {/* 1. STUDENT IDENTITY CARD */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-cyan-100 shadow-xs shrink-0 flex items-center justify-center bg-cyan-50 text-cyan-700 font-black text-xl">
                {isCustomImage && userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getAvatarImageUrl(userAvatar)}
                    alt={student.name}
                    className="h-full w-full object-cover"
                  />
                ) : userAvatar ? (
                  <span className="text-2xl">{userAvatar}</span>
                ) : (
                  <span>{initialLetter}</span>
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {student.name}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Level: <span className="text-cyan-700 font-bold">{student.class}</span>
                </p>
              </div>
            </div>

            {/* 2. ABSENSI CARD */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-2.5">
              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                Absensi &amp; Kehadiran
              </h4>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs sm:text-sm font-black text-slate-900 shrink-0">
                  {attendedSessions.length === 0
                    ? "0 Sesi (Belum ada sesi)"
                    : `${student.attendanceRate || "100%"} (${attendedSessions.length} Sesi)`}
                </span>
                <div className="flex-1 h-2.5 sm:h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                    style={{
                      width:
                        attendedSessions.length === 0
                          ? "0%"
                          : `${parseInt(student.attendanceRate) || (parentStudentHistory.length > 0 ? Math.round((attendedSessions.length / parentStudentHistory.length) * 100) : 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 3. SKILL PROGRESS CARD */}
            <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  Skill Progress
                </h4>
                <span className="text-[11px] font-bold text-slate-400">
                  {hasEverAttendedSession ? "Out of 5" : "Belum Ada Nilai"}
                </span>
              </div>

              {!hasEverAttendedSession ? (
                <div className="py-6 text-center space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto border border-slate-100">
                    <Star size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Belum Ada Evaluasi Skill</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Evaluasi teknik dan perkembangan siswa akan dinilai langsung oleh pelatih setelah siswa menyelesaikan sesi latihan.
                  </p>
                </div>
              ) : (
                <>
                  {/* Skills List with Star Ratings */}
                  <div className="space-y-3">
                    {[
                      {
                        name: "Meluncur (Floating & Streamline)",
                        rating: studentSkillRatings.floating,
                      },
                      {
                        name: "Kayuhan Kaki (Kicking & Gaya Dada)",
                        rating: studentSkillRatings.kicking,
                      },
                      {
                        name: "Gerakan Lengan (Arms Stroke)",
                        rating: studentSkillRatings.arms,
                      },
                      {
                        name: "Pernapasan Ritmik & Stamina",
                        rating: studentSkillRatings.breathing,
                      },
                    ].map((skill, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                          {skill.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={15}
                                className={star <= skill.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-black text-slate-700 w-3 text-right">
                            {skill.rating}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Catatan Pelatih */}
                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Award size={14} className="text-cyan-600" />
                      <span>Catatan Evaluasi Pelatih</span>
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80">
                      Coach {studentSkillRatings.coachName}: &ldquo;{studentSkillRatings.notes || "Perkembangan teknik meluncur, posisi tubuh dalam air, dan kayuhan kaki anak sangat memuaskan. Tingkatkan konsistensi pernapasan ritmik dan stamina saat jarak jauh."}&rdquo;
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* 4. PAST EVALUATIONS */}
            <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  Riwayat Evaluasi Sesi
                </h4>
                {coachEvaluationsList.length > 1 && (
                  <button
                    onClick={() => setShowAllPastEvaluations(!showAllPastEvaluations)}
                    className="text-xs font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer flex items-center gap-1"
                  >
                    <span>{showAllPastEvaluations ? "Sembunyikan" : "Lihat semua"}</span>
                    {showAllPastEvaluations ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
              </div>

              {!hasEverAttendedSession || coachEvaluationsList.length === 0 ? (
                <div className="py-5 text-center text-xs text-slate-400 italic bg-slate-50 rounded-2xl border border-slate-100">
                  Belum ada riwayat catatan evaluasi dari pelatih.
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {(showAllPastEvaluations ? coachEvaluationsList : coachEvaluationsList.slice(0, 2)).map(
                    (evalItem, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50 hover:bg-cyan-50/60 border border-slate-100 space-y-1.5 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-900">{evalItem.title}</span>
                          <span className="text-[10px] font-bold text-slate-400">{evalItem.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium italic">
                          &ldquo;{evalItem.notes}&rdquo;
                        </p>
                        <p className="text-[10px] text-cyan-700 font-bold">
                          Pelatih: Coach {evalItem.coachName}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* 5. DOWNLOAD AS PDF BUTTON */}
            <div className="pt-1 pb-2">
              <button
                onClick={handleDownloadPDF}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-blue-700 font-bold text-xs sm:text-sm border border-slate-200 shadow-sm hover:shadow transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Download size={15} />
                <span>Download as PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: PROFILE (PROFIL SISWA & PENGATURAN)
            ========================================== */}
        {parentActiveTab === "profile" && (
          <div className="space-y-4 animate-fadeIn pb-24 font-sans">
            {/* ========================================================
                VIEW 1: MAIN PROFILE SETTINGS
                ======================================================== */}
            {profileView === "main" && (
              <div className="space-y-4 animate-fadeIn">
                {/* Hero Profile Card */}
                <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    {/* Circular Avatar */}
                    <div className="relative shrink-0">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="h-20 w-20 rounded-full bg-gradient-to-tr from-blue-700 to-cyan-500 p-1 shadow-lg shadow-blue-700/20 cursor-pointer active:scale-95 transition"
                        title="Klik untuk ganti foto dari galeri"
                      >
                        <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white">
                          {isCustomImage && userAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getAvatarImageUrl(userAvatar)}
                              alt={student.name}
                              className="h-full w-full object-cover select-none"
                            />
                          ) : userAvatar ? (
                            <span className="text-3xl select-none">{userAvatar}</span>
                          ) : (
                            <span className="text-2xl font-black text-blue-600 select-none">{initialLetter}</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSavingAvatar}
                        className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition active:scale-90"
                        title="Ganti Foto Profil"
                      >
                        <Camera size={13} />
                      </button>
                    </div>

                    {/* User Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 capitalize truncate">
                        {student.name}
                      </h2>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                          Wali Murid / Siswa
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          GIM-STU-{String(student.id).padStart(3, "0")}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-100">
                          {student.class} Class
                        </span>
                      </div>
                    </div>
                  </div>

                  {avatarSaveSuccess && (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span>Foto profil berhasil diperbarui!</span>
                    </div>
                  )}
                  {avatarError && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
                      <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                      <span>{avatarError}</span>
                    </div>
                  )}
                </div>

                {/* Settings Menu List Card */}
                <div className="rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden divide-y divide-slate-100 text-slate-800">
                  <div>
                    {/* 1. Profilku */}
                    <button
                      type="button"
                      onClick={() => setProfileView("profilku")}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="text-slate-500">
                          <User size={20} strokeWidth={1.8} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Profilku</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-400" />
                    </button>

                    {/* 2. Bahasa */}
                    <div className="w-full flex items-center justify-between px-6 py-3.5 border-t border-slate-100">
                      <div className="flex items-center gap-3.5">
                        <div className="text-slate-500">
                          <Globe size={20} strokeWidth={1.8} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Bahasa</span>
                      </div>
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setProfileLanguage("ID")}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-black transition cursor-pointer ${
                            profileLanguage === "ID"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          ID
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileLanguage("EN")}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-black transition cursor-pointer ${
                            profileLanguage === "EN"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          EN
                        </button>
                      </div>
                    </div>

                    {/* 3. Notifikasi */}
                    <button
                      type="button"
                      onClick={() => setProfileView("notifikasi")}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 active:bg-slate-100 transition border-t border-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="text-slate-500">
                          <Bell size={20} strokeWidth={1.8} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Notifikasi</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-400" />
                    </button>

                    {/* 4. Ubah Password */}
                    <button
                      type="button"
                      onClick={() => setProfileView("password")}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 active:bg-slate-100 transition border-t border-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="text-slate-500">
                          <Lock size={20} strokeWidth={1.8} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Ubah Password</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-400" />
                    </button>

                    {/* 5. FAQ & Panduan */}
                    <button
                      type="button"
                      onClick={() => setProfileView("faq")}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 active:bg-slate-100 transition border-t border-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="text-slate-500">
                          <HelpCircle size={20} strokeWidth={1.8} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">FAQ &amp; Panduan</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-400" />
                    </button>

                    {/* 6. Hubungi Support */}
                    <a
                      href={`https://wa.me/6281234567890?text=Halo%20Admin%20GIM%20Swimming,%20saya%20orang%20tua%20dari%20${student.name}%20memerlukan%20bantuan`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 active:bg-slate-100 transition border-t border-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="text-emerald-600">
                          <MessageCircle size={20} strokeWidth={1.8} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">Hubungi Support</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-400" />
                    </a>

                    {/* 7. Pasang Aplikasi (PWA) */}
                    {showInstallBtn && onInstallClick && (
                      <button
                        type="button"
                        onClick={onInstallClick}
                        className="w-full flex items-center justify-between px-6 py-4 bg-blue-50/50 hover:bg-blue-50 active:bg-blue-100 transition border-t border-slate-100 cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="text-blue-600">
                            <Download size={20} strokeWidth={1.8} />
                          </div>
                          <span className="text-sm font-bold text-blue-700">Pasang Aplikasi (PWA)</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-400" />
                      </button>
                    )}

                    {/* 8. Keluar */}
                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => setShowProfileLogoutModal(true)}
                        className={`w-full flex items-center justify-between px-6 py-4 hover:bg-rose-50/40 active:bg-rose-50 transition cursor-pointer border-t border-slate-100`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="text-slate-500">
                            <LogOut size={20} strokeWidth={1.8} />
                          </div>
                          <span className="text-sm font-bold text-slate-700">Keluar</span>
                        </div>
                        <ChevronRight size={18} className="text-slate-400" />
                      </button>
                    )}

                    {/* 9. Versi Aplikasi */}
                    <div className="w-full flex items-center justify-between px-6 py-4 border-t border-slate-100 text-slate-500">
                      <div className="flex items-center gap-3.5">
                        <div className="text-slate-400">
                          <RotateCw size={19} strokeWidth={1.8} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Versi Aplikasi</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">2.4.0</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                VIEW 2: HALAMAN "PROFILKU"
                ======================================================== */}
            {profileView === "profilku" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4 text-slate-800">
                  {/* Avatar Summary Card */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                    <div className="relative shrink-0">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white font-black text-2xl flex items-center justify-center border-2 border-white shadow-md overflow-hidden cursor-pointer hover:opacity-90 transition"
                      >
                        {isCustomImage && userAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getAvatarImageUrl(userAvatar)}
                            alt={student.name}
                            className="h-full w-full object-cover"
                          />
                        ) : userAvatar ? (
                          <span className="text-3xl">{userAvatar}</span>
                        ) : (
                          <span>{initialLetter}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center border border-white shadow-xs cursor-pointer"
                      >
                        <Camera size={11} />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-black text-slate-900 capitalize truncate">{student.name}</h4>
                      <p className="text-xs text-blue-700 font-bold">{student.class} Class • {student.status}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          Ganti Foto
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setShowProfileEmojiDrawer((v) => !v)}
                          className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                        >
                          {showProfileEmojiDrawer ? "Tutup Emoji" : "Pilih Emoji"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Emoji Drawer */}
                  {showProfileEmojiDrawer && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 animate-fadeIn">
                      <p className="text-[11px] font-bold text-slate-500">Pilih Karakter Emoji Avatar Siswa:</p>
                      <div className="grid grid-cols-5 gap-2">
                        {["🏊‍♂️", "🏊‍♀️", "🤽‍♂️", "🏄‍♂️", "🤿", "🐬", "🏆", "🥇", "⭐", "👤"].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              saveAvatarDirectly(emoji);
                              setShowProfileEmojiDrawer(false);
                            }}
                            className="h-10 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-xl flex items-center justify-center cursor-pointer transition hover:scale-105"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Information Rows */}
                  <div className="space-y-3 text-xs pt-1">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">ID Siswa (Member ID)</span>
                      <span className="font-mono font-black text-blue-700 text-xs sm:text-sm">GIM-STU-{String(student.id).padStart(3, "0")}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tingkat Akses</span>
                      <span className="font-extrabold text-slate-800">Wali Murid / Siswa</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Email Akun</span>
                      <span className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-none">{student.email || currentUserData?.email || `${student.name.toLowerCase().replace(/\s+/g, "")}@gimswimming.com`}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Kontak WhatsApp</span>
                      <span className="font-bold text-slate-800">{student.phone || "-"}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tingkat Kehadiran</span>
                      <span className="font-extrabold text-emerald-600">{student.attendanceRate}</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Pelatih Pembina</span>
                      <span className="font-bold text-slate-800">{coach.name} ({coach.phone})</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Afiliasi Klub</span>
                      <span className="font-bold text-slate-800">GIM Swimming Subang (PRSI Jabar)</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Venue Latihan Utama</span>
                      <span className="font-bold text-slate-800">Hotel Nalendra Plaza &amp; Yonif 312</span>
                    </div>
                  </div>

                  {/* Quick Action to Change Password */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setProfileView("password")}
                      className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Lock size={15} />
                      <span>Ubah Kata Sandi Akun</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                VIEW 3: HALAMAN "UBAH PASSWORD" (DIRECT & OTP RESET)
                ======================================================== */}
            {profileView === "password" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
                  {/* Mode Switcher Tabs */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        setProfilePasswordMode("direct");
                        setProfilePasswordError("");
                        setProfileResetPasswordError("");
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        profilePasswordMode === "direct"
                          ? "bg-white text-blue-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Lock size={14} />
                      <span>Ganti Sandi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfilePasswordMode("otp");
                        setProfilePasswordError("");
                        setProfileResetPasswordError("");
                        if (!profileResetEmail) {
                          setProfileResetEmail(student.email || currentUserData?.email || `${student.name.toLowerCase().replace(/\s+/g, "")}@gimswimming.com`);
                        }
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        profilePasswordMode === "otp"
                          ? "bg-white text-blue-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Mail size={14} />
                      <span>Reset via Email (OTP)</span>
                    </button>
                  </div>

                  {/* TAB 1: GANTI KATA SANDI LANGSUNG */}
                  {profilePasswordMode === "direct" && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs flex items-start gap-2.5">
                        <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
                        <p className="font-medium text-blue-800">
                          Ganti kata sandi akun siswa jika Anda masih mengingat kata sandi saat ini. Minimal 6 karakter.
                        </p>
                      </div>

                      {profilePasswordSuccess && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Kata sandi akun berhasil diperbarui!</span>
                        </div>
                      )}

                      {profilePasswordError && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
                          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                          <span>{profilePasswordError}</span>
                        </div>
                      )}

                      <form onSubmit={handleProfileChangePassword} className="space-y-4 text-xs">
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700">Kata Sandi Saat Ini</label>
                          <div className="relative">
                            <input
                              type={showProfileCurrentPassword ? "text" : "password"}
                              value={profileCurrentPassword}
                              onChange={(e) => setProfileCurrentPassword(e.target.value)}
                              placeholder="Masukkan kata sandi lama"
                              className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowProfileCurrentPassword((v) => !v)}
                              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showProfileCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700">Kata Sandi Baru</label>
                          <div className="relative">
                            <input
                              type={showProfileNewPassword ? "text" : "password"}
                              value={profileNewPassword}
                              onChange={(e) => setProfileNewPassword(e.target.value)}
                              placeholder="Minimal 6 karakter"
                              className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowProfileNewPassword((v) => !v)}
                              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showProfileNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700 flex justify-between">
                            <span>Konfirmasi Kata Sandi Baru</span>
                            {profileConfirmPassword && (
                              <span className={`text-[11px] font-bold ${profileNewPassword === profileConfirmPassword ? "text-emerald-600" : "text-rose-600"}`}>
                                {profileNewPassword === profileConfirmPassword ? "✓ Cocok" : "✗ Belum sama"}
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <input
                              type={showProfileConfirmPassword ? "text" : "password"}
                              value={profileConfirmPassword}
                              onChange={(e) => setProfileConfirmPassword(e.target.value)}
                              placeholder="Ketik ulang kata sandi baru"
                              className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowProfileConfirmPassword((v) => !v)}
                              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showProfileConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isProfileChangingPassword || !profileCurrentPassword || !profileNewPassword || profileNewPassword !== profileConfirmPassword}
                          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-2"
                        >
                          {isProfileChangingPassword ? (
                            <>
                              <RotateCw size={16} className="animate-spin" />
                              <span>Menyimpan Kata Sandi...</span>
                            </>
                          ) : (
                            <>
                              <Check size={16} />
                              <span>Simpan Kata Sandi</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* TAB 2: RESET KATA SANDI DENGAN OTP EMAIL */}
                  {profilePasswordMode === "otp" && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs flex items-start gap-2.5">
                        <Mail size={18} className="text-blue-600 shrink-0 mt-0.5" />
                        <p className="font-medium text-blue-800">
                          Sistem akan mengirimkan <strong>6-digit Kode Verifikasi (OTP)</strong> ke email akun Anda. Kode berlaku 15 menit.
                        </p>
                      </div>

                      {profileResetPasswordSuccess && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Kata sandi Anda berhasil direset! Silakan gunakan kata sandi baru untuk login.</span>
                        </div>
                      )}

                      {profileResetPasswordError && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
                          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                          <span>{profileResetPasswordError}</span>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                        <label className="font-bold text-slate-700 text-xs block">
                          1. Alamat Email Akun
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <input
                              type="email"
                              value={profileResetEmail || student.email || currentUserData?.email || ""}
                              onChange={(e) => setProfileResetEmail(e.target.value)}
                              placeholder="Masukkan email terdaftar"
                              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 outline-none transition"
                            />
                            <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                          </div>
                          <button
                            type="button"
                            onClick={handleProfileSendResetOTP}
                            disabled={isProfileSendingOtp || profileOtpCountdown > 0}
                            className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                          >
                            {isProfileSendingOtp ? (
                              <>
                                <RotateCw size={14} className="animate-spin" />
                                <span>Mengirim...</span>
                              </>
                            ) : profileOtpCountdown > 0 ? (
                              <span>Kirim Ulang ({profileOtpCountdown}s)</span>
                            ) : (
                              <>
                                <Send size={14} />
                                <span>Kirim Kode OTP</span>
                              </>
                            )}
                          </button>
                        </div>

                        {profileOtpSentSuccess && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5 animate-fadeIn">
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                            <span>Kode verifikasi 6 digit telah dikirim ke {profileMaskedEmailDisplay || profileResetEmail}.</span>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleProfileResetPasswordWithOTP} className="space-y-4 text-xs pt-1">
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700">2. Masukkan 6-Digit Kode Verifikasi (OTP)</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={profileResetOtp}
                            onChange={(e) => setProfileResetOtp(e.target.value.replace(/\D/g, ""))}
                            placeholder="Contoh: 123456"
                            className="w-full text-center tracking-[0.4em] font-mono text-base font-black py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:bg-white focus:border-blue-600 text-slate-900 outline-none transition"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700">3. Kata Sandi Baru</label>
                          <div className="relative">
                            <input
                              type={showProfileResetNewPassword ? "text" : "password"}
                              value={profileResetNewPassword}
                              onChange={(e) => setProfileResetNewPassword(e.target.value)}
                              placeholder="Minimal 6 karakter"
                              className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowProfileResetNewPassword((v) => !v)}
                              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showProfileResetNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700 flex justify-between">
                            <span>Konfirmasi Kata Sandi Baru</span>
                            {profileResetConfirmPassword && (
                              <span className={`text-[11px] font-bold ${profileResetNewPassword === profileResetConfirmPassword ? "text-emerald-600" : "text-rose-600"}`}>
                                {profileResetNewPassword === profileResetConfirmPassword ? "✓ Cocok" : "✗ Belum sama"}
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <input
                              type={showProfileResetConfirmPassword ? "text" : "password"}
                              value={profileResetConfirmPassword}
                              onChange={(e) => setProfileResetConfirmPassword(e.target.value)}
                              placeholder="Ketik ulang kata sandi baru"
                              className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowProfileResetConfirmPassword((v) => !v)}
                              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showProfileResetConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isProfileResettingOtp || profileResetOtp.length !== 6 || profileResetNewPassword.length < 6 || profileResetNewPassword !== profileResetConfirmPassword}
                          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-2"
                        >
                          {isProfileResettingOtp ? (
                            <>
                              <RotateCw size={16} className="animate-spin" />
                              <span>Mereset Kata Sandi...</span>
                            </>
                          ) : (
                            <>
                              <Check size={16} />
                              <span>Verifikasi &amp; Simpan Kata Sandi</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                VIEW 4: HALAMAN "NOTIFIKASI"
                ======================================================== */}
            {profileView === "notifikasi" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
                  <PushNotificationCard sessionUser={student.name} sessionRole="siswa" />

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Bell size={14} className="text-blue-600" />
                      <span>Pemberitahuan yang akan diterima:</span>
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-500 font-medium">
                      <li>Pengingat sesi jadwal latihan renang anak</li>
                      <li>Status verifikasi bukti pembayaran SPP bulanan</li>
                      <li>Pengumuman resmi dari tim pelatih dan manajemen</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                VIEW 5: HALAMAN "FAQ & PANDUAN"
                ======================================================== */}
            {profileView === "faq" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-3">
                  {[
                    {
                      q: "Bagaimana cara melakukan absensi kehadiran anak?",
                      a: "Buka menu Presensi di bilah navigasi bawah, pastikan GPS aktif dan Anda berada di radius kolam latihan, lalu klik tombol 'Buka Kamera Presensi' saat sesi dimulai.",
                    },
                    {
                      q: "Bagaimana cara verifikasi pembayaran SPP bulanan?",
                      a: "Orang tua murid dapat melihat rincian tagihan di menu Beranda dan mengunggah bukti transfer untuk diverifikasi langsung oleh Admin.",
                    },
                    {
                      q: "Bagaimana jika anak berhalangan hadir (Izin / Sakit)?",
                      a: "Silakan hubungi Admin Akademi atau Pelatih penanggung jawab secara langsung melalui kontak WhatsApp resmi.",
                    },
                    {
                      q: "Bagaimana jika saya lupa kata sandi akun?",
                      a: "Anda dapat menggunakan fitur 'Reset via Email (OTP)' di menu Ubah Password untuk menerima kode verifikasi 6 digit ke email terdaftar Anda.",
                    },
                    {
                      q: "Apakah aplikasi ini dapat diinstal di smartphone?",
                      a: "Ya! GIM Swimming mendukung Progressive Web App (PWA). Klik 'Pasang Aplikasi' di menu profil untuk memasang aplikasi ke layar ponsel Anda.",
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200/80 overflow-hidden bg-slate-50/70 transition"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedProfileFaq(expandedProfileFaq === idx ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-slate-800 hover:bg-slate-100/60 transition cursor-pointer"
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                            expandedProfileFaq === idx ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </button>

                      {expandedProfileFaq === idx && (
                        <div className="px-4 pb-4 text-xs text-slate-600 font-medium border-t border-slate-150 pt-3 bg-white animate-fadeIn">
                          {item.a}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="pt-3">
                    <a
                      href={`https://wa.me/6281234567890?text=Halo%20Admin%20GIM%20Swimming,%20saya%20orang%20tua%20dari%20${student.name}%20memerlukan%20bantuan`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageCircle size={18} className="text-emerald-600" />
                        <span>Masih ada pertanyaan? Hubungi Admin</span>
                      </div>
                      <ExternalLink size={14} className="text-emerald-600" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Logout Konfirmasi */}
            {showProfileLogoutModal && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
                <div
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
                  onClick={() => setShowProfileLogoutModal(false)}
                />
                <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <LogOut size={22} />
                  </div>
                  <h4 className="text-base font-black text-slate-900">Keluar Akun?</h4>
                  <p className="text-xs text-slate-500">
                    Apakah Anda yakin ingin keluar dari akun siswa <strong className="capitalize text-slate-700">{student.name}</strong>?
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowProfileLogoutModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileLogoutModal(false);
                        onLogout?.();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                    >
                      Ya, Keluar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 5: KEUANGAN (STATUS & RIWAYAT SPP SISWA)
            ========================================== */}
        {parentActiveTab === "keuangan" && (
          <div className="-mt-10 relative z-10 space-y-4 animate-fadeIn pb-24 font-sans">
            {/* Tagihan Saat Ini Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 text-white space-y-4 shadow-xl shadow-blue-500/20 border border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-wider">
                    Tagihan SPP Aktif
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
                    Rp {(invoice?.amount || 350000).toLocaleString("id-ID")}
                  </h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs ${
                    invoice?.status === "Lunas"
                      ? "bg-emerald-400 text-emerald-950 border-emerald-300"
                      : invoice?.status === "Menunggu Konfirmasi"
                        ? "bg-amber-400 text-amber-950 border-amber-300"
                        : "bg-rose-400 text-rose-950 border-rose-300"
                  }`}
                >
                  {invoice?.status || "Belum Dibayar"}
                </span>
              </div>

              <div className="pt-3 border-t border-white/20 text-xs flex items-center justify-between text-cyan-100 flex-wrap gap-2">
                <span>Paket: Kursus Renang 4 Sesi / Bulan</span>
                <span>Jatuh Tempo: Tanggal 10 Tiap Bulan</span>
              </div>
            </div>

            {/* Rekening Pembayaran Resmi */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-bold text-slate-700">Rekening Resmi Pembayaran:</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Bank BCA
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-base sm:text-lg font-mono font-black text-slate-900 tracking-wider select-all">
                    88921-2291
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    a.n GIM Swimming Club
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyBCA}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-blue-200 active:scale-95"
                >
                  {copiedBank ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Salin No. Rek</span>
                    </>
                  )}
                </button>
              </div>

              {invoice?.status !== "Lunas" && (
                <button
                  type="button"
                  disabled={isAccountInactive}
                  onClick={() => !isAccountInactive && onUploadReceipt(invoice?.id || "inv-1")}
                  className={`w-full py-3.5 rounded-2xl text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
                    isAccountInactive
                      ? "bg-slate-300 cursor-not-allowed opacity-60"
                      : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
                  }`}
                >
                  <Upload size={16} />
                  <span>{isAccountInactive ? "Akun Non-Aktif (Pembayaran Dibekukan)" : "Unggah Bukti Transfer SPP"}</span>
                </button>
              )}
            </div>

            {/* Riwayat Pembayaran Terdahulu */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
              <h5 className="text-xs sm:text-sm font-black text-slate-900">
                Riwayat Pembayaran Terdahulu:
              </h5>
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">SPP Bulan Agustus 2026</p>
                    <p className="text-[10px] text-slate-500">Diverifikasi Admin • 08 Agustus 2026</p>
                  </div>
                  <span className="font-bold text-emerald-700">Lunas (Rp 350.000)</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">SPP Bulan Juli 2026</p>
                    <p className="text-[10px] text-slate-500">Diverifikasi Admin • 05 Juli 2026</p>
                  </div>
                  <span className="font-bold text-emerald-700">Lunas (Rp 350.000)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 6: RESCHEDULE (PERMOHONAN RESCHEDULE JADWAL)
            ========================================== */}
        {parentActiveTab === "reschedule" && (
          <div className="-mt-10 relative z-10 space-y-4 animate-fadeIn pb-24 font-sans">
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200">
                  <RotateCw size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Formulir Reschedule Sesi
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Ajukan perubahan jadwal sesi latihan untuk <strong className="text-slate-800">{student.name}</strong>
                  </p>
                </div>
              </div>

              {isAccountInactive && (
                <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Akun Anda Berstatus Non-Aktif.</strong> Pengajuan reschedule tidak dapat diproses selama akun belum diaktifkan kembali oleh Admin.
                  </p>
                </div>
              )}

              {rescheduleSent ? (
                <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200 animate-fadeIn">
                  <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <Check size={24} />
                  </div>
                  <h4 className="text-sm font-black text-emerald-950">Permohonan Berhasil Dikirim!</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Permohonan reschedule untuk siswa <strong>{student.name}</strong> telah diteruskan ke Admin &amp; Pelatih via WhatsApp untuk persetujuan.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleSent(false);
                      setParentActiveTab("home");
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Kembali ke Beranda
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Pilih Sesi Latihan yang Ingin Di-reschedule <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={rescheduleSessionId}
                      onChange={(e) => setRescheduleSessionId(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                    >
                      <option value="">-- Pilih Sesi Latihan --</option>
                      {studentSchedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.date || "Jadwal"} • {s.timeStart}-{s.timeEnd} WIB di {s.poolArea})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Usulan Tanggal Baru <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        min={todayISO}
                        value={rescheduleTargetDate}
                        onChange={(e) => setRescheduleTargetDate(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Usulan Jam Baru <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={rescheduleTargetTime}
                        onChange={(e) => setRescheduleTargetTime(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Alasan Reschedule <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Contoh: Siswa ada agenda sekolah mendadak, sakit / pemulihan stamina, dll."
                      rows={3}
                      className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition resize-none"
                    />
                  </div>

                  <div className="p-3.5 bg-teal-50/80 rounded-2xl border border-teal-100 text-xs text-teal-900 space-y-1">
                    <p className="font-bold">Ketentuan Reschedule:</p>
                    <p className="text-[11px] text-teal-800 leading-relaxed">
                      Pengajuan reschedule harap dilakukan paling lambat 6 jam sebelum sesi dimulai agar pelatih dapat menyesuaikan alokasi waktu dan jalur kolam renang.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setParentActiveTab("home")}
                      className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isAccountInactive || !rescheduleTargetDate || !rescheduleReason.trim()}
                      onClick={() => {
                        if (isAccountInactive) return;
                        const msg = `Halo Admin GIM Swimming,%0ASaya orang tua dari ${student.name} ingin mengajukan permohonan reschedule sesi latihan:%0A- Usulan Tanggal Baru: ${rescheduleTargetDate}%0A- Usulan Jam: ${rescheduleTargetTime} WIB%0A- Alasan: ${rescheduleReason}%0AMohon konfirmasinya. Terima kasih!`;
                        window.open(`https://wa.me/628973180423?text=${msg}`, "_blank");
                        setRescheduleSent(true);
                      }}
                      className={`flex-1 py-3 rounded-2xl text-white font-black text-xs transition flex items-center justify-center gap-1.5 ${
                        isAccountInactive
                          ? "bg-slate-300 cursor-not-allowed opacity-60"
                          : "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 cursor-pointer shadow-md disabled:opacity-50"
                      }`}
                    >
                      <Send size={14} />
                      <span>{isAccountInactive ? "Akun Non-Aktif" : "Kirim ke Admin (WA)"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 7: PENGUMUMAN (INFORMASI & BERITA KLUB)
            ========================================== */}
        {parentActiveTab === "pengumuman" && (
          <div className="-mt-10 relative z-10 space-y-4 animate-fadeIn pb-24 font-sans">
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Pengumuman &amp; Berita Klub
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Informasi resmi GIM Swimming Club untuk orang tua &amp; siswa
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Pengumuman 1 */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                      Penting • Ujian Naik Tingkat
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">14 Sep 2026</span>
                  </div>
                  <h5 className="text-xs sm:text-sm font-black text-slate-900">
                    Pelaksanaan Ujian Kenaikan Tingkatan &amp; Sertifikasi Renang
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ujian evaluasi tingkatan renang periode September akan dilaksanakan serentak di Kolam Utama A. Mohon orang tua memastikan kesiapan fisik siswa dan pakaian renang sesuai standar.
                  </p>
                </div>

                {/* Pengumuman 2 */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-900 text-[10px] font-black uppercase">
                      Jadwal Kolam
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">01 Sep 2026</span>
                  </div>
                  <h5 className="text-xs sm:text-sm font-black text-slate-900">
                    Penggunaan Fasilitas Kolam Renang Nalendra &amp; Wera 312
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Semua sesi renang tetap berlangsung sesuai jadwal yang telah ditentukan pada aplikasi. Presensi GPS dibuka 2 jam sebelum sesi latihan dimulai.
                  </p>
                </div>

                {/* Pengumuman 3 */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase">
                      Tips &amp; Kesehatan
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">Terbaru</span>
                  </div>
                  <h5 className="text-xs sm:text-sm font-black text-slate-900">
                    Panduan Pemanasan &amp; Perlengkapan Wajib Siswa
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Wajib membawa kacamata renang (goggles), pakaian renang resmi, dan handuk pribadi untuk menjaga kebersihan dan kenyamanan selama sesi berlangsung.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          5. FIXED BOTTOM NAVIGATION BAR
          (Home, Jadwal, Presensi, Progres Report, Profile)
          ========================================== */}
      {mounted &&
        createPortal(
          <nav
            className="fixed bottom-0 inset-x-0 z-[999] w-full bg-white/98 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.07)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="max-w-3xl mx-auto flex items-center justify-around px-2 h-16">
              {navTabs.map((tab) => {
                const isActive = parentActiveTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setParentActiveTab(tab.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all duration-200 relative group active:scale-95 outline-none focus:outline-none focus:ring-0 focus:border-none select-none ${
                      isActive
                        ? "text-blue-600 font-bold"
                        : "text-slate-400 hover:text-slate-600 font-medium"
                    }`}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    {isActive && (
                      <span className="absolute -top-1.5 h-0.5 w-8 rounded-full bg-blue-600 animate-fadeIn" />
                    )}
                    <TabIcon size={20} className="mb-0.5" />
                    <span className="text-[10px] tracking-tight truncate max-w-[70px] sm:max-w-none">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>,
          document.body
        )}

      {/* ==========================================
          6. MODAL: JADWAL SESI PADA TANGGAL YANG DIKLIK
          ========================================== */}
      {selectedDateDetails && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setSelectedDateDetails(null)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div>
                <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">
                  Rincian Jadwal Latihan Siswa
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  {selectedDateDetails.dayName}, {selectedDateDetails.fullDateStr}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDateDetails(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {(() => {
              const daySchedules = getSchedulesForSelectedDate(selectedDateDetails.dateISO);

              if (daySchedules.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <Calendar size={32} className="text-slate-300 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700">Tidak Ada Sesi Terjadwal</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Belum ada sesi latihan renang khusus untuk {student.name} pada tanggal ini.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3.5">
                  {daySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-blue-100/60 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                            {schedule.type}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 mt-1">
                            {schedule.sessionTitle}
                          </h4>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-blue-600 block flex items-center justify-end gap-1">
                            <Clock size={12} className="text-blue-500" />
                            <span>{schedule.time}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1">
                            <MapPin size={11} />
                            <span>{schedule.poolArea}</span>
                          </span>
                        </div>
                      </div>

                      {/* Coach Info */}
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 font-black text-xs border border-cyan-100">
                            <User size={16} className="text-cyan-600" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Instruktur / Pelatih</p>
                            <p className="font-bold text-slate-800">{schedule.coach.name}</p>
                          </div>
                        </div>

                        {schedule.coach.phone && (
                          <a
                            href={`https://wa.me/${schedule.coach.phone}?text=Halo%20${schedule.coach.name},%20konfirmasi%20jadwal%20latihan%20renang%20untuk%20${student.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <MessageCircle size={12} />
                            <span>Hubungi</span>
                          </a>
                        )}
                      </div>

                      {schedule.notes && (
                        <div className="p-2 bg-cyan-50/50 rounded-xl border border-cyan-100/60 text-[10px] text-slate-600">
                          <span className="font-bold text-cyan-800">Catatan: </span>
                          {schedule.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedDateDetails(null)}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Evaluasi Sebelumnya */}
      {selectedPastEval && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setSelectedPastEval(null)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div>
                <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">
                  Arsip Rapor Renang Siswa
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Periode {selectedPastEval.period}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPastEval(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Student Card in Modal */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-cyan-100 shadow-xs shrink-0 flex items-center justify-center bg-cyan-50 text-cyan-700 font-black text-lg">
                {isCustomImage && userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getAvatarImageUrl(userAvatar)}
                    alt={student.name}
                    className="h-full w-full object-cover"
                  />
                ) : userAvatar ? (
                  <span className="text-xl">{userAvatar}</span>
                ) : (
                  <span>{initialLetter}</span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">{student.name}</h4>
                <p className="text-xs text-slate-500 font-semibold">
                  Level: <span className="text-cyan-700 font-bold">{selectedPastEval.level}</span> • Kehadiran: <span className="text-emerald-600 font-bold">{selectedPastEval.attendance}</span>
                </p>
              </div>
            </div>

            {/* Skill Progress in Modal */}
            <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-900">Skill Progress</span>
                <span className="text-[11px] font-bold text-slate-400">Out of 5</span>
              </div>
              {selectedPastEval.skills.map((s: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-sm text-amber-400">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star
                          key={st}
                          size={13}
                          className={st <= s.stars ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-slate-700 w-3 text-right">{s.stars}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Catatan Pelatih */}
            <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-100 space-y-1">
              <span className="text-xs font-black text-cyan-900">Catatan Pelatih</span>
              <p className="text-xs text-slate-700 leading-relaxed italic">
                {selectedPastEval.notes}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
              <button
                onClick={() => setSelectedPastEval(null)}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ALASAN KETERLAMBATAN SISWA
          ========================================== */}
      {lateReasonModalSchedule && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => {
              if (!isCheckingIn) setLateReasonModalSchedule(null);
            }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 my-auto border border-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Presensi Terlambat (&gt; 15 Menit)
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {lateReasonModalSchedule.title} • {lateReasonModalSchedule.timeStart} WIB
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Ketentuan Presensi Terlambat:</p>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Sesi latihan telah dimulai lebih dari 15 menit. Anda tetap dapat melakukan presensi kehadiran dengan mengisi alasan keterlambatan untuk catatan pelatih &amp; admin.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Alasan Keterlambatan <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={lateReasonText}
                onChange={(e) => setLateReasonText(e.target.value)}
                placeholder="Contoh: Terjebak macet di jalan, kendala transportasi, dll."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLateReasonModalSchedule(null)}
                disabled={isCheckingIn}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!lateReasonText.trim() || isCheckingIn}
                onClick={() => handlePerformCheckIn(lateReasonModalSchedule, lateReasonText.trim())}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {isCheckingIn ? "Mengirim..." : "Kirim Presensi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          FLOATING WHATSAPP BUTTON (MATCHING LANDING PAGE STYLE)
          ========================================== */}
      {mounted &&
        parentActiveTab === "home" &&
        createPortal(
          <a
            href={`https://wa.me/628973180423?text=Halo%20Admin%20GIM%20Swimming,%20saya%20orang%20tua%20dari%20${encodeURIComponent(student.name)}%20ingin%20bertanya.`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-24 right-5 sm:bottom-24 sm:right-6 md:bottom-24 md:right-8 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-[#25D366] text-white shadow-2xl transition-all duration-300 hover:bg-[#128C7E] hover:scale-110 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 cursor-pointer"
            aria-label="Contact WhatsApp Admin"
          >
            {/* Tooltip / Label */}
            <span className="absolute right-16 scale-0 bg-slate-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-300 origin-right group-hover:scale-100 shadow-lg pointer-events-none flex items-center gap-1.5">
              <span>Hubungi Kami via WA</span>
              <MessageCircle size={13} className="text-emerald-400" />
            </span>

            {/* Pulsing ring animation */}
            <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping pointer-events-none group-hover:animate-none" />

            {/* WhatsApp Image Icon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/wa.png"
              alt="WhatsApp Logo"
              className="h-8 w-8 relative z-10 object-contain"
            />
          </a>,
          document.body
        )}

      {/* Profile Edit Modal */}
      <EditProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        sessionUser={effectiveUsername}
        sessionRole={sessionRole}
        onAvatarChange={(newAv) => setUserAvatar(newAv)}
        onLogout={onLogout}
      />
    </div>
  );
}

