import React, { useState, useEffect } from "react";
import { Student, Coach, Invoice, ScheduleSession, AttendanceRecord, CheckInInput, AdminNotification } from "../types";
import EditProfileModal from "../EditProfileModal";
import {
  isImageAvatar,
  getAvatarImageUrl,
  POOL_VENUES,
  calculateDistanceKm,
  checkAttendanceTimeStatus,
} from "../../../lib/api";

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
  // Navigation tab state: home, jadwal, progres, profile
  const [parentActiveTab, setParentActiveTab] = useState<"home" | "jadwal" | "progres" | "profile">("home");

  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  const lastSession = student?.logs?.[0] || { date: "-", status: "-" };
  const completedSessionsCount = student?.logs?.length || 0;
  // Muncul setelah sesi ke-3 dilakukan (completedSessionsCount >= 3) dan jika memang belum lunas
  const showSPPReminder = completedSessionsCount >= 3 && invoice && invoice.status !== "Lunas";

  // Upcoming scheduled session
  const upcomingScheduleObj =
    studentSchedules.find((s) => !s.date || s.date >= todayISO) || studentSchedules[0];
  const upcomingSession = upcomingScheduleObj
    ? {
        title: upcomingScheduleObj.title,
        class: upcomingScheduleObj.class,
        time: `${upcomingScheduleObj.timeStart} - ${upcomingScheduleObj.timeEnd} WIB`,
        poolArea: upcomingScheduleObj.poolArea,
        coach: {
          name: upcomingScheduleObj.coachName || coach.name,
          spec: upcomingScheduleObj.class || coach.spec,
          phone: upcomingScheduleObj.coachPhone || coach.phone,
        },
      }
    : null;

  // Student Attendances from DB
  const studentAttendances = attendances.filter(
    (a) =>
      a.person_type === "student" &&
      (String(a.person_id) === String(student.id) ||
        a.person_name?.toLowerCase().trim() === student.name.toLowerCase().trim() ||
        a.person_name?.toLowerCase().includes(student.name.toLowerCase().trim()) ||
        student.name.toLowerCase().includes(a.person_name?.toLowerCase().trim() || ""))
  );

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

  const handlePerformCheckIn = async (schedule: ScheduleSession, lateReason?: string) => {
    if (!onCheckInAttendance) return;
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

  // Notifications Count
  const notificationCount =
    (showSPPReminder ? 1 : 0) + (todayStudentSchedules.length > 0 ? 1 : 0);

  // Navigation items config
  const navTabs = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "jadwal", label: "Jadwal", icon: "📅" },
    { id: "progres", label: "Progres Report", icon: "📈" },
    { id: "profile", label: "Profile", icon: "👤" },
  ] as const;

  return (
    <div className="space-y-4 pb-28 bg-[#f8fafc] min-h-full font-sans">
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
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-cyan-500 text-[9px] text-white opacity-0 group-hover:opacity-100 transition shadow-xs border border-white">
                📷
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
                <span className="text-base sm:text-lg">🔔</span>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white shadow-sm">
                    {notificationCount}
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
                    {invoice && invoice.status === "Belum Dibayar" && (
                      <div className="p-2.5 bg-rose-50/80 backdrop-blur-md rounded-2xl border border-rose-200/60 text-left">
                        <p className="text-xs font-bold text-rose-800">
                          ⚠️ Tagihan SPP Belum Dibayar
                        </p>
                        <p className="text-[10px] text-rose-600 mt-0.5">
                          {invoice.desc} • Rp {invoice.amount.toLocaleString("id-ID")}
                        </p>
                      </div>
                    )}

                    {invoice && invoice.status === "Menunggu Konfirmasi" && (
                      <div className="p-2.5 bg-amber-50/80 backdrop-blur-md rounded-2xl border border-amber-200/60 text-left">
                        <p className="text-xs font-bold text-amber-800">
                          ⏳ Bukti SPP Sedang Diverifikasi
                        </p>
                        <p className="text-[10px] text-amber-600 mt-0.5">
                          Admin sedang mengecek transfer pembayaran Anda.
                        </p>
                      </div>
                    )}

                    {todayStudentSchedules.length > 0 && (
                      <div className="p-2.5 bg-blue-50/80 backdrop-blur-md rounded-2xl border border-blue-200/60 text-left">
                        <p className="text-xs font-bold text-blue-800">
                          🏊‍♂️ Ada Jadwal Latihan Hari Ini!
                        </p>
                        <p className="text-[10px] text-blue-600 mt-0.5">
                          {todayStudentSchedules[0].timeStart} - {todayStudentSchedules[0].timeEnd} WIB di {todayStudentSchedules[0].poolArea}
                        </p>
                      </div>
                    )}

                    <div className="p-2.5 bg-slate-50/80 backdrop-blur-md rounded-2xl border border-slate-200/60 text-left">
                      <p className="text-xs font-bold text-slate-800">
                        📢 Info Akademik Renang
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Ujian Kenaikan Tingkatan Renang diadakan 14 September 2026.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
            {/* Calendar Card Overview */}
            <div className="-mt-10 relative z-10">
              <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📅</span>
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
                      ‹
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                      title={calendarViewMode === "week" ? "Minggu Berikutnya" : "Bulan Berikutnya"}
                    >
                      ›
                    </button>
                  </div>
                </div>

                {/* 7-Days Weekly Strip Capsules */}
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
                        className={`flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl transition-all duration-200 relative cursor-pointer active:scale-95 group ${
                          today
                            ? "bg-gradient-to-b from-blue-600 to-cyan-500 text-white font-black shadow-md shadow-cyan-500/30 scale-102"
                            : "bg-slate-50/80 hover:bg-cyan-50/80 text-slate-700 hover:text-cyan-700 border border-slate-100/80"
                        }`}
                      >
                        <span
                          className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mb-0.5 ${
                            today
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
                        {hasSession && !today && (
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1" />
                        )}
                        {today && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100/80 pt-2.5">
                  <span className="flex items-center gap-1">
                    <span className="text-xs">💡</span>
                    <span>Klik hari untuk rincian sesi</span>
                  </span>
                  <button
                    onClick={() => setParentActiveTab("jadwal")}
                    className="font-bold text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Buka Jadwal Lengkap ›</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ==========================================
                JADWAL LATIHAN YANG AKAN DATANG (COMPACT & SIMPLE)
                ========================================== */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-lg shrink-0 border border-blue-100/60 shadow-2xs">
                  🏊‍♂️
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-700 border border-cyan-100/80">
                      {student.class}
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {upcomingSession?.time || "Sabtu, 15:00 - 17:00 WIB"}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    📍 {upcomingSession?.poolArea || "Kolam Nalendra"} • 👨‍🏫 {upcomingSession?.coach?.name || coach.name}
                  </p>
                </div>
              </div>

              <a
                href={`https://wa.me/${upcomingSession?.coach?.phone || coach.phone}?text=Halo%20${upcomingSession?.coach?.name || coach.name},%20saya%20orang%20tua%20dari%20${student.name}%20ingin%20bertanya%20mengenai%20jadwal%20latihan%20renang`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1.5 border border-emerald-100 shrink-0 cursor-pointer shadow-2xs"
                title="Hubungi Pelatih via WhatsApp"
              >
                <span>💬</span>
                <span>Hubungi Pelatih</span>
              </a>
            </div>

            {/* Sesi Hari Ini & Presensi Siswa if active */}
            {todayStudentSchedules.length > 0 && (
              <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 p-5 text-white shadow-xl shadow-blue-500/20 border border-white/20 space-y-4 relative overflow-hidden animate-fadeIn">
                <div className="flex items-center justify-between flex-wrap gap-2 relative z-10 border-b border-white/15 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white text-base shadow-xs border border-white/30">
                      🏊‍♂️
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                          Jadwal Latihan &amp; Presensi Hari Ini
                        </h3>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs animate-pulse">
                          AKTIF
                        </span>
                      </div>
                      <p className="text-[11px] text-cyan-100 font-medium">
                        {todayFormatted}
                      </p>
                    </div>
                  </div>

                  {/* Simulated GPS toggle for testing */}
                  <button
                    onClick={() => setUseSimulatedPoolLocation(!useSimulatedPoolLocation)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border transition cursor-pointer ${
                      useSimulatedPoolLocation
                        ? "bg-emerald-400 text-slate-950 border-emerald-300 font-black shadow-xs"
                        : "bg-white/15 hover:bg-white/25 text-cyan-100 border-white/20"
                    }`}
                    title="Simulasikan perangkat berada di titik kolam renang"
                  >
                    {useSimulatedPoolLocation ? "✓ GPS: Di Kolam (Simulasi)" : "📍 Tes GPS Kolam"}
                  </button>
                </div>

                <div className="space-y-3 relative z-10">
                  {todayStudentSchedules.map((schedule, idx) => {
                    const existingAtt = getScheduleAttendance(schedule.id, schedule.date);
                    const isCheckedIn = !!existingAtt;
                    const timeStat = checkAttendanceTimeStatus(schedule.date || todayISO, schedule.timeStart);
                    const dist = calculateScheduleDistance(schedule);
                    const isWithinRadius = dist !== null && dist <= 2.0;

                    return (
                      <div
                        key={schedule.id || idx}
                        className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="text-xs sm:text-sm font-black text-white block">
                              {schedule.title} ({schedule.class})
                            </span>
                            <span className="text-[11px] text-cyan-100 font-medium">
                              📍 {schedule.poolArea || "Hotel Nalendra Plaza Subang"} • Coach {schedule.coachName || coach.name}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-white/25 text-white text-[11px] font-bold">
                            ⏰ {schedule.timeStart} - {schedule.timeEnd} WIB
                          </span>
                        </div>

                        {/* Attendance State & Action */}
                        {isCheckedIn ? (
                          <div className="p-3 rounded-xl bg-emerald-500/25 border border-emerald-300/40 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-base">✅</span>
                              <div>
                                <p className="text-xs font-black text-white">
                                  {existingAtt?.status === "Terlambat" ? "Presensi Masuk (Terlambat)" : "Presensi Masuk (Hadir)"}
                                </p>
                                <p className="text-[10px] text-emerald-100">
                                  Waktu: {existingAtt?.time_recorded || (existingAtt?.created_at ? `${new Date(existingAtt.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB` : "Tercatat")} • Radius: {existingAtt?.distance_km !== undefined ? `${existingAtt.distance_km.toFixed(2)} km` : "≤ 2.0 km"}
                                </p>
                                {existingAtt?.late_reason && (
                                  <p className="text-[10px] text-amber-200 italic mt-0.5">
                                    Alasan: &quot;{existingAtt.late_reason}&quot;
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black">
                              TERVERIFIKASI
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1 border-t border-white/15">
                            {/* GPS Radar distance status */}
                            <div className="flex items-center justify-between text-[11px] font-medium text-cyan-100 flex-wrap gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${isWithinRadius ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                                <span>
                                  {dist !== null
                                    ? `Jarak ke kolam: ${dist.toFixed(2)} km ${isWithinRadius ? "(✓ Radius ≤ 2.0 km)" : "(✕ Di luar radius 2.0 km)"}`
                                    : isLocating
                                    ? "🛰️ Mendeteksi GPS..."
                                    : "GPS belum aktif"}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                !timeStat.isOpen
                                  ? "bg-slate-800/60 text-slate-300"
                                  : timeStat.isLate
                                  ? "bg-amber-400 text-slate-950 font-black"
                                  : "bg-emerald-400 text-slate-950 font-black"
                              }`}>
                                {!timeStat.isOpen ? "Belum Dibuka" : timeStat.isLate ? "Terlambat (> 15m)" : "Bisa Presensi"}
                              </span>
                            </div>

                            {/* Check-in Button */}
                            <button
                              onClick={() => handlePerformCheckIn(schedule)}
                              disabled={isCheckingIn || !timeStat.isOpen || !isWithinRadius}
                              className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                                !timeStat.isOpen
                                  ? "bg-white/20 text-white/60 cursor-not-allowed"
                                  : !isWithinRadius
                                  ? "bg-rose-500/80 hover:bg-rose-600 text-white"
                                  : timeStat.isLate
                                  ? "bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-slate-950"
                                  : "bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-slate-950"
                              }`}
                            >
                              <span>⏱️</span>
                              <span>
                                {isCheckingIn
                                  ? "Memproses Presensi..."
                                  : !timeStat.isOpen
                                  ? `Buka Presensi: ${timeStat.openTimeString} WIB`
                                  : !isWithinRadius
                                  ? "Mendekat ke Kolam Renang (< 2 km)"
                                  : timeStat.isLate
                                  ? "Presensi Terlambat (Isi Alasan)"
                                  : "Presensi Siswa Hadir Sekarang"}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  <span className="text-lg shrink-0">💳</span>
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
                    className="text-[10px] font-bold text-amber-900 bg-white hover:bg-amber-100/60 px-2 py-1.5 rounded-lg border border-amber-200 transition cursor-pointer"
                    title="Salin No. Rekening BCA"
                  >
                    {copiedBank ? "✓ Tersalin!" : "📋 Salin"}
                  </button>

                  {invoice.status === "Belum Dibayar" ? (
                    <button
                      onClick={() => onUploadReceipt(invoice.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <span>📤</span>
                      <span>Bayar</span>
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
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>📈</span> Progres Evaluasi Kemampuan
                </h4>
                <button
                  onClick={() => setParentActiveTab("progres")}
                  className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100 cursor-pointer"
                >
                  Detail Laporan ›
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Meluncur & Pernapasan</span>
                    <span className="text-cyan-600">90%</span>
                  </div>
                  <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full w-[90%] rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Renang Gaya Dada</span>
                    <span className="text-cyan-600">75%</span>
                  </div>
                  <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full w-[75%] rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan Riwayat Pertemuan Siswa (Basis SPP & Kehadiran) */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">📝</span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900">
                      Catatan Pertemuan Siswa
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Riwayat Presensi &amp; Sesi Latihan Tervalidasi
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black">
                  {studentAttendances.length > 0 ? `${studentAttendances.length} Sesi Tercatat` : `${student.logs?.length || 0} Sesi`}
                </span>
              </div>

              {studentAttendances.length === 0 && (!student.logs || student.logs.length === 0) ? (
                <div className="py-6 text-center text-slate-400 text-xs italic">
                  Belum ada catatan presensi pertemuan yang terekam.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Real GPS Attendance records */}
                  {studentAttendances.map((att, idx) => (
                    <div
                      key={att.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/70 text-blue-700 text-xs font-black shrink-0">
                          S{studentAttendances.length - idx}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            Pertemuan ke-{studentAttendances.length - idx} • {att.date}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {att.class || att.class_name || student.class} • {att.time_recorded || (att.created_at ? `${new Date(att.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB` : "Selesai")} • Radius: {att.distance_km !== undefined ? `${att.distance_km.toFixed(2)} km` : "≤ 2.0 km"}
                          </p>
                          {att.late_reason && (
                            <p className="text-[10px] text-amber-700 font-medium italic mt-0.5">
                              ⚠️ Keterlambatan: &quot;{att.late_reason}&quot;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 ml-auto sm:ml-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${
                            att.status === "Terlambat"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {att.status === "Terlambat" ? "⚠️ Terlambat" : "✓ Hadir"}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Fallback baseline logs if no new attendances recorded yet */}
                  {studentAttendances.length === 0 &&
                    student.logs?.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/70 text-blue-700 text-xs font-black shrink-0">
                            S{student.logs!.length - idx}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">
                              Pertemuan ke-{student.logs!.length - idx} • {log.date}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {student.class} • Kolam Nalendra Plaza
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {log.status || "Hadir"}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Announcements */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <span>📢</span> Pengumuman Akademik
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
                  <span className="text-lg">📅</span>
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
                    ‹
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                  >
                    ›
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
                  <span>{calendarViewMode === "week" ? "📅 Tampilan Bulan ›" : "‹ Tampilan Minggu"}</span>
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
                        className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition-all duration-200 relative cursor-pointer active:scale-95 ${
                          today
                            ? "bg-gradient-to-b from-blue-600 to-cyan-500 text-white font-black shadow-md shadow-cyan-500/30 scale-102"
                            : "bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 border border-slate-100"
                        }`}
                      >
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${
                            today
                              ? "text-cyan-100"
                              : dayOfWeek === 0 || dayOfWeek === 6
                              ? "text-cyan-600"
                              : "text-slate-400"
                          }`}
                        >
                          {dayName}
                        </span>
                        <span className="text-sm sm:text-base font-black">{dayNum}</span>
                        {hasSession && !today && (
                          <span className="h-2 w-2 rounded-full bg-cyan-500 mt-1.5" />
                        )}
                        {today && <span className="h-2 w-2 rounded-full bg-white mt-1.5" />}
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
                        className={`text-xs font-bold uppercase py-1 ${
                          idx === 0 || idx === 6 ? "text-cyan-600" : "text-slate-400"
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
                          className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition cursor-pointer active:scale-95 ${
                            today
                              ? "bg-gradient-to-b from-blue-600 to-cyan-500 text-white font-black shadow-md shadow-cyan-500/30"
                              : isCurrentMonth
                              ? "bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 border border-slate-100"
                              : "bg-slate-50/30 text-slate-300 border border-transparent opacity-60"
                          }`}
                        >
                          <span className={`text-xs font-bold ${today ? "text-white" : ""}`}>
                            {dayNum}
                          </span>
                          {hasSession && !today && (
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 mt-0.5" />
                          )}
                          {today && <span className="h-1.5 w-1.5 rounded-full bg-white mt-0.5" />}
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
                    <span>📋</span> Daftar Sesi Latihan Renang
                  </h4>

                  {upcomingStudentSchedules.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-3xl">🏊‍♂️</span>
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

                          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                            <span>⏰ {s.timeStart} - {s.timeEnd} WIB</span>
                            <span>📍 {s.poolArea}</span>
                            <span>👨‍🏫 {s.coachName || coach.name}</span>
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
                <span>📍</span> Informasi Kolam Renang & Perlengkapan
              </h4>
              <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                <p>• <strong>Lokasi:</strong> Kolam Renang Nalendra (Jl. Sukajadi No. 12)</p>
                <p>• <strong>Waktu Datang:</strong> Harap hadir 10 menit sebelum sesi latihan dimulai untuk pemanasan.</p>
                <p>• <strong>Perlengkapan Wajib:</strong> Pakaian renang standar, kacamata renang (goggles), dan handuk pribadi.</p>
              </div>
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
                Absensi
              </h4>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs sm:text-sm font-black text-slate-900 shrink-0">
                  {student.attendanceRate || "95%"} {monthNames[new Date().getMonth()].substring(0, 3)}
                </span>
                <div className="flex-1 h-2.5 sm:h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                    style={{ width: `${parseInt(student.attendanceRate) || 95}%` }}
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
                  Out of 5
                </span>
              </div>

              {/* Skills List with Star Ratings */}
              <div className="space-y-3">
                {[
                  { name: "Floating", rating: 5 },
                  { name: "Kicking", rating: 5 },
                  { name: "Arms", rating: 5 },
                  { name: "Breathing", rating: 4 },
                ].map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      {skill.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm sm:text-base">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= skill.rating ? "text-amber-400" : "text-slate-200"}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-3 text-right">
                        {skill.rating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Catatan Pelatih */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <h5 className="text-xs font-black text-slate-900">
                  Catatan Pelatih
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80">
                  Coach {coach.name}: &ldquo;Perkembangan teknik meluncur, posisi tubuh dalam air, dan kayuhan kaki anak sangat memuaskan. Tingkatkan konsistensi pernapasan ritmik dan stamina saat jarak jauh.&rdquo;
                </p>
              </div>
            </div>

            {/* 4. PAST EVALUATIONS */}
            <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  Past evaluations
                </h4>
                <button
                  onClick={() => setShowAllPastEvaluations(!showAllPastEvaluations)}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer flex items-center gap-1"
                >
                  <span>{showAllPastEvaluations ? "↑ Hide" : "↓ View all"}</span>
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {(showAllPastEvaluations ? pastEvaluations : pastEvaluations.slice(0, 1)).map(
                  (past, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPastEval(past)}
                      className="p-3.5 rounded-2xl bg-slate-50 hover:bg-cyan-50/60 border border-slate-100 flex items-center justify-between gap-3 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white shadow-2xs overflow-hidden">
                          {isCustomImage && userAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getAvatarImageUrl(userAvatar)}
                              alt={student.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{initialLetter}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{student.name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">
                            Level: {past.level}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                        <span>{past.period}</span>
                        <span className="text-sm font-bold text-slate-400">›</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* 5. DOWNLOAD AS PDF BUTTON */}
            <div className="pt-1 pb-2">
              <button
                onClick={handleDownloadPDF}
                className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-blue-700 font-bold text-xs sm:text-sm border border-slate-200 shadow-sm hover:shadow transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>Download as PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: PROFILE (PROFIL SISWA & PENGATURAN)
            ========================================== */}
        {parentActiveTab === "profile" && (
          <div className="-mt-10 relative z-10 space-y-4 animate-fadeIn">
            {/* User Profile Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 space-y-5 text-center">
              <div className="relative inline-block mx-auto">
                <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-3xl flex items-center justify-center border-4 border-white shadow-lg overflow-hidden mx-auto">
                  {isCustomImage && userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAvatarImageUrl(userAvatar)}
                      alt={student.name}
                      className="h-full w-full object-cover"
                    />
                  ) : userAvatar ? (
                    <span>{userAvatar}</span>
                  ) : (
                    <span>{initialLetter}</span>
                  )}
                </div>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition"
                  title="Ubah Foto"
                >
                  📷
                </button>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 capitalize">{student.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wali Murid: <span className="font-bold text-slate-700">{student.parent || "Orang Tua"}</span>
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100 text-[11px] font-black">
                    {student.class} Class
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-black">
                    Status: {student.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowProfileModal(true)}
                className="w-full py-2.5 rounded-2xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold text-xs transition cursor-pointer border border-cyan-100 flex items-center justify-center gap-2"
              >
                <span>📷</span> Ubah Foto & Avatar Siswa
              </button>
            </div>

            {/* Detail Information */}
            <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Informasi Lengkap Siswa
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Nama Siswa</span>
                  <span className="font-bold text-slate-900">{student.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Program Kelas</span>
                  <span className="font-bold text-cyan-600">{student.class} Class</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Nama Orang Tua / Wali</span>
                  <span className="font-bold text-slate-900">{student.parent || "-"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Tingkat Kehadiran</span>
                  <span className="font-bold text-emerald-600">{student.attendanceRate}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Pelatih Penanggung Jawab</span>
                  <span className="font-bold text-slate-900">{coach.name} ({coach.phone})</span>
                </div>
              </div>
            </div>

            {/* Help & Logout Actions */}
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Pengaturan & Bantuan
              </h4>

              <div className="space-y-2">
                <a
                  href={`https://wa.me/6281234567890?text=Halo%20Admin%20GIM%20Swimming,%20saya%20orang%20tua%20dari%20${student.name}%20butuh%20bantuan`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold transition border border-slate-100 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>💬</span> Hubungi Admin GIM Swimming
                  </span>
                  <span>›</span>
                </a>

                {showInstallBtn && onInstallClick && (
                  <button
                    onClick={onInstallClick}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 text-xs font-bold transition border border-slate-100 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span>📥</span> Pasang Aplikasi (Install PWA)
                    </span>
                    <span>›</span>
                  </button>
                )}

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition cursor-pointer border border-rose-100 flex items-center justify-center gap-2 mt-2"
                  >
                    <span>🚪</span> Keluar dari Akun
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          5. FIXED BOTTOM NAVIGATION BAR
          (Home, Jadwal, Progres Report, Profile)
          ========================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-[calc(4.75rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-3 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] max-w-3xl mx-auto md:rounded-t-3xl">
        {navTabs.map((tab) => {
          const isActive = parentActiveTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setParentActiveTab(tab.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 cursor-pointer transition-all duration-200 relative group active:scale-95 ${
                isActive
                  ? "text-blue-600 font-black scale-105"
                  : "text-slate-400 hover:text-slate-600 font-semibold"
              }`}
            >
              {isActive && (
                <span className="absolute -top-2.5 h-1 w-8 rounded-full bg-blue-600 animate-fadeIn" />
              )}
              <span className="text-xl mb-0.5">{tab.icon}</span>
              <span className="text-[10px] tracking-tight truncate max-w-[70px] sm:max-w-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

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
                ✕
              </button>
            </div>

            {(() => {
              const daySchedules = getSchedulesForSelectedDate(selectedDateDetails.dateISO);

              if (daySchedules.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <span className="text-3xl">🏖️</span>
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
                          <span className="text-xs font-black text-blue-600 block">
                            ⏰ {schedule.time}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            📍 {schedule.poolArea}
                          </span>
                        </div>
                      </div>

                      {/* Coach Info */}
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 font-black text-xs border border-cyan-100">
                            🏊‍♂️
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
                            <span>💬</span> Hubungi
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
                ✕
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
              {selectedPastEval.skills.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-sm text-amber-400">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <span key={st} className={st <= s.stars ? "text-amber-400" : "text-slate-200"}>
                          ★
                        </span>
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
                <span>📥</span> Download PDF
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 text-xl border border-amber-200">
                ⚠️
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
