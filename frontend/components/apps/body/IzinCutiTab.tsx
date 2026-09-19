import React from "react";
import { Plane, ArrowLeft, Construction, Clock, Sparkles } from "lucide-react";

interface IzinCutiTabProps {
  setActiveTab?: (tab: string) => void;
}

export default function IzinCutiTab({ setActiveTab }: IzinCutiTabProps) {
  return (
    <div className="space-y-5 pb-36 sm:pb-32 md:pb-16 bg-[#f8fafc] min-h-full animate-fadeIn">
      {/* ==========================================
          TOP BLUE BANNER
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden">
        {/* Decorative Concentric Circle Lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15" />
          <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20" />
          <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25" />
          <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl" />
          <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl" />
        </div>

        <div className="max-w-3xl mx-auto flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Plane size={20} className="text-cyan-300" />
              <span>Izin & Cuti</span>
            </h1>
            <p className="text-xs text-blue-100/90 font-medium mt-0.5">
              Layanan permohonan izin & cuti
            </p>
          </div>

          {setActiveTab && (
            <button
              onClick={() => setActiveTab("dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-xs transition cursor-pointer border border-white/15"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* ==========================================
          MAIN CONTENT CARD: FITUR DALAM PENGEMBANGAN
          ========================================== */}
      <div className="max-w-md mx-auto -mt-6 px-4 relative z-20">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 text-center space-y-5">
          {/* Badge Icon */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-sky-100 rounded-3xl rotate-6 transition" />
            <div className="relative w-full h-full bg-gradient-to-tr from-sky-500 to-cyan-400 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Construction size={34} />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-400 items-center justify-center text-[9px] text-slate-900 font-black">
                ✨
              </span>
            </span>
          </div>

          {/* Heading & Text */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 text-[11px] font-bold">
              <Clock size={12} className="text-sky-600" />
              <span>Tahap Pengembangan</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Fitur Ini Masih Dalam Pengembangan
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Menu permohonan dan manajemen <strong>Izin & Cuti</strong> sedang dalam proses pembuatan dan akan segera tersedia pada pembaruan mendatang.
            </p>
          </div>

          {/* Action Button */}
          {setActiveTab && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Dashboard</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
