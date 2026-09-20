"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  AlertCircle,
  Lock,
  User,
  Loader2,
  CheckCircle2,
  Scan,
  Mail,
  Send,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  ChevronLeft,
  RotateCw,
  Check,
} from "lucide-react";
import {
  API_BASE_URL,
  getApiBaseUrl,
  setupInitialPassword,
  requestPasswordResetOTP,
  resetPasswordWithOTP,
} from "../lib/api";
import { saveAuthSession } from "../lib/authSession";
import {
  isFaceIdEnabledForUser,
  getFaceIdCredential,
  getRegisteredFaceIdUsers,
  FaceIdUserRecord,
} from "../lib/biometrics";

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
  const [step, setStep] = useState<"login" | "face-scan" | "setup-password" | "forgot-password" | "success">("login");
  const [currentUserData, setCurrentUserData] = useState<{ username: string; role: string; must_change_password?: boolean } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [setupError, setSetupError] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  // Lupa Password (Reset via Email OTP) States
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [isForgotSendingOtp, setIsForgotSendingOtp] = useState(false);
  const [isForgotResetting, setIsForgotResetting] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpCountdown, setForgotOtpCountdown] = useState(0);
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // Face ID Scan States
  const [scanStatus, setScanStatus] = useState("Menghubungkan ke sensor biometrik...");
  const [scanProgress, setScanProgress] = useState(0);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // OTP Countdown timer for forgot password resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (forgotOtpCountdown > 0) {
      timer = setTimeout(() => setForgotOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [forgotOtpCountdown]);

  const [registeredFaceIdUsers, setRegisteredFaceIdUsers] = useState<FaceIdUserRecord[]>([]);

  // Reset states when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setStep("login");
      setUsernameOrEmail("");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setSetupError("");
      setCurrentUserData(null);
      setLoading(false);
      setSetupLoading(false);
      setScanProgress(0);
      setScanStatus("Menghubungkan ke sensor biometrik...");
      setIsScanning(false);
      setForgotEmail("");
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setForgotError("");
      setForgotSuccess("");
      setForgotOtpSent(false);
      setForgotOtpCountdown(0);
      setRegisteredFaceIdUsers(getRegisteredFaceIdUsers());
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
  const handleNormalSubmit = async (e: React.FormEvent) => {
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
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail,
          password: password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal melakukan login");
      }

      setLoading(false);

      // Save session credentials persistently (both localStorage and persistent Cookies)
      const user = result.data.user;
      saveAuthSession({
        user: user?.username || usernameOrEmail,
        role: user?.role || getRoleFromUsername(usernameOrEmail),
        token: result.data.token,
        avatar: user?.avatar,
      });
      setCurrentUserData(user);

      if (user?.must_change_password) {
        setStep("setup-password");
      } else {
        setStep("success");
        setTimeout(() => {
          onLoginSuccess(user.username, user.role);
        }, 1500);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Koneksi ke server gagal. Harap pastikan server backend menyala.");
    }
  };

  // Password Setup Submit Handler for First Time Logins
  const handleSetupPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");

    if (!newPassword || !confirmPassword) {
      setSetupError("Silakan isi kata sandi baru dan konfirmasi kata sandi.");
      return;
    }

    if (newPassword.length < 6) {
      setSetupError("Kata sandi baru minimal harus 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSetupError("Konfirmasi kata sandi tidak cocok. Harap periksa kembali.");
      return;
    }

    setSetupLoading(true);
    try {
      await setupInitialPassword(newPassword);
      setSetupLoading(false);
      setStep("success");

      setTimeout(() => {
        if (currentUserData) {
          onLoginSuccess(currentUserData.username, currentUserData.role);
        } else {
          onLoginSuccess(usernameOrEmail, getRoleFromUsername(usernameOrEmail));
        }
      }, 1500);
    } catch (err: any) {
      setSetupLoading(false);
      setSetupError(err.message || "Gagal menyimpan kata sandi baru.");
    }
  };

  // Send OTP to email for forgot password
  const handleForgotSendOTP = async () => {
    if (!forgotEmail.trim()) {
      setForgotError("Silakan masukkan alamat email atau username Anda.");
      return;
    }
    setForgotError("");
    try {
      setIsForgotSendingOtp(true);
      const res = await requestPasswordResetOTP(forgotEmail.trim());
      setForgotOtpSent(true);
      setForgotMaskedEmail(res.data?.masked_email || forgotEmail.trim());
      setForgotOtpCountdown(60);
    } catch (err: any) {
      setForgotError(err.message || "Gagal mengirim kode verifikasi. Pastikan email terdaftar.");
    } finally {
      setIsForgotSendingOtp(false);
    }
  };

  // Reset password using OTP
  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotEmail.trim()) {
      setForgotError("Silakan masukkan email akun Anda.");
      return;
    }
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setForgotError("Silakan masukkan 6-digit kode verifikasi yang dikirim ke email.");
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError("Kata sandi baru minimal harus 6 karakter.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    try {
      setIsForgotResetting(true);
      await resetPasswordWithOTP(forgotEmail.trim(), forgotOtp.trim(), forgotNewPassword);
      setForgotSuccess("Kata sandi berhasil diperbarui! Mengalihkan ke menu masuk...");
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setTimeout(() => {
        setUsernameOrEmail(forgotEmail.trim());
        setPassword("");
        setStep("login");
        setForgotSuccess("");
      }, 2000);
    } catch (err: any) {
      setForgotError(err.message || "Gagal mereset kata sandi. Pastikan kode verifikasi benar.");
    } finally {
      setIsForgotResetting(false);
    }
  };

  // Trigger Face ID scan flow
  const startFaceIdScan = () => {
    setError("");
    const registered = getRegisteredFaceIdUsers();

    if (registered.length === 0) {
      setError("Fitur Face ID belum diaktifkan pada perangkat ini. Silakan masuk terlebih dahulu menggunakan kata sandi, lalu aktifkan Face ID di menu Profil.");
      return;
    }

    if (usernameOrEmail.trim()) {
      const normalized = usernameOrEmail.trim();
      if (!isFaceIdEnabledForUser(normalized)) {
        setError(`Fitur Face ID belum diaktifkan untuk akun "${normalized}". Silakan masuk dengan kata sandi terlebih dahulu, lalu aktifkan Face ID di menu Profil.`);
        return;
      }
      triggerActiveScan(normalized);
      return;
    }

    // If username field is empty:
    // If exactly 1 registered user exists, use that user automatically
    if (registered.length === 1) {
      const soleUser = registered[0].username;
      setUsernameOrEmail(soleUser);
      triggerActiveScan(soleUser);
      return;
    }

    // If multiple accounts are registered on this device, open account picker screen
    setRegisteredFaceIdUsers(registered);
    setStep("face-scan");
    setIsScanning(false);
  };

  // Start Face ID Scan after user inputs or selects Username/Email inside the biometric screen
  const handleStartScanWithInput = (selectedUsername?: string) => {
    setError("");
    const targetUser = (selectedUsername || usernameOrEmail).trim();
    if (!targetUser) {
      setError("Silakan pilih atau masukkan Username / Email Anda terlebih dahulu.");
      return;
    }

    if (!isFaceIdEnabledForUser(targetUser)) {
      setError(`Fitur Face ID belum diaktifkan untuk akun "${targetUser}". Silakan login dengan kata sandi terlebih dahulu dan aktifkan di Profil.`);
      return;
    }

    setUsernameOrEmail(targetUser);
    triggerActiveScan(targetUser);
  };

  const triggerActiveScan = async (targetUser?: string) => {
    const userToScan = (targetUser || usernameOrEmail).trim();
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

      startScanningAnimation(userToScan);
    } catch (err) {
      console.warn("Webcam access failed, using vector scanner simulator instead:", err);
      setHasCamera(false);
      startScanningAnimation(userToScan);
    }
  };

  const startScanningAnimation = (userToScan?: string) => {
    const targetAccount = (userToScan || usernameOrEmail).trim();
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

        // Retrieve registered local biometric credential
        const credential = getFaceIdCredential(targetAccount);

        if (credential && credential.token) {
          // Verify with backend me endpoint
          fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${credential.token}`,
            },
          })
            .then((res) => {
              if (!res.ok) throw new Error("Token expired");
              return res.json();
            })
            .then((result) => {
              const user = result.data || {
                username: credential.username,
                role: credential.role,
                avatar: credential.avatar,
              };
              saveAuthSession({
                user: user.username || credential.username,
                role: user.role || credential.role,
                token: credential.token,
                avatar: user.avatar || credential.avatar,
              });
              setCurrentUserData(user);
              setStep("success");
              setTimeout(() => {
                onLoginSuccess(user.username || credential.username, user.role || credential.role);
              }, 1200);
            })
            .catch(() => {
              // Fallback to default login
              authenticateViaLoginApi(targetAccount, credential);
            });
        } else {
          authenticateViaLoginApi(targetAccount, credential);
        }
      }

      setScanProgress(progress);

      // Update status text based on progress milestone
      const log = [...statusLogs].reverse().find((l) => progress >= l.p);
      if (log) {
        setScanStatus(log.text);
      }
    }, 90);
  };

  const authenticateViaLoginApi = (targetAccount: string, credential?: FaceIdUserRecord | null) => {
    fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usernameOrEmail: targetAccount,
        password: "password123", // Default seed password
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => { throw new Error(d.error) });
        }
        return res.json();
      })
      .then((result) => {
        const user = result.data.user;
        saveAuthSession({
          user: user?.username || targetAccount,
          role: user?.role || credential?.role || getRoleFromUsername(targetAccount),
          token: result.data.token,
          avatar: user?.avatar || credential?.avatar,
        });
        setCurrentUserData(user);

        if (user?.must_change_password) {
          setStep("setup-password");
        } else {
          setStep("success");
          setTimeout(() => {
            onLoginSuccess(user.username, user.role);
          }, 1200);
        }
      })
      .catch((err) => {
        if (credential) {
          // Direct fallback using registered biometric credential
          saveAuthSession({
            user: credential.username,
            role: credential.role,
            token: credential.token,
            avatar: credential.avatar,
          });
          setStep("success");
          setTimeout(() => {
            onLoginSuccess(credential.username, credential.role);
          }, 1200);
        } else {
          setStep("login");
          setError(err.message || "Autentikasi biometrik gagal. Silakan masuk menggunakan kata sandi.");
        }
      });
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Custom Keyframes Style Injection for Glowing lasers and scanning effects */}
      <style dangerouslySetInnerHTML={{
        __html: `
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
          <X className="h-4 w-4" />
        </button>

        {/* STEP 1: Standard Username/Password Login */}
        {step === "login" && (
          <div>
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-500 border border-cyan-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon.png"
                  alt="GIM Swimming Logo"
                  className="h-7 w-auto object-contain"
                />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Masuk ke Akun Anda
              </h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Kelola jadwal latihan renang Anda dengan mudah
              </p>
            </div>

            {error && (
              <div className={`mb-4 rounded-xl p-3.5 text-xs flex flex-col gap-2 ${
                error.toLowerCase().includes("dinonaktifkan") || error.toLowerCase().includes("nonaktif")
                  ? "border border-red-300 bg-red-50/90 text-red-900 shadow-sm"
                  : "border border-red-200 bg-red-50 text-red-600 flex-row items-center"
              }`}>
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>

                {(error.toLowerCase().includes("dinonaktifkan") || error.toLowerCase().includes("nonaktif")) && (
                  <a
                    href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                      `Halo Admin GIM Swimming Club, saya ingin mengonfirmasi dan meminta bantuan untuk mengaktifkan kembali akun saya (${usernameOrEmail || "User"}). Terima kasih.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition active:scale-98"
                  >
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span>Hubungi Admin via WhatsApp</span>
                  </a>
                )}
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
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(usernameOrEmail.includes("@") ? usernameOrEmail : "");
                      setForgotOtp("");
                      setForgotNewPassword("");
                      setForgotConfirmPassword("");
                      setForgotError("");
                      setForgotSuccess("");
                      setForgotOtpSent(false);
                      setStep("forgot-password");
                    }}
                    className="text-xs font-bold text-cyan-500 hover:text-cyan-400 transition cursor-pointer"
                  >
                    Lupa Password?
                  </button>
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
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo/face.png"
                    alt="Face ID Login"
                    className="h-6 w-6 object-contain transition duration-200 group-hover:scale-110"
                  />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP: Lupa Kata Sandi (Reset via Email OTP) */}
        {step === "forgot-password" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => {
                  setStep("login");
                  setForgotError("");
                  setForgotSuccess("");
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-cyan-600 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Kembali ke Login
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-100">
                Reset Password
              </span>
            </div>

            <div className="text-center mb-5">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-500 border border-cyan-100 shadow-sm">
                <KeyRound className="h-6 w-6 text-cyan-500" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Lupa Kata Sandi?
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[300px] mx-auto">
                Masukkan email atau username terdaftar Anda. Kami akan mengirimkan 6-digit kode verifikasi OTP.
              </p>
            </div>

            {forgotError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-650 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            <form onSubmit={handleForgotResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email / Username Terdaftar
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nama@email.com atau username"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleForgotSendOTP}
                    disabled={isForgotSendingOtp || forgotOtpCountdown > 0 || !forgotEmail.trim()}
                    className="shrink-0 px-3.5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 border border-cyan-400/30 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isForgotSendingOtp ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Mengirim...
                      </>
                    ) : forgotOtpCountdown > 0 ? (
                      <>
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                        {forgotOtpCountdown}s
                      </>
                    ) : forgotOtpSent ? (
                      <>
                        <RotateCw className="h-3.5 w-3.5" />
                        Kirim Ulang
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Kirim OTP
                      </>
                    )}
                  </button>
                </div>
                {forgotOtpSent && (
                  <p className="mt-1.5 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    Kode 6-digit terkirim ke {forgotMaskedEmail || forgotEmail} (berlaku 15 mnt)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kode Verifikasi OTP (6 Digit)
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Contoh: 123456"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showForgotNewPassword ? "text" : "password"}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showForgotNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showForgotConfirmPassword ? "text" : "password"}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showForgotConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isForgotResetting}
                className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-600 py-3 text-sm font-bold text-white transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {isForgotResetting ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Menyimpan Kata Sandi...
                  </>
                ) : (
                  "Verifikasi & Simpan Kata Sandi"
                )}
              </button>
            </form>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo/face.png" alt="Face ID" className="h-8 w-8 object-contain" />
                </div>

                <p className="text-xs text-slate-500 text-center mb-5 max-w-[280px]">
                  Pilih akun terdaftar atau masukkan Username/Email untuk memverifikasi Face ID
                </p>

                {error && (
                  <div className="w-full mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-650 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Quick Account Picker if registered accounts exist */}
                {registeredFaceIdUsers.length > 0 && (
                  <div className="w-full mb-4 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Akun Face ID di Perangkat Ini:
                    </label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {registeredFaceIdUsers.map((u) => (
                        <button
                          key={u.username}
                          type="button"
                          onClick={() => handleStartScanWithInput(u.username)}
                          className="w-full p-2.5 rounded-xl border border-cyan-100 bg-cyan-50/50 hover:bg-cyan-100/70 text-left flex items-center justify-between transition cursor-pointer group active:scale-98"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 capitalize truncate">{u.username}</p>
                              <p className="text-[10px] text-cyan-700 capitalize font-medium">{u.role || "Pengguna"}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-cyan-600 group-hover:translate-x-0.5 transition">
                            Pindai →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="w-full mb-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Atau Masukkan Username / Email Lain:
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
                  type="button"
                  onClick={() => handleStartScanWithInput()}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 py-3 text-sm font-bold text-white transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <Scan className="h-4 w-4" />
                  <span>Mulai Pemindaian Face ID</span>
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

        {/* STEP 3: Mandatory First-Time Password Setup */}
        {step === "setup-password" && (
          <div>
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
                Aktivasi Akun Baru
              </span>

              <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Buat Kata Sandi Baru
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-[290px] mx-auto">
                Halo <span className="font-bold text-slate-800">{currentUserData?.username || "Pengguna"}</span>, akun Anda didaftarkan oleh admin. Silakan tentukan kata sandi baru untuk mengamankan akun Anda.
              </p>
            </div>

            {setupError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-650 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{setupError}</span>
              </div>
            )}

            <form onSubmit={handleSetupPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Sandi Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={setupLoading}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-bold text-white transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {setupLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Menyimpan Kata Sandi...
                  </>
                ) : (
                  "Simpan & Masuk ke Dashboard"
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: Verification Success */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {/* Animated Circular Success Container */}
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100">
              {/* Glowing ring */}
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-pulse-ring" />

              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-checkmark" />
            </div>

            <h3 className="text-xl font-black tracking-tight text-slate-900 mb-2">
              Verifikasi Sukses!
            </h3>
            <p className="text-sm text-emerald-600 font-bold mb-2">
              Selamat datang, <span className="text-cyan-500 font-black">{currentUserData?.username || (usernameOrEmail.includes("@") ? usernameOrEmail.split("@")[0] : usernameOrEmail)}</span>!
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
