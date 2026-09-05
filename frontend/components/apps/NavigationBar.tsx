"use client";

import React, { useState, useEffect } from "react";
import { NavItem } from "./types";
import EditProfileModal from "./EditProfileModal";
import { isImageAvatar, getAvatarImageUrl } from "../../lib/api";

interface NavigationBarProps {
  navItems: NavItem[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  sessionUser: string;
  sessionRole: string;
  onLogout?: () => void;
}

export function DesktopSidebar({
  navItems,
  activeTab,
  setActiveTab,
  sessionUser,
  sessionRole,
  onLogout,
}: NavigationBarProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");

  const loadAvatar = () => {
    if (sessionUser) {
      const saved = localStorage.getItem(`gim_avatar_${sessionUser}`) || "";
      setUserAvatar(saved);
    }
  };

  useEffect(() => {
    loadAvatar();
    const handleAvatarUpdate = () => loadAvatar();
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, [sessionUser]);

  const initialLetter = sessionUser ? sessionUser.charAt(0).toUpperCase() : "U";
  const isCustomImage = isImageAvatar(userAvatar);


  return (
    <>
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-100 bg-white text-slate-700 shrink-0">
        {/* Brand Logo Header */}
        <div className="flex h-20 items-center px-6 border-b border-slate-100">
          <a href="#" className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-slate-900">
              GIM <span className="text-cyan-500">SWIMMING</span>
            </span>
          </a>
        </div>

        {/* User Profile Capsule in Top Sidebar */}
        <div className="p-4 border-b border-slate-100/80">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50/50 border border-slate-100/80 group">
            {/* Clickable Avatar to Edit */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="relative shrink-0 cursor-pointer group/avatar"
              title="Klik untuk ubah foto profil"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500 text-white font-black text-sm uppercase shadow-sm border-2 border-white overflow-hidden group-hover/avatar:ring-2 group-hover/avatar:ring-cyan-400 transition">
                {isCustomImage && userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getAvatarImageUrl(userAvatar)}
                    alt={sessionUser}
                    className="h-full w-full object-cover"
                  />
                ) : userAvatar ? (
                  <span className="text-lg">{userAvatar}</span>
                ) : (
                  <span>{initialLetter}</span>
                )}
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white shadow-2xs" />
              {/* Camera mini badge */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[8px] text-white opacity-0 group-hover/avatar:opacity-100 transition shadow-xs">
                📷
              </span>
            </button>

            {/* User Details */}
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-slate-900 capitalize truncate">
                {sessionUser}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-700">
                  {sessionRole}
                </span>
              </div>
            </div>

            {/* Quick Edit Profile Button */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 p-1.5 rounded-lg transition cursor-pointer"
              title="Pengaturan Profil & Foto"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-cyan-50/80 text-cyan-600 border-l-4 border-cyan-500 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.fullLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with Edit Profile & Logout Buttons */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {/* Edit Profile Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-50 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 text-xs font-bold transition cursor-pointer border border-slate-100"
          >
            <span>📷</span>
            <span>Ubah Foto Profil</span>
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-50/60 hover:bg-rose-100/80 text-rose-600 text-xs font-bold transition cursor-pointer border border-rose-100"
              title="Keluar dari Akun"
            >
              <span>🚪</span>
              <span>Keluar (Logout)</span>
            </button>
          )}
        </div>
      </aside>

      {/* Profile Edit Modal */}
      <EditProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        sessionUser={sessionUser}
        sessionRole={sessionRole}
        onAvatarChange={(newAv) => setUserAvatar(newAv)}
        onLogout={onLogout}
      />
    </>
  );
}

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  sessionUser,
  sessionRole,
  onLogout,
}: {
  activeTab: string;
  setActiveTab: (id: string) => void;
  navItems?: NavItem[];
  sessionUser?: string;
  sessionRole?: string;
  onLogout?: () => void;
}) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");

  const loadAvatar = () => {
    if (sessionUser) {
      const saved = localStorage.getItem(`gim_avatar_${sessionUser}`) || "";
      setUserAvatar(saved);
    }
  };

  useEffect(() => {
    loadAvatar();
    const handleAvatarUpdate = () => loadAvatar();
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, [sessionUser]);

  const initialLetter = sessionUser ? sessionUser.charAt(0).toUpperCase() : "U";
  const isCustomImage = isImageAvatar(userAvatar);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-3 md:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
        {/* 1. Home */}
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors duration-200 ${
            activeTab === "dashboard" ? "text-cyan-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <span className="text-xl mb-0.5">🏠</span>
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        {/* 2. Siswa / Timeline */}
        <button
          onClick={() => setActiveTab("daftar_hadir")}
          className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors duration-200 ${
            activeTab === "daftar_hadir" ? "text-cyan-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <span className="text-xl mb-0.5">📋</span>
          <span className="text-[10px] tracking-tight">Siswa</span>
        </button>

        {/* 3. Center Floating Action Button (Presensi) */}
        <div className="flex flex-col items-center justify-center -mt-7 flex-1">
          <button
            onClick={() => setActiveTab("absensi")}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/40 border-4 border-white active:scale-90 transition-transform duration-150 cursor-pointer"
            title="Input Presensi Cepat"
          >
            <span className="text-2xl">⏱️</span>
          </button>
          <span
            className={`text-[10px] mt-1 tracking-tight font-bold ${
              activeTab === "absensi" ? "text-cyan-600" : "text-slate-500"
            }`}
          >
            Presensi
          </span>
        </div>

        {/* 4. Keuangan */}
        <button
          onClick={() => setActiveTab("keuangan")}
          className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors duration-200 ${
            activeTab === "keuangan" ? "text-cyan-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <span className="text-xl mb-0.5">💰</span>
          <span className="text-[10px] tracking-tight">Keuangan</span>
        </button>

        {/* 5. User Profile Button */}
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors duration-200 text-slate-500 hover:text-cyan-600"
          title="Lihat Profil & Edit Foto"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-[10px] shadow-xs border border-white overflow-hidden mb-0.5">
            {isCustomImage && userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getAvatarImageUrl(userAvatar)}
                alt={sessionUser || "User"}
                className="h-full w-full object-cover"
              />
            ) : userAvatar ? (
              <span>{userAvatar}</span>
            ) : (
              <span>{initialLetter}</span>
            )}
          </div>
          <span className="text-[10px] tracking-tight font-bold">Profil</span>
        </button>
      </div>

      {/* Mobile Profile Modal */}
      {sessionUser && (
        <EditProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          sessionUser={sessionUser}
          sessionRole={sessionRole || "user"}
          onAvatarChange={(newAv) => setUserAvatar(newAv)}
          onLogout={onLogout}
        />
      )}
    </>
  );
}

export default function NavigationBar(props: NavigationBarProps) {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileBottomNav
        activeTab={props.activeTab}
        setActiveTab={props.setActiveTab}
        sessionUser={props.sessionUser}
        sessionRole={props.sessionRole}
        onLogout={props.onLogout}
      />
    </>
  );
}
