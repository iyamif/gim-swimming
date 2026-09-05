import React, { useState, useEffect } from "react";
import { Student, Coach, Invoice, ScheduleSession } from "../types";
import EditProfileModal from "../EditProfileModal";
import { isImageAvatar, getAvatarImageUrl } from "../../../lib/api";

interface DashboardOverviewTabProps {
  sessionUser: string;
  sessionRole: string;
  students: Student[];
  coaches: Coach[];
  invoices: Invoice[];
  schedules?: ScheduleSession[];
  setActiveTab?: (tab: string) => void;
}

export default function DashboardOverviewTab({
  sessionUser,
  sessionRole,
  students,
  coaches,
  invoices,
  schedules = [],
  setActiveTab,
}: DashboardOverviewTabProps) {
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [postText, setPostText] = useState("");

  const loadAvatar = () => {
    if (sessionUser) {
      const saved = localStorage.getItem(`gim_avatar_${sessionUser}`) || "";
      setUserAvatar(saved);
    }
  };

  useEffect(() => {
    loadAvatar();
    const handleAvatarUpdate = () => loadAvatar();
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, [sessionUser]);

  const initialLetter = sessionUser ? sessionUser.charAt(0).toUpperCase() : "A";
  const isCustomImage = isImageAvatar(userAvatar);


  // Week View Anchor Date (defaults to current date)
  const [weekAnchorDate, setWeekAnchorDate] = useState<Date>(new Date());
  const [selectedDateDetails, setSelectedDateDetails] = useState<{
    dateISO: string; // YYYY-MM-DD
    dayNumber: number;
    dayName: string;
    fullDateStr: string;
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, ...
  } | null>(null);

  const pendingInvoices = invoices.filter((i) => i.status === "Menunggu Konfirmasi");
  const paidInvoicesTotal = invoices
    .filter((i) => i.status === "Lunas")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const dayNamesShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const dayNamesFull = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  // Helper to format date into YYYY-MM-DD local string
  const toLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Calculate the 7 days of the current week (Sunday to Saturday)
  const getWeekDates = (anchor: Date) => {
    const curr = new Date(anchor);
    const day = curr.getDay(); // 0 = Sunday
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

  const handlePrevWeek = () => {
    const prev = new Date(weekAnchorDate);
    prev.setDate(weekAnchorDate.getDate() - 7);
    setWeekAnchorDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(weekAnchorDate);
    next.setDate(weekAnchorDate.getDate() + 7);
    setWeekAnchorDate(next);
  };

  const handleCurrentWeek = () => {
    setWeekAnchorDate(new Date());
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

  // Dynamic schedules query: check stored schedules for dateISO
  const getSchedulesForSelectedDate = (dateISO: string, _dayOfWeek?: number) => {
    const customForDate = schedules.filter((s) => s.date === dateISO);
    return customForDate.map((cs) => {
      const coachObj = coaches.find((c) => c.id === cs.coachId || c.name === cs.coachName);
      return {
        id: cs.id,
        time: `${cs.timeStart} - ${cs.timeEnd} WIB`,
        sessionTitle: cs.title,
        poolArea: cs.poolArea,
        coach: {
          name: cs.coachName,
          spec: cs.class,
          phone: cs.coachPhone || coachObj?.phone || "08123456780",
        },
        students: (cs.studentNames || []).map((name, idx) => {
          const studentObj = students.find((st) => st.id === cs.studentIds?.[idx] || st.name === name);
          return {
            id: cs.studentIds?.[idx] || `st-${idx}`,
            name,
            attendanceRate: studentObj?.attendanceRate || "100%",
          };
        }),
        type: cs.class,
        notes: cs.notes,
        isCustom: true,
      };
    });
  };

  // 8 Feature Quick Menu Grid Items
  const menuItems = [
    {
      id: "kehadiran",
      label: "Kehadiran",
      icon: "⏱️",
      bgCircle: "bg-orange-50 border-orange-100 text-orange-500",
      action: () => setActiveTab && setActiveTab("absensi"),
    },
    {
      id: "izin",
      label: "Izin & Cuti",
      icon: "✈️",
      bgCircle: "bg-sky-50 border-sky-100 text-sky-500",
      action: () => setActiveTab && setActiveTab("daftar_hadir"),
    },
    {
      id: "gaji",
      label: "Gaji / SPP",
      icon: "💵",
      bgCircle: "bg-emerald-50 border-emerald-100 text-emerald-500",
      action: () => setActiveTab && setActiveTab("keuangan"),
    },
    {
      id: "kalender",
      label: "Jadwal Les",
      icon: "📅",
      bgCircle: "bg-blue-50 border-blue-100 text-blue-500",
      action: () => setActiveTab && setActiveTab("jadwal"),
    },
    {
      id: "perusahaan",
      label: `Siswa (${students.length})`,
      icon: "🏢",
      bgCircle: "bg-cyan-50 border-cyan-100 text-cyan-600",
      action: () => setActiveTab && setActiveTab("daftar_hadir"),
    },
    {
      id: "approval",
      label: "Approval",
      icon: "📑",
      bgCircle: "bg-purple-50 border-purple-100 text-purple-500",
      action: () => setActiveTab && setActiveTab("keuangan"),
    },
    {
      id: "tim",
      label: `Pelatih (${coaches.length})`,
      icon: "👥",
      bgCircle: "bg-teal-50 border-teal-100 text-teal-500",
      action: () => setShowCoachModal(true),
    },
    {
      id: "kasbon",
      label: "Registrasi",
      icon: "👤+",
      bgCircle: "bg-amber-50 border-amber-100 text-amber-500",
      action: () => setActiveTab && setActiveTab("create"),
    },
  ];

  const firstWeekMonth = monthNames[weekDays[0].getMonth()];
  const lastWeekMonth = monthNames[weekDays[6].getMonth()];
  const weekMonthLabel = firstWeekMonth === lastWeekMonth
    ? `${firstWeekMonth} ${weekDays[0].getFullYear()}`
    : `${firstWeekMonth} - ${lastWeekMonth} ${weekDays[6].getFullYear()}`;

  return (
    <div className="space-y-4 pb-12 bg-[#f8fafc] min-h-full">
      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (FULL WIDTH)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden rounded-none">
        {/* Clean Subtle Concentric Line Pattern */}
        <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25 pointer-events-none" />

        {/* Soft Ambient Depth Glow at Bottom */}
        <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto flex items-center justify-between relative z-10">
          {/* User Profile Capsule */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setShowProfileModal(true)}
              className="relative shrink-0 group cursor-pointer text-left"
              title="Klik untuk ubah foto profil"
            >
              <div className="flex h-13 w-13 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white text-white font-black text-lg shadow-md overflow-hidden group-hover:ring-2 group-hover:ring-cyan-300 transition">
                {isCustomImage && userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getAvatarImageUrl(userAvatar)}
                    alt={sessionUser}
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
              <p className="text-xs font-medium text-cyan-100 leading-tight">
                {sessionRole ? `${sessionRole.toUpperCase()} • ` : ""}Dashboard {sessionRole === "pelatih" ? "Pelatih" : "Admin"}
              </p>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug capitalize">
                {sessionUser || "Administrator GIM"}
              </h2>
            </div>
          </div>

          {/* Top Right Translucent Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationPopup(!showNotificationPopup)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white transition active:scale-95 cursor-pointer shadow-sm"
              title="Notifikasi"
            >
              <span className="text-lg">🔔</span>
              {pendingInvoices.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white shadow-sm">
                  {pendingInvoices.length > 99 ? "99+" : pendingInvoices.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotificationPopup && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl p-4 shadow-2xl border border-slate-100 text-slate-800 z-50 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                  <span className="text-xs font-bold text-slate-900">Pemberitahuan</span>
                  <span className="text-[10px] font-bold text-cyan-600">
                    {pendingInvoices.length} Baru
                  </span>
                </div>
                {pendingInvoices.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center italic">
                    Tidak ada notifikasi baru.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          setShowNotificationPopup(false);
                          if (setActiveTab) setActiveTab("keuangan");
                        }}
                        className="p-2.5 bg-cyan-50/50 rounded-2xl border border-cyan-100 cursor-pointer hover:bg-cyan-100/60 transition text-left"
                      >
                        <p className="text-xs font-bold text-slate-800">
                          Transfer SPP {inv.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Rp {inv.amount.toLocaleString("id-ID")} • Menunggu Verifikasi
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          CONTENT SECTION WRAPPER
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4">
        {/* ==========================================
            2. COMPACT WEEKLY CALENDAR STRIP (7-DAYS)
            ========================================== */}
        <div className="-mt-10 relative z-20">
          <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-3">
            {/* Header: Week Navigation & Quick Actions */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">📅</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Jadwal Latihan Minggu Ini
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {weekMonthLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (setActiveTab) setActiveTab("jadwal");
                  }}
                  className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition cursor-pointer shadow-xs"
                >
                  + Atur Jadwal
                </button>
                <button
                  onClick={handleCurrentWeek}
                  className="px-2 py-1 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[10px] font-bold transition cursor-pointer"
                >
                  Hari Ini
                </button>
                <button
                  onClick={handlePrevWeek}
                  className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                  title="Minggu Sebelumnya"
                >
                  ‹
                </button>
                <button
                  onClick={handleNextWeek}
                  className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                  title="Minggu Berikutnya"
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
                const hasSession = schedules.some((s) => s.date === dateISO);

                return (
                  <button
                    key={dateObj.toISOString()}
                    onClick={() => handleDateClick(dateObj)}
                    className={`flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 rounded-2xl transition-all duration-200 relative cursor-pointer active:scale-95 group ${today
                      ? "bg-gradient-to-b from-blue-600 to-cyan-500 text-white font-black shadow-md shadow-cyan-500/30 scale-102"
                      : "bg-slate-50/80 hover:bg-cyan-50/80 text-slate-700 hover:text-cyan-700 border border-slate-100/80"
                      }`}
                  >
                    {/* Day Name */}
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

                    {/* Date Number */}
                    <span className="text-xs sm:text-sm font-black">
                      {dayNum}
                    </span>

                    {/* Active session indicator dot */}
                    {hasSession && !today && (
                      <span className="h-1 w-1 rounded-full bg-cyan-400 mt-1" />
                    )}
                    {today && (
                      <span className="h-1 w-1 rounded-full bg-white mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick helper tip */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100/80 pt-2">
              <span className="flex items-center gap-1">
                <span className="text-xs">💡</span>
                <span>Klik salah satu hari untuk melihat rincian jam & pelatih</span>
              </span>
              <button
                onClick={() => {
                  if (setActiveTab) setActiveTab("jadwal");
                }}
                className="font-bold text-cyan-600 hover:underline cursor-pointer"
              >
                Buka Menu Jadwal ›
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================
            3. PASTEL 8-GRID FEATURE MENU WITH PAGINATION
            ========================================== */}
        <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
          <div className="grid grid-cols-4 gap-y-5 gap-x-2 sm:gap-x-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="flex flex-col items-center justify-center group cursor-pointer transition active:scale-95"
              >
                <div
                  className={`flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl ${item.bgCircle} border shadow-xs group-hover:scale-105 group-hover:shadow-md transition-all duration-200 mb-2`}
                >
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-700 group-hover:text-cyan-600 transition text-center leading-tight">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Pagination Indicator Pill */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <button
              onClick={() => setActivePageIndex(0)}
              className={`h-1.5 rounded-full transition-all duration-300 ${activePageIndex === 0 ? "w-6 bg-cyan-500" : "w-1.5 bg-slate-200"
                }`}
            />
            <button
              onClick={() => setActivePageIndex(1)}
              className={`h-1.5 rounded-full transition-all duration-300 ${activePageIndex === 1 ? "w-6 bg-cyan-500" : "w-1.5 bg-slate-200"
                }`}
            />
          </div>
        </div>

        {/* ==========================================
            4. TIMELINE & AKTIVITAS SECTION
            ========================================== */}
        <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">Timeline & Aktivitas</h3>
            <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-100">
              Terbaru
            </span>
          </div>

          {/* Share something box */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-xs shrink-0 overflow-hidden shadow-xs border border-white">
              {isCustomImage && userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getAvatarImageUrl(userAvatar)}
                  alt={sessionUser}
                  className="h-full w-full object-cover"
                />
              ) : userAvatar ? (
                <span className="text-sm">{userAvatar}</span>
              ) : (
                <span>{initialLetter}</span>
              )}
            </div>
            <input
              type="text"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Catat evaluasi atau pengumuman hari ini..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>

          {/* Feed Posts */}
          <div className="space-y-3 pt-1">
            {/* Post 1: Announcement */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white text-xs font-bold">
                    🏊
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      GIM Swimming Academy
                    </h4>
                    <p className="text-[10px] text-slate-400">Pengumuman Resmi • 2 jam lalu</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">
                  Ujian Renang
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Ujian Kenaikan Tingkatan Renang akan dilaksanakan serentak pada tanggal 14 September 2026 di Kolam Utama A. Mohon pelatih menyiapkan rekap presensi kesiapan siswa.
              </p>
            </div>

            {/* Post 2: Finance Activity */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white text-xs font-bold">
                    💰
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      Update Administrasi SPP
                    </h4>
                    <p className="text-[10px] text-slate-400">Sistem Keuangan • Hari ini</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {pendingInvoices.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Tercatat total penerimaan SPP terverifikasi sebesar{" "}
                <strong className="text-emerald-600">
                  Rp {paidInvoicesTotal.toLocaleString("id-ID")}
                </strong>
                . {pendingInvoices.length} pembayaran baru menunggu konfirmasi admin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          5. MODAL: JADWAL SESI & PELATIH PADA TANGGAL YANG DIKLIK
          ========================================== */}
      {selectedDateDetails && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setSelectedDateDetails(null)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div>
                <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">
                  Rincian Jadwal Latihan Renang
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

            {/* Schedules List for the clicked date */}
            {(() => {
              const daySchedules = getSchedulesForSelectedDate(
                selectedDateDetails.dateISO,
                selectedDateDetails.dayOfWeek
              );

              if (daySchedules.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <span className="text-3xl">🏖️</span>
                    <h4 className="text-xs font-bold text-slate-700">Tidak Ada Sesi Terjadwal</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Belum ada sesi latihan renang untuk tanggal ini. Anda dapat membuat jadwal baru sekarang.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedDateDetails(null);
                        if (setActiveTab) setActiveTab("jadwal");
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-50 text-cyan-700 text-xs font-bold hover:bg-cyan-100 transition cursor-pointer"
                    >
                      + Buat Jadwal Tanggal Ini
                    </button>
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
                      {/* Session Header */}
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
                            href={`https://wa.me/${schedule.coach.phone}?text=Halo%20${schedule.coach.name},%20konfirmasi%20jadwal%20latihan%20renang`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>💬</span> Hubungi
                          </a>
                        )}
                      </div>

                      {/* Enrolled Students for this Class */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Daftar Siswa Terdaftar ({schedule.students.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {schedule.students.map((student) => (
                            <span
                              key={student.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] font-semibold shadow-2xs"
                            >
                              <span>👤</span>
                              <span>{student.name}</span>
                              <span className="text-[9px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.2 rounded">
                                {student.attendanceRate}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Notes if any */}
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

            {/* Modal Actions */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedDateDetails(null);
                  if (setActiveTab) setActiveTab("jadwal");
                }}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📅</span>
                <span>Kelola & Buat Jadwal</span>
              </button>

              <button
                onClick={() => setSelectedDateDetails(null)}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tim Pelatih Modal */}
      {showCoachModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setShowCoachModal(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>👥</span> Daftar Instruktur & Pelatih GIM
              </h3>
              <button
                onClick={() => setShowCoachModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {coaches.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-900">{c.name}</h5>
                    <p className="text-[10px] text-slate-500">{c.spec} • {c.class}</p>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-100">
                    {c.phone}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowCoachModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      {/* Profile Edit Modal */}
      <EditProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        sessionUser={sessionUser}
        sessionRole={sessionRole}
        onAvatarChange={(newAv) => setUserAvatar(newAv)}
      />
    </div>
  );
}
