"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string, role: string) => void;
}

// Helper to determine the RBAC role based on username or email
const getRoleFromUsername = (name: string): string => {
  const normalized = name.toLowerCase();
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("pelatih") || normalized.includes("coach")) return "pelatih";
  return "orang tua"; // Default standard role
};

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"login" | "face-scan" | "success">("login");

  useEffect(() => {
    setMounted(true);
  }, []);
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Face ID Scan States
  const [scanStatus, setScanStatus] = useState("Menghubungkan ke sensor biometrik...");
  const [scanProgress, setScanProgress] = useState(0);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset states when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setStep("login");
      setUsernameOrEmail("");
      setPassword("");
      setError("");
      setLoading(false);
      setScanProgress(0);
      setScanStatus("Menghubungkan ke sensor biometrik...");
      setIsScanning(false);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  // Normal Form Login handler
  const handleNormalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!usernameOrEmail || !password) {
      setError("Silakan isi semua bidang.");
      return;
    }

    if (usernameOrEmail.length < 3) {
      setError("Username / Email minimal harus 3 karakter.");
      return;
    }

    if (password.length < 6) {
      setError("Kata sandi minimal harus 6 karakter.");
      return;
    }

    setLoading(true);
    // Simulate simple authentication check
    setTimeout(() => {
      setLoading(false);
      const displayName = usernameOrEmail.includes("@") ? usernameOrEmail.split("@")[0] : usernameOrEmail;
      const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      setStep("success");
      setTimeout(() => {
        onLoginSuccess(formattedName, getRoleFromUsername(usernameOrEmail));
      }, 1500);
    }, 1200);
  };

  // Trigger Face ID scan flow
  const startFaceIdScan = () => {
    setError("");
    
    // Check if username/email is provided. If not, open Face ID screen but wait for username input first.
    if (!usernameOrEmail.trim()) {
      setStep("face-scan");
      setIsScanning(false);
      return;
    }

    // Otherwise, directly run scanning
    triggerActiveScan();
  };

  // Start Face ID Scan after user inputs Username/Email inside the biometric screen
  const handleStartScanWithInput = () => {
    setError("");
    if (!usernameOrEmail.trim()) {
      setError("Silakan masukkan Username / Email Anda terlebih dahulu.");
      return;
    }
    triggerActiveScan();
  };

  const triggerActiveScan = async () => {
    setStep("face-scan");
    setIsScanning(true);
    setScanProgress(0);
    setScanStatus("Menginisialisasi kamera depan...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: "user" },
        audio: false,
      });

      setHasCamera(true);
      setVideoStream(stream);

      // Give browser a split second to render video element before assigning stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);

      startScanningAnimation();
    } catch (err) {
      console.warn("Webcam access failed, using vector scanner simulator instead:", err);
      setHasCamera(false);
      startScanningAnimation();
    }
  };

  const startScanningAnimation = () => {
    let progress = 0;
    const statusLogs = [
      { p: 0, text: "Menghubungkan ke sensor biometrik..." },
      { p: 15, text: "Mendeteksi wajah..." },
      { p: 35, text: "Memetakan 30,000+ titik inframerah..." },
      { p: 60, text: "Memverifikasi struktur wajah..." },
      { p: 85, text: "Mencocokkan dengan kunci terenkripsi..." },
      { p: 98, text: "Memproses otorisasi..." },
    ];

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(() => {
      progress += 4;
      if (progress >= 100) {
        progress = 100;
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        stopCamera();

        // Scan success, transition to success step
        setStep("success");
        setTimeout(() => {
          const displayName = usernameOrEmail.includes("@") ? usernameOrEmail.split("@")[0] : usernameOrEmail;
          const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
          onLoginSuccess(formattedName, getRoleFromUsername(usernameOrEmail));
        }, 1500);
      }

      setScanProgress(progress);

      // Update status text based on progress milestone
      const log = [...statusLogs].reverse().find((l) => progress >= l.p);
      if (log) {
        setScanStatus(log.text);
      }
    }, 100);
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Custom Keyframes Style Injection for Glowing lasers and scanning effects */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes laser-slide {
          0%, 100% { top: 10%; opacity: 0.8; }
          50% { top: 90%; opacity: 0.8; }
        }
        .animate-laser {
          animation: laser-slide 2s infinite ease-in-out;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.96); opacity: 0.4; }
          50% { transform: scale(1.04); opacity: 0.8; }
          100% { transform: scale(0.96); opacity: 0.4; }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2.2s infinite ease-in-out;
        }
        @keyframes draw-checkmark {
          0% { stroke-dashoffset: 80; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-checkmark {
          stroke-dasharray: 80;
          stroke-dashoffset: 80;
          animation: draw-checkmark 0.6s 0.3s ease-out forwards;
        }
      `}} />

      {/* Modal Backdrop Overlay (Covers the complete screen) */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300 z-[999]"
        onClick={onClose}
      />

      {/* Modal Dialog Box (Centered layout, pure white background) */}
      <div className="relative z-[1000] w-full max-w-sm sm:max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl transition-all duration-300 sm:p-8">
        
        {/* Decorative Top Glowing Border */}
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 animate-pulse" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition duration-200"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* STEP 1: Standard Username/Password Login */}
        {step === "login" && (
          <div>
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-500 border border-cyan-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Masuk ke Akun Anda
              </h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Kelola jadwal latihan renang Anda dengan mudah
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-650 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleNormalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Username / Email
                </label>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 focus:bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Kata Sandi
                  </label>
                  <a href="#" className="text-xs font-bold text-cyan-500 hover:text-cyan-400 transition">
                    Lupa Password?
                  </a>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 focus:bg-white"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4.5 w-4.5 rounded border-slate-200 bg-slate-50 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <label htmlFor="remember-me" className="ml-2 text-xs font-medium text-slate-550 select-none cursor-pointer">
                  Ingat saya di perangkat ini
                </label>
              </div>

              <div className="flex gap-3 items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-cyan-400 hover:bg-cyan-500 py-3 text-sm font-bold text-white transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Memverifikasi...
                    </>
                  ) : (
                    "Masuk ke Akun"
                  )}
                </button>

                {/* Face ID Icon Button (Only Icon, Aligned Side-by-Side) */}
                <button
                  type="button"
                  onClick={startFaceIdScan}
                  className="h-12 w-12 shrink-0 rounded-xl border border-cyan-100 bg-cyan-50/40 hover:bg-cyan-50 text-cyan-500 transition-all duration-200 flex items-center justify-center group cursor-pointer"
                  title="Login dengan Face ID"
                  aria-label="Login dengan Face ID"
                >
                  {/* Face ID Icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="h-6 w-6 transition duration-200 group-hover:scale-110"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h.008v.008H15V9zm-3 0h.008v.008H12V9zm-3 0h.008v.008H9V9zm0 6h.008v.008H9V15zm3 0h.008v.008H12V15zm3 0h.008v.008H15V15zm0-6h.008v.008H15V9zm-3 0h.008v.008H12V9zm-3 0h.008v.008H9V9zm0 6h.008v.008H9V15zm3 0h.008v.008H12V15zm3 0h.008v.008H15V15zM2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.256 0m3.256 0a.75.75 0 101.014-1.104 4.75 4.75 0 00-6.284 0 .75.75 0 101.014 1.104m3.256 5.667c-.89.777-2.366.777-3.256 0m3.256 0a.75.75 0 111.014 1.104 4.75 4.75 0 01-6.284 0 .75.75 0 111.014-1.104" />
                    <rect x="5.25" y="5.25" width="13.5" height="13.5" rx="3.75" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Demo Roles Quick Picker */}
            <div className="mt-5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Pilih Akun Demo untuk Review (Klik untuk Mengisi)
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setUsernameOrEmail("admin@gimswimming.com");
                    setPassword("password123");
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-100 rounded-lg hover:bg-cyan-100/80 transition cursor-pointer"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameOrEmail("pelatih@gimswimming.com");
                    setPassword("password123");
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100/80 transition cursor-pointer"
                >
                  Pelatih
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameOrEmail("ortu@gimswimming.com");
                    setPassword("password123");
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 rounded-lg hover:bg-purple-100/80 transition cursor-pointer"
                >
                  Orang Tua
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Biometric Scanning Mode */}
        {step === "face-scan" && (
          <div className="flex flex-col items-center py-4">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-1">
              Verifikasi Biometrik
            </h3>

            {!isScanning ? (
              // Initial Prompt Screen for Username/Email before scanning
              <div className="w-full flex flex-col items-center mt-4">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-cyan-500 border border-cyan-100 animate-pulse">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-8 w-8"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                
                <p className="text-xs text-slate-500 text-center mb-6 max-w-[280px]">
                  Masukkan Username atau Email akun Anda untuk memverifikasi dengan Face ID
                </p>

                {error && (
                  <div className="w-full mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-650 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                      <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <div className="w-full mb-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Username / Email
                  </label>
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Masukkan username atau email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 focus:bg-white"
                  />
                </div>

                <button
                  onClick={handleStartScanWithInput}
                  className="w-full rounded-xl bg-cyan-400 hover:bg-cyan-500 py-3 text-sm font-bold text-white transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20"
                >
                  Mulai Pemindaian Face ID
                </button>
              </div>
            ) : (
              // Active scanning screen
              <>
                <p className="text-xs text-slate-500 text-center mb-6">
                  Posisikan wajah Anda di area pemindaian
                </p>

                {/* Scanning window (webcam container maintains dark contrast for laser visibility) */}
                <div className="relative h-44 w-44 rounded-full overflow-hidden border-2 border-cyan-400 bg-slate-950 flex items-center justify-center shadow-lg shadow-cyan-400/20">
                  
                  {/* Outer Pulsing Glow */}
                  <div className="absolute inset-0 border-4 border-cyan-400/20 rounded-full animate-pulse-ring pointer-events-none" />

                  {/* Dynamic Camera Feed or Fallback Graphics */}
                  {hasCamera ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    // Futuristic Glowing Cyberpunk Face SVG fallback
                    <div className="w-full h-full flex items-center justify-center p-6 text-cyan-400 bg-cyan-950/20">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1}
                        stroke="currentColor"
                        className="h-28 w-28 opacity-80"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                        />
                        <circle cx="12" cy="12" r="10" strokeDasharray="6 4" className="animate-spin" style={{ animationDuration: "12s" }} />
                      </svg>
                    </div>
                  )}

                  {/* Scanning Laser Line Overlay */}
                  <div className="absolute left-0 w-full h-[3px] bg-cyan-400 shadow-[0_0_10px_2px_rgba(34,211,238,0.7)] animate-laser pointer-events-none" />
                  
                  {/* Holographic grid matrix (overlay for tech look) */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0a1926]/10 to-[#0a1926]/40 pointer-events-none" />
                </div>

                {/* Progress Circular ring value & Status Log */}
                <div className="w-full mt-6 text-center">
                  {/* Progress Percentage bar */}
                  <div className="w-3/4 mx-auto bg-slate-100 h-1 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-100 ease-out"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>

                  <p className="text-sm font-semibold text-cyan-600 animate-pulse min-h-[20px]">
                    {scanStatus}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[280px] mx-auto truncate">
                    {scanProgress}% Selesai (Akun: {usernameOrEmail})
                  </p>
                </div>
              </>
            )}

            {/* Cancel biometric back button */}
            <button
              onClick={() => {
                stopCamera();
                setStep("login");
              }}
              className="mt-6 text-xs font-bold text-slate-500 hover:text-slate-800 transition duration-200 border border-slate-200 bg-slate-50 px-4 py-2 rounded-xl"
            >
              Kembali ke Menu Login
            </button>
          </div>
        )}

        {/* STEP 3: Verification Success */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {/* Animated Circular Success Container */}
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100">
              {/* Glowing ring */}
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-pulse-ring" />
              
              {/* Animated checkmark */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3.5}
                stroke="currentColor"
                className="h-10 w-10 text-emerald-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-checkmark"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>

            <h3 className="text-xl font-black tracking-tight text-slate-900 mb-2">
              Verifikasi Sukses!
            </h3>
            <p className="text-sm text-emerald-600 font-bold mb-2">
              Selamat datang kembali, <span className="text-cyan-500 font-black">{usernameOrEmail.includes("@") ? usernameOrEmail.split("@")[0] : usernameOrEmail}</span>!
            </p>
            <p className="text-xs text-slate-500 max-w-[280px]">
              Menghubungkan ke dasbor GIM Swimming. Mengarahkan halaman...
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
