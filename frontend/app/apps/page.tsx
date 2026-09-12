"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  API_BASE_URL,
  getApiBaseUrl,
  fetchStudents,
  createStudent,
  updateStudent,
  updateStudentStatus,
  deleteStudent,
  submitBulkAttendance,
  fetchCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
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
  fetchFinancialTransactions,
  createFinancialTransaction,
  deleteFinancialTransaction,
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
  FinancialTransaction,
} from "../../components/apps/types";
import IOSInstallModal from "../../components/apps/IOSInstallModal";
import {
  playNotificationChime,
  triggerNotificationHaptic,
  showWebNotification,
  requestNotificationPermission,
} from "../../lib/notificationUtils";
import {
  subscribeToPushNotifications,
  updateAppBadge,
  clearAppBadge,
  sendTestPushToDevice,
} from "../../lib/pushNotifications";
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
  const [financialTransactions, setFinancialTransactions] = useState<FinancialTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time Notification State & Tracking Refs
  const knownNotificationIdsRef = useRef<Set<number>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("gim_swimming_user");
    localStorage.removeItem("gim_swimming_role");
    localStorage.removeItem("gim_swimming_token");
    setSessionUser("");
    setSessionRole("");
    router.replace("/?login=true");
  };

  // Load all real data from PostgreSQL Backend
  const loadAllData = useCallback(async (roleParam?: string, userParam?: string) => {
    try {
      setLoadingData(true);
      const role =
        roleParam ||
        sessionRole ||
        (typeof window !== "undefined"
          ? localStorage.getItem("gim_swimming_role") || ""
          : "");
      const user =
        userParam ||
        sessionUser ||
        (typeof window !== "undefined"
          ? localStorage.getItem("gim_swimming_user") || ""
          : "");

      const [
        fetchedStudents,
        fetchedCoaches,
        fetchedSchedules,
        fetchedInvoices,
        fetchedAttendances,
        fetchedFinancialTransactions,
      ] = await Promise.all([
        fetchStudents(),
        fetchCoaches(),
        fetchSchedules(),
        fetchInvoices(),
        fetchAttendances(),
        fetchFinancialTransactions(),
      ]);

      // If role is Orang Tua, find corresponding student name to accurately query notifications
      let queryName = user;
      if (role.toLowerCase().trim() === "orang tua") {
        const normalizedUser = user.toLowerCase();
        const matched = fetchedStudents.find(
          (s) =>
            s.name.toLowerCase().includes(normalizedUser) ||
            s.parent.toLowerCase().includes(normalizedUser) ||
            (normalizedUser === "ortu" && s.name.toLowerCase() === "rian")
        );
        if (matched) {
          queryName = matched.name;
        }
      }

      const fetchedNotifications = await fetchNotifications(role, queryName);

      // Seed known notifications set on initial load so we don't trigger toast for existing notifications
      fetchedNotifications.forEach((n) => knownNotificationIdsRef.current.add(n.id));
      initialLoadDoneRef.current = true;

      setStudents(fetchedStudents);
      setCoaches(fetchedCoaches);
      setSchedules(fetchedSchedules);
      setInvoices(fetchedInvoices);
      setAttendances(fetchedAttendances);
      setNotifications(fetchedNotifications);
      setFinancialTransactions(fetchedFinancialTransactions);
    } catch (err) {
      console.error("Error fetching database data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [sessionRole, sessionUser]);

  // Proactively request browser notification permission on mount if supported
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        requestNotificationPermission().catch(() => { });
      }
    }
  }, []);

  // Proactively register Web Push subscription with VAPID on login/mount
  useEffect(() => {
    if (!sessionRole || !sessionUser) return;

    let queryName = sessionUser;
    if (sessionRole.toLowerCase().trim() === "orang tua") {
      const normalizedUser = (sessionUser || "").toLowerCase();
      const matched = students.find(
        (s) =>
          s.name.toLowerCase().includes(normalizedUser) ||
          s.parent.toLowerCase().includes(normalizedUser) ||
          (normalizedUser === "ortu" && s.name.toLowerCase() === "rian")
      );
      if (matched) {
        queryName = matched.name;
      }
    }

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const subKey = `gim_push_synced_${sessionRole}_${sessionUser}_${queryName}`;
      if (sessionStorage.getItem(subKey) !== "true") {
        subscribeToPushNotifications({
          role: sessionRole,
          username: sessionUser,
          studentName: queryName,
          userPrompt: false,
        })
          .then((res) => {
            if (res.success) {
              sessionStorage.setItem(subKey, "true");
            }
          })
          .catch((err) => {
            console.debug("[WebPush] Auto-subscribe sync note:", err);
          });
      }
    }
  }, [sessionRole, sessionUser, students.length]);

  // Synchronize Native Mobile App Badge Count (e.g. icon badge on iOS/Android homescreen)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    updateAppBadge(unreadCount);
  }, [notifications]);

  // Real-time Service Worker Push Notification message listener
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_NOTIFICATION_RECEIVED") {
        const payload = event.data.payload || {};
        const title = payload.title || "GIM Swimming Club";
        const body = payload.body || payload.message || "";
        const data = payload.data || {};
        const unreadCount = event.data.unread_count !== undefined ? Number(event.data.unread_count) : 1;

        // Audio chime & haptic feedback
        playNotificationChime();
        triggerNotificationHaptic();

        // Update homescreen app badge count immediately
        updateAppBadge(unreadCount);

        // Reload data from backend in background to keep UI fresh
        loadAllData();
      } else if (event.data?.type === "NOTIFICATION_CLICKED") {
        const payload = event.data.payload || {};
        if (payload.role === "orang tua" || sessionRole === "orang tua") {
          window.dispatchEvent(new CustomEvent("parent_switch_tab", { detail: "jadwal" }));
        } else if (payload.tab) {
          setActiveTab(payload.tab);
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleSwMessage);
    };
  }, [loadAllData, sessionRole]);

  // Background idle polling: checks for new notifications silently every 3.5s without manual refresh
  useEffect(() => {
    if (!sessionRole && !sessionUser) return;

    let isSubscribed = true;

    const performSilentPoll = async () => {
      try {
        const role = sessionRole;
        let queryName = sessionUser;

        if (role.toLowerCase().trim() === "orang tua") {
          const normalizedUser = (sessionUser || "").toLowerCase();
          const matched = students.find(
            (s) =>
              s.name.toLowerCase().includes(normalizedUser) ||
              s.parent.toLowerCase().includes(normalizedUser) ||
              (normalizedUser === "ortu" && s.name.toLowerCase() === "rian")
          );
          if (matched) {
            queryName = matched.name;
          }
        }

        const latestNotifications = await fetchNotifications(role, queryName);
        if (!isSubscribed) return;

        // Seed initial notifications if not already seeded
        if (!initialLoadDoneRef.current) {
          latestNotifications.forEach((n) => knownNotificationIdsRef.current.add(n.id));
          initialLoadDoneRef.current = true;
          setNotifications(latestNotifications);
          return;
        }

        // Detect any new unread notification that arrived while the user was idle
        const newUnreadItems = latestNotifications.filter(
          (n) => !n.is_read && !knownNotificationIdsRef.current.has(n.id)
        );

        if (newUnreadItems.length > 0) {
          // Add newly discovered notification IDs to known set
          newUnreadItems.forEach((n) => knownNotificationIdsRef.current.add(n.id));
          latestNotifications.forEach((n) => knownNotificationIdsRef.current.add(n.id));

          // Update notifications state immediately
          setNotifications(latestNotifications);

          // Sound chime & haptic feedback
          playNotificationChime();
          triggerNotificationHaptic();

          // Native browser Web Notification
          const newest = newUnreadItems[0];
          if (newest) {
            showWebNotification(newest.title, {
              body: newest.message,
              icon: "/icon.png",
            });
          }

          // Check if schedules or attendances need silent sync in the background
          const hasScheduleUpdate = newUnreadItems.some(
            (n) =>
              n.type?.includes("schedule") ||
              n.title?.toLowerCase().includes("jadwal") ||
              n.message?.toLowerCase().includes("jadwal")
          );
          const hasAttendanceUpdate = newUnreadItems.some(
            (n) =>
              n.type?.includes("attendance") ||
              n.title?.toLowerCase().includes("hadir") ||
              n.title?.toLowerCase().includes("absen")
          );

          if (hasScheduleUpdate) {
            fetchSchedules()
              .then((updatedSchedules) => {
                if (isSubscribed && updatedSchedules) {
                  setSchedules(updatedSchedules);
                }
              })
              .catch(() => { });
          }

          if (hasAttendanceUpdate) {
            fetchAttendances()
              .then((updatedAttendances) => {
                if (isSubscribed && updatedAttendances) {
                  setAttendances(updatedAttendances);
                }
              })
              .catch(() => { });
          }
        } else {
          // Sync read status or deleted items smoothly without flickering
          setNotifications((prev) => {
            if (
              prev.length === latestNotifications.length &&
              prev.every(
                (p, idx) =>
                  p.id === latestNotifications[idx]?.id &&
                  p.is_read === latestNotifications[idx]?.is_read
              )
            ) {
              return prev;
            }
            return latestNotifications;
          });
        }
      } catch (err) {
        // Silent error handling for background polling
      }
    };

    // Polling interval: every 3.5s while idle
    const intervalId = setInterval(performSilentPoll, 3500);

    // Immediate poll when tab becomes active / focused / screen unlocked
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        performSilentPoll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [sessionRole, sessionUser, students]);

  // Pull-to-refresh handler: reloads all database data and profile avatar + checks SW updates
  const handlePullRefresh = async () => {
    try {
      setIsRefreshing(true);

      // Check Service Worker for new versions in the background
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) reg.update().catch(() => { });
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

      // Log when new service worker takes over control without interrupting active user session
      handleControllerChange = () => {
        console.log("[PWA] New Service Worker controller is now active.");
      };
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

      // Check for updates when app is resumed from background or screen unlocked
      handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          navigator.serviceWorker.getRegistration().then((reg) => {
            if (reg) reg.update().catch(() => { });
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
          activeTab === "keuangan" ||
          activeTab === "create" ||
          activeTab === "pengumuman"
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
    const user = typeof window !== "undefined" ? localStorage.getItem("gim_swimming_user") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("gim_swimming_role") : null;
    const token = typeof window !== "undefined" ? localStorage.getItem("gim_swimming_token") : null;

    if (!user || !role) {
      // If cache/session is null (e.g. after iOS update, fresh install, or logout),
      // redirect immediately to landing page with login modal open instead of showing a blank screen.
      router.replace("/?login=true");
      return;
    }

    setSessionUser(user);
    const normalizedRole = role.toLowerCase().trim();
    setSessionRole(normalizedRole);
    loadAllData(normalizedRole, user);

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
            if (res.status === 401) {
              handleLogout();
            }
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
  }, [loadAllData, router]);

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
      pengumuman: ["admin", "pelatih"],
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
    { id: "pengumuman", label: "Pengumuman", fullLabel: "Pusat Pengumuman", icon: "📢" },
    { id: "create", label: "Registrasi", fullLabel: "Registrasi Pelatih/Siswa", icon: "👤+" },
    { id: "profile", label: "Profil", fullLabel: "Profil Akun", icon: "👤" },
  ].filter((item) => hasAccess(item.id));

  // Handler: Add Schedule to PostgreSQL DB
  const handleAddSchedule = async (data: Omit<ScheduleSession, "id">) => {
    try {
      const created = await createSchedule(data);
      if (created) {
        setSchedules((prev) => [created, ...prev]);
        // Refresh notifications immediately so new targeted schedule notification appears right away
        const notifs = await fetchNotifications(sessionRole, sessionUser);
        setNotifications(notifs);
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
        const notifs = await fetchNotifications(sessionRole, sessionUser);
        setNotifications(notifs);
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
    coach_id?: string;
    coach_name?: string;
    coachId?: string;
    coachName?: string;
    [key: string]: any;
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

  // Handler: Update Student Membership Status (Active / Inactive)
  const handleUpdateStudentStatus = async (studentId: string, status: string) => {
    try {
      await updateStudentStatus(studentId, status);
      const updatedStudents = await fetchStudents();
      setStudents(updatedStudents);
    } catch (err) {
      console.error("Failed to update student status:", err);
      throw err;
    }
  };

  // Handler: Update Full Student Profile Details (Admin)
  const handleUpdateStudent = async (studentId: string, data: Partial<Student>) => {
    try {
      await updateStudent(studentId, data);
      const updatedStudents = await fetchStudents();
      setStudents(updatedStudents);
    } catch (err) {
      console.error("Failed to update student profile:", err);
      throw err;
    }
  };

  // Handler: Delete Student (Admin)
  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
      const updatedStudents = await fetchStudents();
      setStudents(updatedStudents);
    } catch (err) {
      console.error("Failed to delete student:", err);
      throw err;
    }
  };

  // Handler: Delete Coach (Admin)
  const handleDeleteCoach = async (coachId: string) => {
    try {
      await deleteCoach(coachId);
      const updatedCoaches = await fetchCoaches();
      setCoaches(updatedCoaches);
    } catch (err) {
      console.error("Failed to delete coach:", err);
      throw err;
    }
  };

  // Handler: Update Coach (Admin)
  const handleUpdateCoach = async (
    coachId: string,
    data: {
      name: string;
      spec?: string;
      phone: string;
      email: string;
      class: string;
      avatar?: string;
      pay_per_session?: number;
    }
  ) => {
    try {
      const updated = await updateCoach(coachId, data);
      if (updated) {
        const updatedCoaches = await fetchCoaches();
        setCoaches(updatedCoaches);
      }
    } catch (err) {
      console.error("Failed to update coach:", err);
      throw err;
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
      const [updatedInvoices, updatedTransactions] = await Promise.all([
        fetchInvoices(),
        fetchFinancialTransactions(),
      ]);
      setInvoices(updatedInvoices);
      setFinancialTransactions(updatedTransactions);
    } catch (err) {
      console.error("Failed to verify payment:", err);
    }
  };

  // Handler: Create manual income / expense transaction (Admin view) to PostgreSQL DB
  const handleAddFinancialTransaction = async (data: {
    type: "income" | "expense";
    category: string;
    title: string;
    amount: number;
    date: string;
    notes?: string;
  }) => {
    try {
      const created = await createFinancialTransaction(data);
      if (created) {
        const updated = await fetchFinancialTransactions();
        setFinancialTransactions(updated);
      }
    } catch (err) {
      console.error("Failed to create financial transaction:", err);
      throw err;
    }
  };

  // Handler: Delete financial transaction (Admin view) from PostgreSQL DB
  const handleDeleteFinancialTransaction = async (id: string) => {
    try {
      const success = await deleteFinancialTransaction(id);
      if (success) {
        const updated = await fetchFinancialTransactions();
        setFinancialTransactions(updated);
      }
    } catch (err) {
      console.error("Failed to delete financial transaction:", err);
      throw err;
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
          fetchNotifications(sessionRole, sessionUser),
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
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        const unreadCount = next.filter((n) => !n.is_read).length;
        updateAppBadge(unreadCount);
        return next;
      });
    } catch (err) {
      console.error("Mark notification read error:", err);
    }
  };



  // Handler: Clear all notifications
  const handleClearAllNotifications = async () => {
    try {
      let queryName = sessionUser;
      if (sessionRole.toLowerCase().trim() === "orang tua") {
        const normalizedUser = (sessionUser || "").toLowerCase();
        const matched = students.find(
          (s) =>
            s.name.toLowerCase().includes(normalizedUser) ||
            s.parent.toLowerCase().includes(normalizedUser) ||
            (normalizedUser === "ortu" && s.name.toLowerCase() === "rian")
        );
        if (matched) {
          queryName = matched.name;
        }
      }

      await clearAllNotifications(sessionRole, queryName);
      setNotifications([]);
      clearAppBadge();
    } catch (err) {
      console.error("Clear notifications error:", err);
    }
  };

  if (!mounted || !sessionUser) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#061827] text-white">
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="GIM Swimming"
            className="h-20 w-20 object-contain drop-shadow-2xl animate-float-movement"
          />
          <div className="flex items-center space-x-2 text-cyan-400">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-semibold tracking-wider uppercase text-cyan-200">
              Memeriksa Sesi Pengguna...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ORANG TUA (PARENT) VIEW: All-in-One Dashboard Page
  // ==========================================
  if (sessionRole === "orang tua") {
    // Dynamically find student matching the logged in username or parent name with instant fallback
    const normalizedUser = (sessionUser || "").toLowerCase();

    const defaultStudent: Student = {
      id: "1",
      name: sessionUser && sessionUser !== "ortu" ? sessionUser : "Rian",
      class: "Prestasi",
      attendanceRate: "100%",
      parent: sessionUser || "Wali Murid",
      phone: "081234567890",
      age: "7 Tahun",
      status: "Active",
      logs: [],
    };

    const currentStudent: Student =
      students.find(
        (s) =>
          s.name.toLowerCase().includes(normalizedUser) ||
          s.parent.toLowerCase().includes(normalizedUser) ||
          (normalizedUser === "ortu" && s.name.toLowerCase() === "rian")
      ) ||
      students[0] ||
      defaultStudent;

    const defaultCoach: Coach = {
      id: "1",
      name: "Pelatih Utama",
      spec: "Instruktur Renang",
      phone: "081234567890",
      email: "coach@gimswimming.com",
      class: currentStudent?.class || "Prestasi",
    };

    const coachData: Coach =
      coaches.find((c) => c.class === (currentStudent?.class || "Prestasi")) ||
      coaches[0] ||
      defaultCoach;

    const defaultInvoice: Invoice = {
      id: "1",
      studentId: currentStudent.id,
      name: currentStudent.name,
      amount: 450000,
      desc: "SPP Bulanan Renang",
      status: "Lunas",
      uploadReceipt: null,
    };

    const currentInvoice: Invoice =
      invoices.find(
        (i) =>
          i.studentId === String(currentStudent?.id) ||
          i.name.toLowerCase() === currentStudent?.name.toLowerCase()
      ) ||
      invoices[0] ||
      defaultInvoice;

    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-10 flex flex-col">
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

        <IOSInstallModal
          isOpen={showIOSPrompt}
          onClose={() => setShowIOSPrompt(false)}
        />

        {/* Centered Floating Loading Screen Overlay only during Pull-to-Refresh */}
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
      className="flex h-screen h-[100dvh] w-full bg-[#f8fafc] overflow-hidden text-slate-800 font-sans"
    >
      <DesktopSidebar
        navItems={navItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sessionUser={sessionUser}
        sessionRole={sessionRole}
        notifications={notifications}
        onLogout={handleLogout}
      />

      <MobileBottomNav
        navItems={navItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sessionUser={sessionUser}
        sessionRole={sessionRole}
        notifications={notifications}
        onLogout={handleLogout}
      />

      <main
        className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#f8fafc]"
      >
        {/* Desktop Admin Header for tabs without integrated banner */}
        {activeTab !== "dashboard" &&
          activeTab !== "profile" &&
          activeTab !== "daftar_hadir" &&
          activeTab !== "pelatih" &&
          activeTab !== "keuangan" &&
          activeTab !== "pengumuman" && (
            <div className="hidden md:block shrink-0">
              <AdminHeader
                title={currentTabTitle}
                sessionRole={sessionRole}
                showInstallBtn={showInstallBtn}
                onInstallClick={handleInstallClick}
                onLogout={handleLogout}
                onRefresh={handlePullRefresh}
                notifications={notifications}
                onMarkNotificationRead={handleMarkNotificationRead}
                onClearAllNotifications={handleClearAllNotifications}
                setActiveTab={setActiveTab}
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
            onUpdateStudentStatus={handleUpdateStudentStatus}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddStudent={handleAddSiswaSubmit}
            onAddCoach={handleAddPelatihSubmit}
            onUpdateCoach={handleUpdateCoach}
            onDeleteCoach={handleDeleteCoach}
            financialTransactions={financialTransactions}
            onAddFinancialTransaction={handleAddFinancialTransaction}
            onDeleteFinancialTransaction={handleDeleteFinancialTransaction}
          />
        </div>
      </main>

      <IOSInstallModal
        isOpen={showIOSPrompt}
        onClose={() => setShowIOSPrompt(false)}
      />

      {/* Centered Floating Loading Screen Overlay only during Pull-to-Refresh */}
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
