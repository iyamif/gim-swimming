"use client";

import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <a href="#" className="flex items-center gap-2 sm:gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="GIM Swimming Logo"
            className="h-9 sm:h-12 w-auto rounded-lg sm:rounded-xl object-contain bg-white"
          />
          <div>
            <p className="text-xs sm:text-base md:text-lg font-black tracking-tight text-slate-900 leading-none">
              GIM <span className="text-cyan-400">SWIMMING</span>
            </p>
            <p className="text-[6px] sm:text-[9px] font-bold tracking-[0.25em] text-slate-500 mt-0.5 sm:mt-1">
              SWIM • LEARN • GROW
            </p>
          </div>
        </a>

        {/* Desktop Navigation Menu */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#tentang"
            className="text-sm font-semibold text-slate-600 transition hover:text-cyan-505"
          >
            Tentang
          </a>
          <a
            href="#program"
            className="text-sm font-semibold text-slate-600 transition hover:text-cyan-505"
          >
            Program
          </a>
          <a
            href="#keunggulan"
            className="text-sm font-semibold text-slate-600 transition hover:text-cyan-505"
          >
            Keunggulan
          </a>
        </nav>

        {/* CTA and Menu Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/pendaftaran"
            className="rounded-full bg-cyan-400 px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm font-bold text-white transition hover:bg-cyan-300"
          >
            Daftar<span className="hidden sm:inline"> Sekarang</span>
          </a>

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl border border-slate-100 bg-slate-50 text-slate-600 transition hover:bg-slate-100 md:hidden"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="h-4.5 w-4.5 sm:h-5 sm:w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="h-4.5 w-4.5 sm:h-5 sm:w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu Panel */}
      {isOpen && (
        <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md py-4 px-4 sm:px-6 md:hidden shadow-lg transition duration-200">
          <nav className="flex flex-col gap-3">
            <a
              href="#tentang"
              onClick={() => setIsOpen(false)}
              className="text-sm font-bold text-slate-600 hover:text-cyan-500 py-1.5 border-b border-slate-50 transition"
            >
              Tentang
            </a>
            <a
              href="#program"
              onClick={() => setIsOpen(false)}
              className="text-sm font-bold text-slate-600 hover:text-cyan-500 py-1.5 border-b border-slate-50 transition"
            >
              Program
            </a>
            <a
              href="#keunggulan"
              onClick={() => setIsOpen(false)}
              className="text-sm font-bold text-slate-600 hover:text-cyan-500 py-1.5 transition"
            >
              Keunggulan
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
