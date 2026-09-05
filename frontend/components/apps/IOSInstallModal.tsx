import React from "react";

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
            <p>Ketuk tombol <strong>Bagikan (Share)</strong> <span className="inline-block px-1.5 py-0.5 rounded bg-white border text-sm">📤</span> pada bagian navigasi bawah Safari.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[10px] font-black text-cyan-600">3</span>
            <p>Gulir ke bawah dan ketuk opsi <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong> <span className="inline-block px-1.5 py-0.5 rounded bg-white border text-sm">➕</span>.</p>
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
