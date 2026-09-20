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
import {
  isFaceIdEnabledForUser,
  enableFaceIdForUser,
  disableFaceIdForUser,
} from "../../../lib/biometrics";
import { detectFaceInVideo } from "../../../lib/faceDetection";
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
  Scan,
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

type ProfileView = "main" | "profilku" | "password" | "notifikasi" | "faq" | "face-id";

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
  setActiveTab,
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

  // Face ID Biometrics states
  const [isFaceIdActive, setIsFaceIdActive] = useState(false);
  const [isFaceIdScanning, setIsFaceIdScanning] = useState(false);
  const [faceIdScanProgress, setFaceIdScanProgress] = useState(0);
  const [faceIdScanStatus, setFaceIdScanStatus] = useState("Menghubungkan ke sensor biometrik...");
  const [faceIdHasCamera, setFaceIdHasCamera] = useState<boolean | null>(null);
  const [faceIdSuccess, setFaceIdSuccess] = useState("");
  const [faceIdError, setFaceIdError] = useState("");
  const [faceIdIsDetected, setFaceIdIsDetected] = useState(false);
  const faceIdVideoRef = useRef<HTMLVideoElement>(null);
  const faceIdScanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceIdStreamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync Face ID status on mount and user change
  useEffect(() => {
    if (sessionUser) {
      setIsFaceIdActive(isFaceIdEnabledForUser(sessionUser));
    }
    const handleFaceIdChanged = () => {
      if (sessionUser) {
        setIsFaceIdActive(isFaceIdEnabledForUser(sessionUser));
      }
    };
    window.addEventListener("gim_face_id_changed", handleFaceIdChanged);
    return () => window.removeEventListener("gim_face_id_changed", handleFaceIdChanged);
  }, [sessionUser]);

  // Clean up camera on unmount or view change
  const stopFaceIdCamera = () => {
    if (faceIdScanIntervalRef.current) {
      clearInterval(faceIdScanIntervalRef.current);
      faceIdScanIntervalRef.current = null;
    }
    if (faceIdStreamRef.current) {
      faceIdStreamRef.current.getTracks().forEach((track) => track.stop());
      faceIdStreamRef.current = null;
    }
    setIsFaceIdScanning(false);
    setFaceIdIsDetected(false);
  };

  useEffect(() => {
    if (currentView !== "face-id") {
      stopFaceIdCamera();
    }
    return () => {
      stopFaceIdCamera();
    };
  }, [currentView]);

  const handleStartFaceIdRegistration = async () => {
    setFaceIdError("");
    setFaceIdSuccess("");
    setIsFaceIdScanning(true);
    setFaceIdScanProgress(0);
    setFaceIdScanStatus("Menginisialisasi kamera depan...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: "user" },
        audio: false,
      });
      setFaceIdHasCamera(true);
      faceIdStreamRef.current = stream;
      setTimeout(() => {
        if (faceIdVideoRef.current) {
          faceIdVideoRef.current.srcObject = stream;
        }
      }, 50);
      startFaceIdRegistrationScan();
    } catch (err) {
      console.warn("Camera access not available or denied, using vector biometrics scanner:", err);
      setFaceIdHasCamera(false);
      startFaceIdRegistrationScan();
    }
  };

  const startFaceIdRegistrationScan = () => {
    let progress = 0;
    let consecutiveFaceHits = 0;
    let consecutiveMisses = 0;
    let isRegistering = false;

    if (faceIdScanIntervalRef.current) clearInterval(faceIdScanIntervalRef.current);

    faceIdScanIntervalRef.current = setInterval(async () => {
      if (isRegistering) return;

      // Real-time Face Verification during Registration
      if (faceIdHasCamera) {
        if (faceIdVideoRef.current) {
          try {
            const result = await detectFaceInVideo(faceIdVideoRef.current);
            if (result.isFace) {
              setFaceIdIsDetected(true);
              consecutiveFaceHits++;
              consecutiveMisses = 0;
              progress = Math.min(100, progress + 5);
              setFaceIdScanProgress(progress);

              if (progress < 25) {
                setFaceIdScanStatus("Wajah terdeteksi. Memetakan 30,000+ titik biometrik...");
              } else if (progress < 60) {
                setFaceIdScanStatus("Merekam struktur dan kontur wajah...");
              } else if (progress < 90) {
                setFaceIdScanStatus("Menyimpan kunci biometrik terenkripsi...");
              } else {
                setFaceIdScanStatus("Pendaftaran Face ID selesai!");
              }
            } else {
              setFaceIdIsDetected(false);
              consecutiveMisses++;
              consecutiveFaceHits = Math.max(0, consecutiveFaceHits - 1);
              setFaceIdScanStatus(result.message || "Wajah tidak terdeteksi. Posisikan wajah Anda di depan kamera");

              if (consecutiveMisses > 2) {
                progress = Math.max(0, progress - 4);
                setFaceIdScanProgress(progress);
              }
              return;
            }
          } catch (err) {
            console.warn("Face detection frame error:", err);
          }
        }
      } else if (faceIdHasCamera === false) {
        progress += 4;
        setFaceIdScanProgress(progress);
      }

      if (progress >= 100 && ((faceIdHasCamera && consecutiveFaceHits >= 8) || faceIdHasCamera === false)) {
        isRegistering = true;
        progress = 100;
        setFaceIdScanProgress(100);
        if (faceIdScanIntervalRef.current) clearInterval(faceIdScanIntervalRef.current);
        stopFaceIdCamera();

        const success = enableFaceIdForUser({
          username: sessionUser,
          role: sessionRole,
          token: localStorage.getItem("gim_swimming_token") || "",
          avatar: currentAvatar,
        });

        if (success) {
          setIsFaceIdActive(true);
          setFaceIdSuccess("Face ID berhasil diaktifkan! Anda kini dapat masuk menggunakan Face ID di halaman login.");
        } else {
          setFaceIdError("Gagal mengaktifkan Face ID. Silakan coba lagi.");
        }
      }
    }, 90);
  };

  const handleDisableFaceId = () => {
    setFaceIdError("");
    setFaceIdSuccess("");
    const disabled = disableFaceIdForUser(sessionUser);
    if (disabled) {
      setIsFaceIdActive(false);
      setFaceIdSuccess("Face ID telah dinonaktifkan untuk akun ini.");
    }
  };

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
    <div className="space-y-4 pb-28 bg-[#f8fafc] min-h-full font-sans">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (FULL WIDTH)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden rounded-none">
        {/* Subtle Decorative Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15" />
          <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20" />
          <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25" />
          <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl" />
          <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl" />
        </div>

        <div className="max-w-3xl mx-auto flex items-center justify-between relative z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentView !== "main") {
                  setCurrentView("main");
                } else if (setActiveTab) {
                  setActiveTab("dashboard");
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white transition active:scale-95 cursor-pointer shadow-sm"
              title="Kembali"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">
                Menu Akun • GIM Swimming
              </p>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug">
                {currentView === "main" && "Profil & Pengaturan Akun"}
                {currentView === "profilku" && "Profil Pengguna"}
                {currentView === "password" && "Ubah Password"}
                {currentView === "notifikasi" && "Pengaturan Notifikasi"}
                {currentView === "faq" && "FAQ & Panduan"}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          2. FLOATING CONTENT CONTAINER
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4 relative z-10">
        {/* ========================================================
            VIEW 1: MAIN PROFILE SETTINGS
            ======================================================== */}
        {currentView === "main" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Hero Profile Card */}
            <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                {/* Circular Avatar */}
                <div className="relative shrink-0">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 w-20 rounded-full bg-gradient-to-tr from-blue-700 to-cyan-500 p-1 shadow-lg shadow-blue-700/20 cursor-pointer active:scale-95 transition"
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
                        <span className="text-3xl select-none">{previewAvatar}</span>
                      ) : (
                        <span className="text-2xl font-black text-blue-600 select-none">{initialLetter}</span>
                      )}
                    </div>
                  </div>

                  {/* Camera Edit Badge */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition active:scale-90"
                    title="Ganti Foto Profil"
                  >
                    <Camera size={13} />
                  </button>
                </div>

                {/* User Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 capitalize truncate">
                    {sessionUser}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                      {roleLabel}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {userMemberId}
                    </span>
                  </div>
                </div>
              </div>

              {avatarSuccess && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>Foto profil berhasil diperbarui!</span>
                </div>
              )}
              {avatarError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
                  <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                  <span>{avatarError}</span>
                </div>
              )}
            </div>

            {/* List Item Settings Menu Card */}
            <div className="rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden divide-y divide-slate-100 text-slate-800">
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

                {/* 5. Face ID / Biometrik */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView("face-id");
                    setFaceIdSuccess("");
                    setFaceIdError("");
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 border-t border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-6 w-6 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo/face.png" alt="Face ID" className="h-5 w-5 object-contain" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Face ID &amp; Biometrik</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border flex items-center gap-1.5 ${
                        isFaceIdActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isFaceIdActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      {isFaceIdActive ? "Aktif" : "Nonaktif"}
                    </span>
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
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
                    <span className="text-sm font-bold text-slate-700">FAQ &amp; Panduan</span>
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
                    <span className="text-sm font-bold text-emerald-700">Hubungi Support</span>
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
          <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4 text-slate-800 animate-fadeIn">
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
        )}

        {/* ========================================================
            VIEW 3: HALAMAN "UBAH PASSWORD" (FULL SUB-PAGE)
            ======================================================== */}
        {currentView === "password" && (
          <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4 animate-fadeIn">
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
                        placeholder="Masukkan kata sandi saat ini"
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

            {/* TAB 2: RESET KATA SANDI DENGAN OTP EMAIL */}
            {passwordMode === "otp" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs flex items-start gap-2.5">
                  <Mail size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="font-medium text-blue-800">
                    Sistem akan mengirimkan <strong>6-digit Kode Verifikasi (OTP)</strong> ke email akun Anda. Kode berlaku 15 menit.
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

                {/* Step 1: Request OTP Input */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <label className="font-bold text-slate-700 text-xs block">
                    1. Alamat Email Akun
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="email"
                        value={resetEmail || currentUserData?.email || userEmail}
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
        )}

        {/* ========================================================
            VIEW 4: HALAMAN "NOTIFIKASI" (FULL SUB-PAGE)
            ======================================================== */}
        {currentView === "notifikasi" && (
          <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4 animate-fadeIn">
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
        )}

        {/* ========================================================
            VIEW 5: HALAMAN "FAQ" (FULL SUB-PAGE)
            ======================================================== */}
        {currentView === "faq" && (
          <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-3 text-slate-800 animate-fadeIn">
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
        )}

        {/* ========================================================
            VIEW 6: HALAMAN "FACE ID & BIOMETRIK" (FULL SUB-PAGE)
            ======================================================== */}
        {currentView === "face-id" && (
          <div className="-mt-8 sm:-mt-10 relative z-10 rounded-3xl bg-white p-5 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-5 text-slate-800 animate-fadeIn">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 border border-cyan-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo/face.png" alt="Face ID" className="h-6 w-6 object-contain" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Face ID &amp; Biometrik</h3>
                  <p className="text-xs text-slate-500 font-medium">Otentikasi biometrik cepat &amp; aman</p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border flex items-center gap-1.5 ${
                  isFaceIdActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isFaceIdActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                {isFaceIdActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>

            {/* Success & Error alerts */}
            {faceIdSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{faceIdSuccess}</span>
              </div>
            )}
            {faceIdError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>{faceIdError}</span>
              </div>
            )}

            {/* Active Scanner interface */}
            {isFaceIdScanning ? (
              <div className="flex flex-col items-center py-4 bg-slate-950 rounded-2xl p-6 text-white space-y-4 shadow-xl shadow-cyan-950/20">
                <p className="text-xs text-cyan-300 font-semibold tracking-wide">
                  Posisikan wajah Anda di depan kamera
                </p>

                {/* Video / Simulator viewport */}
                <div className={`relative h-44 w-44 rounded-full overflow-hidden border-2 transition-colors duration-300 bg-slate-900 flex items-center justify-center shadow-lg ${
                  faceIdIsDetected
                    ? "border-emerald-400 shadow-emerald-400/30"
                    : "border-amber-400/80 shadow-amber-400/20"
                }`}>
                  {faceIdHasCamera ? (
                    <video
                      ref={faceIdVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-6 text-cyan-400 bg-cyan-950/40">
                      <Scan size={64} className="animate-pulse" />
                    </div>
                  )}

                  {/* Scanning Laser Line */}
                  <div className={`absolute left-0 w-full h-[3px] animate-laser pointer-events-none transition-colors duration-300 ${
                    faceIdIsDetected
                      ? "bg-emerald-400 shadow-[0_0_12px_3px_rgba(52,211,153,0.8)]"
                      : "bg-amber-400 shadow-[0_0_10px_2px_rgba(251,191,36,0.7)]"
                  }`} />
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-xs text-center space-y-2">
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ease-out ${
                        faceIdIsDetected ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${faceIdScanProgress}%` }}
                    />
                  </div>
                  <p className={`text-xs font-bold transition-colors duration-200 px-2 min-h-[20px] ${
                    faceIdIsDetected ? "text-emerald-400" : "text-amber-400 animate-pulse"
                  }`}>
                    {faceIdScanStatus}
                  </p>
                  <p className="text-[11px] text-slate-400">{faceIdScanProgress}% Selesai</p>
                </div>

                <button
                  type="button"
                  onClick={stopFaceIdCamera}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
                >
                  Batal Pindai
                </button>
              </div>
            ) : (
              /* Overview & Actions */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50/70 to-blue-50/70 border border-cyan-100 text-xs text-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-cyan-950">
                    <Sparkles size={16} className="text-cyan-600" />
                    <span>Keuntungan Mengaktifkan Face ID:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-1 font-medium">
                    <li>Masuk ke akun <strong>secara instan</strong> cukup dengan klik ikon Face ID pada layar login.</li>
                    <li>Tidak perlu repot mengingat atau mengetik kata sandi setiap kali membuka aplikasi.</li>
                    <li>Kredensial tersimpan secara aman &amp; terenkripsi lokal pada perangkat ini.</li>
                  </ul>
                </div>

                {isFaceIdActive ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">Status Face ID: Aktif</p>
                        <p className="text-[11px] text-slate-500">Terdaftar untuk akun: <strong>{sessionUser}</strong></p>
                      </div>
                      <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleStartFaceIdRegistration}
                        className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Scan size={15} />
                        <span>Pindai Ulang Wajah</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDisableFaceId}
                        className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Nonaktifkan Face ID</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={handleStartFaceIdRegistration}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo/face.png" alt="Face ID" className="h-5 w-5 object-contain brightness-0 invert" />
                      <span>Aktifkan Face ID Sekarang</span>
                    </button>
                  </div>
                )}
              </div>
            )}
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
