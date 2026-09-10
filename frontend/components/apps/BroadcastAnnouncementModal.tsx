"use client";

import React, { useState } from "react";
import { broadcastPushNotification } from "../../lib/api";

interface BroadcastAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sessionUser: string;
}

interface PresetTemplate {
  id: string;
  label: string;
  icon: string;
  title: string;
  message: string;
}

export default function BroadcastAnnouncementModal({
  isOpen,
  onClose,
  onSuccess,
  sessionUser,
}: BroadcastAnnouncementModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetUrl, setTargetUrl] = useState("/apps");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
    details?: string;
  } | null>(null);

  const presets: PresetTemplate[] = [
    {
      id: "libur",
      label: "Libur Latihan",
      icon: "🏖️",
      title: "📢 Pengumuman Libur Latihan Renang",
      message:
        "Diberitahukan kepada seluruh siswa & pelatih bahwa kegiatan latihan renang hari ini diliburkan dan jadwal pengganti akan diinfokan lebih lanjut.",
    },
    {
      id: "ujian",
      label: "Ujian Tingkat",
      icon: "🏆",
      title: "🏆 Ujian Kenaikan Tingkatan Renang",
      message:
        "Ujian kenaikan tingkat renang akan dilaksanakan akhir pekan ini di Kolam Renang Nalendra. Mohon siswa mempersiapkan diri dan hadir tepat waktu.",
    },
    {
      id: "jadwal",
      label: "Ubah Jadwal",
      icon: "⏰",
      title: "⏰ Penyesuaian Jadwal Latihan",
      message:
        "Terdapat penyesuaian jam latihan untuk sesi sore hari ini. Silakan buka tab Jadwal di aplikasi untuk melihat rincian sesi terbaru Anda.",
    },
    {
      id: "spp",
      label: "Pengingat SPP",
      icon: "💳",
      title: "💳 Pengingat Pembayaran SPP Renang",
      message:
        "Batas pembayaran iuran SPP bulanan renang paling lambat tanggal 10. Mohon melakukan konfirmasi melalui menu Keuangan. Terima kasih!",
    },
    {
      id: "ekstra",
      label: "Latihan Tambahan",
      icon: "🏊‍♂️",
      title: "🏊‍♂️ Sesi Pemantapan Teknik Renang",
      message:
        "Akan diadakan sesi pemantapan teknik renang khusus gaya dada dan bebas. Pastikan hadir 15 menit sebelum sesi dimulai.",
    },
  ];

  const handleApplyPreset = (preset: PresetTemplate) => {
    setTitle(preset.title);
    setMessage(preset.message);
    setFeedback(null);
  };

  const handleSend = async (e: React.FormEvent) => {
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
        url: targetUrl.trim() || "/apps",
        type: "announcement",
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: "Pengumuman berhasil disiarkan!",
          details: `Terkirim ke ${res.sent_count || 0} dari ${res.total_recipients || 0
            } perangkat PWA yang terpasang di HP siswa & pelatih.`,
        });

        if (onSuccess) {
          onSuccess();
        }

        setTimeout(() => {
          setTitle("");
          setMessage("");
          setFeedback(null);
          onClose();
        }, 2200);
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Gagal menyiarkan pengumuman push.",
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Header Gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 p-5 sm:p-6 text-white relative shrink-0">
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-2xl shadow-sm">
                📢
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    Siarkan Pengumuman (Push Notifikasi)
                  </h3>
                </div>
                <p className="text-xs text-cyan-100 mt-0.5">
                  Kirim notifikasi instan ke semua ponsel yang menginstall PWA
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm transition cursor-pointer border border-white/20 active:scale-95"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold border flex items-start gap-2.5 animate-fadeIn ${feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
            >
              <span className="text-base shrink-0">
                {feedback.type === "success" ? "✅" : "⚠️"}
              </span>
              <div>
                <p className="font-bold">{feedback.text}</p>
                {feedback.details && (
                  <p className="text-[11px] text-emerald-700 mt-0.5 font-normal">
                    {feedback.details}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Preset Templates Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                {/* <span>⚡</span> */}
                <span>Pilih Template Cepat (1-Klik):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Klik untuk auto-fill
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 text-slate-700 hover:text-blue-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="space-y-4">
            {/* Title Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>Judul Notifikasi</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {title.length}/60 karakter
                </span>
              </div>
              <input
                type="text"
                value={title}
                maxLength={60}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: 📢 Libur Latihan Renang Hari Ini"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium"
                required
              />
            </div>

            {/* Message Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>Isi Pengumuman / Pesan</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {message.length}/200 karakter
                </span>
              </div>
              <textarea
                value={message}
                maxLength={200}
                rows={3}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan pengumuman lengkap di sini. Notifikasi ini akan langsung muncul di lockscreen dan banner HP penerima..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium resize-none"
                required
              />
            </div>

            {/* Live Mobile Notification Preview Card */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span>📱</span>
                <span>Live Preview Tampilan di Ponsel:</span>
              </span>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white shadow-md border border-slate-700 space-y-2 relative overflow-hidden">
                {/* Simulated lockscreen / banner glass overlay */}
                <div className="flex items-center justify-between text-[10px] text-slate-300 border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-white text-[10px] font-bold">
                      🏊
                    </div>
                    <span className="font-bold tracking-wide text-white uppercase text-[9px]">
                      GIM Swimming Academy
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400">Baru saja</span>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-white leading-tight">
                    {title.trim() || "Judul Notifikasi Pengumuman 📢"}
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-snug font-normal">
                    {message.trim() ||
                      "Isi teks pengumuman yang Anda ketikkan akan ditampilkan langsung di lockscreen & notification drawer ponsel seluruh siswa serta pelatih."}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[9px] text-cyan-300/80 pt-1 font-medium">
                  <span className="flex items-center gap-1">
                    <span>🔔 Suara &amp; Getar Aktif</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>🔴 Badge Icon App: +1</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Target Audience Notice */}
            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-2 text-[11px] text-blue-900">
              <span className="text-sm shrink-0">ℹ️</span>
              <p className="leading-relaxed">
                Pengumuman ini otomatis dikirimkan ke <strong>semua role</strong> (Orang Tua, Siswa, dan Pelatih) yang telah memasang aplikasi PWA GIM Swimming di Android / iPhone / Desktop.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={sending || !title.trim() || !message.trim()}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                {sending ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Menyiarkan ke Semua HP...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Kirim Pengumuman ke Semua HP</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
