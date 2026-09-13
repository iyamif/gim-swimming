"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  uploadAvatarFile,
  updateAvatarPreset,
  isImageAvatar,
  getAvatarImageUrl,
  changeUserPassword,
  fetchCurrentUser,
} from "../../lib/api";
import PushNotificationCard from "./PushNotificationCard";
import {
  User,
  X,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  MessageCircle,
  Download,
  LogOut,
  ChevronRight,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Smile,
  Copy,
  Check,
  Building2,
  ExternalLink,
} from "lucide-react";

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
  "🏊‍♂️", "🏊‍♀️", "🤽‍♂️", "🏄‍♂️", "🤿", "🐬", "🏆", "🥇", "⭐", "👤",
  "🥋", "⚡", "🔥", "🌊", "👑", "🎯", "🛡️", "🚀", "🌟", "🦈"
];

function compressImage(file: File, maxDimension = 360, quality = 0.85): Promise<{ file: File; dataUrl: string }> {
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
  const [modalTab, setModalTab] = useState<"profile" | "password" | "details">("profile");

  const [currentAvatar, setCurrentAvatar] = useState<string>("");
  const [previewAvatar, setPreviewAvatar] = useState<string>("");
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // User details
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && sessionUser) {
      const saved = localStorage.getItem(`gim_avatar_${sessionUser}`) || "";
      setCurrentAvatar(saved);
      setPreviewAvatar(saved);
      setIsCustomImage(isImageAvatar(saved));
      setAvatarError("");
      setAvatarSuccess(false);
      setIsSaving(false);
      setShowEmojiPicker(false);
      setPasswordError("");
      setPasswordSuccess(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      fetchCurrentUser().then((u) => {
        if (u) setCurrentUserData(u);
      }).catch(() => {});
    }
  }, [isOpen, sessionUser]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1800);
    }
  };

  const saveAvatarDirectly = async (avatarDataUrl: string) => {
    if (!sessionUser) return;
    try {
      setIsSaving(true);
      setAvatarError("");

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

      if (onAvatarChange) onAvatarChange(finalAvatar);
      window.dispatchEvent(new Event("avatar_updated"));

      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 2500);
    } catch (err: any) {
      console.error("Save avatar error:", err);
      setAvatarError(err.message || "Gagal menyimpan foto profil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    try {
      setIsSaving(true);
      setAvatarError("");
      const { dataUrl } = await compressImage(rawFile, 400, 0.85);
      await saveAvatarDirectly(dataUrl);
    } catch (err: any) {
      console.error("Error processing image file:", err);
      setAvatarError("Gagal memproses gambar");
      setIsSaving(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectPreset = async (emoji: string) => {
    await saveAvatarDirectly(emoji);
    setShowEmojiPicker(false);
  };

  const handleResetAvatar = async () => {
    await saveAvatarDirectly("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Silakan masukkan kata sandi saat ini");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Kata sandi baru minimal harus 6 karakter");
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
      setTimeout(() => setPasswordSuccess(false), 3500);
    } catch (err: any) {
      console.error("Change password error:", err);
      setPasswordError(err.message || "Gagal mengubah kata sandi. Pastikan kata sandi saat ini benar.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "Kosong", color: "bg-slate-200", textColor: "text-slate-400" };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: "Lemah", color: "bg-rose-500", textColor: "text-rose-600" };
      case 2:
        return { score: 50, label: "Cukup", color: "bg-amber-500", textColor: "text-amber-600" };
      case 3:
        return { score: 75, label: "Kuat", color: "bg-blue-500", textColor: "text-blue-600" };
      case 4:
        return { score: 100, label: "Sangat Kuat", color: "bg-emerald-500", textColor: "text-emerald-600" };
      default:
        return { score: 0, label: "Kosong", color: "bg-slate-200", textColor: "text-slate-400" };
    }
  }, [newPassword]);

  const initialLetter = sessionUser ? sessionUser.charAt(0).toUpperCase() : "A";
  const isAdmin = sessionRole.toLowerCase().trim() === "admin";
  const isCoach = sessionRole.toLowerCase().trim() === "pelatih";
  const userEmail = currentUserData?.email || `${sessionUser.toLowerCase().replace(/\s+/g, "")}@gimswimming.com`;
  const userMemberId = `GIM-${isAdmin ? "ADM" : isCoach ? "CCH" : "STU"}-${currentUserData?.id ? String(currentUserData.id).padStart(3, "0") : "001"}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 capitalize tracking-tight flex items-center gap-1.5">
                <span>{sessionUser}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {isAdmin ? "Admin" : isCoach ? "Pelatih" : "Wali Murid"}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Pengaturan Profil &amp; Keamanan Akun</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Segmented Navigation */}
        <div className="flex rounded-2xl bg-slate-100 p-1 gap-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setModalTab("profile")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              modalTab === "profile"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Foto Profil
          </button>
          <button
            type="button"
            onClick={() => setModalTab("password")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              modalTab === "password"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Ganti Sandi
          </button>
          <button
            type="button"
            onClick={() => setModalTab("details")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              modalTab === "details"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Detail Akun
          </button>
        </div>

        {/* Feedback Alert Toasts */}
        {avatarSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
            <Sparkles size={14} className="text-emerald-600" />
            <span>Foto profil berhasil diperbarui!</span>
          </div>
        )}

        {avatarError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-fadeIn">
            <AlertTriangle size={14} className="text-rose-600" />
            <span>{avatarError}</span>
          </div>
        )}

        {/* TAB 1: FOTO PROFIL */}
        {modalTab === "profile" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Avatar Preview */}
            <div className="text-center py-2">
              <div className="relative inline-block mx-auto">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative h-24 w-24 rounded-3xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 text-white font-black text-3xl flex items-center justify-center border-4 border-white shadow-xl overflow-hidden cursor-pointer active:scale-95 transition group"
                >
                  {isCustomImage && previewAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAvatarImageUrl(previewAvatar)}
                      alt={sessionUser}
                      className="h-full w-full object-cover select-none pointer-events-none"
                    />
                  ) : previewAvatar ? (
                    <span className="text-4xl">{previewAvatar}</span>
                  ) : (
                    <span className="text-3xl font-black">{initialLetter}</span>
                  )}

                  {isSaving && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                      <RotateCw size={20} className="animate-spin text-cyan-300 mb-1" />
                      <span className="text-[8px] font-bold">Menyimpan</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition duration-200">
                    <Camera size={20} className="mb-0.5" />
                    <span className="text-[9px] font-bold">Ganti Foto</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition active:scale-90"
                  title="Pilih dari Galeri"
                >
                  <Camera size={14} />
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Camera size={13} />
                  <span>Unggah Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Smile size={13} />
                  <span>Karakter Emoji</span>
                </button>
              </div>
            </div>

            {/* Emoji Selector */}
            {showEmojiPicker && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 animate-fadeIn">
                <p className="text-[11px] font-bold text-slate-500">Pilih Karakter Emoji Avatar:</p>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSelectPreset(emoji)}
                      className="h-10 rounded-xl bg-white border border-slate-200 text-xl flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GANTI KATA SANDI */}
        {modalTab === "password" && (
          <div className="space-y-3.5 animate-fadeIn">
            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <AlertTriangle size={15} className="text-rose-600 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                <span>Kata sandi berhasil diperbarui dengan aman!</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
              {/* Current Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Kata Sandi Saat Ini</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Kata sandi lama"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-700">Kata Sandi Baru</label>
                  {newPassword && (
                    <span className={`text-[10px] font-bold ${passwordStrength.textColor}`}>
                      {passwordStrength.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Konfirmasi Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/25 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 mt-2"
              >
                {isChangingPassword ? (
                  <>
                    <RotateCw size={14} className="animate-spin text-cyan-200" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    <span>Simpan Kata Sandi Baru</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: DETAIL AKUN */}
        {modalTab === "details" && (
          <div className="space-y-3 text-xs animate-fadeIn">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-400 font-bold">Member ID</span>
                <span className="font-mono font-extrabold text-slate-800">{userMemberId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-400 font-bold">Email Akun</span>
                <span className="font-bold text-slate-800">{userEmail}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-400 font-bold">Otoritas</span>
                <span className="font-bold text-blue-600">{isAdmin ? "Super Admin" : isCoach ? "Coach / Pelatih" : "Wali Murid"}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold">Sistem</span>
                <span className="font-bold text-emerald-600">GIM Swimming v2.4 (Active)</span>
              </div>
            </div>

            <a
              href={`https://wa.me/6281234567890?text=Halo%20Admin%20GIM%20Swimming,%20saya%20${sessionUser}%20memerlukan%20bantuan`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition border border-emerald-200 flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <MessageCircle size={15} className="text-emerald-600" />
                <span>Bantuan Teknis WhatsApp</span>
              </span>
              <ExternalLink size={13} />
            </a>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition cursor-pointer border border-rose-100 flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                <span>Keluar dari Akun</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
