import React, { useEffect, useState } from "react";
import { AdminNotification } from "./types";

interface NotificationToastProps {
  notification: AdminNotification | null;
  onDismiss: () => void;
  onClickAction?: (notification: AdminNotification) => void;
  autoDismissTimeout?: number; // default 7000ms
}

export default function NotificationToast({
  notification,
  onDismiss,
  onClickAction,
  autoDismissTimeout = 7000,
}: NotificationToastProps) {
  const [progress, setProgress] = useState(100);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!notification) {
      setProgress(100);
      setIsClosing(false);
      return;
    }

    setProgress(100);
    setIsClosing(false);

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / autoDismissTimeout) * 100);
      setProgress(remainingPct);

      if (remainingPct <= 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification, autoDismissTimeout]);

  if (!notification) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDismiss();
      setIsClosing(false);
    }, 250);
  };

  const handleClick = () => {
    if (onClickAction) {
      onClickAction(notification);
    }
    handleClose();
  };

  const isSchedule =
    notification.type?.includes("schedule") ||
    notification.title?.toLowerCase().includes("jadwal");
  const isLate = notification.title?.includes("Terlambat");
  const isAttendance =
    notification.type?.includes("attendance") ||
    notification.title?.toLowerCase().includes("hadir") ||
    notification.title?.toLowerCase().includes("absen");

  const icon = isSchedule ? "📅" : isLate ? "⚠️" : isAttendance ? "⏱️" : "🔔";
  const accentColor = isSchedule
    ? "from-emerald-500 to-teal-600 border-emerald-400/40 text-emerald-400"
    : isLate
    ? "from-amber-500 to-orange-600 border-amber-400/40 text-amber-400"
    : isAttendance
    ? "from-blue-500 to-indigo-600 border-blue-400/40 text-blue-400"
    : "from-cyan-500 to-blue-600 border-cyan-400/40 text-cyan-400";

  return (
    <div
      className={`fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100%-1.5rem)] max-w-md pointer-events-auto transition-all duration-300 ${
        isClosing
          ? "opacity-0 -translate-y-4 scale-95"
          : "opacity-100 translate-y-0 scale-100 animate-slideDown"
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900/95 text-white shadow-2xl shadow-slate-950/60 border border-white/20 backdrop-blur-2xl p-3.5 sm:p-4">
        {/* Glow ambient background */}
        <div
          className={`absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-25 bg-gradient-to-br ${accentColor}`}
        />

        <div className="flex items-start gap-3 relative z-10">
          {/* Pulsing Icon Bubble */}
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr ${accentColor} text-xl shadow-md border ring-4 ring-white/10`}
          >
            <span>{icon}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-black uppercase tracking-wider text-cyan-300 border border-white/15">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Notifikasi Baru
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Baru saja</span>
            </div>

            <h4 className="text-xs sm:text-sm font-black text-white tracking-tight leading-snug line-clamp-1">
              {notification.title}
            </h4>

            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed mt-0.5 line-clamp-2">
              {notification.message}
            </p>

            {/* Quick Action Button */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleClick}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-[11px] font-bold text-slate-950 transition cursor-pointer shadow-sm shadow-cyan-500/25"
              >
                <span>{isSchedule ? "Lihat Jadwal" : isAttendance ? "Buka Absensi" : "Buka"}</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-[11px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>

          {/* Close Icon */}
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/10 transition cursor-pointer shrink-0"
            title="Tutup Notifikasi"
          >
            ✕
          </button>
        </div>

        {/* Bottom progress bar countdown */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 transition-all duration-75 linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
