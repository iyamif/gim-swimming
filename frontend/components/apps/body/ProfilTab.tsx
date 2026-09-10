"use client";

import React, { useState, useEffect, useRef } from "react";
import { Student, Coach, ScheduleSession } from "../types";
import {
  uploadAvatarFile,
  updateAvatarPreset,
  isImageAvatar,
  getAvatarImageUrl,
} from "../../../lib/api";
import PushNotificationCard from "../PushNotificationCard";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    try {
      setErrorMessage("");
      const { file: optimizedFile, dataUrl } = await compressImage(rawFile);
      setSelectedFile(optimizedFile);
      setPreviewAvatar(dataUrl);
      setIsCustomImage(true);
    } catch (err: any) {
      console.error("Error processing image file:", err);
      setSelectedFile(rawFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result as string);
        setIsCustomImage(true);
      };
      reader.readAsDataURL(rawFile);
    }
  };

  const handleSelectPreset = (emoji: string) => {
    setPreviewAvatar(emoji);
    setSelectedFile(null);
    setIsCustomImage(false);
    setErrorMessage("");
  };

  const handleResetAvatar = () => {
    setPreviewAvatar("");
    setSelectedFile(null);
    setIsCustomImage(false);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!sessionUser) return;

    try {
      setIsSaving(true);
      setErrorMessage("");

      let finalAvatar = "";

      if (previewAvatar && previewAvatar.startsWith("data:image")) {
        finalAvatar = await updateAvatarPreset(previewAvatar);
      } else if (selectedFile) {
        finalAvatar = await uploadAvatarFile(selectedFile);
      } else {
        finalAvatar = await updateAvatarPreset(previewAvatar);
      }

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
      setSelectedFile(null);
      setIsCustomImage(isImageAvatar(finalAvatar));

      window.dispatchEvent(new Event("avatar_updated"));

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowPhotoEditor(false);
      }, 1200);
    } catch (err: any) {
      console.error("Save avatar error:", err);
      setErrorMessage(err.message || "Gagal menyimpan foto profil ke database");
    } finally {
      setIsSaving(false);
    }
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
        {/* ==========================================
            CARD 1: USER PROFILE IDENTITY (CENTERED WITH OVERLAPPING AVATAR)
            ========================================== */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 pt-0 pb-6 px-6 text-center relative">
          {/* Overlapping Avatar matching mockup */}
          <div className="relative -top-12 -mb-8 inline-block mx-auto">
            <div
              onClick={() => setShowPhotoEditor((prev) => !prev)}
              className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-3xl flex items-center justify-center border-4 border-white shadow-md overflow-hidden mx-auto cursor-pointer hover:scale-105 transition"
              title="Klik untuk ubah foto profil"
            >
              {isCustomImage && previewAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getAvatarImageUrl(previewAvatar)}
                  alt={sessionUser}
                  className="h-full w-full object-cover"
                />
              ) : previewAvatar ? (
                <span>{previewAvatar}</span>
              ) : (
                <span>{initialLetter}</span>
              )}
            </div>
            <button
              onClick={() => setShowPhotoEditor((prev) => !prev)}
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition"
              title="Ubah Foto"
            >
              📷
            </button>
          </div>

          {/* Name & Role Text directly below avatar */}
          <div className="mt-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 capitalize tracking-tight">
              {sessionUser}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {isAdmin
                ? "Administrator Utama - GIM Swimming"
                : isCoach
                ? "Senior Coach - Level 3"
                : "Wali Murid - GIM Swimming"}
            </p>
          </div>
        </div>

        {/* ==========================================
            PHOTO & AVATAR SELECTOR DRAWER (TOGGLED)
            ========================================== */}
        {showPhotoEditor && (
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-cyan-200/80 space-y-3.5 animate-fadeIn">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>🖼️</span> Pilih Foto atau Emoji Avatar
            </h4>

            {/* Upload Button */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>📁</span>
                <span>Unggah Foto dari Perangkat</span>
              </button>

              {previewAvatar && (
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  className="py-2.5 px-3 rounded-xl bg-slate-200/70 hover:bg-slate-300/70 text-slate-700 text-xs font-bold transition cursor-pointer"
                  title="Reset Avatar Default"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Preset Avatar Emojis */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Atau Pilih Avatar Karakter:
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectPreset(emoji)}
                    className={`flex h-10 items-center justify-center rounded-xl text-lg transition-all duration-150 cursor-pointer border ${previewAvatar === emoji && !isCustomImage
                      ? "bg-cyan-50 border-cyan-400 ring-2 ring-cyan-400/30 scale-105"
                      : "bg-white hover:bg-slate-100 border-slate-200/80"
                      }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Alert */}
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
                <span>✅</span>
                <span>Foto profil berhasil disimpan ke database!</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin inline-block">🔄</span>
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <span>Simpan Perubahan Foto</span>
              )}
            </button>
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
                <span>💬</span> Hubungi Dukungan Teknis GIM
              </span>
              <span>›</span>
            </a>

            {showInstallBtn && onInstallClick && (
              <button
                type="button"
                onClick={onInstallClick}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 text-xs font-bold transition border border-slate-100 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>📥</span> Pasang Aplikasi (Install PWA)
                </span>
                <span>›</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition cursor-pointer border border-rose-100 flex items-center justify-center gap-2 mt-2"
              >
                <span>🚪</span> Keluar dari Akun ({sessionUser})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
