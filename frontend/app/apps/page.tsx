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
  deleteSchedule,
  fetchInvoices,
  verifyInvoicePayment,
  uploadInvoiceReceipt,
  syncCurrentUserAvatar,
} from "../../lib/api";
import { Student, Coach, Invoice, ScheduleSession, NavItem } from "../../components/apps/types";
import ToastNotification from "../../components/apps/ToastNotification";
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

  // Floating Toast Notifications state
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // REAL DATABASE STATES (Loaded from PostgreSQL Backend)
  const [students, setStudents] = useState<Student[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSession[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  // Helper to show dynamic toasts
  const triggerToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3500);
  };

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
      const [fetchedStudents, fetchedCoaches, fetchedSchedules, fetchedInvoices] =
        await Promise.all([
          fetchStudents(),
          fetchCoaches(),
          fetchSchedules(),
          fetchInvoices(),
        ]);

      setStudents(fetchedStudents);
      setCoaches(fetchedCoaches);
      setSchedules(fetchedSchedules);
      setInvoices(fetchedInvoices);
    } catch (err) {
      console.error("Error fetching database data:", err);
      triggerToast("Gagal memuat data dari database", "error");
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Pull-to-refresh handler: reloads all database data and profile avatar
  const handlePullRefresh = async () => {
    const startTime = Date.now();
    try {
      setIsRefreshing(true);
      await Promise.all([
        loadAllData(),
        sessionUser ? syncCurrentUserAvatar(sessionUser) : Promise.resolve(""),
      ]);
      const elapsed = Date.now() - startTime;
      if (elapsed < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 5000 - elapsed));
      }
      triggerToast("Data terbaru berhasil dimuat dari database! ✨", "success");
    } catch (err) {
      console.error("Refresh error:", err);
      const elapsed = Date.now() - startTime;
      if (elapsed < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 5000 - elapsed));
      }
      triggerToast("Gagal memuat ulang data", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Register Service Worker in the browser
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("PWA Service Worker registered:", reg.scope))
        .catch((err) => console.warn("PWA Service Worker registration failed:", err));
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
    };
  }, []);

  // Dynamic theme-color / status bar sync per tab / role
  useEffect(() => {
    if (typeof document === "undefined") return;

    const targetColor =
      sessionRole === "orang tua"
        ? "#ffffff"
        : activeTab === "dashboard"
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
      absensi: ["admin", "pelatih"],
      create: ["admin"],
    };

    return accessMatrix[tabName]?.includes(normalizedRole) || false;
  };

  // Dynamic Navigation Items with mobile-friendly short labels (Admin & Pelatih)
  const navItems: NavItem[] = [
    { id: "dashboard", label: "Overview", fullLabel: "Dashboard Overview", icon: "📊" },
    { id: "jadwal", label: "Jadwal", fullLabel: "Jadwal Les Renang", icon: "📅" },
    { id: "keuangan", label: "Keuangan", fullLabel: "Laporan Keuangan", icon: "💰" },
    { id: "daftar_hadir", label: "Siswa", fullLabel: "Daftar Hadir Siswa", icon: "📋" },
    { id: "absensi", label: "Absensi", fullLabel: "Input Absensi Harian", icon: "⏱️" },
    { id: "create", label: "Registrasi", fullLabel: "Registrasi Pelatih/Siswa", icon: "👤+" },
  ].filter((item) => hasAccess(item.id));

  // Handler: Add Schedule to PostgreSQL DB
  const handleAddSchedule = async (data: Omit<ScheduleSession, "id">) => {
    try {
      const created = await createSchedule(data);
      if (created) {
        setSchedules((prev) => [created, ...prev]);
        triggerToast(
          `Jadwal "${created.title}" tanggal ${created.date} (${created.timeStart}-${created.timeEnd} WIB) berhasil disimpan di database!`
        );
      }
    } catch (err) {
      triggerToast("Gagal menyimpan jadwal ke database", "error");
    }
  };

  // Handler: Delete Schedule from PostgreSQL DB
  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      triggerToast("Jadwal latihan berhasil dihapus dari database.");
    } catch (err) {
      triggerToast("Gagal menghapus jadwal", "error");
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
      triggerToast("Silakan isi semua bidang wajib", "error");
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
        triggerToast(`Siswa "${created.name}" berhasil didaftarkan ke database!`);
      }
    } catch (err) {
      triggerToast("Gagal mendaftarkan siswa ke database", "error");
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
      triggerToast("Silakan isi semua bidang wajib", "error");
      return;
    }

    try {
      const created = await createCoach(data);
      if (created) {
        const updatedCoaches = await fetchCoaches();
        setCoaches(updatedCoaches);
        triggerToast(`Pelatih "${created.name}" berhasil didaftarkan ke database!`);
      }
    } catch (err) {
      triggerToast("Gagal mendaftarkan pelatih ke database", "error");
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
      triggerToast(`Absensi kelas "${className}" berhasil disimpan ke database!`);
    } catch (err) {
      triggerToast("Gagal menyimpan absensi", "error");
    }
  };

  // Handler: Upload tuition receipt (Orang Tua view) to PostgreSQL DB
  const handleParentUploadReceipt = async (invoiceId: string) => {
    try {
      await uploadInvoiceReceipt(invoiceId, "bukti_tf_ortu_rian.jpg");
      const updatedInvoices = await fetchInvoices();
      setInvoices(updatedInvoices);
      triggerToast("Bukti pembayaran SPP berhasil dikirim!");
    } catch (err) {
      triggerToast("Gagal mengunggah bukti pembayaran", "error");
    }
  };

  // Handler: Confirm tuition receipt (Admin view) to PostgreSQL DB
  const handleAdminVerifyPayment = async (invoiceId: string, confirm: boolean) => {
    try {
      await verifyInvoicePayment(invoiceId, confirm);
      const updatedInvoices = await fetchInvoices();
      setInvoices(updatedInvoices);
      triggerToast(
        confirm
          ? "Pembayaran terverifikasi! Status berubah menjadi Lunas di database."
          : "Pembayaran ditolak."
      );
    } catch (err) {
      triggerToast("Gagal memperbarui status pembayaran", "error");
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
        <ToastNotification message={toastMessage} type={toastType} />

        <ParentHeader
          sessionUser={sessionUser}
          sessionRole={sessionRole}
          showInstallBtn={showInstallBtn}
          onInstallClick={handleInstallClick}
          onLogout={handleLogout}
          onRefresh={handlePullRefresh}
        />

        {currentStudent ? (
          <PullToRefresh onRefresh={handlePullRefresh} className="flex-1">
            <ParentBody
              student={currentStudent}
              coach={coachData}
              invoice={currentInvoice}
              onUploadReceipt={handleParentUploadReceipt}
            />
          </PullToRefresh>
        ) : (
          <div className="p-8 text-center text-slate-400">Memuat data siswa dari database...</div>
        )}

        <IOSInstallModal
          isOpen={showIOSPrompt}
          onClose={() => setShowIOSPrompt(false)}
        />

        {/* Centered Floating Loading Screen Overlay during Refresh (tanpa background putih) */}
        {isRefreshing && (
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
        activeTab === "dashboard" ? "bg-[#1d4ed8]" : "bg-[#f8fafc]"
      } md:bg-[#f8fafc] overflow-hidden text-slate-800 font-sans`}
    >
      <ToastNotification message={toastMessage} type={toastType} />

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
          activeTab === "dashboard" ? "bg-[#1d4ed8]" : "bg-[#f8fafc]"
        } md:bg-[#f8fafc]`}
      >
        {/* Desktop Admin Header for non-dashboard tabs */}
        {activeTab !== "dashboard" && (
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
            onRefresh={handlePullRefresh}
            onAddSchedule={handleAddSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onVerifyPayment={handleAdminVerifyPayment}
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

      {/* Centered Floating Loading Screen Overlay during Refresh (tanpa background putih) */}
      {isRefreshing && (
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
