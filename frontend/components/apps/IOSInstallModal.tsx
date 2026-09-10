import React from "react";
import { Share, PlusSquare } from "lucide-react";

interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IOSInstallModal({ isOpen, onClose }: IOSInstallModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl text-center">
        <h3 className="text-lg font-black text-slate-900 mb-2">Instal Aplikasi di iOS</h3>
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          Ikuti langkah mudah ini untuk menambahkan GIM Swimming ke Layar Utama perangkat Apple Anda:
        </p>
        <div className="space-y-4 text-left text-xs text-slate-650 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[10px] font-black text-cyan-600">1</span>
            <p>Buka portal ini menggunakan browser <strong>Safari</strong> bawaan iOS.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[10px] font-black text-cyan-600">2</span>
            <p className="flex items-center gap-1.5 flex-wrap">
              <span>Ketuk tombol <strong>Bagikan (Share)</strong></span>
              <span className="inline-flex items-center justify-center p-1 rounded bg-white border border-slate-200 text-blue-500 shadow-2xs">
                <Share size={13} />
              </span>
              <span>pada bagian navigasi bawah Safari.</span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[10px] font-black text-cyan-600">3</span>
            <p className="flex items-center gap-1.5 flex-wrap">
              <span>Gulir ke bawah dan ketuk opsi <strong>Tambahkan ke Layar Utama</strong></span>
              <span className="inline-flex items-center justify-center p-1 rounded bg-white border border-slate-200 text-slate-700 shadow-2xs">
                <PlusSquare size={13} />
              </span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[10px] font-black text-cyan-600">4</span>
            <p>Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas untuk menyelesaikan.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-cyan-400 hover:bg-cyan-500 py-3 text-sm font-bold text-white transition duration-200 cursor-pointer"
        >
          Saya Mengerti
        </button>
      </div>
    </div>
  );
}
