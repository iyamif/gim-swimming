"use client";

import React, { useState, useEffect, useRef } from "react";
import { uploadAvatarFile, updateAvatarPreset, isImageAvatar } from "../../lib/api";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionUser: string;
  sessionRole: string;
  onAvatarChange?: (newAvatar: string) => void;
  onLogout?: () => void;
}

const PRESET_AVATARS = [
  "🏊‍♂️", "🏊‍♀️", "🤽‍♂️", "🏄‍♂️", "🤿", "🐬", "🏆", "🥇", "⭐", "👤"
];

export default function EditProfileModal({
  isOpen,
  onClose,
  sessionUser,
  sessionRole,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
  }, [isOpen, sessionUser]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Ukuran gambar maksimal 5MB");
      return;
    }

    setErrorMessage("");
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      setPreviewAvatar(resultStr);
      setIsCustomImage(true);
    };
    reader.readAsDataURL(file);
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
        // Upload photo to backend (saved in frontend/public/foto-profile and DB)
        finalAvatar = await uploadAvatarFile(selectedFile);
      } else {
        // Update preset or empty avatar
        finalAvatar = await updateAvatarPreset(previewAvatar);
      }

      if (finalAvatar) {
        localStorage.setItem(`gim_avatar_${sessionUser}`, finalAvatar);
      } else {
        localStorage.removeItem(`gim_avatar_${sessionUser}`);
      }

      setCurrentAvatar(finalAvatar);
      setPreviewAvatar(finalAvatar);
      setSelectedFile(null);
      setIsCustomImage(isImageAvatar(finalAvatar));

      if (onAvatarChange) {
        onAvatarChange(finalAvatar);
      }

      // Trigger global event for all listening components
      window.dispatchEvent(new Event("avatar_updated"));

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Save avatar error:", err);
      setErrorMessage(err.message || "Gagal menyimpan foto profil ke database");
    } finally {
      setIsSaving(false);
    }
  };

  const initialLetter = sessionUser ? sessionUser.charAt(0).toUpperCase() : "U";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">👤</span>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Profil & Foto Akun
              </h3>
              <p className="text-[11px] text-slate-400">
                Kelola foto avatar dan informasi akun Anda
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

        {/* User Info Capsule */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50/40 border border-cyan-100/60">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-2xl shadow-md border-2 border-white overflow-hidden shrink-0">
              {isCustomImage && previewAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewAvatar}
                  alt={sessionUser}
                  className="h-full w-full object-cover"
                />
              ) : previewAvatar ? (
                <span>{previewAvatar}</span>
              ) : (
                <span>{initialLetter}</span>
              )}
            </div>
            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-400 border-2 border-white shadow-xs" />
          </div>

          <div className="overflow-hidden">
            <h4 className="text-sm font-black text-slate-900 capitalize truncate">
              {sessionUser}
            </h4>
            <p className="text-[11px] text-slate-500 truncate">
              {sessionUser.toLowerCase()}@gimswimming.com
            </p>
            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-700 border border-cyan-200">
              Role: {sessionRole}
            </span>
          </div>
        </div>

        {/* Edit Photo Actions */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Pilihan Foto / Avatar Profil
          </label>

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
              className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <span>📷</span>
              <span>Unggah Foto dari Perangkat</span>
            </button>

            {previewAvatar && (
              <button
                type="button"
                onClick={handleResetAvatar}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                title="Reset Avatar Default"
              >
                Reset
              </button>
            )}
          </div>

          {/* Preset Avatar Emojis */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Atau Pilih Avatar Karakter:
            </span>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectPreset(emoji)}
                  className={`flex h-11 items-center justify-center rounded-xl text-xl transition-all duration-150 cursor-pointer border ${
                    previewAvatar === emoji && !isCustomImage
                      ? "bg-cyan-50 border-cyan-400 ring-2 ring-cyan-400/30 scale-105"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/80"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
            <span>✅</span>
            <span>Foto profil berhasil disimpan ke database & folder server!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              Tutup
            </button>
          </div>


          {/* Logout Section in Modal */}
          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/80 text-rose-600 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🚪</span>
              <span>Keluar dari Akun ({sessionUser})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
