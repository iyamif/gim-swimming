"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  uploadAvatarFile,
  updateAvatarPreset,
  isImageAvatar,
  getAvatarImageUrl,
} from "../../lib/api";
import {
  subscribeToPushNotifications,
  sendTestPushToDevice,
  isPushNotificationSupported,
} from "../../lib/pushNotifications";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionUser: string;
  sessionRole: string;
  showInstallBtn?: boolean;
  onInstallClick?: () => void;
  onAvatarChange?: (newAvatar: string) => void;
  onLogout?: () => void;
}

const PRESET_AVATARS = [
  "🏊‍♂️", "🏊‍♀️", "🤽‍♂️", "🏄‍♂️", "🤿", "🐬", "🏆", "🥇", "⭐", "👤"
];

// Helper to compress and convert any uploaded image (JPG, JPEG, PNG, etc.) to a lightweight high-res JPEG
function compressImage(file: File, maxDimension = 1200, quality = 0.88): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ file, dataUrl: URL.createObjectURL(file) });
    };
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        resolve({ file, dataUrl: (e.target?.result as string) || URL.createObjectURL(file) });
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
          return resolve({ file, dataUrl: e.target?.result as string });
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({ file, dataUrl });
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const optimizedFile = new File([blob], cleanName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve({ file: optimizedFile, dataUrl });
          },
          "image/jpeg",
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function EditProfileModal({
  isOpen,
  onClose,
  sessionUser,
  sessionRole,
  showInstallBtn,
  onInstallClick,
  onAvatarChange,
  onLogout,
}: EditProfileModalProps) {
  const [currentAvatar, setCurrentAvatar] = useState<string>("");
  const [previewAvatar, setPreviewAvatar] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Push Notification state
  const [pushStatus, setPushStatus] = useState<"enabled" | "disabled" | "unsupported">("disabled");
  const [isPushTesting, setIsPushTesting] = useState(false);
  const [testPushMessage, setTestPushMessage] = useState("");

  const checkPushStatus = () => {
    if (typeof window === "undefined" || !isPushNotificationSupported()) {
      setPushStatus("unsupported");
      return;
    }
    if (Notification.permission === "granted") {
      setPushStatus("enabled");
    } else {
      setPushStatus("disabled");
    }
  };

  useEffect(() => {
    if (isOpen && sessionUser) {
      const saved = localStorage.getItem(`gim_avatar_${sessionUser}`) || "";
      setCurrentAvatar(saved);
      setPreviewAvatar(saved);
      setSelectedFile(null);
      setIsCustomImage(isImageAvatar(saved));
      setErrorMessage("");
      setSaveSuccess(false);
      setIsSaving(false);
      setShowPhotoEditor(false);
      setTestPushMessage("");
      checkPushStatus();
    }
  }, [isOpen, sessionUser]);

  if (!isOpen) return null;

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

      if (selectedFile) {
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

      if (onAvatarChange) {
        onAvatarChange(finalAvatar);
      }

      window.dispatchEvent(new Event("avatar_updated"));

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowPhotoEditor(false);
      }, 1000);
    } catch (err: any) {
      console.error("Save avatar error:", err);
      setErrorMessage(err.message || "Gagal menyimpan foto profil ke database");
    } finally {
      setIsSaving(false);
    }
  };

  const initialLetter = sessionUser ? sessionUser.charAt(0).toUpperCase() : "A";
  const isAdmin = sessionRole.toLowerCase().trim() === "admin";
  const isCoach = sessionRole.toLowerCase().trim() === "pelatih";

  const userEmail = `${sessionUser.toLowerCase().replace(/\s+/g, "")}@gimswimming.com`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs"
      />

      {/* Modal Dialog (Styled matching the Student Profile Tab) */}
      <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isAdmin ? "Profil Administrator" : isCoach ? "Profil Pelatih" : "Profil Siswa / Wali Murid"}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Informasi detail akun dan pengaturan profil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ==========================================
            1. USER IDENTITY CARD (CENTERED AVATAR)
            ========================================== */}
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4 text-center">
          <div className="relative inline-block mx-auto">
            <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-3xl flex items-center justify-center border-4 border-white shadow-lg overflow-hidden mx-auto">
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

          <div>
            <h3 className="text-lg font-black text-slate-900 capitalize">
              {sessionUser}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {userEmail}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-black">
                {isAdmin ? "Administrator Utama" : isCoach ? "Instruktur Renang" : "Wali Murid"}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-black">
                Status: Aktif &amp; Terverifikasi
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowPhotoEditor((prev) => !prev)}
            className="w-full py-2.5 rounded-2xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold text-xs transition cursor-pointer border border-cyan-100 flex items-center justify-center gap-2"
          >
            <span>📷</span>
            <span>{showPhotoEditor ? "Tutup Editor Foto" : "Ubah Foto & Avatar Profil"}</span>
          </button>
        </div>

        {/* ==========================================
            PHOTO EDITOR DRAWER (TOGGLED)
            ========================================== */}
        {showPhotoEditor && (
          <div className="p-4 rounded-3xl bg-slate-50 border border-cyan-200/80 space-y-3.5 animate-fadeIn">
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
                    className={`flex h-10 items-center justify-center rounded-xl text-lg transition-all duration-150 cursor-pointer border ${
                      previewAvatar === emoji && !isCustomImage
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
            2. DETAIL INFORMASI LENGKAP ADMIN
            ========================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
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
              <span className="text-slate-500">Sistem Aplikasi</span>
              <span className="font-bold text-slate-900">GIM Swimming Academy v2.0</span>
            </div>
          </div>
        </div>

        {/* ==========================================
            3. NOTIFIKASI HP & APP BADGE (WEB PUSH + VAPID)
            ========================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-white border border-indigo-100 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔔</span> Notifikasi HP &amp; Icon Badge
            </h4>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                pushStatus === "enabled"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : pushStatus === "unsupported"
                  ? "bg-slate-100 text-slate-600 border-slate-300"
                  : "bg-amber-100 text-amber-800 border-amber-300"
              }`}
            >
              {pushStatus === "enabled"
                ? "🟢 Aktif (Connected)"
                : pushStatus === "unsupported"
                ? "⚪ Tidak Didukung"
                : "🟡 Belum Diaktifkan"}
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Menerima notifikasi jadwal baru dan update absensi secara langsung di layar HP (Homescreen) lengkap dengan hitungan badge count native mobile.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {pushStatus !== "enabled" && pushStatus !== "unsupported" && (
              <button
                type="button"
                onClick={async () => {
                  setTestPushMessage("");
                  const res = await subscribeToPushNotifications({
                    role: sessionRole,
                    username: sessionUser,
                    userPrompt: true,
                  });
                  if (res.success) {
                    setPushStatus("enabled");
                    setTestPushMessage("✅ Notifikasi HP berhasil diaktifkan!");
                  } else {
                    setTestPushMessage(`⚠️ ${res.error || "Gagal mengaktifkan notifikasi."}`);
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🔔</span> Aktifkan Notifikasi HP
              </button>
            )}

            <button
              type="button"
              disabled={isPushTesting}
              onClick={async () => {
                try {
                  setIsPushTesting(true);
                  setTestPushMessage("");
                  // If permission not yet granted, request first
                  if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
                    await subscribeToPushNotifications({
                      role: sessionRole,
                      username: sessionUser,
                      userPrompt: true,
                    });
                    checkPushStatus();
                  }

                  const res = await sendTestPushToDevice({
                    role: sessionRole,
                    username: sessionUser,
                  });
                  if (res.success) {
                    setTestPushMessage("🚀 " + res.message);
                  } else {
                    setTestPushMessage("⚠️ " + res.message);
                  }
                } catch (err: any) {
                  setTestPushMessage("⚠️ " + (err.message || "Gagal mengirim tes"));
                } finally {
                  setIsPushTesting(false);
                }
              }}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200 shadow-xs transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              <span>📲</span> {isPushTesting ? "Mengirim..." : "Kirim Notifikasi Tes ke HP"}
            </button>
          </div>

          {testPushMessage && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold animate-fadeIn ${
                testPushMessage.startsWith("✅") || testPushMessage.startsWith("🚀")
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {testPushMessage}
            </div>
          )}
        </div>

        {/* ==========================================
            4. PENGATURAN, BANTUAN & LOGOUT
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
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition cursor-pointer border border-rose-100 flex items-center justify-center gap-2 mt-2"
              >
                <span>🚪</span> Keluar dari Akun ({sessionUser})
              </button>
            )}
          </div>
        </div>

        {/* Close Button Footer */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
