import React from "react";
import EditProfileModal from "./EditProfileModal";
import { isImageAvatar, getAvatarImageUrl } from "../../lib/api";

interface ParentHeaderProps {
  sessionUser?: string;
  sessionRole?: string;
  showInstallBtn: boolean;
  onInstallClick: () => void;
  onLogout: () => void;
  onRefresh?: () => void | Promise<void>;
}

export function ParentHeader({
  sessionUser,
  sessionRole = "orang tua",
  showInstallBtn,
  onInstallClick,
  onLogout,
  onRefresh,
}: ParentHeaderProps) {
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [userAvatar, setUserAvatar] = React.useState<string>("");
  const [isRefreshingLocal, setIsRefreshingLocal] = React.useState(false);

  const loadAvatar = () => {
    if (sessionUser) {
      const saved = localStorage.getItem(`gim_avatar_${sessionUser}`) || "";
      setUserAvatar(saved);
    }
  };

  React.useEffect(() => {
    loadAvatar();
    const handleAvatarUpdate = () => loadAvatar();
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
  }, [sessionUser]);

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

  const initialLetter = sessionUser ? sessionUser.charAt(0).toUpperCase() : "U";
  const isCustomImage = isImageAvatar(userAvatar);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-5 pt-[max(2.75rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-4 pb-4 flex items-center justify-between shadow-sm shadow-slate-100/50">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            Dashboard Wali Murid
          </p>
          <h1 className="text-base font-black text-slate-900 mt-1">GIM Swimming App</h1>
        </div>
        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshingLocal}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 hover:bg-cyan-50 border border-slate-200/80 text-slate-600 hover:text-cyan-600 transition cursor-pointer disabled:opacity-60"
              title="Perbarui Data Database"
            >
              <span className={`text-xs ${isRefreshingLocal ? "animate-spin" : ""}`}>🔄</span>
            </button>
          )}

          {sessionUser && (
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full bg-slate-50 hover:bg-cyan-50 border border-slate-200/80 transition cursor-pointer"
              title="Ubah Foto Profil"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-xs shadow-xs border border-white overflow-hidden shrink-0">
                {isCustomImage && userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getAvatarImageUrl(userAvatar)}
                    alt={sessionUser}
                    className="h-full w-full object-cover"
                  />
                ) : userAvatar ? (
                  <span>{userAvatar}</span>
                ) : (
                  <span>{initialLetter}</span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-700 capitalize hidden sm:inline">
                {sessionUser}
              </span>
            </button>
          )}

          {showInstallBtn && (
            <button
              onClick={onInstallClick}
              className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 px-3 py-2 text-xs font-bold text-white transition cursor-pointer flex items-center gap-1 shadow-md shadow-rose-500/20 shrink-0"
            >
              <span>📥</span> <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-slate-50 transition cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </header>

      {sessionUser && (
        <EditProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          sessionUser={sessionUser}
          sessionRole={sessionRole}
          onAvatarChange={(newAv) => setUserAvatar(newAv)}
          onLogout={onLogout}
        />
      )}
    </>
  );
}

interface AdminHeaderProps {
  title: string;
  sessionRole: string;
  showInstallBtn: boolean;
  onInstallClick: () => void;
  onLogout: () => void;
  onRefresh?: () => void | Promise<void>;
  notifications?: import("./types").AdminNotification[];
  onMarkNotificationRead?: (id: number | string) => Promise<void>;
  onClearAllNotifications?: () => Promise<void>;
  setActiveTab?: (tab: string) => void;
}

export function AdminHeader({
  title,
  sessionRole,
  showInstallBtn,
  onInstallClick,
  onLogout,
  onRefresh,
  notifications = [],
  onMarkNotificationRead,
  onClearAllNotifications,
  setActiveTab,
}: AdminHeaderProps) {
  const [isRefreshingLocal, setIsRefreshingLocal] = React.useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = React.useState(false);

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

  const unreadNotifs = notifications.filter((n) => !n.is_read);

  return (
    <header className="flex h-18 sm:h-20 items-center justify-between border-b border-slate-100 bg-white px-6 relative z-30">
      <div>
        <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshingLocal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-cyan-50 border border-slate-200/80 text-xs font-bold text-slate-600 hover:text-cyan-700 transition cursor-pointer disabled:opacity-60"
            title="Muat Ulang Data Terbaru dari Database"
          >
            <span className={isRefreshingLocal ? "animate-spin inline-block" : ""}>🔄</span>
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        )}

        {/* Notification Bell with Popup */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationPopup(!showNotificationPopup)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer relative shadow-2xs"
            title="Notifikasi"
          >
            <span className="text-base">🔔</span>
            {unreadNotifs.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white shadow-xs animate-pulse">
                {unreadNotifs.length > 99 ? "99+" : unreadNotifs.length}
              </span>
            )}
          </button>

          {showNotificationPopup && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/5"
                onClick={() => setShowNotificationPopup(false)}
              />
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto bg-white rounded-3xl p-4 shadow-2xl border border-slate-100 text-slate-800 z-50 animate-fadeIn space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-900">Pemberitahuan</span>
                  {notifications.length > 0 && onClearAllNotifications && (
                    <button
                      type="button"
                      onClick={async () => {
                        await onClearAllNotifications();
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center italic">
                    Tidak ada notifikasi baru.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {notifications.slice(0, 8).map((notif) => {
                      const isSchedule = notif.type?.includes("schedule") || notif.title?.toLowerCase().includes("jadwal");
                      const isLate = notif.title?.includes("Terlambat");
                      const icon = isSchedule ? "📅" : isLate ? "⚠️" : notif.type?.includes("attendance") ? "⏱️" : "🔔";

                      return (
                        <div
                          key={notif.id}
                          onClick={async () => {
                            if (onMarkNotificationRead && !notif.is_read) {
                              await onMarkNotificationRead(notif.id);
                            }
                            setShowNotificationPopup(false);
                            if (isSchedule && setActiveTab) {
                              setActiveTab("jadwal");
                            } else if (notif.type?.includes("attendance") && setActiveTab) {
                              setActiveTab("absensi");
                            }
                          }}
                          className={`p-2.5 rounded-2xl border transition text-left cursor-pointer ${
                            !notif.is_read
                              ? isSchedule
                                ? "bg-emerald-50/80 border-emerald-200"
                                : isLate
                                ? "bg-amber-50/80 border-amber-200"
                                : "bg-blue-50/80 border-blue-200"
                              : "bg-slate-50/60 border-slate-100 opacity-80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                              <span>{icon}</span>
                              <span className="truncate">{notif.title}</span>
                            </span>
                            {!notif.is_read && (
                              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">
                            {notif.message}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-1">
                            {notif.created_at ? new Date(notif.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "Baru saja"} WIB
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Dynamic Role Badge */}
        <span
          className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            sessionRole === "admin"
              ? "bg-rose-50 text-rose-600 border-rose-100"
              : sessionRole === "pelatih"
              ? "bg-pink-50 text-pink-600 border-pink-100"
              : "bg-purple-50 text-purple-600 border-purple-100"
          }`}
        >
          {sessionRole}
        </span>

        {showInstallBtn && (
          <button
            onClick={onInstallClick}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 px-3 py-2 text-xs font-bold text-white transition cursor-pointer flex items-center gap-1 shadow-md shadow-rose-500/20 shrink-0"
          >
            <span>📥</span> <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-red-500 hover:border-red-200 transition cursor-pointer"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}

export default function AppsHeader(
  props:
    | ({ role: "orang tua" } & ParentHeaderProps)
    | ({ role: "admin" | "pelatih" } & AdminHeaderProps)
) {
  if (props.role === "orang tua") {
    return (
      <ParentHeader
        sessionUser={props.sessionUser}
        sessionRole={props.sessionRole}
        showInstallBtn={props.showInstallBtn}
        onInstallClick={props.onInstallClick}
        onLogout={props.onLogout}
        onRefresh={props.onRefresh}
      />
    );
  }

  return (
    <AdminHeader
      title={props.title}
      sessionRole={props.sessionRole}
      showInstallBtn={props.showInstallBtn}
      onInstallClick={props.onInstallClick}
      onLogout={props.onLogout}
      onRefresh={props.onRefresh}
      notifications={props.notifications}
      onMarkNotificationRead={props.onMarkNotificationRead}
      onClearAllNotifications={props.onClearAllNotifications}
      setActiveTab={props.setActiveTab}
    />
  );
}
