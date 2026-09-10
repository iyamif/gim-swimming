"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

export default function FloatingWA() {
  const pathname = usePathname();

  // Hanya tampilkan icon floating WhatsApp di landing page utama ("/")
  if (pathname !== "/") {
    return null;
  }

  const whatsappUrl = "https://wa.me/628973180423?text=Halo%20Admin%20GIM%20Swimming%2C%20saya%20ingin%20tanya%20mengenai%20jadwal%20dan%20kelas%20berenang.";

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center h-14 w-14 rounded-full bg-[#25D366] text-white shadow-2xl transition-all duration-300 hover:bg-[#128C7E] hover:scale-110 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
      aria-label="Contact WhatsApp Admin"
    >
      {/* Tooltip / Label */}
      <span className="absolute right-16 scale-0 bg-slate-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-300 origin-right group-hover:scale-100 shadow-lg pointer-events-none flex items-center gap-1.5">
        <span>Hubungi Kami via WA</span>
        <MessageCircle size={13} className="text-emerald-400" />
      </span>

      {/* Pulsing ring animation */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping pointer-events-none group-hover:animate-none" />

      {/* WhatsApp Image Icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/wa.png"
        alt="WhatsApp Logo"
        className="h-8 w-8 relative z-10 object-contain"
      />
    </a>
  );
}
