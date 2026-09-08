"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  API_BASE_URL,
  getApiBaseUrl,
  fetchStudents,
  createStudent,
  submitBulkAttendance,
  fetchCoaches,
  createCoach,
  fetchSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  fetchInvoices,
  verifyInvoicePayment,
  uploadInvoiceReceipt,
  syncCurrentUserAvatar,
  fetchAttendances,
  checkInAttendance,
  fetchNotifications,
  markNotificationRead,
  clearAllNotifications,
} from "../../lib/api";
import {
  Student,
  Coach,
  Invoice,
  ScheduleSession,
  NavItem,
  AttendanceRecord,
  AdminNotification,
  CheckInInput,
} from "../../components/apps/types";
import IOSInstallModal from "../../components/apps/IOSInstallModal";
import { ParentHeader, AdminHeader } from "../../components/apps/AppsHeader";
import { DesktopSidebar, MobileBottomNav } from "../../components/apps/NavigationBar";
import ParentBody from "../../components/apps/body/ParentBody";
import AppsBody from "../../components/apps/body/AppsBody";
import PullToRefresh from "../../components/apps/PullToRefresh";

export default function AppsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sessionUser, setSessionUser] = useState("");
  const [sessionRole, setSessionRole] = useState("");

  // Navigation tab state (for Admin & Pelatih only)
  const [activeTab, setActiveTab] = useState("dashboard");

  // REAL DATABASE STATES (Loaded from PostgreSQL Backend)
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSession[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("gim_swimming_user");
    localStorage.removeItem("gim_swimming_role");
    localStorage.removeItem("gim_swimming_token");
    router.push("/");
  };

  // Load all real data from PostgreSQL Backend
  const loadAllData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [
        fetchedStudents,
        fetchedCoaches,
        fetchedSchedules,
        fetchedInvoices,
        fetchedAttendances,
        fetchedNotifications,
      ] = await Promise.all([
        fetchStudents(),
        fetchCoaches(),
        fetchSchedules(),
        fetchInvoices(),
        fetchAttendances(),
        fetchNotifications(),
      ]);

      setStudents(fetchedStudents);
      setCoaches(fetchedCoaches);
      setSchedules(fetchedSchedules);
      setInvoices(fetchedInvoices);
      setAttendances(fetchedAttendances);
      setNotifications(fetchedNotifications);
    } catch (err) {
      console.error("Error fetching database data:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Pull-to-refresh handler: reloads all database data and profile avatar + checks SW updates
  const handlePullRefresh = async () => {
    try {
      setIsRefreshing(true);

      // Check Service Worker for new versions in the background
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) reg.update().catch(() => {});
        });
      }

      await Promise.all([
        loadAllData(),
        sessionUser ? syncCurrentUserAvatar(sessionUser) : Promise.resolve(""),
      ]);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Register Service Worker in the browser with auto-update handling
    let handleControllerChange: (() => void) | null = null;
    let handleVisibilityChange: (() => void) | null = null;

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);

          // Proactively check for updates immediately on launch
          reg.update().catch((err) => console.log("[PWA] SW update check:", err));

          // Listen for new worker installation and force activation
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[PWA] New update installed -> requesting skip waiting");
                  installingWorker.postMessage({ type: "SKIP_WAITING" });
                }
              };
            }
          };
        })
        .catch((err) => console.warn("[PWA] Service Worker registration failed:", err));

      // Reload smoothly when new service worker takes over control
      let refreshing = false;
      handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          console.log("[PWA] New controller active -> auto refreshing to latest version");
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

      // Check for updates when app is resumed from background or screen unlocked
      handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          navigator.serviceWorker.getRegistration().then((reg) => {
            if (reg) reg.update().catch(() => {});
          });
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleVisibilityChange);
    }

    // Detect iOS devices
    const isIOSDevice =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (
      isIOSDevice &&
      typeof window !== "undefined" &&
      !window.matchMedia("(display-mode: standalone)").matches
    ) {
      setShowInstallBtn(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (handleControllerChange && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      }
      if (handleVisibilityChange) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleVisibilityChange);
      }
    };
  }, []);

  // Dynamic theme-color / status bar sync per tab / role
  useEffect(() => {
    if (typeof document === "undefined") return;

    const targetColor =
      sessionRole === "orang tua"
        ? "#ffffff"
        : activeTab === "dashboard" ||
          activeTab === "profile" ||
          activeTab === "daftar_hadir" ||
          activeTab === "pelatih" ||
          activeTab === "keuangan"
        ? "#1d4ed8"
        : "#f8fafc";

    const existingMetas = document.querySelectorAll('meta[name="theme-color"]');
    if (existingMetas.length > 0) {
      existingMetas.forEach((meta) => meta.setAttribute("content", targetColor));
    } else {
      const newMeta = document.createElement("meta");
      newMeta.name = "theme-color";
      newMeta.content = targetColor;
      document.head.appendChild(newMeta);
    }

    const msMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (msMeta) msMeta.setAttribute("content", targetColor);
  }, [activeTab, sessionRole]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSPrompt(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install choice: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // Authenticate user session on mount & fetch real DB data
  useEffect(() => {
    setMounted(true);
    const user = localStorage.getItem("gim_swimming_user");
    const role = localStorage.getItem("gim_swimming_role");
    const token = localStorage.getItem("gim_swimming_token");

    if (user && role) {
      setSessionUser(user);
      setSessionRole(role.toLowerCase().trim());
      loadAllData();

      // Verify token with backend & synchronize avatar from database if token exists
      if (token) {
        fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })
          .then((res) => {
            if (!res.ok) {
              console.warn("Session check returned status:", res.status);
              return null;
            }
            return res.json();
          })
          .then((resp) => {
            if (!resp) return;
            const userData = resp?.data?.user || resp?.data;
            if (userData) {
              const uname = userData.username || user;
              if (userData.avatar !== undefined) {
                if (userData.avatar) {
                  localStorage.setItem(`gim_avatar_${uname}`, userData.avatar);
                } else {
                  localStorage.removeItem(`gim_avatar_${uname}`);
                }
                window.dispatchEvent(new Event("avatar_updated"));
              }
            }
          })
          .catch((err) => {
            console.warn("Backend auth token check warning:", err);
          });
      }
    }
  }, [loadAllData]);

  // RBAC Access Helper
  const hasAccess = (tabName: string): boolean => {
    const normalizedRole = (sessionRole || "").toLowerCase().trim();
    if (!normalizedRole) return false;

    const accessMatrix: Record<string, string[]> = {
      dashboard: ["admin", "pelatih"],
      jadwal: ["admin", "pelatih"],
      keuangan: ["admin"],
      daftar_hadir: ["admin", "pelatih"],
      pelatih: ["admin", "pelatih"],
      absensi: ["admin", "pelatih"],
      kehadiran: ["admin", "pelatih"],
      create: ["admin"],
      profile: ["admin", "pelatih"],
    };

    return accessMatrix[tabName]?.includes(normalizedRole) || false;
  };

  // Dynamic Navigation Items with mobile-friendly short labels (Admin & Pelatih)
  const navItems: NavItem[] = [
    { id: "dashboard", label: "Overview", fullLabel: "Dashboard Overview", icon: "📊" },
    { id: "jadwal", label: "Jadwal", fullLabel: "Jadwal Les Renang", icon: "📅" },
    { id: "keuangan", label: "Keuangan", fullLabel: "Laporan Keuangan", icon: "💰" },
    { id: "daftar_hadir", label: "Siswa", fullLabel: "Daftar Hadir Siswa", icon: "📋" },
    { id: "pelatih", label: "Pelatih", fullLabel: "Daftar Pelatih & Instruktur", icon: "🏊‍♂️" },
    { id: "absensi", label: "Absensi", fullLabel: "Input Absensi Harian", icon: "⏱️" },
    { id: "create", label: "Registrasi", fullLabel: "Registrasi Pelatih/Siswa", icon: "👤+" },
    { id: "profile", label: "Profil", fullLabel: "Profil Akun", icon: "👤" },
  ].filter((item) => hasAccess(item.id));

  // Handler: Add Schedule to PostgreSQL DB
  const handleAddSchedule = async (data: Omit<ScheduleSession, "id">) => {
    try {
      const created = await createSchedule(data);
      if (created) {
        setSchedules((prev) => [created, ...prev]);
      }
    } catch (err) {
      console.error("Failed to add schedule:", err);
    }
  };

  // Handler: Update Schedule in PostgreSQL DB
  const handleUpdateSchedule = async (id: string, data: Partial<ScheduleSession>) => {
    try {
      const updated = await updateSchedule(id, data);
      if (updated) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
        );
      }
    } catch (err: any) {
      console.warn("Update schedule API warning:", err);
      // Optimistic state update so user UI works immediately
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id ? ({ ...s, ...data } as ScheduleSession) : s
        )
      );
    }
  };

  // Handler: Delete Schedule from PostgreSQL DB
  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete schedule:", err);
    }
  };

  // Handler: Add Student to PostgreSQL DB
  const handleAddSiswaSubmit = async (data: {
    name: string;
    age: string;
    parent: string;
    phone: string;
    class: string;
  }) => {
    if (!data.name || !data.parent || !data.phone) {
      return;
    }

    try {
      const created = await createStudent(data);
      if (created) {
        // Refresh students and invoices from DB
        const [updatedStudents, updatedInvoices] = await Promise.all([
          fetchStudents(),
          fetchInvoices(),
        ]);
        setStudents(updatedStudents);
        setInvoices(updatedInvoices);
      }
    } catch (err) {
      console.error("Failed to add student:", err);
    }
  };

  // Handler: Add Coach to PostgreSQL DB
  const handleAddPelatihSubmit = async (data: {
    name: string;
    spec: string;
    phone: string;
    email: string;
    class: string;
  }) => {
    if (!data.name || !data.phone || !data.email) {
      return;
    }

    try {
      const created = await createCoach(data);
      if (created) {
        const updatedCoaches = await fetchCoaches();
        setCoaches(updatedCoaches);
      }
    } catch (err) {
      console.error("Failed to add coach:", err);
    }
  };

  // Handler: Submit Bulk Attendance to PostgreSQL DB
  const handleAbsensiSubmit = async (
    className: string,
    attendanceMap: Record<string, "Hadir" | "Sakit" | "Izin" | "Alpa">
  ) => {
    try {
      const today = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      await submitBulkAttendance({
        class: className,
        date: today,
        attendanceMap,
      });

      // Refresh students to reflect updated attendance rate and logs
      const updatedStudents = await fetchStudents();
      setStudents(updatedStudents);
    } catch (err) {
      console.error("Failed to submit bulk attendance:", err);
    }
  };

  // Handler: Upload tuition receipt (Orang Tua view) to PostgreSQL DB
  const handleParentUploadReceipt = async (invoiceId: string) => {
    try {
      await uploadInvoiceReceipt(invoiceId, "bukti_tf_ortu_rian.jpg");
      const updatedInvoices = await fetchInvoices();
      setInvoices(updatedInvoices);
    } catch (err) {
      console.error("Failed to upload receipt:", err);
    }
  };

  // Handler: Confirm tuition receipt (Admin view) to PostgreSQL DB
  const handleAdminVerifyPayment = async (invoiceId: string, confirm: boolean) => {
    try {
      await verifyInvoicePayment(invoiceId, confirm);
      const updatedInvoices = await fetchInvoices();
      setInvoices(updatedInvoices);
    } catch (err) {
      console.error("Failed to verify payment:", err);
    }
  };

  // Handler: Check-in attendance with GPS and Time validation
  const handleCheckInAttendance = async (payload: CheckInInput): Promise<boolean | void> => {
    try {
      const res = await checkInAttendance(payload);
      if (res) {
        // Refresh attendances, notifications, students, and schedules (for session notes sync)
        const [updatedAttendances, updatedNotifs, updatedStudents, updatedSchedules] = await Promise.all([
          fetchAttendances(),
          fetchNotifications(),
          fetchStudents(),
          fetchSchedules(),
        ]);
        setAttendances(updatedAttendances);
        setNotifications(updatedNotifs);
        setStudents(updatedStudents);
        setSchedules(updatedSchedules);
        return true;
      }
    } catch (err: any) {
      console.error("Check-in error:", err);
      throw err;
    }
  };

  // Handler: Mark notification as read
  const handleMarkNotificationRead = async (id: number | string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Mark notification read error:", err);
    }
  };

  // Handler: Clear all notifications
  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
    } catch (err) {
      console.error("Clear notifications error:", err);
    }
  };

  if (!mounted || !sessionUser) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <div className="flex flex-col items-center justify-center space-y-4 max-w-sm text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="GIM Swimming Logo"
            className="h-20 w-20 object-contain animate-float-movement drop-shadow-md"
          />
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">GIM SWIMMING</h2>
            <p className="text-xs text-slate-400 mt-1">Memuat data aplikasi...</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="mt-2 text-xs font-bold text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-4 py-2 rounded-xl transition cursor-pointer"
          >
            ← Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // ORANG TUA (PARENT) VIEW: All-in-One Dashboard Page
  // ==========================================
  if (sessionRole === "orang tua") {
    // Dynamically find student matching the logged in username or parent name
    const normalizedUser = sessionUser.toLowerCase();
    const currentStudent =
      students.find(
        (s) =>
          s.name.toLowerCase().includes(normalizedUser) ||
          s.parent.toLowerCase().includes(normalizedUser) ||
          (normalizedUser === "ortu" && s.name.toLowerCase() === "rian")
      ) || students[0];

    const currentInvoice =
      invoices.find(
        (i) =>
          i.studentId === String(currentStudent?.id) ||
          i.name.toLowerCase() === currentStudent?.name.toLowerCase()
      ) || invoices[0];

    const coachData =
      coaches.find((c) => c.class === (currentStudent?.class || "Beginner")) || coaches[0];

    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-10 flex flex-col">
        {currentStudent ? (
          <PullToRefresh onRefresh={handlePullRefresh} className="flex-1">
            <ParentBody
              sessionUser={sessionUser}
              sessionRole={sessionRole}
              student={currentStudent}
              coach={coachData}
              invoice={currentInvoice}
              schedules={schedules}
              coaches={coaches}
              attendances={attendances}
              notifications={notifications}
              onUploadReceipt={handleParentUploadReceipt}
              onCheckInAttendance={handleCheckInAttendance}
              onMarkNotificationRead={handleMarkNotificationRead}
              onClearAllNotifications={handleClearAllNotifications}
              showInstallBtn={showInstallBtn}
              onInstallClick={handleInstallClick}
              onLogout={handleLogout}
              onRefresh={handlePullRefresh}
            />
          </PullToRefresh>
        ) : (
          <div className="flex-1" />
        )}

        <IOSInstallModal
          isOpen={showIOSPrompt}
          onClose={() => setShowIOSPrompt(false)}
        />

        {/* Centered Floating Loading Screen Overlay during Initial Load or Refresh */}
        {(isRefreshing || loadingData) && (
          <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[3px] pointer-events-none transition-all duration-300 animate-fadeIn">
            <div className="flex flex-col items-center justify-center space-y-3 scale-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.png"
                alt="Loading"
                className="h-20 w-20 sm:h-24 sm:w-24 object-contain animate-float-movement drop-shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Tab Title for Desktop Header
  const currentTabItem = navItems.find((item) => item.id === activeTab);
  const currentTabTitle = currentTabItem?.fullLabel || currentTabItem?.label || "Dashboard";

  // ==========================================
  // ADMIN & PELATIH (COACH) VIEW: Sidebar layout
  // ==========================================
  return (
    <div
      className={`flex h-screen h-[100dvh] w-full ${
        activeTab === "dashboard" ||
        activeTab === "profile" ||
        activeTab === "daftar_hadir" ||
        activeTab === "pelatih"
          ? "bg-[#1d4ed8]"
          : "bg-[#f8fafc]"
      } md:bg-[#f8fafc] overflow-hidden text-slate-800 font-sans`}
    >
      <DesktopSidebar
        navItems={navItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sessionUser={sessionUser}
        sessionRole={sessionRole}
        onLogout={handleLogout}
      />

      <MobileBottomNav
        navItems={navItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sessionUser={sessionUser}
        sessionRole={sessionRole}
        onLogout={handleLogout}
      />

      <main
        className={`flex-1 flex flex-col h-full overflow-hidden min-w-0 ${
          activeTab === "dashboard" ||
          activeTab === "profile" ||
          activeTab === "daftar_hadir" ||
          activeTab === "pelatih"
            ? "bg-[#1d4ed8]"
            : "bg-[#f8fafc]"
        } md:bg-[#f8fafc]`}
      >
        {/* Desktop Admin Header for tabs without integrated banner */}
        {activeTab !== "dashboard" &&
          activeTab !== "profile" &&
          activeTab !== "daftar_hadir" &&
          activeTab !== "pelatih" &&
          activeTab !== "keuangan" && (
          <div className="hidden md:block shrink-0">
            <AdminHeader
              title={currentTabTitle}
              sessionRole={sessionRole}
              showInstallBtn={showInstallBtn}
              onInstallClick={handleInstallClick}
              onLogout={handleLogout}
              onRefresh={handlePullRefresh}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0 min-w-0">
          <AppsBody
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            sessionUser={sessionUser}
            sessionRole={sessionRole}
            students={students}
            coaches={coaches}
            invoices={invoices}
            schedules={schedules}
            attendances={attendances}
            notifications={notifications}
            showInstallBtn={showInstallBtn}
            onInstallClick={handleInstallClick}
            onLogout={handleLogout}
            onRefresh={handlePullRefresh}
            onAddSchedule={handleAddSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onVerifyPayment={handleAdminVerifyPayment}
            onCheckInAttendance={handleCheckInAttendance}
            onMarkNotificationRead={handleMarkNotificationRead}
            onClearAllNotifications={handleClearAllNotifications}
            onSubmitAttendance={handleAbsensiSubmit}
            onAddStudent={handleAddSiswaSubmit}
            onAddCoach={handleAddPelatihSubmit}
          />
        </div>
      </main>

      <IOSInstallModal
        isOpen={showIOSPrompt}
        onClose={() => setShowIOSPrompt(false)}
      />

      {/* Centered Floating Loading Screen Overlay during Initial Load or Refresh */}
      {(isRefreshing || loadingData) && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[3px] pointer-events-none transition-all duration-300 animate-fadeIn">
          <div className="flex flex-col items-center justify-center space-y-3 scale-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.png"
              alt="Loading"
              className="h-20 w-20 sm:h-24 sm:w-24 object-contain animate-float-movement drop-shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
