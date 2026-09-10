"use client";

import React, { useState, useEffect } from "react";
import {
  subscribeToPushNotifications,
  isPushNotificationSupported,
} from "../../lib/pushNotifications";
import { Bell, RotateCw } from "lucide-react";

interface PushPermissionBannerProps {
  sessionUser: string;
  sessionRole: string;
  studentName?: string;
}

export default function PushPermissionBanner({
  sessionUser,
  sessionRole,
  studentName,
}: PushPermissionBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !isPushNotificationSupported()) {
      return;
    }

    const dismissed = sessionStorage.getItem("gim_push_banner_dismissed") === "true";
    if (Notification.permission === "default" && !dismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      const res = await subscribeToPushNotifications({
        role: sessionRole,
        username: sessionUser,
        studentName: studentName || sessionUser,
        userPrompt: true,
      });

      if (res.success) {
        setShowBanner(false);
      }
    } catch (err) {
      console.error("Banner push subscribe error:", err);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("gim_push_banner_dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 p-3.5 sm:p-4 text-white shadow-md shadow-blue-500/15 border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn relative z-20">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white shadow-2xs border border-white/30">
          <Bell size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-white leading-tight">
              Aktifkan Notifikasi di HP Anda
            </h4>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-cyan-300 text-slate-950">
              1-Klik
            </span>
          </div>
          <p className="text-[11px] text-cyan-100 leading-tight mt-0.5">
            Dapatkan pemberitahuan jadwal baru &amp; pengumuman saat aplikasi ditutup
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-100 text-[11px] font-bold transition cursor-pointer"
        >
          Nanti Saja
        </button>

        <button
          type="button"
          disabled={isSubscribing}
          onClick={handleEnable}
          className="px-3.5 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-cyan-50 text-[11px] font-black transition shadow-sm cursor-pointer active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
        >
          {isSubscribing ? (
            <>
              <RotateCw size={12} className="animate-spin" />
              <span>Mengaktifkan...</span>
            </>
          ) : (
            <>
              <Bell size={12} />
              <span>Aktifkan Sekarang</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
