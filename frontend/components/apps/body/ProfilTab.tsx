import React, { useState, useEffect, useRef } from "react";
import { Student, Coach, ScheduleSession } from "../types";
import {
  uploadAvatarFile,
  updateAvatarPreset,
  isImageAvatar,
  getAvatarImageUrl,
} from "../../../lib/api";
import PushNotificationCard from "../PushNotificationCard";
import {
  Camera,
  Sparkles,
  AlertTriangle,
  Smile,
  X,
  MessageCircle,
  Download,
  LogOut,
  ChevronRight,
  Trash2,
  User,
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

const PRESET_AVATARS = [
  "🏊‍♂️", "🏊‍♀️", "🤽‍♂️", "🏄‍♂️", "🤿", "🐬", "🏆", "🥇", "⭐", "👤"
];

// Helper to compress and convert any uploaded image to an ultra-lightweight WebP/JPEG Base64 Data URL (~15-30KB)
function compressImage(file: File, maxDimension = 300, quality = 0.82): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ file, dataUrl: "" });
    };
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        resolve({ file, dataUrl: (e.target?.result as string) || "" });
      };
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
        if (!ctx) {
          return resolve({ file, dataUrl: (e.target?.result as string) || "" });
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer modern WebP format with JPEG fallback
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
            if (!blob) {
              return resolve({ file, dataUrl });
            }
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
  const [currentAvatar, setCurrentAvatar] = useState<string>("");
  const [previewAvatar, setPreviewAvatar] = useState<string>("");
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [isViewingFullPhoto, setIsViewingFullPhoto] = useState(false);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Long press timer tracking for Instagram-style hold gesture
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const loadAvatar = () => {
    if (sessionUser) {
      const saved = localStorage.getItem(`gim_avatar_${sessionUser}`) || "";
      setCurrentAvatar(saved);
      setPreviewAvatar(saved);
      setIsCustomImage(isImageAvatar(saved));
    }
  };

  useEffect(() => {
    loadAvatar();
    const handleAvatarUpdate = () => loadAvatar();
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, [sessionUser]);

  // Save new avatar directly to PostgreSQL database
  const saveAvatarDirectly = async (avatarDataUrl: string) => {
    if (!sessionUser) return;
    try {
      setIsSaving(true);
      setErrorMessage("");

      const finalAvatar = await updateAvatarPreset(avatarDataUrl);

      if (finalAvatar) {
        localStorage.setItem(`gim_avatar_${sessionUser}`, finalAvatar);
        localStorage.setItem(`gim_avatar_${sessionUser.toLowerCase()}`, finalAvatar);
        localStorage.setItem(
          `gim_avatar_${sessionUser.charAt(0).toUpperCase() + sessionUser.slice(1)}`,
          finalAvatar
        );
      } else {
        localStorage.removeItem(`gim_avatar_${sessionUser}`);
        localStorage.removeItem(`gim_avatar_${sessionUser.toLowerCase()}`);
      }

      setCurrentAvatar(finalAvatar);
      setPreviewAvatar(finalAvatar);
      setIsCustomImage(isImageAvatar(finalAvatar));
      window.dispatchEvent(new Event("avatar_updated"));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error("Save avatar error:", err);
      setErrorMessage(err.message || "Gagal memperbarui foto profil");
    } finally {
      setIsSaving(false);
    }
  };

  // Instant upload from gallery selection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    try {
      setIsSaving(true);
      setErrorMessage("");
      const { dataUrl } = await compressImage(rawFile, 400, 0.85);
      await saveAvatarDirectly(dataUrl);
    } catch (err: any) {
      console.error("Error processing image file:", err);
      setErrorMessage("Gagal memproses gambar");
      setIsSaving(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectPreset = async (emoji: string) => {
    await saveAvatarDirectly(emoji);
    setShowEmojiDrawer(false);
  };

  const handleResetAvatar = async () => {
    await saveAvatarDirectly("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Instagram-style Gesture: Press Start (Touch / Mouse Down)
  const handlePressStart = () => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      // Trigger subtle haptic feedback on mobile if supported
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(40);
      }
      setIsViewingFullPhoto(true);
    }, 450); // 450ms hold threshold
  };

  // Instagram-style Gesture: Press End (Touch End / Mouse Up)
  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Instagram-style Gesture: Click (Tap)
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }
    // Normal tap: immediately open device gallery / camera
    fileInputRef.current?.click();
  };

  const handleManualRefresh = async () => {
    if (onRefresh && !isRefreshingLocal) {
      setIsRefreshingLocal(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshingLocal(false), 500);
      }
    }
  };

  const initialLetter = sessionUser ? sessionUser.charAt(0).toUpperCase() : "A";
  const isAdmin = sessionRole.toLowerCase().trim() === "admin";
  const isCoach = sessionRole.toLowerCase().trim() === "pelatih";
  const userEmail = `${sessionUser.toLowerCase().replace(/\s+/g, "")}@gimswimming.com`;

  return (
    <div className="space-y-4 pb-28 md:pb-12 bg-[#f8fafc] min-h-full">
      {/* Hidden File Input for Device Gallery / Camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (HERO BACKDROP)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white h-32 sm:h-36 pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.5rem))] px-5 sm:px-8 shadow-md overflow-hidden">
        {/* Subtle geometric circles */}
        <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25 pointer-events-none" />

        {/* Soft Ambient Depth Glow at Bottom */}
        <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />
      </div>

      {/* ==========================================
          2. MAIN CONTENT CONTAINER (3-CARD LAYOUT)
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4 -mt-14 sm:-mt-16 relative z-20 animate-fadeIn">
        {/* Toast / Notification Alert */}
        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-fadeIn">
            <Sparkles size={14} className="text-emerald-600" />
            <span>Foto profil berhasil diperbarui!</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-fadeIn">
            <AlertTriangle size={14} className="text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ==========================================
            CARD 1: INSTAGRAM-STYLE AVATAR CARD
            ========================================== */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 pt-0 pb-6 px-6 text-center relative">
          {/* Overlapping Avatar with Instagram Gestures */}
          <div className="relative -top-12 -mb-8 inline-block mx-auto select-none">
            <div
              onClick={handleAvatarClick}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handlePressEnd}
              className="relative h-24 w-24 sm:h-26 sm:w-26 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500 text-white font-black text-3xl flex items-center justify-center border-4 border-white shadow-xl overflow-hidden mx-auto cursor-pointer active:scale-95 transition-transform duration-150 group"
              title="Ketuk untuk ganti foto dari galeri • Tahan untuk melihat foto"
            >
              {isCustomImage && previewAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getAvatarImageUrl(previewAvatar)}
                  alt={sessionUser}
                  className="h-full w-full object-cover select-none pointer-events-none"
                />
              ) : previewAvatar ? (
                <span className="select-none">{previewAvatar}</span>
              ) : (
                <span className="select-none">{initialLetter}</span>
              )}

              {/* Uploading Spinner Overlay */}
              {isSaving && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                  <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
                  <span className="text-[9px] font-bold">Menyimpan</span>
                </div>
              )}
            </div>

            {/* Camera Badge Bottom Right (Click to open gallery directly) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-lg cursor-pointer transition active:scale-90"
              title="Pilih Foto dari Galeri"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* Name & Role Text directly below avatar */}
          <div className="mt-2 space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 capitalize tracking-tight">
              {sessionUser}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {isAdmin
                ? "Administrator Utama - GIM Swimming"
                : isCoach
                  ? "Senior Coach - Level 3"
                  : "Wali Murid - GIM Swimming"}
            </p>

            {/* Instagram-style Gesture Guidance Pill */}
            <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100/90 text-slate-600 border border-slate-200/60">
                <Camera size={12} className="text-slate-500" />
                <span>Ketuk untuk ganti foto • Tahan untuk melihat</span>
              </span>

              <button
                type="button"
                onClick={() => setShowEmojiDrawer((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200/80 transition cursor-pointer"
              >
                <Smile size={12} />
                <span>Pilih Karakter Emoji</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================
            EMOJI PRESET DRAWER (EXPANDABLE)
            ========================================== */}
        {showEmojiDrawer && (
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Smile size={14} className="text-cyan-600" />
                <span>Pilih Karakter Emoji Avatar</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowEmojiDrawer(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Tutup</span>
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {PRESET_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectPreset(emoji)}
                  className={`flex h-11 items-center justify-center rounded-2xl text-xl transition-all duration-150 cursor-pointer border ${previewAvatar === emoji && !isCustomImage
                      ? "bg-blue-50 border-blue-500 ring-2 ring-blue-400/30 scale-105"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/80"
                    }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            CARD 2: DETAIL INFORMASI LENGKAP ADMIN
            ========================================== */}
        <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Informasi Lengkap Akun
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Nama Pengguna</span>
              <span className="font-bold text-slate-900 capitalize">{sessionUser}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Peran &amp; Otoritas</span>
              <span className="font-bold text-blue-600">
                {isAdmin
                  ? "Administrator Utama (Full Control)"
                  : isCoach
                    ? "Instruktur Pelatih Renang"
                    : "Wali Murid / Siswa"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Email Resmi</span>
              <span className="font-bold text-slate-900">{userEmail}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Akses Modul</span>
              <span className="font-bold text-emerald-600">
                {isAdmin
                  ? "Jadwal, Siswa, Pelatih, Keuangan & Presensi"
                  : isCoach
                    ? "Jadwal Sesi & Input Presensi Harian"
                    : "Dashboard & Progres Report Siswa"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Total Siswa Terdaftar</span>
              <span className="font-bold text-slate-900">{students.length} Siswa Aktif</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Total Pelatih / Coach</span>
              <span className="font-bold text-slate-900">{coaches.length} Instruktur</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Sesi Terjadwal</span>
              <span className="font-bold text-slate-900">{schedules.length} Sesi Terjadwal</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Sistem Aplikasi</span>
              <span className="font-bold text-slate-900">GIM Swimming Academy v2.0</span>
            </div>
          </div>
        </div>

        {/* ==========================================
            CARD 2.5: PUSH NOTIFICATION & APP BADGE STATUS
            ========================================== */}
        <PushNotificationCard
          sessionUser={sessionUser}
          sessionRole={sessionRole}
        />

        {/* ==========================================
            CARD 3: PENGATURAN, BANTUAN & LOGOUT
            ========================================== */}
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Pengaturan &amp; Bantuan
          </h4>

          <div className="space-y-2">
            <a
              href={`https://wa.me/6281234567890?text=Halo%20Dukungan%20Teknis%20GIM%20Swimming,%20saya%20${sessionUser}%20memerlukan%20bantuan`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold transition border border-slate-100 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <MessageCircle size={15} className="text-emerald-600" />
                <span>Hubungi Dukungan Teknis GIM</span>
              </span>
              <ChevronRight size={15} className="text-slate-400" />
            </a>

            {showInstallBtn && onInstallClick && (
              <button
                type="button"
                onClick={onInstallClick}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 text-xs font-bold transition border border-slate-100 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Download size={15} className="text-cyan-600" />
                  <span>Pasang Aplikasi (Install PWA)</span>
                </span>
                <ChevronRight size={15} className="text-slate-400" />
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition cursor-pointer border border-rose-100 flex items-center justify-center gap-2 mt-2"
              >
                <LogOut size={14} />
                <span>Keluar dari Akun ({sessionUser})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          INSTAGRAM-STYLE FULLSCREEN AVATAR LIGHTBOX VIEWER
          ========================================== */}
      {isViewingFullPhoto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          {/* Dark Glassmorphism Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity"
            onClick={() => setIsViewingFullPhoto(false)}
          />

          {/* Centered Modal Box */}
          <div className="relative z-10 w-full max-w-xs sm:max-w-sm rounded-3xl bg-slate-900/95 border border-white/15 p-6 shadow-2xl text-center flex flex-col items-center animate-zoomIn">
            {/* Close Button Top Right */}
            <button
              onClick={() => setIsViewingFullPhoto(false)}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
              title="Tutup"
            >
              <X size={16} />
            </button>

            {/* User Title */}
            <div className="mb-4">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-1.5">
                {sessionRole}
              </span>
              <h3 className="text-base sm:text-lg font-black text-white capitalize tracking-tight">
                {sessionUser}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Foto Profil GIM Swimming
              </p>
            </div>

            {/* High-res Large Avatar Display */}
            <div className="relative mb-5">
              <div className="h-44 w-44 sm:h-52 sm:w-52 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500 p-1 shadow-2xl shadow-blue-500/25">
                <div className="h-full w-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center border-2 border-white/20">
                  {isCustomImage && previewAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAvatarImageUrl(previewAvatar)}
                      alt={sessionUser}
                      className="h-full w-full object-cover select-none pointer-events-none"
                    />
                  ) : previewAvatar ? (
                    <span className="text-6xl sm:text-7xl select-none">{previewAvatar}</span>
                  ) : (
                    <span className="text-5xl sm:text-6xl font-black text-white select-none">{initialLetter}</span>
                  )}
                </div>
              </div>
              <span className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-emerald-400 border-3 border-slate-900 shadow-md" />
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsViewingFullPhoto(false);
                  setTimeout(() => fileInputRef.current?.click(), 120);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Camera size={14} />
                <span>Ganti Foto dari Galeri</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsViewingFullPhoto(false);
                  setShowEmojiDrawer(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Smile size={14} />
                <span>Pilih Karakter Emoji</span>
              </button>

              {previewAvatar && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleResetAvatar();
                    setIsViewingFullPhoto(false);
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  <span>Hapus Foto Profil</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsViewingFullPhoto(false)}
                className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
