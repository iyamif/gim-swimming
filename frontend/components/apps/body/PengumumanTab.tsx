"use client";

import React, { useState } from "react";
import { AdminNotification } from "../types";
import { broadcastPushNotification } from "../../../lib/api";

interface PengumumanTabProps {
  sessionUser: string;
  sessionRole: string;
  notifications?: AdminNotification[];
  onMarkNotificationRead?: (id: number | string) => Promise<void>;
  onClearAllNotifications?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  setActiveTab?: (tab: string) => void;
}

interface PresetTemplate {
  id: string;
  label: string;
  icon: string;
  category: "libur" | "ujian" | "jadwal" | "spp" | "latihan" | "umum";
  title: string;
  message: string;
}

export default function PengumumanTab({
  sessionUser,
  sessionRole,
  notifications = [],
  onMarkNotificationRead,
  onClearAllNotifications,
  onRefresh,
  setActiveTab,
}: PengumumanTabProps) {
  const isAdmin = sessionRole?.toLowerCase() === "admin";

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "orangtua" | "siswa" | "pelatih">("all");
  const [categoryType, setCategoryType] = useState<"announcement" | "urgent" | "schedule" | "finance">("announcement");
  const [targetUrl, setTargetUrl] = useState("/apps");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
    details?: string;
  } | null>(null);

  // Feed & filter states
  const [selectedFilter, setSelectedFilter] = useState<"all" | "announcement" | "schedule" | "system">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const presets: PresetTemplate[] = [
    {
      id: "libur",
      label: "Libur Latihan",
      icon: "🏖️",
      category: "libur",
      title: "📢 Pengumuman Libur Latihan Renang",
      message:
        "Diberitahukan kepada seluruh siswa & pelatih bahwa kegiatan latihan renang hari ini diliburkan dan jadwal pengganti akan diinfokan lebih lanjut.",
    },
    {
      id: "ujian",
      label: "Ujian Tingkat",
      icon: "🏆",
      category: "ujian",
      title: "🏆 Ujian Kenaikan Tingkatan Renang",
      message:
        "Ujian kenaikan tingkat renang akan dilaksanakan akhir pekan ini di Kolam Renang Nalendra. Mohon siswa mempersiapkan diri dan hadir tepat waktu.",
    },
    {
      id: "jadwal",
      label: "Ubah Jadwal",
      icon: "⏰",
      category: "jadwal",
      title: "⏰ Penyesuaian Jadwal Latihan",
      message:
        "Terdapat penyesuaian jam latihan untuk sesi sore hari ini. Silakan buka tab Jadwal di aplikasi untuk melihat rincian sesi terbaru Anda.",
    },
    {
      id: "spp",
      label: "Pengingat SPP",
      icon: "💳",
      category: "spp",
      title: "💳 Pengingat Pembayaran SPP Renang",
      message:
        "Batas pembayaran iuran SPP bulanan renang paling lambat tanggal 10. Mohon melakukan konfirmasi melalui menu Keuangan. Terima kasih!",
    },
    {
      id: "latihan",
      label: "Latihan Tambahan",
      icon: "🏊‍♂️",
      category: "latihan",
      title: "🏊‍♂️ Sesi Pemantapan Teknik Renang",
      message:
        "Akan diadakan sesi pemantapan teknik renang khusus gaya dada dan bebas. Pastikan hadir 15 menit sebelum sesi dimulai.",
    },
    {
      id: "umum",
      label: "Pengumuman Resmi",
      icon: "📢",
      category: "umum",
      title: "📢 Informasi Penting GIM Swimming Academy",
      message:
        "Seluruh siswa dan wali murid diimbau untuk selalu memperbarui kehadiran dan memantau notifikasi harian di aplikasi.",
    },
  ];

  const handleApplyPreset = (preset: PresetTemplate) => {
    setTitle(preset.title);
    setMessage(preset.message);
    if (preset.id === "jadwal") {
      setCategoryType("schedule");
      setTargetUrl("/apps?tab=jadwal");
    } else if (preset.id === "spp") {
      setCategoryType("finance");
      setTargetUrl("/apps?tab=keuangan");
    } else {
      setCategoryType("announcement");
      setTargetUrl("/apps");
    }
    setFeedback(null);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFeedback({
        type: "error",
        text: "Judul dan isi pesan pengumuman wajib diisi.",
      });
      return;
    }

    try {
      setSending(true);
      setFeedback(null);

      const res = await broadcastPushNotification({
        title: title.trim(),
        message: message.trim(),
        url: targetUrl || "/apps",
        type: categoryType,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: "Pengumuman berhasil disiarkan!",
          details: `Terkirim ke ${res.sent_count ?? 0} perangkat terdaftar (${res.total_recipients ?? 0} total subscriber). Notifikasi langsung muncul di ponsel pengguna.`,
        });
        setTitle("");
        setMessage("");

        if (onRefresh) {
          await onRefresh();
        }
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Gagal menyiarkan pengumuman push.",
          details: "Periksa koneksi server atau coba lagi beberapa saat lagi.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Terjadi kesalahan saat menyiarkan pengumuman.",
      });
    } finally {
      setSending(false);
    }
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((notif) => {
    const isSchedule =
      notif.type?.includes("schedule") || notif.title?.toLowerCase().includes("jadwal");
    const isAnnouncement =
      notif.type?.includes("announcement") ||
      notif.title?.toLowerCase().includes("pengumuman") ||
      (!isSchedule && !notif.type?.includes("attendance"));
    const isSystem =
      notif.type?.includes("attendance") || notif.type?.includes("system");

    if (selectedFilter === "announcement" && !isAnnouncement) return false;
    if (selectedFilter === "schedule" && !isSchedule) return false;
    if (selectedFilter === "system" && !isSystem) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = notif.title?.toLowerCase().includes(q);
      const matchMsg = notif.message?.toLowerCase().includes(q);
      return matchTitle || matchMsg;
    }

    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5 pb-16 bg-[#f8fafc] min-h-full animate-fadeIn">
      {/* ==========================================
          1. TOP VIBRANT BLUE BANNER (MATCHING THEME)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15">
        {/* Subtle Decorative Background Lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15" />
          <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20" />
          <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25" />
          <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl" />
          <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl" />
        </div>

        <div className="max-w-4xl mx-auto flex items-center justify-between relative z-30">
          <div className="flex items-center gap-3.5">
            {setActiveTab && (
              <button
                onClick={() => setActiveTab("dashboard")}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white transition active:scale-95 cursor-pointer"
                title="Kembali ke Dashboard"
              >
                <span className="text-lg">←</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>📢</span> Pusat Pengumuman
                </h1>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-300 text-slate-950 shadow-xs">
                  {isAdmin ? "Broadcast Admin" : "Pemberitahuan"}
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-medium mt-0.5">
                {isAdmin
                  ? "Siarkan notifikasi instan ke seluruh ponsel orang tua, siswa, & pelatih"
                  : "Daftar pengumuman resmi dan informasi terbaru kegiatan akademi renang"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={() => onRefresh()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white transition cursor-pointer text-sm"
                title="Muat Ulang"
              >
                🔄
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          CONTENT SECTION
          ========================================== */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 -mt-8 relative z-20">
        {/* ==========================================
            ADMIN BROADCAST COMPOSER (ADMIN VIEW ONLY)
            ========================================== */}
        {isAdmin && (
          <div className="rounded-3xl bg-white p-5 sm:p-7 shadow-xl shadow-slate-200/60 border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-xl shadow-xs">
                  ✍️
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    Buat Siaran Pengumuman Baru
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Pesan akan langsung muncul di lockscreen HP penerima via WebPush / FCM
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Sistem PWA Online
              </span>
            </div>

            {/* Quick Presets Pills */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                ⚡ Template Cepat (1-Klik Isi Form)
              </label>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 border border-slate-200/80 hover:border-cyan-300 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form & Live Phone Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input Columns */}
              <form onSubmit={handleBroadcast} className="lg:col-span-7 space-y-4">
                {/* Target Audience */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Target Penerima Notifikasi</span>
                    <span className="text-[10px] text-slate-400">Otomatis ke semua role</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "all", label: "Semua", icon: "🌐" },
                      { id: "orangtua", label: "Orang Tua", icon: "👨‍👩‍👧" },
                      { id: "siswa", label: "Siswa", icon: "🏊" },
                      { id: "pelatih", label: "Pelatih", icon: "👥" },
                    ].map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setTargetAudience(role.id as any)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          targetAudience === role.id
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{role.icon}</span>
                        <span>{role.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category / Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">
                    Kategori Pengumuman
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "announcement", label: "Umum", icon: "📢", color: "blue" },
                      { id: "urgent", label: "Penting / Urgent", icon: "🚨", color: "rose" },
                      { id: "schedule", label: "Jadwal", icon: "📅", color: "emerald" },
                      { id: "finance", label: "Keuangan / SPP", icon: "💳", color: "amber" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryType(cat.id as any)}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          categoryType === cat.id
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-400/20 shadow-2xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">
                      Judul Notifikasi <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {title.length}/60 karakter
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={60}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: 📢 Pengumuman Libur Latihan Renang"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-800 placeholder-slate-400 outline-none transition bg-white"
                  />
                </div>

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">
                      Isi Pesan Pengumuman <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {message.length}/250 karakter
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={250}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tuliskan isi pengumuman lengkap di sini. Pesan ini akan muncul di push drawer & lockscreen HP..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-800 placeholder-slate-400 outline-none transition bg-white resize-none"
                  />
                </div>

                {/* Target URL */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700">
                    Aksi Buka Halaman (URL saat Notifikasi Diklik)
                  </label>
                  <select
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white outline-none cursor-pointer"
                  >
                    <option value="/apps">🏠 Halaman Utama (Dashboard Overview)</option>
                    <option value="/apps?tab=jadwal">📅 Halaman Jadwal Les</option>
                    <option value="/apps?tab=keuangan">💰 Halaman Keuangan / SPP</option>
                    <option value="/apps?tab=daftar_hadir">📋 Halaman Daftar Hadir Siswa</option>
                    <option value="/apps?tab=absensi">⏱️ Halaman Input Presensi</option>
                  </select>
                </div>

                {/* Feedback Alerts */}
                {feedback && (
                  <div
                    className={`p-4 rounded-2xl border text-xs transition animate-fadeIn ${
                      feedback.type === "success"
                        ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                        : "bg-rose-50/90 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <span>{feedback.type === "success" ? "✅" : "⚠️"}</span>
                      <span>{feedback.text}</span>
                    </div>
                    {feedback.details && (
                      <p className="mt-1 text-[11px] opacity-90 pl-6 leading-relaxed">
                        {feedback.details}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-black text-xs transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <span className="animate-spin text-sm">⏳</span>
                        <span>Menyiarkan Notifikasi...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base">🚀</span>
                        <span>Siarkan Pengumuman ke Semua HP</span>
                      </>
                    )}
                  </button>

                  {(title || message) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTitle("");
                        setMessage("");
                        setFeedback(null);
                      }}
                      className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </form>

              {/* Right: Realistic Phone Lockscreen & Push Preview */}
              <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-3">
                <div className="w-full text-left">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📱</span> Preview Tampilan di HP Siswa
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Simulasi notifikasi banner & lockscreen HP penerima
                  </p>
                </div>

                <div className="w-full max-w-[290px] rounded-[36px] bg-slate-900 p-3 shadow-2xl border-4 border-slate-800 text-white relative overflow-hidden">
                  {/* Phone Speaker & Camera Notch */}
                  <div className="flex justify-center mb-4">
                    <div className="h-4 w-24 bg-slate-950 rounded-full flex items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-slate-800" />
                      <div className="h-1.5 w-8 bg-slate-800 rounded-full" />
                    </div>
                  </div>

                  {/* Lockscreen Time */}
                  <div className="text-center my-3 space-y-0.5">
                    <p className="text-[10px] text-slate-300 font-medium">Kamis, 10 September</p>
                    <p className="text-3xl font-black tracking-tight text-white">09:41</p>
                  </div>

                  {/* Push Notification Banner Card in Phone */}
                  <div className="rounded-2xl bg-white/95 backdrop-blur-md text-slate-900 p-3 shadow-lg border border-white/20 space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                      <div className="flex items-center gap-1.5">
                        <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center text-[8px] text-white font-black">
                          G
                        </div>
                        <span className="text-slate-800 font-black text-[10px]">
                          GIM SWIMMING
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400">Baru saja</span>
                    </div>

                    <div className="pl-0.5 space-y-0.5">
                      <h4 className="text-xs font-black text-slate-900 leading-snug">
                        {title.trim() || "Judul Pengumuman 📢"}
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                        {message.trim() ||
                          "Isi teks pengumuman yang Anda ketikkan akan langsung tampil di sini dan di lockscreen ponsel penerima."}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Phone Bar */}
                  <div className="mt-8 mb-1 flex justify-center">
                    <div className="h-1 w-20 bg-white/40 rounded-full" />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 text-center leading-tight">
                  Tersinkronisasi otomatis ke Android, iOS PWA, dan Web Desktop.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            2. FEED & RIWAYAT PENGUMUMAN (HISTORY LIST)
            ========================================== */}
        <div className="rounded-3xl bg-white p-5 sm:p-7 shadow-sm border border-slate-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-600 text-xl shadow-xs">
                📋
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Riwayat Pengumuman &amp; Notifikasi</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                      {unreadCount} Baru
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  Seluruh pemberitahuan resmi, jadwal, dan aktivitas sistem
                </p>
              </div>
            </div>

            {onClearAllNotifications && notifications.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  await onClearAllNotifications();
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition cursor-pointer border border-slate-200/80 shrink-0 self-start sm:self-auto"
              >
                🗑️ Bersihkan Semua
              </button>
            )}
          </div>

          {/* Search & Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "all", label: "Semua", icon: "🌐", count: notifications.length },
                {
                  id: "announcement",
                  label: "Pengumuman",
                  icon: "📢",
                  count: notifications.filter(
                    (n) =>
                      n.type?.includes("announcement") ||
                      n.title?.toLowerCase().includes("pengumuman")
                  ).length,
                },
                {
                  id: "schedule",
                  label: "Jadwal",
                  icon: "📅",
                  count: notifications.filter(
                    (n) =>
                      n.type?.includes("schedule") ||
                      n.title?.toLowerCase().includes("jadwal")
                  ).length,
                },
                {
                  id: "system",
                  label: "Presensi / Sistem",
                  icon: "⏱️",
                  count: notifications.filter(
                    (n) =>
                      n.type?.includes("attendance") || n.type?.includes("system")
                  ).length,
                },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                    selectedFilter === f.id
                      ? "bg-cyan-500 text-white border-cyan-500 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                  }`}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                  {f.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedFilter === f.id
                          ? "bg-white/25 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Keyword Search */}
            <div className="relative min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pengumuman..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-cyan-500 bg-slate-50 focus:bg-white transition"
              />
            </div>
          </div>

          {/* List of Announcements & Notifications */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <span className="text-3xl">📭</span>
                <p className="text-xs font-bold text-slate-600">
                  {searchQuery
                    ? "Tidak ada pengumuman yang sesuai dengan kata kunci."
                    : "Belum ada riwayat pengumuman atau notifikasi."}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isAdmin
                    ? "Gunakan form di atas untuk menyiarkan pengumuman baru kepada seluruh pengguna."
                    : "Pemberitahuan resmi dari akademi akan muncul di sini."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isSchedule =
                  notif.type?.includes("schedule") ||
                  notif.title?.toLowerCase().includes("jadwal");
                const isLate = notif.title?.includes("Terlambat");
                const isUrgent =
                  notif.type?.includes("urgent") ||
                  notif.title?.toLowerCase().includes("urgent") ||
                  notif.title?.toLowerCase().includes("penting");

                const icon = isUrgent
                  ? "🚨"
                  : isSchedule
                  ? "📅"
                  : isLate
                  ? "⚠️"
                  : notif.type?.includes("attendance")
                  ? "⏱️"
                  : "📢";

                return (
                  <div
                    key={notif.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition text-left flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 group ${
                      !notif.is_read
                        ? isUrgent
                          ? "bg-rose-50/70 border-rose-200 shadow-xs"
                          : isSchedule
                          ? "bg-emerald-50/70 border-emerald-200 shadow-xs"
                          : "bg-blue-50/70 border-blue-200 shadow-xs"
                        : "bg-white hover:bg-slate-50/60 border-slate-100 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-100 text-xl shadow-xs">
                        {icon}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-black text-slate-900">
                            {notif.title}
                          </h3>
                          {!notif.is_read && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500 text-white shadow-2xs">
                              BARU
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium ml-auto sm:ml-0">
                            {notif.created_at
                              ? new Date(notif.created_at).toLocaleString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Baru saja"}{" "}
                            WIB
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          {notif.message}
                        </p>

                        {/* Badges / Metadata */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            PWA Push Broadcast
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100">
                            Semua Pengguna
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on each item */}
                    <div className="flex items-center gap-2 shrink-0 pl-13 sm:pl-0">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setTitle(notif.title);
                            setMessage(notif.message);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer border border-slate-200 active:scale-95"
                          title="Salin ke Form Buat Pengumuman"
                        >
                          📋 Gunakan Teks
                        </button>
                      )}

                      {isSchedule && setActiveTab && (
                        <button
                          onClick={() => {
                            if (onMarkNotificationRead && !notif.is_read) {
                              onMarkNotificationRead(notif.id);
                            }
                            setActiveTab("jadwal");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition cursor-pointer shadow-xs active:scale-95"
                        >
                          Buka Jadwal →
                        </button>
                      )}

                      {!notif.is_read && onMarkNotificationRead && (
                        <button
                          onClick={() => onMarkNotificationRead(notif.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold transition cursor-pointer active:scale-95 shadow-2xs"
                          title="Tandai Sudah Dibaca"
                        >
                          ✓ Dibaca
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
