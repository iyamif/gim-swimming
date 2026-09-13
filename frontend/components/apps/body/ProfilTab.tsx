"use client";

import React, { useState, useEffect, useRef } from "react";
import { Student, Coach, ScheduleSession } from "../types";
import {
  updateAvatarPreset,
  isImageAvatar,
  getAvatarImageUrl,
  changeUserPassword,
  fetchCurrentUser,
  requestPasswordResetOTP,
  resetPasswordWithOTP,
} from "../../../lib/api";
import PushNotificationCard from "../PushNotificationCard";
import {
  Camera,
  LogOut,
  User,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Send,
  Phone,
  RotateCw,
  Download,
  Check,
  Smile,
  X,
  Globe,
  Bell,
  HelpCircle,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Info,
  Building2,
  ExternalLink,
  ChevronDown,
  Calendar,
  CreditCard,
  MapPin,
  Sparkles,
} from "lucide-react";

interface ProfilTabProps {
  sessionUser: string;
  sessionRole: string;
  students?: Student[];
  coaches?: Coach[];
  schedules?: ScheduleSession[];
  showInstallBtn?: boolean;
  onInstallClick?: () => void;
  onLogout?: () => void;
  onRefresh?: () => void | Promise<void>;
  setActiveTab?: (tab: string) => void;
}

type ProfileView = "main" | "profilku" | "password" | "notifikasi" | "faq";

const PRESET_EMOJIS = ["🏊‍♂️", "🏊‍♀️", "🤽‍♂️", "🏄‍♂️", "🤿", "🐬", "🏆", "🥇", "⭐", "👤"];

// Lightweight image compression
function compressImage(file: File, maxDimension = 360, quality = 0.85): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve({ file, dataUrl: "" });
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve({ file, dataUrl: (e.target?.result as string) || "" });
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve({ file, dataUrl: (e.target?.result as string) || "" });

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL("image/webp", quality);
          if (!dataUrl.startsWith("data:image/webp")) {
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
        } catch {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve({ file, dataUrl });
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const optimizedFile = new File([blob], cleanName, {
              type: blob.type || "image/webp",
              lastModified: Date.now(),
            });
            resolve({ file: optimizedFile, dataUrl });
          },
          "image/webp",
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilTab({
  sessionUser,
  sessionRole,
  students = [],
  coaches = [],
  schedules = [],
  showInstallBtn,
  onInstallClick,
  onLogout,
  onRefresh,
}: ProfilTabProps) {
  // Navigation inside Profile Tab: 'main' | 'profilku' | 'password' | 'notifikasi' | 'faq'
  const [currentView, setCurrentView] = useState<ProfileView>("main");

  // Avatar states
  const [currentAvatar, setCurrentAvatar] = useState<string>("");
  const [previewAvatar, setPreviewAvatar] = useState<string>("");
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);

  // User backend details
  const [currentUserData, setCurrentUserData] = useState<any>(null);

  // Language state: 'ID' | 'EN'
  const [language, setLanguage] = useState<"ID" | "EN">("ID");

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // FAQ expanded items
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Password Sub-View Modes: "direct" | "otp"
  const [passwordMode, setPasswordMode] = useState<"direct" | "otp">("direct");

  // Email OTP Reset Password States
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResettingOtp, setIsResettingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSentSuccess, setOtpSentSuccess] = useState(false);
  const [maskedEmailDisplay, setMaskedEmailDisplay] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Load avatar and user details
  const loadUserData = () => {
    if (sessionUser) {
      const saved = localStorage.getItem(`gim_avatar_${sessionUser}`) || "";
      setCurrentAvatar(saved);
      setPreviewAvatar(saved);
      setIsCustomImage(isImageAvatar(saved));
    }
    fetchCurrentUser()
      .then((u) => {
        if (u) {
          setCurrentUserData(u);
          if (u.email && !resetEmail) {
            setResetEmail(u.email);
          }
          if (u.avatar && !currentAvatar) {
            setCurrentAvatar(u.avatar);
            setPreviewAvatar(u.avatar);
            setIsCustomImage(isImageAvatar(u.avatar));
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadUserData();
    const handleAvatarUpdate = () => loadUserData();
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, [sessionUser]);

  // Save Avatar handler
  const saveAvatar = async (dataUrl: string) => {
    if (!sessionUser) return;
    try {
      setIsSavingAvatar(true);
      setAvatarError("");
      const finalAvatar = await updateAvatarPreset(dataUrl);

      if (finalAvatar) {
        localStorage.setItem(`gim_avatar_${sessionUser}`, finalAvatar);
      } else {
        localStorage.removeItem(`gim_avatar_${sessionUser}`);
      }

      setCurrentAvatar(finalAvatar);
      setPreviewAvatar(finalAvatar);
      setIsCustomImage(isImageAvatar(finalAvatar));
      window.dispatchEvent(new Event("avatar_updated"));

      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 2500);
    } catch (err: any) {
      setAvatarError(err.message || "Gagal menyimpan foto profil");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    try {
      setIsSavingAvatar(true);
      const { dataUrl } = await compressImage(rawFile, 400, 0.85);
      await saveAvatar(dataUrl);
      setShowEmojiDrawer(false);
    } catch {
      setAvatarError("Gagal memproses gambar");
      setIsSavingAvatar(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Submit Password Form (Direct)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Masukkan kata sandi saat ini");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Kata sandi baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi baru tidak cocok");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("Kata sandi baru tidak boleh sama dengan kata sandi saat ini");
      return;
    }

    try {
      setIsChangingPassword(true);
      await changeUserPassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || "Gagal memperbarui kata sandi. Pastikan kata sandi saat ini benar.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Send Reset Password OTP via Email
  const handleSendResetOTP = async () => {
    const emailToUse = resetEmail.trim() || currentUserData?.email || userEmail;
    if (!emailToUse) {
      setResetPasswordError("Alamat email tidak ditemukan. Masukkan alamat email akun Anda.");
      return;
    }
    setResetPasswordError("");
    try {
      setIsSendingOtp(true);
      const res = await requestPasswordResetOTP(emailToUse);
      setOtpSentSuccess(true);
      setMaskedEmailDisplay(res.data?.masked_email || emailToUse);
      setOtpCountdown(60);
    } catch (err: any) {
      setResetPasswordError(err.message || "Gagal mengirim kode verifikasi ke email");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Reset Password using OTP & New Password
  const handleResetPasswordWithOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetPasswordError("");
    setResetPasswordSuccess(false);

    const emailToUse = resetEmail.trim() || currentUserData?.email || userEmail;
    if (!emailToUse) {
      setResetPasswordError("Alamat email tidak ditemukan. Masukkan email Anda.");
      return;
    }
    if (!resetOtp.trim() || resetOtp.trim().length !== 6) {
      setResetPasswordError("Masukkan 6-digit kode verifikasi yang dikirim ke email");
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetPasswordError("Kata sandi baru minimal 6 karakter");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetPasswordError("Konfirmasi kata sandi baru tidak cocok");
      return;
    }

    try {
      setIsResettingOtp(true);
      await resetPasswordWithOTP(emailToUse, resetOtp.trim(), resetNewPassword);
      setResetPasswordSuccess(true);
      setResetOtp("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setTimeout(() => {
        setResetPasswordSuccess(false);
      }, 5000);
    } catch (err: any) {
      setResetPasswordError(err.message || "Gagal mereset kata sandi. Pastikan kode verifikasi benar.");
    } finally {
      setIsResettingOtp(false);
    }
  };

  const initialLetter = sessionUser ? sessionUser.charAt(0).toUpperCase() : "A";
  const roleLower = sessionRole.toLowerCase().trim();
  const isAdmin = roleLower === "admin";
  const isCoach = roleLower === "pelatih";

  const roleLabel = isAdmin ? "Administrator" : isCoach ? "Pelatih Renang" : "Wali Murid / Siswa";

  // Phone lookup
  const matchedCoach = coaches.find((c) => c.name.toLowerCase().includes(sessionUser.toLowerCase()));
  const matchedStudent = students.find(
    (s) =>
      s.name.toLowerCase().includes(sessionUser.toLowerCase()) ||
      s.parent.toLowerCase().includes(sessionUser.toLowerCase())
  );
  const userPhone = matchedCoach?.phone || matchedStudent?.phone || "+62 812-3456-7890";
  const userEmail = currentUserData?.email || `${sessionUser.toLowerCase().replace(/\s+/g, "")}@gimswimming.com`;
  const userMemberId = `GIM-${isAdmin ? "ADM" : isCoach ? "CCH" : "STU"}-${currentUserData?.id ? String(currentUserData.id).padStart(3, "0") : "001"}`;

  // FAQ Items Data
  const FAQ_ITEMS = [
    {
      q: "Bagaimana cara melihat jadwal latihan & sesi renang?",
      a: "Buka menu 'Jadwal' di bar navigasi bawah untuk melihat jadwal harian lengkap dengan waktu sesi, pelatih penanggung jawab, dan lokasi kolam renang.",
    },
    {
      q: "Bagaimana sistem presensi kehadiran sesi?",
      a: "Pelatih dapat melakukan absensi pada menu 'Presensi' dengan verifikasi kamera foto selfie dan radius koordinat GPS kolam yang akurat.",
    },
    {
      q: "Bagaimana cara pembayaran tagihan SPP bulanan?",
      a: "Orang tua murid dapat melihat rincian tagihan di menu 'Tagihan/Keuangan' dan mengunggah bukti transfer untuk diverifikasi langsung oleh Admin.",
    },
    {
      q: "Bagaimana jika saya lupa kata sandi akun?",
      a: "Silakan hubungi Customer Support via WhatsApp atau minta Admin Akademi untuk mengatur ulang kata sandi login Anda.",
    },
    {
      q: "Apakah aplikasi ini dapat diinstal di smartphone?",
      a: "Ya! GIM Swimming mendukung Progressive Web App (PWA). Cukup klik 'Pasang Aplikasi' di menu profil untuk menambahkannya ke layar utama ponsel Anda.",
    },
  ];

  return (
    <div className="min-h-full bg-white sm:bg-[#f8fafc] pb-28 md:pb-12 font-sans">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Main Container Card */}
      <div className="max-w-md mx-auto bg-white sm:shadow-lg sm:rounded-3xl sm:my-4 overflow-hidden border-0 sm:border sm:border-slate-100">
        {/* ========================================================
            VIEW 1: MAIN PROFILE SETTINGS (EXACT MATCH WITH IMAGE)
            ======================================================== */}
        {currentView === "main" && (
          <div className="animate-fadeIn">
            {/* Top Header with Curved Blue Accent & Avatar */}
            <div className="relative bg-gradient-to-b from-blue-700 via-blue-600 to-blue-500 pt-8 pb-12 px-6 text-center text-white rounded-b-[2.5rem] shadow-sm">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute top-2 left-2 h-24 w-24 rounded-full border border-white/10 pointer-events-none" />

              {/* User Name & Role */}
              <div className="relative z-10 space-y-1">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white capitalize drop-shadow-xs">
                  {sessionUser}
                </h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-white/20 text-blue-50 backdrop-blur-xs">
                  <span>{roleLabel}</span>
                  <span>•</span>
                  <span className="font-mono">{userMemberId}</span>
                </div>
              </div>
            </div>

            {/* Circular Avatar Overlapping the Curved Header */}
            <div className="relative -mt-12 flex justify-center z-20">
              <div className="relative">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-700 to-cyan-500 p-1 shadow-lg shadow-blue-700/20 cursor-pointer active:scale-95 transition"
                  title="Klik untuk ganti foto dari galeri"
                >
                  <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white">
                    {isCustomImage && previewAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAvatarImageUrl(previewAvatar)}
                        alt={sessionUser}
                        className="h-full w-full object-cover select-none"
                      />
                    ) : previewAvatar ? (
                      <span className="text-4xl select-none">{previewAvatar}</span>
                    ) : (
                      <span className="text-3xl font-black text-blue-600 select-none">{initialLetter}</span>
                    )}
                  </div>
                </div>

                {/* Camera Edit Badge */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition active:scale-90"
                  title="Ganti Foto Profil"
                >
                  <Camera size={15} />
                </button>
              </div>
            </div>

            {/* Alerts / Feedback Toasts */}
            {avatarSuccess && (
              <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Foto profil berhasil diperbarui!</span>
              </div>
            )}
            {avatarError && (
              <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
                <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                <span>{avatarError}</span>
              </div>
            )}

            {/* List Item Settings Menu */}
            <div className="mt-4 divide-y divide-slate-100 text-slate-800">
              {/* SECTION 1: PROFIL & PREFERENSI */}
              <div>
                {/* 1. Profilku */}
                <button
                  type="button"
                  onClick={() => setCurrentView("profilku")}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="text-slate-500">
                      <User size={20} strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Profilku</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>

                {/* 2. Bahasa (with ID | EN Toggle Pill) */}
                <div className="w-full flex items-center justify-between px-6 py-3.5 border-t border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="text-slate-500">
                      <Globe size={20} strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Bahasa</span>
                  </div>
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setLanguage("ID")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-black transition cursor-pointer ${
                        language === "ID"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("EN")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-black transition cursor-pointer ${
                        language === "EN"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                {/* 3. Notifikasi */}
                <button
                  type="button"
                  onClick={() => setCurrentView("notifikasi")}
                  className="w-full flex items-center justify-between px-6 py-4 border-t border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="text-slate-500">
                      <Bell size={20} strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Notifikasi</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>

                {/* 4. Ubah Password */}
                <button
                  type="button"
                  onClick={() => setCurrentView("password")}
                  className="w-full flex items-center justify-between px-6 py-4 border-t border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="text-slate-500">
                      <Lock size={20} strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Ubah Password</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>
              </div>

              {/* SUBTLE SECTION DIVIDER */}
              <div className="h-3 bg-slate-100/90 border-t border-b border-slate-200/50" />

              {/* SECTION 2: BANTUAN & SUPPORT */}
              <div>
                {/* 5. FAQ */}
                <button
                  type="button"
                  onClick={() => setCurrentView("faq")}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="text-slate-500">
                      <HelpCircle size={20} strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">FAQ</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>

                {/* 6. Hubungi Customer Support (WhatsApp Direct) */}
                <a
                  href={`https://wa.me/6281234567890?text=Halo%20Admin%20GIM%20Swimming,%20saya%20${sessionUser}%20memerlukan%20bantuan%20aplikasi`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-6 py-4 border-t border-slate-100 hover:bg-emerald-50/50 active:bg-emerald-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="text-emerald-600">
                      <MessageCircle size={20} strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-bold text-emerald-700">Hubungi Customer Support</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </a>
              </div>

              {/* SUBTLE SECTION DIVIDER */}
              <div className="h-3 bg-slate-100/90 border-t border-b border-slate-200/50" />

              {/* SECTION 3: SESI & INFO APLIKASI */}
              <div>
                {/* 7. Pasang Aplikasi (PWA) */}
                {showInstallBtn && onInstallClick && (
                  <button
                    type="button"
                    onClick={onInstallClick}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-blue-50/50 active:bg-blue-50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="text-blue-600">
                        <Download size={20} strokeWidth={1.8} />
                      </div>
                      <span className="text-sm font-bold text-blue-700">Pasang Aplikasi (PWA)</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </button>
                )}

                {/* 8. Keluar */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className={`w-full flex items-center justify-between px-6 py-4 hover:bg-rose-50/40 active:bg-rose-50 transition cursor-pointer ${
                      showInstallBtn ? "border-t border-slate-100" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="text-slate-500">
                        <LogOut size={20} strokeWidth={1.8} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">Keluar</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </button>
                )}

                {/* 9. Versi Aplikasi */}
                <div className="w-full flex items-center justify-between px-6 py-4 border-t border-slate-100 text-slate-500">
                  <div className="flex items-center gap-3.5">
                    <div className="text-slate-400">
                      <RotateCw size={19} strokeWidth={1.8} />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Versi Aplikasi</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">2.4.0</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 2: HALAMAN "PROFILKU" (FULL SUB-PAGE)
            ======================================================== */}
        {currentView === "profilku" && (
          <div className="animate-fadeIn">
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 sticky top-0 z-20">
              <button
                type="button"
                onClick={() => setCurrentView("main")}
                className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-bold text-xs p-1 -ml-1 transition cursor-pointer"
              >
                <ChevronLeft size={20} />
                <span>Kembali</span>
              </button>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Profilku</h3>
              <div className="w-14" />
            </div>

            {/* Profile Detail Content */}
            <div className="p-5 sm:p-6 space-y-4 text-slate-800">
              {/* Avatar Summary Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                <div className="relative shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white font-black text-2xl flex items-center justify-center border-2 border-white shadow-md overflow-hidden cursor-pointer hover:opacity-90 transition"
                  >
                    {isCustomImage && previewAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAvatarImageUrl(previewAvatar)}
                        alt={sessionUser}
                        className="h-full w-full object-cover"
                      />
                    ) : previewAvatar ? (
                      <span className="text-3xl">{previewAvatar}</span>
                    ) : (
                      <span>{initialLetter}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center border border-white shadow-xs cursor-pointer"
                  >
                    <Camera size={11} />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-black text-slate-900 capitalize truncate">{sessionUser}</h4>
                  <p className="text-xs text-blue-700 font-bold">{roleLabel}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      Ganti Foto
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setShowEmojiDrawer((v) => !v)}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                    >
                      {showEmojiDrawer ? "Tutup Emoji" : "Pilih Emoji"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Emoji Drawer */}
              {showEmojiDrawer && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 animate-fadeIn">
                  <p className="text-[11px] font-bold text-slate-500">Pilih Karakter Emoji Avatar:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          saveAvatar(emoji);
                          setShowEmojiDrawer(false);
                        }}
                        className="h-10 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-xl flex items-center justify-center cursor-pointer transition hover:scale-105"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Information Rows */}
              <div className="space-y-3 text-xs pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">ID Anggota</span>
                  <span className="font-mono font-black text-blue-700 text-xs sm:text-sm">{userMemberId}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tingkat Akses</span>
                  <span className="font-extrabold text-slate-800">{roleLabel}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Email Resmi</span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">{userEmail}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Kontak WhatsApp</span>
                  <span className="font-bold text-slate-800">{userPhone}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Afiliasi Klub</span>
                  <span className="font-bold text-slate-800">GIM Swimming Subang (PRSI Jabar)</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Venue Latihan Utama</span>
                  <span className="font-bold text-slate-800">Hotel Nalendra Plaza &amp; Yonif 312</span>
                </div>
              </div>

              {/* Quick Action to Change Password */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView("password")}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock size={15} />
                  <span>Ubah Kata Sandi Akun</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 3: HALAMAN "UBAH PASSWORD" (FULL SUB-PAGE)
            ======================================================== */}
        {currentView === "password" && (
          <div className="animate-fadeIn">
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 sticky top-0 z-20">
              <button
                type="button"
                onClick={() => setCurrentView("main")}
                className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-bold text-xs p-1 -ml-1 transition cursor-pointer"
              >
                <ChevronLeft size={20} />
                <span>Kembali</span>
              </button>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Ubah Password</h3>
              <div className="w-14" />
            </div>

            {/* Change Password Form Content */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Mode Switcher Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordMode("direct");
                    setPasswordError("");
                    setResetPasswordError("");
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    passwordMode === "direct"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Lock size={14} />
                  <span>Ganti Sandi</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordMode("otp");
                    setPasswordError("");
                    setResetPasswordError("");
                    if (!resetEmail) {
                      setResetEmail(currentUserData?.email || userEmail);
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    passwordMode === "otp"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Mail size={14} />
                  <span>Reset via Email (OTP)</span>
                </button>
              </div>

              {/* TAB 1: GANTI KATA SANDI LANGSUNG */}
              {passwordMode === "direct" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs flex items-start gap-2.5">
                    <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="font-medium text-blue-800">
                      Ganti kata sandi akun Anda jika Anda masih mengingat kata sandi saat ini. Minimal 6 karakter.
                    </p>
                  </div>

                  {passwordSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Kata sandi akun Anda berhasil diperbarui!</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
                      <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                    {/* Kata Sandi Lama */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Kata Sandi Saat Ini</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Masukkan kata sandi lama"
                          className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Kata Sandi Baru */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Konfirmasi Kata Sandi Baru */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 flex justify-between">
                        <span>Konfirmasi Kata Sandi Baru</span>
                        {confirmPassword && (
                          <span className={`text-[11px] font-bold ${newPassword === confirmPassword ? "text-emerald-600" : "text-rose-600"}`}>
                            {newPassword === confirmPassword ? "✓ Cocok" : "✗ Belum sama"}
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ketik ulang kata sandi baru"
                          className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                      className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-2"
                    >
                      {isChangingPassword ? (
                        <>
                          <RotateCw size={16} className="animate-spin" />
                          <span>Menyimpan Kata Sandi...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Simpan Kata Sandi</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: RESET KATA SANDI DENGAN KODE VERIFIKASI EMAIL (OTP) */}
              {passwordMode === "otp" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs flex items-start gap-2.5">
                    <Mail size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="font-medium text-blue-800">
                      Sistem akan mengirimkan <strong>6-digit Kode Verifikasi (OTP)</strong> ke email terdaftar Anda. Kode berlaku selama 15 menit.
                    </p>
                  </div>

                  {resetPasswordSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Kata sandi Anda berhasil direset! Silakan gunakan kata sandi baru untuk login.</span>
                    </div>
                  )}

                  {resetPasswordError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
                      <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                      <span>{resetPasswordError}</span>
                    </div>
                  )}

                  {/* Step 1: Send OTP to Email */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <label className="font-bold text-slate-700 text-xs block">
                      1. Alamat Email Akun
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="email"
                          value={resetEmail || userEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="Masukkan email terdaftar"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-medium focus:border-blue-600 outline-none transition"
                        />
                        <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendResetOTP}
                        disabled={isSendingOtp || otpCountdown > 0}
                        className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                      >
                        {isSendingOtp ? (
                          <>
                            <RotateCw size={14} className="animate-spin" />
                            <span>Mengirim...</span>
                          </>
                        ) : otpCountdown > 0 ? (
                          <span>Kirim Ulang ({otpCountdown}s)</span>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Kirim Kode OTP</span>
                          </>
                        )}
                      </button>
                    </div>

                    {otpSentSuccess && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5 animate-fadeIn">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>Kode verifikasi 6 digit telah dikirim ke {maskedEmailDisplay || resetEmail}.</span>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Form Input OTP & Password Baru */}
                  <form onSubmit={handleResetPasswordWithOTP} className="space-y-4 text-xs pt-1">
                    {/* Input OTP */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">2. Masukkan 6-Digit Kode Verifikasi (OTP)</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="Contoh: 123456"
                        className="w-full text-center tracking-[0.4em] font-mono text-base font-black py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:bg-white focus:border-blue-600 text-slate-900 outline-none transition"
                      />
                    </div>

                    {/* Kata Sandi Baru */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">3. Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type={showResetNewPassword ? "text" : "password"}
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetNewPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showResetNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Konfirmasi Kata Sandi Baru */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 flex justify-between">
                        <span>Konfirmasi Kata Sandi Baru</span>
                        {resetConfirmPassword && (
                          <span className={`text-[11px] font-bold ${resetNewPassword === resetConfirmPassword ? "text-emerald-600" : "text-rose-600"}`}>
                            {resetNewPassword === resetConfirmPassword ? "✓ Cocok" : "✗ Belum sama"}
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type={showResetConfirmPassword ? "text" : "password"}
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          placeholder="Ketik ulang kata sandi baru"
                          className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetConfirmPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showResetConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isResettingOtp || resetOtp.length !== 6 || resetNewPassword.length < 6 || resetNewPassword !== resetConfirmPassword}
                      className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-2"
                    >
                      {isResettingOtp ? (
                        <>
                          <RotateCw size={16} className="animate-spin" />
                          <span>Mereset Kata Sandi...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Verifikasi &amp; Simpan Kata Sandi</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 4: HALAMAN "NOTIFIKASI" (FULL SUB-PAGE)
            ======================================================== */}
        {currentView === "notifikasi" && (
          <div className="animate-fadeIn">
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 sticky top-0 z-20">
              <button
                type="button"
                onClick={() => setCurrentView("main")}
                className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-bold text-xs p-1 -ml-1 transition cursor-pointer"
              >
                <ChevronLeft size={20} />
                <span>Kembali</span>
              </button>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Notifikasi</h3>
              <div className="w-14" />
            </div>

            {/* Notification Card Content */}
            <div className="p-5 sm:p-6 space-y-4">
              <PushNotificationCard sessionUser={sessionUser} sessionRole={sessionRole} />

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Bell size={14} className="text-blue-600" />
                  <span>Jenis Pemberitahuan:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-500 font-medium">
                  <li>Pengingat sesi jadwal latihan renang</li>
                  <li>Konfirmasi verifikasi pembayaran SPP</li>
                  <li>Pengumuman resmi dari manajemen GIM Swimming</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 5: HALAMAN "FAQ" (FULL SUB-PAGE)
            ======================================================== */}
        {currentView === "faq" && (
          <div className="animate-fadeIn">
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 sticky top-0 z-20">
              <button
                type="button"
                onClick={() => setCurrentView("main")}
                className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-bold text-xs p-1 -ml-1 transition cursor-pointer"
              >
                <ChevronLeft size={20} />
                <span>Kembali</span>
              </button>
              <h3 className="text-base font-black text-slate-900 tracking-tight">FAQ &amp; Panduan</h3>
              <div className="w-14" />
            </div>

            {/* FAQ Accordion Content */}
            <div className="p-5 sm:p-6 space-y-3">
              {FAQ_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 overflow-hidden bg-slate-50/70 transition"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-slate-800 hover:bg-slate-100/60 transition cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                        expandedFaq === idx ? "rotate-180 text-blue-600" : ""
                      }`}
                    />
                  </button>

                  {expandedFaq === idx && (
                    <div className="px-4 pb-4 text-xs text-slate-600 font-medium border-t border-slate-150 pt-3 bg-white animate-fadeIn">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}

              {/* Helpdesk banner */}
              <div className="pt-3">
                <a
                  href={`https://wa.me/6281234567890?text=Halo%20Admin%20GIM%20Swimming,%20saya%20${sessionUser}%20memerlukan%20bantuan`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle size={18} className="text-emerald-600" />
                    <span>Masih ada pertanyaan? Hubungi Customer Care</span>
                  </div>
                  <ExternalLink size={14} className="text-emerald-600" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: KONFIRMASI LOGOUT (STANDAR AMAN)
          ======================================================== */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut size={22} />
            </div>
            <h4 className="text-base font-black text-slate-900">Keluar Akun?</h4>
            <p className="text-xs text-slate-500">
              Apakah Anda yakin ingin keluar dari akun <strong className="capitalize text-slate-700">{sessionUser}</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout?.();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
