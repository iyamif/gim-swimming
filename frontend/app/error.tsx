"use client";

import React, { useEffect } from "react";
import { RotateCw, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PWA Runtime Error]:", error);

    // Auto-recover from chunk loading errors caused by iOS standalone stale cache
    const errMsg = error?.message || "";
    if (
      errMsg.includes("Loading chunk") ||
      errMsg.includes("ChunkLoadError") ||
      errMsg.includes("Failed to fetch dynamically imported module")
    ) {
      const lastReload = sessionStorage.getItem("pwa_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("pwa_chunk_reload", now.toString());
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "CLEAR_ALL_CACHES" });
        }
        window.location.reload();
      }
    }
  }, [error]);

  const handleHardRefresh = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (e) {
      console.warn("Cache clear error:", e);
    }
    window.location.href = "/apps?refresh=" + Date.now();
  };

  return (
    <div className="min-h-screen bg-[#061827] flex items-center justify-center p-6 text-white text-center font-sans">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-5 animate-fadeIn">
        <div className="h-16 w-16 rounded-2xl bg-blue-500/20 border border-blue-400/40 text-cyan-400 flex items-center justify-center mx-auto shadow-lg">
          <RefreshCw size={28} className="animate-spin" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-black text-white">
            Memperbarui Aplikasi GIM Swimming
          </h2>
          <p className="text-xs text-cyan-200/80 leading-relaxed">
            Terdeteksi pembaruan versi baru pada perangkat Anda. Silakan muat ulang untuk memperbarui sistem.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => reset()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95"
          >
            <RotateCw size={15} />
            <span>Coba Lagi</span>
          </button>

          <button
            onClick={handleHardRefresh}
            className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-cyan-100 font-bold text-xs transition cursor-pointer border border-white/15 flex items-center justify-center gap-2 active:scale-95"
          >
            <RefreshCw size={15} />
            <span>Bersihkan Cache &amp; Muat Ulang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
