"use client";

import React from "react";
import { ShieldAlert, LogOut, MessageCircle, AlertTriangle, PhoneCall } from "lucide-react";

interface DeactivatedAccountModalProps {
  isOpen: boolean;
  userName: string;
  userRole: string;
  onLogout: () => void;
}

export default function DeactivatedAccountModal({
  isOpen,
  userName,
  userRole,
  onLogout,
}: DeactivatedAccountModalProps) {
  if (!isOpen) return null;

  const roleLabel =
    userRole.toLowerCase() === "pelatih"
      ? "Pelatih"
      : userRole.toLowerCase() === "orang tua"
      ? "Siswa / Orang Tua"
      : "Pengguna";

  const waMessage = encodeURIComponent(
    `Halo Admin GIM Swimming, akun saya (${userName} - ${roleLabel}) saat ini berstatus non-aktif. Mohon bantuannya untuk mengaktifkan kembali akun saya agar dapat mengakses aplikasi. Terima kasih.`
  );
  const waUrl = `https://wa.me/6281234567890?text=${waMessage}`;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-red-100 text-center overflow-hidden animate-scaleUp">
        {/* Top Decorative Amber/Red Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-red-100 rounded-full blur-2xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-100 rounded-full blur-2xl opacity-60 pointer-events-none" />

        {/* Big Alert Icon */}
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-500 to-rose-400 text-white shadow-lg shadow-red-500/25 ring-8 ring-red-50 animate-bounce">
          <ShieldAlert className="h-10 w-10 text-white" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-600 text-xs font-bold mb-3">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          Status Akun: Non-Aktif
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mb-2">
          Akun Anda Dinonaktifkan
        </h2>

        {/* Message */}
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Akun <span className="font-bold text-slate-800">{userName}</span> ({roleLabel}) telah dinonaktifkan oleh Administrator. Seluruh akses fitur aplikasi dibekukan sementara. Hubungi Admin untuk kembali mengaktifkan akun Anda.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* WhatsApp Direct Action */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-600 active:scale-[0.98] transition-all cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/wa.png" alt="WhatsApp" className="h-5 w-5 object-contain" />
            <span>Hubungi Admin via WhatsApp</span>
          </a>

          {/* Logout Action */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-slate-500" />
            <span>Keluar dari Aplikasi</span>
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span>GIM Swimming Club Official Support</span>
        </div>
      </div>
    </div>
  );
}
