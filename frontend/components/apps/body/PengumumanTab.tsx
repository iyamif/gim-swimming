import React, { useState } from "react";
import { AdminNotification } from "../types";
import { broadcastPushNotification } from "../../../lib/api";
import {
  Megaphone,
  RotateCw,
  Send,
  Trash2,
  Search,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Globe,
  GraduationCap,
  Award,
  Check,
} from "lucide-react";

interface PengumumanTabProps {
  sessionUser: string;
  sessionRole: string;
  notifications?: AdminNotification[];
  onMarkNotificationRead?: (id: number | string) => Promise<void>;
  onClearAllNotifications?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  setActiveTab?: (tab: string) => void;
}

export default function PengumumanTab({
  sessionRole,
  notifications = [],
  onMarkNotificationRead,
  onClearAllNotifications,
  onRefresh,
}: PengumumanTabProps) {
  const isAdmin = sessionRole?.toLowerCase() === "admin";

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "siswa" | "pelatih">("all");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

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
        url: "/apps",
        type: "announcement",
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: "Pengumuman berhasil disiarkan!",
        });
        setTitle("");
        setMessage("");

        if (onRefresh) {
          await onRefresh();
        }
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Gagal menyiarkan pengumuman.",
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

  const filteredNotifications = notifications.filter((notif) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (notif.title || "").toLowerCase().includes(q) ||
      (notif.message || "").toLowerCase().includes(q)
    );
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5 pb-36 sm:pb-32 md:pb-16 bg-[#f8fafc] min-h-full animate-fadeIn">
      {/* ==========================================
          TOP BLUE BANNER (WITH DASHBOARD CONCENTRIC CIRCLE LINES)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden">
        {/* Subtle Decorative Background Circles (Matching Dashboard) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Concentric Circle Lines */}
          <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15" />
          <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20" />
          <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25" />

          {/* Soft Ambient Depth Glow */}
          <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl" />
          <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl" />
        </div>

        <div className="max-w-3xl mx-auto flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Megaphone size={20} className="text-cyan-300" />
              <span>Pusat Pengumuman</span>
            </h1>
            <p className="text-xs text-blue-100/90 font-medium mt-0.5">
              Informasi terbaru dan siaran pengumuman resmi
            </p>
          </div>
        </div>
      </div>

      {/* ==========================================
          MAIN CONTENT AREA
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6 -mt-8 relative z-20">
        {/* FORM BUAT PENGUMUMAN (ADMIN ONLY) */}
        {isAdmin && (
          <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/60 border border-slate-100 space-y-4">
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Megaphone size={16} className="text-blue-600" />
              <span>Buat Pengumuman Baru</span>
            </h2>

            <form onSubmit={handleBroadcast} className="space-y-4">
              {/* Target Penerima */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Target Penerima
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "Semua", icon: <Globe size={13} /> },
                    { id: "siswa", label: "Siswa", icon: <GraduationCap size={13} /> },
                    { id: "pelatih", label: "Pelatih", icon: <Award size={13} /> },
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
                      {role.icon}
                      <span>{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Judul Pengumuman */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Judul Pengumuman <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masukkan judul pengumuman..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-800 placeholder-slate-400 outline-none transition bg-white"
                />
              </div>

              {/* Isi Pesan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Isi Pesan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tuliskan isi pengumuman lengkap di sini..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs text-slate-800 placeholder-slate-400 outline-none transition bg-white resize-none"
                />
              </div>

              {/* Feedback Message */}
              {feedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-bold ${
                    feedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {feedback.type === "success" ? (
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Kirim Pengumuman</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* RIWAYAT PENGUMUMAN */}
        <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>Riwayat Pengumuman</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                  {unreadCount} Baru
                </span>
              )}
            </h2>

            {onClearAllNotifications && notifications.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Hapus semua riwayat pengumuman?")) {
                    await onClearAllNotifications();
                  }
                }}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer flex items-center gap-1 border border-slate-200/60"
              >
                <Trash2 size={12} />
                <span>Bersihkan</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pengumuman..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition"
            />
          </div>

          {/* List of Announcements */}
          <div className="space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-1 flex flex-col items-center justify-center">
                <Inbox size={28} className="text-slate-300 mb-1" />
                <p className="text-xs font-bold text-slate-600">
                  {searchQuery
                    ? "Tidak ada pengumuman yang sesuai."
                    : "Belum ada pengumuman."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition text-left flex items-start justify-between gap-3 ${
                    !notif.is_read
                      ? "bg-blue-50/60 border-blue-200"
                      : "bg-white hover:bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-black text-slate-900">
                        {notif.title}
                      </h3>
                      {!notif.is_read && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500 text-white">
                          BARU
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-auto">
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

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.is_read && onMarkNotificationRead && (
                    <button
                      onClick={() => onMarkNotificationRead(notif.id)}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold transition cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                      title="Tandai Sudah Dibaca"
                    >
                      <Check size={11} />
                      <span>Dibaca</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
