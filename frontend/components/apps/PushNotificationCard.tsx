"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  subscribeToPushNotifications,
  sendTestPushToDevice,
  isPushNotificationSupported,
  isAppBadgeSupported,
} from "../../lib/pushNotifications";

interface PushNotificationCardProps {
  sessionUser: string;
  sessionRole: string;
  studentName?: string;
  className?: string;
  compact?: boolean;
}

export default function PushNotificationCard({
  sessionUser,
  sessionRole,
  studentName,
  className = "",
  compact = false,
}: PushNotificationCardProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showTips, setShowTips] = useState(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = () => {
    if (typeof window === "undefined" || !isPushNotificationSupported()) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  };

  useEffect(() => {
    checkStatus();
    // Re-check when window regains focus in case user changed browser settings
    const handleFocus = () => checkStatus();
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const handleSubscribe = async () => {
    try {
      setIsSubscribing(true);
      setStatusMessage(null);

      const res = await subscribeToPushNotifications({
        role: sessionRole,
        username: sessionUser,
        studentName: studentName || sessionUser,
        userPrompt: true,
      });

      checkStatus();

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "✅ Notifikasi HP berhasil diaktifkan! Perangkat Anda kini siap menerima notifikasi saat aplikasi ditutup.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `⚠️ ${res.error || "Gagal mengaktifkan notifikasi push."}`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `⚠️ Terjadi kesalahan: ${err.message || "Gagal menghubungkan push notification"}`,
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const startTestCountdown = () => {
    if (countdown !== null) return;
    setStatusMessage(null);

    // If permission not yet granted, request first
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      handleSubscribe();
      return;
    }

    let currentCount = 5;
    setCountdown(currentCount);

    countdownTimerRef.current = setInterval(async () => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setCountdown(0);

        try {
          const res = await sendTestPushToDevice({
            role: sessionRole,
            username: sessionUser,
            studentName: studentName || sessionUser,
          });

          if (res.success) {
            setStatusMessage({
              type: "success",
              text: "🚀 Notifikasi tes berhasil dikirim dari server! Jika aplikasi ditutup, notifikasi akan langsung muncul di bar notifikasi & lockscreen HP Anda.",
            });
          } else {
            setStatusMessage({
              type: "error",
              text: `⚠️ ${res.message || "Gagal mengirim tes push."}`,
            });
          }
        } catch (err: any) {
          setStatusMessage({
            type: "error",
            text: `⚠️ Error saat mengirim tes: ${err.message}`,
          });
        } finally {
          setTimeout(() => setCountdown(null), 1500);
        }
      }
    }, 1000);
  };

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";
  const isUnsupported = permission === "unsupported";

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br from-indigo-50/90 via-blue-50/60 to-white border border-indigo-100/90 p-5 sm:p-6 shadow-sm space-y-4 relative overflow-hidden animate-fadeIn ${className}`}
    >
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-cyan-400/10 blur-lg pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white text-xl shadow-md shadow-indigo-600/20">
            🔔
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                Notifikasi HP &amp; Layar Terkunci
              </h4>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                Web Push + VAPID
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
              Menerima notifikasi otomatis saat HP terkunci atau aplikasi ditutup total
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <span
          className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full border shadow-2xs ${
            isGranted
              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
              : isDenied
              ? "bg-rose-50 text-rose-700 border-rose-300"
              : isUnsupported
              ? "bg-slate-100 text-slate-600 border-slate-300"
              : "bg-amber-50 text-amber-700 border-amber-300 animate-pulse"
          }`}
        >
          {isGranted
            ? "🟢 Aktif (Siap)"
            : isDenied
            ? "🔴 Diblokir"
            : isUnsupported
            ? "⚪ Tidak Didukung"
            : "🟡 Belum Diaktifkan"}
        </span>
      </div>

      {/* Countdown Alert Banner when testing */}
      {countdown !== null && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg space-y-2 animate-fadeIn relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-200 flex items-center gap-1.5">
              <span>⏱️</span> Hitung Mundur Pengujian Notifikasi
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-700 font-black text-sm shadow-md animate-bounce">
              {countdown}
            </span>
          </div>
          <p className="text-xs font-bold leading-relaxed text-cyan-50">
            👉 <strong>Segera TUTUP / MINIMIZE aplikasi atau KUNCI layar HP Anda sekarang!</strong> Dalam{" "}
            {countdown} detik, notifikasi akan dikirim dari server untuk menguji penerimaan di latar belakang.
          </p>
        </div>
      )}

      {/* Description & Features */}
      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 relative z-10">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 border border-slate-100 shadow-2xs">
            <span>⚡</span>
            <span>Notifikasi instan jadwal baru &amp; perubahan sesi</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 border border-slate-100 shadow-2xs">
            <span>🔴</span>
            <span>Badge count angka di ikon aplikasi HP</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 relative z-10 pt-1">
        {!isGranted && !isUnsupported && (
          <button
            type="button"
            disabled={isSubscribing}
            onClick={handleSubscribe}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black text-xs shadow-md shadow-indigo-500/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isSubscribing ? (
              <>
                <span className="animate-spin inline-block">🔄</span>
                <span>Menghubungkan ke Server...</span>
              </>
            ) : (
              <>
                <span>🔔</span>
                <span>Aktifkan Notifikasi di HP Ini (1-Klik)</span>
              </>
            )}
          </button>
        )}

        {isGranted && (
          <button
            type="button"
            disabled={isSubscribing}
            onClick={handleSubscribe}
            className="py-2.5 px-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            title="Perbarui pendaftaran push token jika berganti perangkat"
          >
            <span>🔄</span>
            <span>Sinkronkan Ulang</span>
          </button>
        )}

        <button
          type="button"
          disabled={countdown !== null || isUnsupported}
          onClick={startTestCountdown}
          className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <span>📲</span>
          <span>
            {countdown !== null ? `Mengirim dalam ${countdown}s...` : "Uji Notifikasi (Hitung Mundur 5 Detik)"}
          </span>
        </button>
      </div>

      {/* Live Status Message Alert */}
      {statusMessage && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold relative z-10 animate-fadeIn ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : statusMessage.type === "error"
              ? "bg-rose-50 text-rose-800 border border-rose-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Mobile Optimization Guide Accordion */}
      <div className="pt-1 border-t border-indigo-100/70 relative z-10">
        <button
          type="button"
          onClick={() => setShowTips((prev) => !prev)}
          className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center justify-between w-full cursor-pointer py-1"
        >
          <span className="flex items-center gap-1.5">
            <span>💡</span>
            <span>Tips agar notifikasi tidak tertunda oleh sistem Android / iOS</span>
          </span>
          <span>{showTips ? "▲ Sembunyikan" : "▼ Lihat Tips"}</span>
        </button>

        {showTips && (
          <div className="mt-2.5 p-3.5 rounded-2xl bg-white/90 border border-indigo-100 text-[11px] text-slate-700 space-y-2.5 animate-fadeIn leading-relaxed">
            <div>
              <strong className="text-slate-900 block mb-0.5">📱 Pengguna Android (Chrome / Samsung Internet):</strong>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>
                  Buka <em>Pengaturan HP &gt; Aplikasi &gt; Chrome (atau GIM Swimming) &gt; Notifikasi &gt; Izinkan</em>.
                </li>
                <li>
                  Buka <em>Pengaturan Baterai &gt; Penggunaan Baterai Aplikasi</em> dan setel ke <strong>&quot;Tidak Dibatasi (Unrestricted)&quot;</strong> agar sistem HP tidak mematikan service worker saat layar mati.
                </li>
              </ul>
            </div>

            <div>
              <strong className="text-slate-900 block mb-0.5">🍏 Pengguna iPhone / iPad (iOS 16.4+):</strong>
              <p className="text-slate-600">
                Web Push di iPhone memerlukan aplikasi ditambahkan ke Home Screen terlebih dahulu. Buka di Safari, ketuk tombol <strong>Share (Bagikan) &gt; Tambah ke Layar Utama (Add to Home Screen)</strong>, lalu buka aplikasi dari ikon layar utama dan izinkan notifikasi.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
