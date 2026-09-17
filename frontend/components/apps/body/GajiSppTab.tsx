"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Student,
  Coach,
  Invoice,
  AttendanceRecord,
  CoachPayroll,
  ScheduleSession,
} from "../types";
import {
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Search,
  Check,
  X,
  FileText,
  Calendar,
  History,
  ArrowLeft,
  ChevronRight,
  Plus,
  Waves,
  MapPin,
} from "lucide-react";
import {
  verifyInvoicePayment,
  fetchCoachPayrolls,
  createOrUpdateCoachPayroll,
  approveCoachPayroll,
  createInvoice,
} from "../../../lib/api";
import SlipGajiModal from "./SlipGajiModal";

interface GajiSppTabProps {
  students: Student[];
  coaches: Coach[];
  invoices: Invoice[];
  attendances?: AttendanceRecord[];
  schedules?: ScheduleSession[];
  sessionUser?: string;
  sessionRole?: string;
  onRefresh?: () => Promise<void>;
  onVerifyPayment?: (invoiceId: string, confirm: boolean) => void;
  setActiveTab?: (tab: string) => void;
}

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const cleanCoachName = (name: string) =>
  (name || "").toLowerCase().replace(/^coach\s+/i, "").trim();

export default function GajiSppTab({
  students = [],
  coaches = [],
  invoices = [],
  attendances = [],
  schedules = [],
  sessionUser = "",
  sessionRole = "admin",
  onRefresh,
  onVerifyPayment,
  setActiveTab,
}: GajiSppTabProps) {
  const isCoachRole = sessionRole?.toLowerCase() === "pelatih";

  // Sub-view for Coach: "honor" (bulan ini) | "riwayat" (halaman riwayat slip gaji)
  const [coachSubView, setCoachSubView] = useState<"honor" | "riwayat">("honor");

  // Admin active segment
  const [activeSegment, setActiveSegment] = useState<"spp" | "gaji">(
    isCoachRole ? "gaji" : "spp"
  );

  // Current Month Anchor (Default: e.g. "September 2026")
  const currentMonthName = useMemo(() => {
    const d = new Date();
    return `${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);

  // Search & Filter state (for Admin SPP)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Receipt Preview Modal (Admin)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Manual Invoice Modal (Admin)
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualAmount, setManualAmount] = useState<number>(450000);
  const [manualDesc, setManualDesc] = useState(`SPP Renang - ${selectedMonth}`);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Coach Payroll State (from backend)
  const [payrolls, setPayrolls] = useState<CoachPayroll[]>([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [approvingPayrollId, setApprovingPayrollId] = useState<string | null>(null);

  // Selected Slip Modal State
  const [selectedSlipData, setSelectedSlipData] = useState<{
    isOpen: boolean;
    coach: Coach | null;
    month: string;
    totalSessions: number;
    payPerSession: number;
    bonusAmount?: number;
    deductionAmount?: number;
    totalAmount: number;
    status: string;
    approvedAt?: string;
    notes?: string;
    sessionDetails?: Array<{
      date: string;
      time?: string;
      title?: string;
      poolArea?: string;
      class?: string;
      status?: string;
    }>;
  }>({
    isOpen: false,
    coach: null,
    month: selectedMonth,
    totalSessions: 0,
    payPerSession: 100000,
    totalAmount: 0,
    status: "Pending",
  });

  // Load coach payrolls from backend
  const loadPayrolls = async () => {
    try {
      setLoadingPayrolls(true);
      const data = await fetchCoachPayrolls(selectedMonth);
      setPayrolls(data);
    } catch (err) {
      console.error("Error loading payrolls:", err);
    } finally {
      setLoadingPayrolls(false);
    }
  };

  useEffect(() => {
    loadPayrolls();
  }, [selectedMonth]);

  // Available Month Options (6 months backward to current)
  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(`${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`);
    }
    return options;
  }, []);

  // -------------------------------------------------------------
  // Find Logged In Coach (For Pelatih View)
  // -------------------------------------------------------------
  const normalizedUser = (sessionUser || "").toLowerCase().trim();
  const cleanedSessionUser = cleanCoachName(sessionUser);

  const currentCoach = useMemo(() => {
    if (!isCoachRole) return null;
    const found = coaches.find((c) => {
      const cClean = cleanCoachName(c.name);
      return (
        c.id === sessionUser ||
        c.name.toLowerCase().trim() === normalizedUser ||
        (cleanedSessionUser && cClean === cleanedSessionUser) ||
        (cleanedSessionUser &&
          (cClean.includes(cleanedSessionUser) || cleanedSessionUser.includes(cClean)))
      );
    });

    if (found) return found;

    return (
      coaches[0] || {
        id: "coach-1",
        name: sessionUser || "Pelatih Renang",
        spec: "Instruktur Renang",
        class: "Prestasi & Reguler",
        phone: "081234567890",
        email: "pelatih@gimswimming.com",
        pay_per_session: 100000,
        payPerSession: 100000,
      }
    );
  }, [coaches, isCoachRole, sessionUser, normalizedUser, cleanedSessionUser]);

  // Parse target month index and year
  const parseSelectedMonthRange = useMemo(() => {
    const parts = selectedMonth.split(" ");
    const monthName = parts[0] || "September";
    const year = parseInt(parts[1] || "2026", 10);
    const monthIdx = MONTH_NAMES_ID.findIndex(
      (m) => m.toLowerCase() === monthName.toLowerCase()
    );
    return { monthIdx: monthIdx !== -1 ? monthIdx : 8, year };
  }, [selectedMonth]);

  // Helper to get strictly real completed sessions from DB for a coach in a specific month
  const getCoachCompletedSessionsForMonth = useCallback(
    (targetMonthIdx: number, targetYear: number) => {
      if (!currentCoach) return [];

      const coachIdStr = String(currentCoach.id);
      const coachClean = cleanCoachName(currentCoach.name);

      // Filter real DB attendances
      const matched = attendances.filter((att) => {
        const isCoachPerson =
          att.person_type === "coach" ||
          att.user_role === "pelatih" ||
          String(att.person_id) === coachIdStr ||
          (coachClean && cleanCoachName(att.person_name) === coachClean) ||
          (normalizedUser && cleanCoachName(att.person_name) === normalizedUser);

        const isValidStatus =
          att.status === "Hadir" ||
          att.status === "Terlambat" ||
          att.status === "Selesai";

        if (!isCoachPerson || !isValidStatus) return false;

        if (att.date) {
          const d = new Date(att.date);
          if (!isNaN(d.getTime())) {
            return d.getMonth() === targetMonthIdx && d.getFullYear() === targetYear;
          }
        }
        return false;
      });

      // Distinct by schedule_id or date to prevent duplicate count on checkin & checkout
      const distinctMap = new Map<string, typeof matched[0]>();
      matched.forEach((att) => {
        const key = att.schedule_id
          ? `sch-${att.schedule_id}`
          : `date-${att.date}-${att.time_start || att.time_recorded || att.id}`;
        if (!distinctMap.has(key) || att.status === "Selesai") {
          distinctMap.set(key, att);
        }
      });

      return Array.from(distinctMap.values()).map((att, idx) => ({
        id: String(att.id || idx),
        date: att.date,
        time: att.time_start ? `${att.time_start} - ${att.time_end || ""}` : "15:00 - 17:00 WIB",
        title: att.schedule_title || att.class_name || "Sesi Latihan Renang",
        poolArea: att.pool_area || "Kolam Utama",
        class: att.class_name || att.class || currentCoach.class || "Prestasi",
        status: att.status || "Hadir",
      }));
    },
    [currentCoach, attendances, normalizedUser]
  );

  // Sesi mengajar pelatih yang login pada bulan yang dipilih (REAL DB ONLY)
  const currentCoachSessionsThisMonth = useMemo(() => {
    return getCoachCompletedSessionsForMonth(
      parseSelectedMonthRange.monthIdx,
      parseSelectedMonthRange.year
    );
  }, [getCoachCompletedSessionsForMonth, parseSelectedMonthRange]);

  // Hitungan Honor Pelatih Login (REAL DB ONLY: 0 sessions = Rp 0)
  const currentCoachHonorCalculation = useMemo(() => {
    if (!currentCoach) {
      return {
        completedSessions: 0,
        payPerSession: 100000,
        bonus: 0,
        totalAmount: 0,
        status: "Belum Ada Sesi",
        approvedAt: undefined,
        notes: "",
        payrollId: null,
      };
    }

    const payPerSession =
      currentCoach.pay_per_session || currentCoach.payPerSession || 100000;

    // Check if there is an existing payroll in database
    const existingPr = payrolls.find(
      (p) =>
        (String(p.coach_id) === String(currentCoach.id) ||
          cleanCoachName(p.coach_name) === cleanCoachName(currentCoach.name)) &&
        (!p.month || p.month === selectedMonth)
    );

    // Strictly real session count: 0 if coach hasn't completed any sessions yet
    const sessionCount = existingPr
      ? existingPr.total_sessions
      : currentCoachSessionsThisMonth.length;

    const baseAmount = sessionCount * payPerSession;
    const bonus = existingPr?.bonus_amount || 0;
    const totalAmount = existingPr ? existingPr.total_amount : baseAmount + bonus;
    const status = existingPr
      ? existingPr.status
      : sessionCount > 0
        ? "Pending"
        : "Belum Ada Sesi";

    return {
      completedSessions: sessionCount,
      payPerSession,
      bonus,
      totalAmount,
      status,
      approvedAt: existingPr?.approved_at,
      notes: existingPr?.notes || "",
      payrollId: existingPr?.id || null,
    };
  }, [currentCoach, currentCoachSessionsThisMonth, payrolls, selectedMonth]);

  // Riwayat Slip Gaji Pelatih (REAL DB ONLY)
  const coachSlipHistory = useMemo(() => {
    if (!currentCoach) return [];

    const historyItems = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = `${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
      const mIdx = d.getMonth();
      const mYear = d.getFullYear();

      // Check DB payroll record
      const savedPr = payrolls.find(
        (p) =>
          p.month === mName &&
          (String(p.coach_id) === String(currentCoach.id) ||
            cleanCoachName(p.coach_name) === cleanCoachName(currentCoach.name))
      );

      // Get real sessions from attendances for that month
      const monthSessions = getCoachCompletedSessionsForMonth(mIdx, mYear);

      const isCurrent = i === 0;
      const sessions = savedPr
        ? savedPr.total_sessions
        : isCurrent
          ? currentCoachHonorCalculation.completedSessions
          : monthSessions.length;

      const rate = savedPr
        ? savedPr.pay_per_session
        : currentCoach.pay_per_session || currentCoach.payPerSession || 100000;

      const bonus = savedPr ? savedPr.bonus_amount : 0;
      const total = savedPr ? savedPr.total_amount : sessions * rate + bonus;
      const status = savedPr
        ? savedPr.status
        : sessions > 0
          ? "Pending"
          : "Belum Ada Sesi";

      historyItems.push({
        month: mName,
        totalSessions: sessions,
        payPerSession: rate,
        bonusAmount: bonus,
        totalAmount: total,
        status,
        approvedAt: savedPr?.approved_at,
        notes: savedPr?.notes || "",
        isCurrentMonth: isCurrent,
        sessionDetails: monthSessions,
      });
    }

    return historyItems;
  }, [
    currentCoach,
    payrolls,
    currentCoachHonorCalculation,
    getCoachCompletedSessionsForMonth,
  ]);

  // -------------------------------------------------------------
  // SPP Calculations & Filters (Admin View)
  // -------------------------------------------------------------
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (inv.name || "").toLowerCase().includes(q);
        const matchDesc = (inv.desc || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      if (statusFilter !== "ALL") {
        if (inv.status !== statusFilter) return false;
      }
      return true;
    });
  }, [invoices, searchQuery, statusFilter]);

  const sppTotalLunas = useMemo(() => {
    return invoices
      .filter((i) => i.status === "Lunas")
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [invoices]);

  const countLunas = invoices.filter((i) => i.status === "Lunas").length;
  const countPending = invoices.filter((i) => i.status === "Menunggu Konfirmasi").length;
  const countUnpaid = invoices.filter((i) => i.status === "Belum Dibayar").length;

  // Coach Calculations for Admin (REAL DB ONLY)
  const coachCalculations = useMemo(() => {
    return coaches.map((coach) => {
      const coachClean = cleanCoachName(coach.name);
      const coachIdStr = String(coach.id);

      const coachAttendances = attendances.filter((att) => {
        const isCoach =
          att.person_type === "coach" ||
          att.user_role === "pelatih" ||
          String(att.person_id) === coachIdStr ||
          (coachClean && cleanCoachName(att.person_name) === coachClean);

        const isValidStatus =
          att.status === "Hadir" || att.status === "Terlambat" || att.status === "Selesai";

        if (!isCoach || !isValidStatus) return false;

        if (att.date) {
          const d = new Date(att.date);
          if (!isNaN(d.getTime())) {
            return (
              d.getMonth() === parseSelectedMonthRange.monthIdx &&
              d.getFullYear() === parseSelectedMonthRange.year
            );
          }
        }
        return false;
      });

      // Distinct sessions
      const distinctMap = new Map<string, typeof coachAttendances[0]>();
      coachAttendances.forEach((att) => {
        const key = att.schedule_id
          ? `sch-${att.schedule_id}`
          : `att-${att.date}-${att.time_start || ""}`;
        if (!distinctMap.has(key) || att.status === "Selesai") {
          distinctMap.set(key, att);
        }
      });

      const existingPr = payrolls.find(
        (p) =>
          (String(p.coach_id) === coachIdStr ||
            cleanCoachName(p.coach_name) === coachClean) &&
          (!p.month || p.month === selectedMonth)
      );

      const completedSessions = existingPr ? existingPr.total_sessions : distinctMap.size;
      const payPerSession = coach.pay_per_session || coach.payPerSession || 100000;
      const baseTotal = completedSessions * payPerSession;

      const status = existingPr
        ? existingPr.status
        : completedSessions > 0
          ? "Pending"
          : "Belum Ada Sesi";
      const bonus = existingPr?.bonus_amount || 0;
      const finalAmount = existingPr ? existingPr.total_amount : baseTotal + bonus;

      return {
        coach,
        completedSessions,
        payPerSession,
        bonus,
        totalAmount: finalAmount,
        status,
        payrollId: existingPr?.id || null,
        approvedAt: existingPr?.approved_at,
        notes: existingPr?.notes || "",
      };
    });
  }, [coaches, attendances, payrolls, parseSelectedMonthRange, selectedMonth]);

  const totalPayrollExpense = useMemo(() => {
    return coachCalculations.reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [coachCalculations]);

  const approvedPayrollCount = coachCalculations.filter((c) => c.status === "Approved").length;

  // Handle Approve SPP (Admin)
  const handleApproveInvoice = async (inv: Invoice) => {
    try {
      if (onVerifyPayment) {
        onVerifyPayment(inv.id, true);
      } else {
        await verifyInvoicePayment(inv.id, true);
        if (onRefresh) await onRefresh();
      }
      setPreviewInvoice(null);
    } catch (err) {
      console.error("Approve invoice error:", err);
      alert("Gagal menyetujui pembayaran SPP.");
    }
  };

  // Handle Reject SPP (Admin)
  const handleRejectInvoice = async (inv: Invoice) => {
    if (!confirm(`Tolak bukti pembayaran untuk ${inv.name}?`)) return;
    try {
      if (onVerifyPayment) {
        onVerifyPayment(inv.id, false);
      } else {
        await verifyInvoicePayment(inv.id, false);
        if (onRefresh) await onRefresh();
      }
      setPreviewInvoice(null);
    } catch (err) {
      console.error("Reject invoice error:", err);
      alert("Gagal menolak pembayaran SPP.");
    }
  };

  // Handle Create Manual SPP Invoice (Admin)
  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentId) {
      alert("Pilih siswa terlebih dahulu");
      return;
    }
    const student = students.find((s) => s.id === manualStudentId);
    if (!student) return;

    try {
      setManualSubmitting(true);
      await createInvoice({
        studentId: student.id,
        name: student.name,
        amount: manualAmount,
        desc: manualDesc,
      });
      setShowManualModal(false);
      setManualStudentId("");
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Create invoice error:", err);
      alert("Gagal membuat tagihan SPP.");
    } finally {
      setManualSubmitting(false);
    }
  };

  // Handle Approve Coach Payroll (Admin)
  const handleApproveCoachPayroll = async (item: (typeof coachCalculations)[0]) => {
    if (item.completedSessions === 0 && item.totalAmount === 0) {
      if (!confirm(`Pelatih ${item.coach.name} belum memiliki sesi selesai. Tetap setujui Rp 0?`)) {
        return;
      }
    } else if (
      !confirm(
        `Setujui dan cairkan gaji Pelatih ${item.coach.name} sebesar Rp ${item.totalAmount.toLocaleString(
          "id-ID"
        )} untuk periode ${selectedMonth}?`
      )
    ) {
      return;
    }

    try {
      setApprovingPayrollId(item.coach.id);
      let targetId = item.payrollId;

      if (!targetId) {
        const created = await createOrUpdateCoachPayroll({
          coach_id: item.coach.id,
          coach_name: item.coach.name,
          month: selectedMonth,
          total_sessions: item.completedSessions,
          pay_per_session: item.payPerSession,
          bonus_amount: item.bonus,
          total_amount: item.totalAmount,
          notes: `Gaji Pelatih ${item.coach.name} (${selectedMonth})`,
        });
        if (created) targetId = created.id;
      }

      if (targetId) {
        await approveCoachPayroll(targetId, `Disetujui oleh Admin ${sessionUser}`);
        await loadPayrolls();
        if (onRefresh) await onRefresh();
        alert(
          `Gaji Pelatih ${item.coach.name} berhasil disetujui dan otomatis dicatat ke Laporan Pengeluaran Keuangan!`
        );
      }
    } catch (err: any) {
      console.error("Approve payroll error:", err);
      alert(err.message || "Gagal menyetujui gaji pelatih.");
    } finally {
      setApprovingPayrollId(null);
    }
  };

  // Helper untuk membuka Slip Gaji Modal bagi Pelatih yang Login
  const handleOpenCurrentCoachSlip = () => {
    if (!currentCoach) return;
    setSelectedSlipData({
      isOpen: true,
      coach: currentCoach,
      month: selectedMonth,
      totalSessions: currentCoachHonorCalculation.completedSessions,
      payPerSession: currentCoachHonorCalculation.payPerSession,
      bonusAmount: currentCoachHonorCalculation.bonus,
      totalAmount: currentCoachHonorCalculation.totalAmount,
      status: currentCoachHonorCalculation.status,
      approvedAt: currentCoachHonorCalculation.approvedAt,
      notes: currentCoachHonorCalculation.notes,
      sessionDetails: currentCoachSessionsThisMonth,
    });
  };

  return (
    <div className="space-y-4 pb-28 bg-[#f8fafc] min-h-full font-sans">
      {/* ========================================================================= */}
      {/* 1. ROLE PELATIH: ULTRA SIMPLE & MOBILE-FIRST VIEW (REAL DB DATA) */}
      {/* ========================================================================= */}
      {isCoachRole ? (
        <div className="space-y-4">
          {/* A. HEADER PELATIH */}
          <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(2.5rem,calc(env(safe-area-inset-top)+0.5rem))] sm:pt-6 pb-10 sm:pb-12 px-4 sm:px-6 shadow-xl shadow-blue-700/15 overflow-hidden">
            <div className="max-w-xl mx-auto space-y-3 relative z-10">
              {/* Top Navigation Row */}
              <div className="flex items-center justify-between">
                {coachSubView === "riwayat" ? (
                  <button
                    onClick={() => setCoachSubView("honor")}
                    className="flex items-center gap-1.5 text-xs font-bold text-cyan-100 hover:text-white bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 transition cursor-pointer active:scale-95"
                  >
                    <ArrowLeft size={15} />
                    <span>Kembali ke Honor</span>
                  </button>
                ) : (
                  <div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                      <Banknote size={20} className="text-cyan-300" />
                      <span>Honor Pelatih</span>
                    </h2>
                    <p className="text-[11px] text-cyan-100 font-medium">
                      Coach {currentCoach?.name || sessionUser}
                    </p>
                  </div>
                )}

                {/* Button Riwayat Gaji (Hanya tampil di subview honor) */}
                {coachSubView === "honor" && (
                  <button
                    onClick={() => setCoachSubView("riwayat")}
                    className="flex items-center gap-1.5 bg-white text-blue-800 hover:bg-cyan-50 text-xs font-black px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <History size={14} className="text-blue-600" />
                    <span>Riwayat</span>
                  </button>
                )}
              </div>

              {/* Month Selector Pill (Di halaman Honor) */}
              {coachSubView === "honor" && (
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white w-fit">
                  <Calendar size={13} className="text-cyan-200" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt} value={opt} className="bg-slate-900 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Judul Halaman Riwayat */}
              {coachSubView === "riwayat" && (
                <div>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <History size={20} className="text-cyan-300" />
                    <span>Riwayat Slip Gaji</span>
                  </h2>
                  <p className="text-[11px] text-cyan-100 font-medium">
                    Arsip penggajian 6 bulan terakhir dari database
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* B. MAIN BODY CONTENT (MOBILE-FIRST) */}
          <div className="max-w-xl mx-auto px-4 space-y-4 -mt-6 relative z-10">
            {/* SUB-VIEW 1: HALAMAN UTAMA HONOR BULAN INI */}
            {coachSubView === "honor" ? (
              <div className="space-y-4">
                {/* 1. HERO SALARY CARD */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Honor Bulan Ini ({selectedMonth})
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${currentCoachHonorCalculation.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : currentCoachHonorCalculation.completedSessions > 0
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                    >
                      {currentCoachHonorCalculation.status === "Approved" ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Sudah Dicairkan</span>
                        </>
                      ) : currentCoachHonorCalculation.completedSessions > 0 ? (
                        <>
                          <Clock size={12} />
                          <span>Menunggu Approval</span>
                        </>
                      ) : (
                        <span>Belum Ada Sesi</span>
                      )}
                    </span>
                  </div>

                  {/* Big Number Amount (Real DB: Rp 0 jika belum ada sesi selesai) */}
                  <div className="text-center py-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight block">
                      Rp {currentCoachHonorCalculation.totalAmount.toLocaleString("id-ID")}
                    </span>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {currentCoachHonorCalculation.completedSessions > 0
                        ? "Total honor mengajar yang terhitung dari presensi"
                        : "Honor masih Rp 0 karena belum ada sesi yang diselesaikan"}
                    </p>
                  </div>

                  {/* Calculation Breakdown (Real DB data) */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 text-xs border border-slate-100">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Kehadiran Mengajar:</span>
                      <span className="font-bold text-slate-900">
                        {currentCoachHonorCalculation.completedSessions} Sesi Selesai
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Tarif per Sesi:</span>
                      <span className="font-bold text-slate-900">
                        Rp {currentCoachHonorCalculation.payPerSession.toLocaleString("id-ID")}
                      </span>
                    </div>
                    {currentCoachHonorCalculation.bonus > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 font-bold">
                        <span>Bonus / Penyesuaian:</span>
                        <span>+ Rp {currentCoachHonorCalculation.bonus.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-black text-slate-800">
                      <span>Rumus Hitungan:</span>
                      <span className="text-blue-700">
                        {currentCoachHonorCalculation.completedSessions} sesi × Rp{" "}
                        {currentCoachHonorCalculation.payPerSession.toLocaleString("id-ID")} = Rp{" "}
                        {currentCoachHonorCalculation.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Primary Call-to-Action Button: Buka Slip Gaji */}
                  <button
                    onClick={handleOpenCurrentCoachSlip}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm py-3 px-4 rounded-2xl shadow-md shadow-blue-600/20 transition active:scale-98 cursor-pointer"
                  >
                    <FileText size={16} />
                    <span>Lihat Slip Gaji Resmi</span>
                  </button>
                </div>

                {/* 2. RINCIAN SESI MENGAJAR BULAN INI (REAL DB DATA) */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">
                      Sesi Selesai Bulan Ini ({currentCoachSessionsThisMonth.length})
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Data Real Presensi DB
                    </span>
                  </div>

                  {currentCoachSessionsThisMonth.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <Waves size={24} className="mx-auto text-slate-300" />
                      <p className="text-slate-700 font-bold text-xs">
                        Belum ada sesi latihan yang diselesaikan di bulan {selectedMonth}
                      </p>
                      <p className="text-slate-400 text-[11px] max-w-xs mx-auto">
                        Honor akan otomatis terhitung (Rp{" "}
                        {currentCoachHonorCalculation.payPerSession.toLocaleString("id-ID")}/sesi) saat Anda menyelesaikan presensi mengajar.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentCoachSessionsThisMonth.map((s, idx) => (
                        <div
                          key={s.id || idx}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-black text-slate-900">{s.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {s.date} • {s.time} • {s.poolArea}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {s.status}
                            </span>
                            <p className="text-[11px] font-bold text-blue-700 mt-0.5">
                              +Rp {currentCoachHonorCalculation.payPerSession.toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* SUB-VIEW 2: HALAMAN RIWAYAT SLIP GAJI (REAL DB DATA) */
              <div className="space-y-3">
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-md space-y-3">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h3 className="text-sm font-black text-slate-900">
                      Arsip Riwayat Penggajian
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Data riwayat penggajian terverifikasi dari database.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {coachSlipHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/40 border border-slate-100 flex items-center justify-between gap-3 transition"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-black text-slate-900">
                              {item.month}
                            </h4>
                            {item.isCurrentMonth && (
                              <span className="text-[9px] font-extrabold px-2 py-0.2 rounded-full bg-blue-100 text-blue-800">
                                Bulan Ini
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {item.totalSessions} Sesi Hadir • Rp{" "}
                            {item.totalAmount.toLocaleString("id-ID")}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedSlipData({
                                isOpen: true,
                                coach: currentCoach,
                                month: item.month,
                                totalSessions: item.totalSessions,
                                payPerSession: item.payPerSession,
                                bonusAmount: item.bonusAmount,
                                totalAmount: item.totalAmount,
                                status: item.status,
                                approvedAt: item.approvedAt,
                                notes: item.notes,
                                sessionDetails: item.sessionDetails || [],
                              });
                            }}
                            className="flex items-center gap-1 bg-white hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition shadow-2xs cursor-pointer active:scale-95"
                          >
                            <FileText size={13} />
                            <span>Slip Gaji</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. ROLE ADMIN VIEW: SPP SISWA & APPROVAL GAJI PELATIH */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Header Admin */}
          <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden">
            <div className="max-w-3xl mx-auto relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    <Banknote size={24} className="text-cyan-300" />
                    <span>Gaji &amp; SPP</span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-cyan-100 font-medium">
                    Pusat Penggajian Pelatih &amp; Verifikasi SPP Siswa
                  </p>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/20 text-white shrink-0">
                  <Calendar size={14} className="text-cyan-200" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-white font-bold text-xs sm:text-sm focus:outline-none cursor-pointer pr-1"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt} value={opt} className="bg-slate-900 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {activeSegment === "spp" && (
                  <button
                    onClick={() => setShowManualModal(true)}
                    className="flex items-center justify-center gap-1 bg-white hover:bg-cyan-50 text-blue-700 font-black text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl shadow-md shadow-black/10 transition active:scale-95 cursor-pointer shrink-0"
                  >
                    <Plus size={14} className="stroke-[3]" />
                    <span>Tagihan</span>
                  </button>
                )}
              </div>

              {/* Stats Cards Admin */}
              {activeSegment === "gaji" ? (
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                  <div className="bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 px-2 py-2 sm:px-3 sm:py-2.5 shadow-xs transition hover:bg-white/20 flex flex-col justify-center">
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-cyan-200 uppercase tracking-tight block truncate">
                      Estimasi Gaji
                    </span>
                    <p
                      className="text-[11px] sm:text-xs md:text-sm font-black text-white mt-0.5 truncate"
                      title={`Rp ${totalPayrollExpense.toLocaleString("id-ID")}`}
                    >
                      Rp{" "}
                      {totalPayrollExpense >= 1000000
                        ? `${(totalPayrollExpense / 1000000).toFixed(1).replace(/\.0$/, "")}jt`
                        : totalPayrollExpense.toLocaleString("id-ID")}
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 px-2 py-2 sm:px-3 sm:py-2.5 shadow-xs transition hover:bg-white/20 flex flex-col justify-center text-center sm:text-left">
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-cyan-200 uppercase tracking-tight block truncate">
                      Total Pelatih
                    </span>
                    <p className="text-[11px] sm:text-xs md:text-sm font-black text-white mt-0.5">
                      {coaches.length}{" "}
                      <span className="text-[9px] sm:text-[10px] font-normal text-cyan-100 hidden sm:inline">
                        Pelatih
                      </span>
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 px-2 py-2 sm:px-3 sm:py-2.5 shadow-xs transition hover:bg-white/20 flex flex-col justify-center text-center sm:text-left">
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-cyan-200 uppercase tracking-tight block truncate">
                      Dicairkan
                    </span>
                    <p className="text-[11px] sm:text-xs md:text-sm font-black text-emerald-300 mt-0.5">
                      {approvedPayrollCount}{" "}
                      <span className="text-[9px] sm:text-[10px] font-normal text-cyan-100">
                        /{coachCalculations.length}
                      </span>
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 px-2 py-2 sm:px-3 sm:py-2.5 shadow-xs transition hover:bg-white/20 flex flex-col justify-center text-center sm:text-left">
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-cyan-200 uppercase tracking-tight block truncate">
                      Approval
                    </span>
                    <p className="text-[11px] sm:text-xs md:text-sm font-black text-amber-300 mt-0.5">
                      {coachCalculations.length - approvedPayrollCount}{" "}
                      <span className="text-[9px] sm:text-[10px] font-normal text-cyan-100 hidden sm:inline">
                        Pelatih
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                  <div className="bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 px-2 py-2 sm:px-3 sm:py-2.5 shadow-xs transition hover:bg-white/20 flex flex-col justify-center">
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-cyan-200 uppercase tracking-tight block truncate">
                      Total Lunas
                    </span>
                    <p
                      className="text-[11px] sm:text-xs md:text-sm font-black text-white mt-0.5 truncate"
                      title={`Rp ${sppTotalLunas.toLocaleString("id-ID")}`}
                    >
                      Rp{" "}
                      {sppTotalLunas >= 1000000
                        ? `${(sppTotalLunas / 1000000).toFixed(1).replace(/\.0$/, "")}jt`
                        : sppTotalLunas.toLocaleString("id-ID")}
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 px-2 py-2 sm:px-3 sm:py-2.5 shadow-xs transition hover:bg-white/20 flex flex-col justify-center text-center sm:text-left">
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-cyan-200 uppercase tracking-tight block truncate">
                      Sudah Lunas
                    </span>
                    <p className="text-[11px] sm:text-xs md:text-sm font-black text-white mt-0.5">
                      {countLunas}{" "}
                      <span className="text-[9px] sm:text-[10px] font-normal text-cyan-100">
                        /{invoices.length}
                      </span>
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 px-2 py-2 sm:px-3 sm:py-2.5 shadow-xs transition hover:bg-white/20 flex flex-col justify-center text-center sm:text-left">
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-cyan-200 uppercase tracking-tight block truncate">
                      Review
                    </span>
                    <p className="text-[11px] sm:text-xs md:text-sm font-black text-amber-300 mt-0.5">
                      {countPending}{" "}
                      <span className="text-[9px] sm:text-[10px] font-normal text-cyan-100 hidden sm:inline">
                        Siswa
                      </span>
                    </p>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/20 px-2 py-2 sm:px-3 sm:py-2.5 shadow-xs transition hover:bg-white/20 flex flex-col justify-center text-center sm:text-left">
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-cyan-200 uppercase tracking-tight block truncate">
                      Belum Bayar
                    </span>
                    <p className="text-[11px] sm:text-xs md:text-sm font-black text-rose-300 mt-0.5">
                      {countUnpaid}{" "}
                      <span className="text-[9px] sm:text-[10px] font-normal text-cyan-100 hidden sm:inline">
                        Siswa
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Floating Body */}
          <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4 -mt-6 relative z-10">
            {/* Segmented Switcher */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-md shadow-slate-200/40 flex items-center gap-1.5">
              <button
                onClick={() => setActiveSegment("spp")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${activeSegment === "spp"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <CreditCard size={16} />
                <span>SPP Siswa ({invoices.length})</span>
              </button>
              <button
                onClick={() => setActiveSegment("gaji")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${activeSegment === "gaji"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                <Banknote size={16} />
                <span>Gaji Pelatih ({coaches.length})</span>
              </button>
            </div>

            {/* Segment 1: SPP Siswa (Admin) */}
            {activeSegment === "spp" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="relative flex-1">
                    <Search
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Cari nama siswa atau keterangan tagihan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="Menunggu Konfirmasi">Menunggu Review</option>
                      <option value="Lunas">Lunas</option>
                      <option value="Belum Dibayar">Belum Bayar</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <CreditCard size={18} className="text-blue-600" />
                      <span>Daftar Tagihan &amp; Pembayaran SPP Siswa</span>
                    </h3>
                    <span className="text-xs font-bold text-slate-500">
                      Menampilkan {filteredInvoices.length} data
                    </span>
                  </div>

                  {filteredInvoices.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-700 font-bold text-sm">
                        Tidak ada tagihan SPP ditemukan
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-base shrink-0">
                              {inv.name ? inv.name.charAt(0).toUpperCase() : "S"}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{inv.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {inv.desc || "SPP Bulanan Les Renang"}
                              </p>
                              <p className="text-xs font-black text-blue-700 mt-1">
                                Rp {inv.amount.toLocaleString("id-ID")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                            {inv.status === "Lunas" && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200">
                                <CheckCircle2 size={14} />
                                <span>Lunas</span>
                              </span>
                            )}
                            {inv.status === "Menunggu Konfirmasi" && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-black border border-amber-200 animate-pulse">
                                <Clock size={14} />
                                <span>Review Bukti</span>
                              </span>
                            )}
                            {inv.status === "Belum Dibayar" && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-black border border-rose-200">
                                <AlertCircle size={14} />
                                <span>Belum Bayar</span>
                              </span>
                            )}

                            {inv.uploadReceipt && (
                              <button
                                onClick={() => setPreviewInvoice(inv)}
                                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                              >
                                <Eye size={14} />
                                <span>Lihat Bukti</span>
                              </button>
                            )}

                            {inv.status === "Menunggu Konfirmasi" && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleApproveInvoice(inv)}
                                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                  <Check size={14} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleRejectInvoice(inv)}
                                  className="flex items-center gap-1 bg-rose-100 hover:bg-rose-200 text-rose-700 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
                                >
                                  <X size={14} />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            )}

                            {inv.status === "Belum Dibayar" && (
                              <button
                                onClick={() => handleApproveInvoice(inv)}
                                className="flex items-center gap-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold transition border border-slate-200"
                              >
                                <Check size={14} />
                                <span>Set Lunas</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Segment 2: Gaji Pelatih (Admin) */}
            {activeSegment === "gaji" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {coachCalculations.map((item) => {
                    const isApproved = item.status === "Approved";

                    return (
                      <div
                        key={item.coach.id}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-blue-200 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 font-black text-lg flex items-center justify-center shrink-0">
                              {item.coach.name ? item.coach.name.charAt(0).toUpperCase() : "P"}
                            </div>
                            <div>
                              <h4 className="text-base font-black text-slate-900">
                                {item.coach.name}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {item.coach.spec || "Instruktur Renang"} • {item.coach.class || "Prestasi"}
                              </p>
                            </div>
                          </div>

                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200 shrink-0">
                              <CheckCircle2 size={13} />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black border border-amber-200 shrink-0">
                              <Clock size={13} />
                              <span>Menunggu Approval</span>
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl space-y-2 text-xs">
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Sesi Selesai Mengajar:</span>
                            <span className="font-bold text-slate-900">
                              {item.completedSessions} Sesi
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Honor per Sesi:</span>
                            <span className="font-bold text-slate-900">
                              Rp {item.payPerSession.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                            <span>Total Gaji Periode Ini:</span>
                            <span className="text-blue-700 text-base">
                              Rp {item.totalAmount.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 gap-2">
                          <button
                            onClick={() => {
                              setSelectedSlipData({
                                isOpen: true,
                                coach: item.coach,
                                month: selectedMonth,
                                totalSessions: item.completedSessions,
                                payPerSession: item.payPerSession,
                                bonusAmount: item.bonus,
                                totalAmount: item.totalAmount,
                                status: item.status,
                                approvedAt: item.approvedAt,
                                notes: item.notes,
                              });
                            }}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                          >
                            <FileText size={14} />
                            <span>Slip Gaji</span>
                          </button>

                          {isApproved ? (
                            <button
                              disabled
                              className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold cursor-default"
                            >
                              <Check size={15} />
                              <span>Gaji Telah Cair</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApproveCoachPayroll(item)}
                              disabled={approvingPayrollId === item.coach.id}
                              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
                            >
                              <CheckCircle2 size={15} />
                              <span>
                                {approvingPayrollId === item.coach.id
                                  ? "Memproses..."
                                  : "Setujui Gaji"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SLIP GAJI PELATIH (RESMI & CETAK) */}
      {/* ========================================================= */}
      <SlipGajiModal
        isOpen={selectedSlipData.isOpen}
        onClose={() => setSelectedSlipData((prev) => ({ ...prev, isOpen: false }))}
        coach={selectedSlipData.coach}
        month={selectedSlipData.month}
        totalSessions={selectedSlipData.totalSessions}
        payPerSession={selectedSlipData.payPerSession}
        bonusAmount={selectedSlipData.bonusAmount}
        deductionAmount={selectedSlipData.deductionAmount}
        totalAmount={selectedSlipData.totalAmount}
        status={selectedSlipData.status}
        approvedAt={selectedSlipData.approvedAt}
        notes={selectedSlipData.notes}
        sessionDetails={selectedSlipData.sessionDetails}
      />

      {/* MODAL: PREVIEW BUKTI TRANSFER SPP (ADMIN) */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Bukti Transfer SPP</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {previewInvoice.name} • Rp {previewInvoice.amount.toLocaleString("id-ID")}
                </p>
              </div>
              <button
                onClick={() => setPreviewInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2 overflow-hidden flex items-center justify-center min-h-[220px]">
              {previewInvoice.uploadReceipt ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewInvoice.uploadReceipt}
                  alt="Bukti Transfer"
                  className="max-h-[350px] w-auto object-contain rounded-xl shadow-sm"
                />
              ) : (
                <p className="text-slate-400 text-xs font-bold">Bukti transfer tidak tersedia</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Tutup
              </button>
              {previewInvoice.status === "Menunggu Konfirmasi" && (
                <>
                  <button
                    onClick={() => handleRejectInvoice(previewInvoice)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition border border-rose-200 cursor-pointer"
                  >
                    Tolak Bukti
                  </button>
                  <button
                    onClick={() => handleApproveInvoice(previewInvoice)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Check size={16} />
                    <span>Approve Pembayaran</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BUAT TAGIHAN SPP MANUAL (ADMIN) */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-blue-600" />
                <span>Buat Tagihan SPP Manual</span>
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateManualInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Siswa <span className="text-rose-500">*</span>
                </label>
                <select
                  value={manualStudentId}
                  onChange={(e) => {
                    setManualStudentId(e.target.value);
                    const matched = students.find((s) => s.id === e.target.value);
                    if (matched) {
                      setManualDesc(
                        `SPP Renang Kelas ${matched.class || "Prestasi"} - ${selectedMonth}`
                      );
                    }
                  }}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.class || "Prestasi"}) - Wali: {st.parent}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal SPP (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(Number(e.target.value))}
                  required
                  min={10000}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Tagihan
                </label>
                <input
                  type="text"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {manualSubmitting ? "Menyimpan..." : "Simpan Tagihan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
