"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../../lib/api";

// Interface Definitions
interface AttendanceLog {
  date: string;
  status: "Hadir" | "Sakit" | "Izin" | "Alpa";
}

interface Student {
  id: string;
  name: string;
  class: string;
  attendanceRate: string;
  parent: string;
  status: string;
  logs: AttendanceLog[];
}

interface Coach {
  id: string;
  name: string;
  spec: string;
  phone: string;
  email: string;
  class: string;
}

interface Invoice {
  id: string;
  studentId: string;
  name: string;
  amount: number;
  desc: string;
  status: "Belum Dibayar" | "Menunggu Konfirmasi" | "Lunas";
  uploadReceipt: string | null;
}

export default function AppsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sessionUser, setSessionUser] = useState("");
  const [sessionRole, setSessionRole] = useState("");

  // Navigation tab state (for Admin & Pelatih only)
  const [activeTab, setActiveTab] = useState("dashboard");

  // Mobile sidebar drawer state (for Admin & Pelatih only)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Parent view interactive state
  const [showParentHistory, setShowParentHistory] = useState(false);

  // Floating Toast Notifications state
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // IN-MEMORY DATABASE STATES (Shared across panels)
  const [students, setStudents] = useState<Student[]>([
    {
      id: "s1",
      name: "Rian",
      class: "Beginner",
      attendanceRate: "80%",
      parent: "Bambang",
      status: "Active",
      logs: [
        { date: "24 Aug 2026", status: "Hadir" },
        { date: "21 Aug 2026", status: "Hadir" },
        { date: "17 Aug 2026", status: "Hadir" },
        { date: "14 Aug 2026", status: "Izin" },
        { date: "10 Aug 2026", status: "Alpa" },
      ]
    },
    {
      id: "s2",
      name: "Budi",
      class: "Kids Swimming",
      attendanceRate: "100%",
      parent: "Agus",
      status: "Active",
      logs: [
        { date: "24 Aug 2026", status: "Hadir" },
        { date: "21 Aug 2026", status: "Hadir" },
      ]
    },
    {
      id: "s3",
      name: "Siti",
      class: "Private Class",
      attendanceRate: "50%",
      parent: "Dewi",
      status: "Active",
      logs: [
        { date: "24 Aug 2026", status: "Hadir" },
        { date: "21 Aug 2026", status: "Sakit" },
      ]
    }
  ]);

  const [coaches, setCoaches] = useState<Coach[]>([
    { id: "c1", name: "Coach Adi", spec: "Gaya Bebas / Dada", phone: "085353333220", email: "adi@gimswimming.com", class: "Beginner" },
    { id: "c2", name: "Coach Linda", spec: "Kids Coach Specialist", phone: "08123456780", email: "linda@gimswimming.com", class: "Kids Swimming" },
  ]);

  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: "inv1", studentId: "s1", name: "Rian", amount: 500000, desc: "SPP Agustus 2026", status: "Belum Dibayar", uploadReceipt: null },
    { id: "inv2", studentId: "s2", name: "Budi", amount: 500000, desc: "SPP Agustus 2026", status: "Lunas", uploadReceipt: "bukti_spp_budi.jpg" },
    { id: "inv3", studentId: "s3", name: "Siti", amount: 650000, desc: "SPP Agustus 2026", status: "Belum Dibayar", uploadReceipt: null },
  ]);

  // Form states
  const [formSiswa, setFormSiswa] = useState({ name: "", age: "", parent: "", phone: "", class: "Beginner" });
  const [formPelatih, setFormPelatih] = useState({ name: "", spec: "", phone: "", email: "", class: "Beginner" });
  const [formAbsensi, setFormAbsensi] = useState<Record<string, "Hadir" | "Sakit" | "Izin" | "Alpa">>({});
  const [absensiClass, setAbsensiClass] = useState("Beginner");

  // Selected student details popup
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<Student | null>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Register Service Worker in the browser
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("PWA Service Worker registered:", reg.scope))
        .catch((err) => console.warn("PWA Service Worker registration failed:", err));
    }

    // Detect iOS devices
    const isIOSDevice = typeof navigator !== "undefined" && 
      /iPad|iPhone|iPod/.test(navigator.userAgent) && 
      !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice && typeof window !== "undefined" && !window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallBtn(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default installation popup
      e.preventDefault();
      // Store event
      setDeferredPrompt(e);
      // Display install button
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If already running in standalone PWA mode, hide the install button
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

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

  // Authenticate user session on mount
  useEffect(() => {
    setMounted(true);
    const user = localStorage.getItem("gim_swimming_user");
    const role = localStorage.getItem("gim_swimming_role");
    const token = localStorage.getItem("gim_swimming_token");

    if (user && role && token) {
      setSessionUser(user);
      setSessionRole(role.toLowerCase());

      // Verify token with backend
      fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Sesi tidak valid");
          }
          return res.json();
        })
        .catch((err) => {
          console.warn("Auth token check failed, logging out:", err);
          handleLogout();
        });
    } else {
      router.push("/");
    }
  }, [router]);

  // Helper to show dynamic toasts
  const triggerToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem("gim_swimming_user");
    localStorage.removeItem("gim_swimming_role");
    localStorage.removeItem("gim_swimming_token");
    router.push("/");
  };

  // RBAC Access Helper
  const hasAccess = (tabName: string): boolean => {
    if (!sessionRole) return false;

    // Module permissions matrix
    const accessMatrix: Record<string, string[]> = {
      dashboard: ["admin", "pelatih"],
      keuangan: ["admin"],
      daftar_hadir: ["admin", "pelatih"],
      absensi: ["admin", "pelatih"],
      create: ["admin"],
    };

    return accessMatrix[tabName]?.includes(sessionRole) || false;
  };

  // Dynamic Navigation Items with mobile-friendly short labels (Admin & Pelatih)
  const navItems = [
    { id: "dashboard", label: "Overview", fullLabel: "Dashboard Overview", icon: "📊" },
    { id: "keuangan", label: "Keuangan", fullLabel: "Laporan Keuangan", icon: "💰" },
    { id: "daftar_hadir", label: "Siswa", fullLabel: "Daftar Hadir Siswa", icon: "📋" },
    { id: "absensi", label: "Absensi", fullLabel: "Input Absensi Harian", icon: "⏱️" },
    { id: "create", label: "Registrasi", fullLabel: "Registrasi Pelatih/Siswa", icon: "👤+" },
  ].filter(item => hasAccess(item.id));

  // Handler: Add Student
  const handleAddSiswaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSiswa.name || !formSiswa.parent || !formSiswa.phone) {
      triggerToast("Silakan isi semua bidang wajib", "error");
      return;
    }

    const newStudent: Student = {
      id: "s" + (students.length + 1),
      name: formSiswa.name,
      class: formSiswa.class,
      attendanceRate: "100%",
      parent: formSiswa.parent,
      status: "Active",
      logs: []
    };

    setStudents([...students, newStudent]);

    // Create matching invoice for new student
    const newInvoice: Invoice = {
      id: "inv" + (invoices.length + 1),
      studentId: newStudent.id,
      name: newStudent.name,
      amount: formSiswa.class === "Private Class" ? 650000 : 500000,
      desc: "SPP Registrasi Baru",
      status: "Belum Dibayar",
      uploadReceipt: null
    };
    setInvoices([...invoices, newInvoice]);

    setFormSiswa({ name: "", age: "", parent: "", phone: "", class: "Beginner" });
    triggerToast(`Siswa "${newStudent.name}" berhasil didaftarkan!`);
  };

  // Handler: Add Coach
  const handleAddPelatihSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPelatih.name || !formPelatih.phone || !formPelatih.email) {
      triggerToast("Silakan isi semua bidang wajib", "error");
      return;
    }

    const newCoach: Coach = {
      id: "c" + (coaches.length + 1),
      name: formPelatih.name,
      spec: formPelatih.spec || "Instruktur Renang",
      phone: formPelatih.phone,
      email: formPelatih.email,
      class: formPelatih.class
    };

    setCoaches([...coaches, newCoach]);
    setFormPelatih({ name: "", spec: "", phone: "", email: "", class: "Beginner" });
    triggerToast(`Pelatih "${newCoach.name}" berhasil didaftarkan!`);
  };

  // Handler: Submit Attendance
  const handleAbsensiSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

    const updatedStudents = students.map(student => {
      if (student.class === absensiClass) {
        const studentStatus = formAbsensi[student.id] || "Hadir";
        const newLogs = [{ date: today, status: studentStatus }, ...student.logs];

        // Recalculate attendance rate
        const presentCount = newLogs.filter(l => l.status === "Hadir" || l.status === "Izin" || l.status === "Sakit").length;
        const totalCount = newLogs.length;
        const rate = Math.round((presentCount / totalCount) * 100) + "%";

        return {
          ...student,
          logs: newLogs,
          attendanceRate: rate
        };
      }
      return student;
    });

    setStudents(updatedStudents);
    triggerToast(`Absensi kelas "${absensiClass}" berhasil disimpan!`);
  };

  // Handler: Upload tuition receipt (Orang Tua view)
  const handleParentUploadReceipt = (invoiceId: string) => {
    const updatedInvoices = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: "Menunggu Konfirmasi" as const,
          uploadReceipt: "bukti_tf_ortu_rian.jpg"
        };
      }
      return inv;
    });

    setInvoices(updatedInvoices);
    triggerToast("Bukti pembayaran SPP Rian berhasil dikirim!");
  };

  // Handler: Confirm tuition receipt (Admin view)
  const handleAdminVerifyPayment = (invoiceId: string, confirm: boolean) => {
    const updatedInvoices = invoices.map(inv => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          status: confirm ? ("Lunas" as const) : ("Belum Dibayar" as const),
          uploadReceipt: confirm ? inv.uploadReceipt : null
        };
      }
      return inv;
    });

    setInvoices(updatedInvoices);
    triggerToast(confirm ? "Pembayaran terverifikasi! Status berubah menjadi Lunas." : "Pembayaran ditolak.");
  };

  if (!mounted || !sessionUser) return null;

  // ==========================================
  // ORANG TUA (PARENT) VIEW: All-in-One Dashboard Page
  // ==========================================
  if (sessionRole === "orang tua") {
    const rianInvoice = invoices.find((i) => i.name === "Rian");
    const rianData = students.find((s) => s.name === "Rian") || students[0];
    const coachData = coaches.find((c) => c.class === rianData.class) || coaches[0];
    const lastSession = rianData.logs[0] || { date: "-", status: "-" };

    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-10 flex flex-col">
        {/* Soft Toast Notification banner */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-xl animate-bounce">
            <span className="text-sm">✅</span>
            <span className="text-xs font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Dynamic Top Header with soft background */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between shadow-sm shadow-slate-100/50">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Dashboard Wali Murid</p>
            <h1 className="text-base font-black text-slate-900 mt-1">GIM Swimming App</h1>
          </div>
          <div className="flex items-center gap-2">
            {showInstallBtn && (
              <button
                onClick={handleInstallClick}
                className="rounded-xl bg-cyan-400 hover:bg-cyan-500 px-3 py-2 text-xs font-bold text-white transition cursor-pointer flex items-center gap-1 shadow-md shadow-cyan-400/20 shrink-0"
              >
                <span>📥</span> <span className="hidden sm:inline">Install App</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-slate-50 transition cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Scrollable Single Page Feed Body */}
        <div className="flex-1 max-w-xl mx-auto w-full px-4 py-5 space-y-4">

          {/* PROFILE SUMMARY BAR */}
          <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-cyan-50 flex items-center justify-center text-2xl text-cyan-500 shrink-0 border border-cyan-100/50">
              👶
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">{rianData.name}</h2>
              <p className="text-xs text-slate-500">Program: <span className="font-bold text-cyan-600">{rianData.class} Class</span></p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black border border-emerald-100/50 uppercase tracking-wider">
                  Status: {rianData.status}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black border border-blue-100/50">
                  Kehadiran: {rianData.attendanceRate}
                </span>
              </div>
            </div>
          </div>

          {/* ACTIVE INVOICE & TUITION ACTION PANEL (Soft color theme) */}
          {rianInvoice && (
            <div className={`p-5 rounded-3xl border shadow-sm space-y-4 ${rianInvoice.status === "Lunas"
                ? "bg-emerald-50/40 border-emerald-100"
                : rianInvoice.status === "Menunggu Konfirmasi"
                  ? "bg-amber-50/40 border-amber-100"
                  : "bg-rose-50/40 border-rose-100"
              }`}>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Invoice Administrasi SPP</span>
                  <h3 className="text-xs font-bold text-slate-800 mt-0.5">{rianInvoice.desc}</h3>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase border ${rianInvoice.status === "Lunas"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : rianInvoice.status === "Menunggu Konfirmasi"
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-rose-100 text-rose-700 border-rose-200"
                  }`}>
                  {rianInvoice.status}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Nominal Tagihan:</span>
                <span className="text-sm font-black text-slate-800">Rp {rianInvoice.amount.toLocaleString("id-ID")}</span>
              </div>

              {rianInvoice.status === "Belum Dibayar" && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-white/70 border border-slate-100 rounded-2xl text-[10px] text-slate-600 leading-relaxed space-y-1.5 shadow-sm">
                    <p className="font-bold text-slate-700">Bank Transfer BCA:</p>
                    <p className="text-xs font-black text-slate-900 select-all tracking-wider">88921-2291</p>
                    <p className="text-[9px] text-slate-400 font-bold">a.n Yayasan GIM Swimming</p>
                  </div>
                  <button
                    onClick={() => handleParentUploadReceipt(rianInvoice.id)}
                    className="w-full rounded-2xl bg-cyan-400 hover:bg-cyan-500 text-white font-bold py-3 text-xs shadow-lg shadow-cyan-400/10 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>📤</span> Bayar & Unggah Bukti Pembayaran
                  </button>
                </div>
              )}

              {rianInvoice.status === "Menunggu Konfirmasi" && (
                <div className="p-3 bg-white/60 rounded-2xl border border-amber-100 text-center">
                  <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                    Bukti transfer (`{rianInvoice.uploadReceipt}`) telah diunggah. Admin sedang memverifikasi transaksi pembayaran Anda.
                  </p>
                </div>
              )}

              {rianInvoice.status === "Lunas" && (
                <div className="p-3 bg-white/60 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[10px] text-emerald-700 font-bold">
                    Pembayaran SPP terverifikasi lunas. Terima kasih atas kerja sama Anda!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* NEXT SESSION SCHEDULE & CONTACT COACH (Direct view) */}
          <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-950 flex items-center gap-2">
              <span>🏊‍♂️</span> Jadwal Renang & Informasi Instruktur
            </h4>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Sesi Berikutnya</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">Sabtu, 15:00 - 17:00 WIB</p>
                  <p className="text-[10px] text-slate-500 font-medium">Kolam A (Beginner Area)</p>
                </div>
                <span className="text-xl">⏱️</span>
              </div>

              <div className="border-t border-slate-100/80 pt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pelatih Rian</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{coachData.name}</p>
                </div>

                {/* Direct WhatsApp WhatsApp API link */}
                <a
                  href={`https://wa.me/${coachData.phone}?text=Halo%20${coachData.name},%20saya%20orang%20tua%20dari%20Rian%20ingin%20bertanya%20mengenai%20kelas%20renang`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100/50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>💬</span> Hubungi Pelatih
                </a>
              </div>
            </div>
          </div>

          {/* ATTENDANCE TIMELINE WITH DETAILED COLLAPSIBLE LIST */}
          <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-950 flex items-center gap-2">
                <span>📋</span> Status Presensi Latihan Siswa
              </h4>

              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${lastSession.status === "Hadir"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : lastSession.status === "Sakit"
                    ? "bg-blue-50 text-blue-700 border-blue-100"
                    : lastSession.status === "Izin"
                      ? "bg-amber-50 text-amber-700 border-amber-100"
                      : "bg-rose-50 text-rose-700 border-rose-100"
                }`}>
                Sesi Terakhir: {lastSession.status}
              </span>
            </div>

            {rianData.logs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">Belum ada histori latihan.</p>
            ) : (
              <div className="space-y-2">

                {/* Accordion trigger */}
                <button
                  onClick={() => setShowParentHistory(!showParentHistory)}
                  className="w-full py-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition rounded-xl text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{showParentHistory ? "🔼 Tutup" : "🔽 Lihat"} Histori 5 Latihan Terakhir</span>
                </button>

                {/* Collapsible log entries list */}
                {showParentHistory && (
                  <div className="space-y-1.5 pt-2 animate-fadeIn">
                    {rianData.logs.map((log, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-50/50 border border-slate-100/60">
                        <span className="font-semibold text-slate-600">{log.date}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${log.status === "Hadir"
                            ? "bg-emerald-50 text-emerald-700"
                            : log.status === "Sakit"
                              ? "bg-blue-50 text-blue-700"
                              : log.status === "Izin"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                          }`}>
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* EVALUATION PROGRESS CHART (Simplified styled bars) */}
          <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-950 flex items-center gap-2">
              <span>📈</span> Grafik Evaluasi Kemampuan Anak
            </h4>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Meluncur & Pernapasan</span>
                  <span>90%</span>
                </div>
                <div className="bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 h-full w-[90%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Renang Gaya Dada</span>
                  <span>75%</span>
                </div>
                <div className="bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 h-full w-[75%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Renang Gaya Bebas</span>
                  <span>60%</span>
                </div>
                <div className="bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 h-full w-[60%]" />
                </div>
              </div>
            </div>
          </div>

          {/* ANNOUNCEMENT BOARD */}
          <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
            <h4 className="text-xs font-bold text-slate-950">
              📢 Pengumuman Akademik
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-cyan-50/40 border border-cyan-100/50 rounded-2xl">
                <p className="font-bold text-slate-800">Ujian Naik Tingkatan Renang</p>
                <p className="text-slate-500 mt-1 leading-relaxed text-[10px]">
                  Dilaksanakan pada tanggal 14 September 2026. Mohon untuk memantau kesiapan stamina anak dan instruksi pakaian renang ujian dari pelatih.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // ADMIN & PELATIH (COACH) VIEW: Sidebar layout
  // ==========================================
  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden text-slate-800 font-sans">

      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border animate-bounce ${toastType === "success"
            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
            : "bg-rose-50 border-rose-100 text-rose-700"
          }`}>
          <span className="text-lg">{toastType === "success" ? "✅" : "❌"}</span>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Desktop Sidebar (Minimalist white style) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-100 bg-white text-slate-700">

        {/* Brand Logo Header */}
        <div className="flex h-20 items-center px-6 border-b border-slate-100">
          <a href="#" className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-slate-900">
              GIM <span className="text-cyan-500">SWIMMING</span>
            </span>
          </a>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-2xl transition-all duration-200 cursor-pointer ${isActive
                    ? "bg-cyan-50/70 text-cyan-600 border-l-4 border-cyan-400"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.fullLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* User Session Info footer inside desktop sidebar */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500 text-white font-black text-sm uppercase shrink-0">
              {sessionUser.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">{sessionUser}</p>
              <p className="text-[10px] font-bold text-slate-400 capitalize">{sessionRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Screens < md) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white/90 backdrop-blur-md border-t border-slate-100/80 flex items-center justify-around px-2 md:hidden shadow-lg shadow-slate-200/50">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors duration-200 ${isActive ? "text-cyan-500 font-bold" : "text-slate-400 hover:text-slate-600"
                }`}
            >
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span className="text-[9px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top Navbar Header */}
        <header className="flex h-20 items-center justify-between border-b border-slate-100 bg-white px-6">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              {navItems.find(n => n.id === activeTab)?.fullLabel || activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Dynamic Role Badge (soft pastel design) */}
            <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sessionRole === "admin"
                ? "bg-cyan-50 text-cyan-600 border-cyan-100"
                : sessionRole === "pelatih"
                  ? "bg-blue-50 text-blue-600 border-blue-100"
                  : "bg-purple-50 text-purple-600 border-purple-100"
              }`}>
              {sessionRole}
            </span>

            {showInstallBtn && (
              <button
                onClick={handleInstallClick}
                className="rounded-xl bg-cyan-400 hover:bg-cyan-500 px-3 py-2 text-xs font-bold text-white transition cursor-pointer flex items-center gap-1 shadow-md shadow-cyan-400/20 shrink-0"
              >
                <span>📥</span> <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {/* Logout link */}
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-red-500 hover:border-red-200 transition cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Tab Content Panel */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">

          {/* TAB 1: Dashboard Overview */}
          {activeTab === "dashboard" && (
            <div className="space-y-5">

              {/* Greetings Header (Soft colors, simplified layout) */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-50 to-blue-50/30 text-slate-800 relative overflow-hidden border border-cyan-100/50">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1">
                  Halo, {sessionUser}!
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  Selamat datang di Dashboard Latihan GIM Swimming. Akses dan pantau jadwal, presensi, serta administrasi Anda di sini.
                </p>
              </div>

              {/* Dynamic Stats Row (soft pastel cards, clean typography) */}
              {sessionRole === "admin" && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="p-4 rounded-3xl bg-cyan-50/50 border border-cyan-100/50 shadow-sm">
                    <span className="text-xl">👥</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 mb-0.5">Siswa Aktif</p>
                    <h4 className="text-lg font-black text-slate-800">{students.length} Siswa</h4>
                  </div>

                  <div className="p-4 rounded-3xl bg-blue-50/50 border border-blue-100/50 shadow-sm">
                    <span className="text-xl">🏊‍♂️</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 mb-0.5">Pelatih</p>
                    <h4 className="text-lg font-black text-slate-800">{coaches.length} Pelatih</h4>
                  </div>

                  <div className="p-4 rounded-3xl bg-emerald-50/50 border border-emerald-100/50 shadow-sm">
                    <span className="text-xl">💰</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 mb-0.5">SPP Lunas</p>
                    <h4 className="text-lg font-black text-emerald-600">
                      Rp {invoices.filter(i => i.status === "Lunas").reduce((acc, curr) => acc + curr.amount, 0).toLocaleString("id-ID")}
                    </h4>
                  </div>

                  <div className="p-4 rounded-3xl bg-amber-50/50 border border-amber-100/50 shadow-sm">
                    <span className="text-xl">⏱️</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 mb-0.5">Konfirmasi</p>
                    <h4 className="text-lg font-black text-amber-600">
                      {invoices.filter(i => i.status === "Menunggu Konfirmasi").length} Transaksi
                    </h4>
                  </div>
                </div>
              )}

              {sessionRole === "pelatih" && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <div className="p-4 rounded-3xl bg-blue-50/50 border border-blue-100/50 shadow-sm">
                    <span className="text-xl">⏱️</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 mb-0.5">Jadwal Kelas</p>
                    <h4 className="text-lg font-black text-slate-800">2 Kelas Hari Ini</h4>
                  </div>

                  <div className="p-4 rounded-3xl bg-cyan-50/50 border border-cyan-100/50 shadow-sm">
                    <span className="text-xl">👥</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 mb-0.5">Siswa Dibina</p>
                    <h4 className="text-lg font-black text-slate-800">
                      {students.filter(s => s.class === "Beginner").length} Siswa
                    </h4>
                  </div>

                  <div className="p-4 rounded-3xl bg-emerald-50/50 border border-emerald-100/50 shadow-sm col-span-2 lg:col-span-1">
                    <span className="text-xl">📈</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 mb-0.5">Rasio Kehadiran</p>
                    <h4 className="text-lg font-black text-emerald-600">89% Hadir</h4>
                  </div>
                </div>
              )}

              {/* Informational Alerts */}
              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3.5">
                <h4 className="text-xs font-bold text-slate-900">
                  📢 Pengumuman & Jadwal Kolam
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-cyan-50/40 border border-cyan-100/50 rounded-2xl">
                    <p className="font-bold text-slate-800">Ujian Kenaikan Tingkatan Renang</p>
                    <p className="text-slate-550 mt-1 leading-relaxed text-[10px]">Diselenggarakan pada tanggal 14 September 2026. Mohon untuk menyiapkan laporan kehadiran kesiapan ujian siswa.</p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="font-bold text-slate-800">Pembersihan Berkala Kolam Utama A</p>
                    <p className="text-slate-550 mt-1 leading-relaxed text-[10px]">Dilaksanakan rutin setiap Senin pagi (08:00 - 11:00 WIB). Sesi kelas pagi digeser ke area Kolam B.</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Keuangan */}
          {activeTab === "keuangan" && hasAccess("keuangan") && (
            <div className="space-y-5">

              {/* ADMIN VIEW */}
              {sessionRole === "admin" && (
                <div className="space-y-5">

                  {/* Verification approvals panel */}
                  <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900 mb-4">
                      Konfirmasi Bukti Transfer SPP Masuk
                    </h3>

                    {invoices.filter(i => i.status === "Menunggu Konfirmasi").length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6 text-center">
                        Semua pembayaran saat ini telah terverifikasi lunas.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {invoices.filter(i => i.status === "Menunggu Konfirmasi").map(inv => (
                          <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50/50 border border-amber-100 rounded-2xl gap-3">
                            <div>
                              <p className="text-xs font-bold text-slate-800">Pembayaran SPP: {inv.name}</p>
                              <p className="text-[10px] text-slate-455 mt-0.5 font-bold">Transfer a.n {inv.name} • {inv.uploadReceipt}</p>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <span className="text-xs font-bold text-slate-700">Rp {inv.amount.toLocaleString("id-ID")}</span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleAdminVerifyPayment(inv.id, true)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition cursor-pointer"
                                >
                                  Terima
                                </button>
                                <button
                                  onClick={() => handleAdminVerifyPayment(inv.id, false)}
                                  className="px-3 py-1.5 text-xs font-bold text-red-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                                >
                                  Tolak
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* General invoices history */}
                  <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                    <h3 className="text-xs font-bold text-slate-900 mb-4">
                      Laporan Status Invoice SPP Siswa (Semua)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold">
                            <th className="py-2.5 px-3">Nama Siswa</th>
                            <th className="py-2.5 px-3">Tagihan</th>
                            <th className="py-2.5 px-3">Nominal</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-3 font-bold text-slate-900">{inv.name}</td>
                              <td className="py-3 px-3 text-slate-500">{inv.desc}</td>
                              <td className="py-3 px-3 font-bold text-slate-700">Rp {inv.amount.toLocaleString("id-ID")}</td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${inv.status === "Lunas"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : inv.status === "Menunggu Konfirmasi"
                                      ? "bg-amber-50 text-amber-700 border-amber-100"
                                      : "bg-rose-50 text-rose-700 border-rose-100"
                                  }`}>
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: Daftar Hadir Siswa */}
          {activeTab === "daftar_hadir" && (
            <div className="space-y-5">

              {/* ADMIN & PELATIH VIEW */}
              {sessionRole === "admin" || sessionRole === "pelatih" ? (
                <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-900">
                      Rangkuman Kehadiran Kelas Siswa GIM Swimming
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Klik nama siswa di bawah untuk melihat histori presensi rinci.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-bold">
                          <th className="py-2.5 px-3">Nama Siswa</th>
                          <th className="py-2.5 px-3">Kelas</th>
                          <th className="py-2.5 px-3">Kehadiran</th>
                          <th className="py-2.5 px-3">Wali Murid</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {students.map((student) => (
                          <tr
                            key={student.id}
                            onClick={() => setSelectedStudentLogs(student)}
                            className="hover:bg-slate-50/70 transition cursor-pointer"
                          >
                            <td className="py-3.5 px-3 font-bold text-cyan-600 hover:underline">{student.name}</td>
                            <td className="py-3.5 px-3 text-slate-600">{student.class}</td>
                            <td className="py-3.5 px-3 font-bold text-slate-800">{student.attendanceRate}</td>
                            <td className="py-3.5 px-3 text-slate-500">{student.parent}</td>
                            <td className="py-3.5 px-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                {student.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {/* Student detail calendar overlay popup */}
              {selectedStudentLogs && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                  <div
                    onClick={() => setSelectedStudentLogs(null)}
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                  />
                  <div className="relative z-10 w-full max-w-sm bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl my-auto">

                    <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 mb-4">
                      Histori Presensi: {selectedStudentLogs.name}
                    </h3>

                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {selectedStudentLogs.logs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">Belum ada catatan presensi.</p>
                      ) : (
                        selectedStudentLogs.logs.map((log, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="font-bold text-slate-700">{log.date}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${log.status === "Hadir"
                                ? "bg-emerald-50 text-emerald-700"
                                : log.status === "Sakit"
                                  ? "bg-blue-50 text-blue-700"
                                  : log.status === "Izin"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-rose-50 text-rose-700"
                              }`}>
                              {log.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedStudentLogs(null)}
                      className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Tutup Histori
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: Absensi */}
          {activeTab === "absensi" && hasAccess("absensi") && (
            <div className="space-y-5">

              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm">
                <form onSubmit={handleAbsensiSubmit} className="space-y-5">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih Kelas</label>
                      <select
                        value={absensiClass}
                        onChange={(e) => {
                          setAbsensiClass(e.target.value);
                          setFormAbsensi({});
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white cursor-pointer"
                      >
                        <option value="Beginner">Beginner Class</option>
                        <option value="Kids Swimming">Kids Swimming Class</option>
                        <option value="Private Class">Private Class (1-on-1)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Hari / Tanggal Absensi</label>
                      <input
                        type="text"
                        disabled
                        value={new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs text-slate-500 outline-none select-none"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800">Catat Kehadiran Siswa:</h4>

                    {students.filter(s => s.class === absensiClass).length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">Tidak ada siswa terdaftar di kelas ini.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {students.filter(s => s.class === absensiClass).map((student) => (
                          <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2.5">
                            <span className="text-xs font-bold text-slate-900">{student.name}</span>

                            <div className="flex gap-1.5 flex-wrap">
                              {["Hadir", "Sakit", "Izin", "Alpa"].map((status) => {
                                const currentStatus = formAbsensi[student.id] || "Hadir";
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormAbsensi(prev => ({ ...prev, [student.id]: status as any }))}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition duration-200 cursor-pointer ${currentStatus === status
                                        ? status === "Hadir"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-250 shadow-sm"
                                          : status === "Sakit"
                                            ? "bg-blue-50 text-blue-700 border-blue-250 shadow-sm"
                                            : status === "Izin"
                                              ? "bg-amber-50 text-amber-700 border-amber-250 shadow-sm"
                                              : "bg-rose-50 text-rose-700 border-rose-250 shadow-sm"
                                        : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                                      }`}
                                  >
                                    {status}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={students.filter(s => s.class === absensiClass).length === 0}
                    className="w-full rounded-2xl bg-cyan-400 hover:bg-cyan-500 text-white font-bold py-3 text-xs shadow-lg shadow-cyan-400/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Simpan Absensi Kelas
                  </button>

                </form>
              </div>

            </div>
          )}

          {/* TAB 5: Create Pelatih/Siswa */}
          {activeTab === "create" && hasAccess("create") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Pendaftaran Siswa Baru
                </h3>

                <form onSubmit={handleAddSiswaSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Siswa</label>
                    <input
                      type="text"
                      value={formSiswa.name}
                      onChange={(e) => setFormSiswa(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Masukkan nama lengkap siswa"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Orang Tua / Wali</label>
                    <input
                      type="text"
                      value={formSiswa.parent}
                      onChange={(e) => setFormSiswa(prev => ({ ...prev, parent: e.target.value }))}
                      placeholder="Nama wali murid"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Usia (Tahun)</label>
                      <input
                        type="number"
                        value={formSiswa.age}
                        onChange={(e) => setFormSiswa(prev => ({ ...prev, age: e.target.value }))}
                        placeholder="Usia"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">WhatsApp Wali</label>
                      <input
                        type="text"
                        value={formSiswa.phone}
                        onChange={(e) => setFormSiswa(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="08123xxxx"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih Kelas Latihan</label>
                    <select
                      value={formSiswa.class}
                      onChange={(e) => setFormSiswa(prev => ({ ...prev, class: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white cursor-pointer"
                    >
                      <option value="Beginner">Beginner Class</option>
                      <option value="Kids Swimming">Kids Swimming Class</option>
                      <option value="Private Class">Private Class (1-on-1)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-cyan-400 hover:bg-cyan-500 text-white font-bold py-3 text-xs shadow-lg shadow-cyan-400/20 transition cursor-pointer"
                  >
                    Daftarkan Siswa
                  </button>
                </form>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Pendaftaran Pelatih Baru
                </h3>

                <form onSubmit={handleAddPelatihSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Instruktur</label>
                    <input
                      type="text"
                      value={formPelatih.name}
                      onChange={(e) => setFormPelatih(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nama lengkap instruktur"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Spesialisasi Keterampilan</label>
                    <input
                      type="text"
                      value={formPelatih.spec}
                      onChange={(e) => setFormPelatih(prev => ({ ...prev, spec: e.target.value }))}
                      placeholder="Contoh: Gaya Bebas / Gaya Kupu-kupu"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">No. WhatsApp</label>
                      <input
                        type="text"
                        value={formPelatih.phone}
                        onChange={(e) => setFormPelatih(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="08123xxxx"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Instruktur</label>
                      <input
                        type="email"
                        value={formPelatih.email}
                        onChange={(e) => setFormPelatih(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="coach@gimswimming.com"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Alokasi Kelas Utama</label>
                    <select
                      value={formPelatih.class}
                      onChange={(e) => setFormPelatih(prev => ({ ...prev, class: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white cursor-pointer"
                    >
                      <option value="Beginner">Beginner Class</option>
                      <option value="Kids Swimming">Kids Swimming Class</option>
                      <option value="Private Class">Private Class (1-on-1)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-cyan-400 hover:bg-cyan-500 text-white font-bold py-3 text-xs shadow-lg shadow-cyan-400/20 transition cursor-pointer"
                  >
                    Daftarkan Pelatih
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* iOS PWA Install Instructions Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowIOSPrompt(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl text-center">
            <h3 className="text-lg font-black text-slate-900 mb-2">Instal Aplikasi di iOS</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Ikuti langkah mudah ini untuk menambahkan GIM Swimming ke Layar Utama perangkat Apple Anda:
            </p>
            <div className="space-y-4 text-left text-xs text-slate-650 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[10px] font-black text-cyan-600">1</span>
                <p>Buka portal ini menggunakan browser <strong>Safari</strong> bawaan iOS.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[10px] font-black text-cyan-600">2</span>
                <p>Ketuk tombol <strong>Bagikan (Share)</strong> <span className="inline-block px-1.5 py-0.5 rounded bg-white border text-sm">📤</span> pada bagian navigasi bawah Safari.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[10px] font-black text-cyan-600">3</span>
                <p>Gulir ke bawah dan ketuk opsi <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong> <span className="inline-block px-1.5 py-0.5 rounded bg-white border text-sm">➕</span>.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[10px] font-black text-cyan-600">4</span>
                <p>Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas untuk menyelesaikan.</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full rounded-xl bg-cyan-400 hover:bg-cyan-500 py-3 text-sm font-bold text-white transition duration-200"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
