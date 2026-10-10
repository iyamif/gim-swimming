import React, { useState, useMemo } from "react";
import {
  Invoice,
  Student,
  Coach,
  AttendanceRecord,
  ScheduleSession,
  FinancialTransaction,
  CoachPayroll,
} from "../types";
import {
  CalendarDays,
  CreditCard,
  ChevronRight,
  Handshake,
  AlertTriangle,
  Eye,
  Check,
  X,
  Search,
  MapPin,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Download,
} from "lucide-react";

interface KeuanganTabProps {
  invoices: Invoice[];
  sessionRole: string;
  students?: Student[];
  coaches?: Coach[];
  schedules?: ScheduleSession[];
  attendances?: AttendanceRecord[];
  financialTransactions?: FinancialTransaction[];
  payrolls?: CoachPayroll[];
  loadingData?: boolean;
  onAddFinancialTransaction?: (data: {
    type: "income" | "expense";
    category: string;
    title: string;
    amount: number;
    date: string;
    notes?: string;
  }) => Promise<void> | void;
  onDeleteFinancialTransaction?: (id: string) => Promise<void> | void;
  sessionUser?: string;
  onVerifyPayment: (invoiceId: string, confirm: boolean) => void;
  setActiveTab?: (tab: string) => void;
}

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const MONTH_NAMES_FULL = [
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

export default function KeuanganTab({
  invoices,
  sessionRole,
  students = [],
  coaches = [],
  schedules = [],
  attendances = [],
  financialTransactions = [],
  payrolls = [],
  loadingData = false,
  onAddFinancialTransaction,
  onDeleteFinancialTransaction,
  sessionUser,
  onVerifyPayment,
  setActiveTab,
}: KeuanganTabProps) {
  if (sessionRole !== "admin") return null;

  // Real Current Date
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 1. Dynamic 6-Month Rolling Window ending on current month (e.g. Mei - Okt 2026)
  const rollingMonths = useMemo(() => {
    const list = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      list.push({
        year: y,
        monthIndex: m,
        key: `${y}-${String(m + 1).padStart(2, "0")}`,
        shortLabel: MONTH_NAMES_SHORT[m],
        fullLabel: `${MONTH_NAMES_FULL[m]} ${y}`,
        shortPeriod: `${MONTH_NAMES_SHORT[m]} ${y}`,
      });
    }
    return list;
  }, [now]);

  // Selected Period State (Defaults to Current Month Key)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  // Derive readable label from selected key
  const selectedPeriodObj = useMemo(() => {
    const found = rollingMonths.find((m) => m.key === selectedMonthKey);
    if (found) return found;
    const [yStr, mStr] = selectedMonthKey.split("-");
    const y = parseInt(yStr, 10) || now.getFullYear();
    const m = (parseInt(mStr, 10) || 1) - 1;
    return {
      year: y,
      monthIndex: m,
      key: selectedMonthKey,
      shortLabel: MONTH_NAMES_SHORT[m] || "Bln",
      fullLabel: `${MONTH_NAMES_FULL[m] || "Bulan"} ${y}`,
      shortPeriod: `${MONTH_NAMES_SHORT[m] || "Bln"} ${y}`,
    };
  }, [selectedMonthKey, rollingMonths, now]);

  // Modals for Transaction History & Add Transaction
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [showPaymentReceivedModal, setShowPaymentReceivedModal] = useState(false);
  const [showCoachPaymentModal, setShowCoachPaymentModal] = useState(false);
  const [modalViewAllTime, setModalViewAllTime] = useState(false);
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<Invoice | null>(null);

  // Search & Filter for Student SPP Table
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "CONFIRM">("ALL");

  // Form State for "+ Catat Transaksi"
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txCategory, setTxCategory] = useState("Pendaftaran Siswa Baru");
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [txNotes, setTxNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  const incomeCategories = [
    "Pendaftaran Siswa Baru",
    "Merchandise & Alat Renang",
    "Sewa Perlengkapan/Pelampung",
    "Event & Lomba Renang",
    "Sponsorship & Donasi",
    "Pemasukan Lainnya",
  ];

  const expenseCategories = [
    "Sewa Jalur Kolam",
    "Peralatan & Kaporit",
    "Konsumsi & Operasional",
    "Bonus/Insentif Tambahan Pelatih",
    "Transport & Logistik",
    "Pengeluaran Lainnya",
  ];

  // Helper for Date Parsing
  const getMonthKeyFromDate = (dateStr?: string): string => {
    if (!dateStr) return currentMonthKey;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return currentMonthKey;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } catch {
      return currentMonthKey;
    }
  };

  // Helper to resolve an Invoice's month key accurately
  const getInvoiceMonthKey = (inv: Invoice): string => {
    const dateVal = inv.date || inv.createdAt;
    if (dateVal) {
      try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        }
      } catch {
        // Fallback
      }
    }

    const desc = (inv.desc || "").toLowerCase();
    for (let m = 0; m < 12; m++) {
      const full = MONTH_NAMES_FULL[m].toLowerCase();
      const short = MONTH_NAMES_SHORT[m].toLowerCase();
      // Match whole word to avoid substring collisions
      const regex = new RegExp(`\\b(${full}|${short})\\b`, "i");
      if (regex.test(desc)) {
        const matchYear = desc.match(/20\\d{2}/);
        const y = matchYear ? parseInt(matchYear[0], 10) : now.getFullYear();
        return `${y}-${String(m + 1).padStart(2, "0")}`;
      }
    }
    return currentMonthKey;
  };

  // Format IDR currency
  const formatIDR = (num: number) => {
    return `Rp ${Math.round(num).toLocaleString("id-ID")}`;
  };

  const formatShortK = (num: number) => {
    if (Math.abs(num) >= 1000000) {
      return `IDR ${(num / 1000000).toFixed(2).replace(/\\.00$/, "")}M`;
    }
    if (Math.abs(num) >= 1000) {
      return `IDR ${(num / 1000).toFixed(0)}k`;
    }
    return `IDR ${Math.round(num)}`;
  };

  // ==========================================
  // REAL-DATA AGGREGATIONS (100% FROM DATABASE)
  // ==========================================

  // Stable Status Helpers
  const isPaid = (status?: string) => {
    const s = (status || "").toLowerCase().trim();
    return s === "lunas" || s === "paid" || s === "sudah bayar";
  };
  const isPendingConfirm = (status?: string) => {
    const s = (status || "").toLowerCase().trim();
    return s === "menunggu konfirmasi" || s === "verifikasi" || s === "pending_verification";
  };
  const isUnpaid = (status?: string) => {
    const s = (status || "").toLowerCase().trim();
    return s === "belum dibayar" || s === "belum bayar" || s === "unpaid" || s === "pending";
  };

  // Helper to match CoachPayroll records with target monthKey (YYYY-MM)
  const isPayrollMatchingMonth = (p: CoachPayroll, targetMonthKey: string) => {
    if (!p.month) return false;
    const pMonth = p.month.trim().toLowerCase();
    if (pMonth.includes(targetMonthKey)) return true;
    const [yStr, mStr] = targetMonthKey.split("-");
    const mIdx = parseInt(mStr, 10) - 1;
    const yNum = parseInt(yStr, 10);
    if (mIdx >= 0 && mIdx < 12) {
      const mFull = MONTH_NAMES_FULL[mIdx].toLowerCase();
      const mShort = MONTH_NAMES_SHORT[mIdx].toLowerCase();
      if ((pMonth.includes(mFull) || pMonth.includes(mShort)) && pMonth.includes(String(yNum))) {
        return true;
      }
    }
    return false;
  };

  // Invoices categorization
  const pendingInvoices = useMemo(() => invoices.filter((i) => isPendingConfirm(i.status)), [invoices]);
  const paidInvoices = useMemo(() => invoices.filter((i) => isPaid(i.status)), [invoices]);
  const unpaidInvoices = useMemo(() => invoices.filter((i) => isUnpaid(i.status)), [invoices]);

  // Filter financial transactions to exclude auto-recorded SPP invoices and auto-recorded Coach Payrolls
  const manualTransactions = useMemo(() => {
    return financialTransactions.filter((t) => {
      const isAutoSpp =
        t.category === "SPP Siswa" ||
        (t.notes && t.notes.toLowerCase().includes("auto-recorded dari approval spp"));
      const isAutoGaji =
        t.category === "Gaji Pelatih" ||
        (t.notes && t.notes.toLowerCase().includes("auto-recorded dari approval gaji"));
      return !isAutoSpp && !isAutoGaji;
    });
  }, [financialTransactions]);

  // Dynamic Coach Payments calculation for any specified month key
  // PERATURAN: Hanya honor/gaji yang telah di-ACC/approve oleh Admin yang masuk ke perhitungan keuangan.
  const calculateCoachPayrollForMonth = (monthKey: string) => {
    return coaches.map((c, idx) => {
      const coachSchedules = schedules.filter((s) => {
        const matchCoach =
          s.coachId === c.id ||
          s.coachName?.toLowerCase().trim() === c.name.toLowerCase().trim() ||
          c.name.toLowerCase().includes(s.coachName?.toLowerCase().trim() || "");
        const matchMonth = getMonthKeyFromDate(s.date) === monthKey;
        return matchCoach && matchMonth;
      });

      const completedSchedules = coachSchedules.filter((s) => {
        if (s.status === "Completed") return true;
        if (s.date && new Date(s.date) <= now && s.status !== "Cancelled") return true;
        return false;
      });

      const verifiedCoachAttendances = attendances.filter((a) => {
        const isCoachPerson =
          a.person_type === "coach" &&
          (String(a.person_id) === String(c.id) ||
            a.person_name?.toLowerCase().trim() === c.name.toLowerCase().trim() ||
            c.name.toLowerCase().includes(a.person_name?.toLowerCase().trim() || ""));
        const isValidStatus =
          a.status === "Hadir" || a.status === "Terlambat" || a.status === "Selesai";
        const matchMonth = getMonthKeyFromDate(a.date) === monthKey;
        return isCoachPerson && isValidStatus && matchMonth;
      });

      const matchingPr = payrolls.find(
        (p) =>
          (String(p.coach_id) === String(c.id) ||
            p.coach_name?.toLowerCase().trim() === c.name.toLowerCase().trim() ||
            c.name.toLowerCase().includes(p.coach_name?.toLowerCase().trim() || "")) &&
          isPayrollMatchingMonth(p, monthKey)
      );

      const sessionsCount = matchingPr
        ? matchingPr.total_sessions
        : Math.max(
            completedSchedules.length,
            verifiedCoachAttendances.length,
            coachSchedules.length > 0 ? coachSchedules.length : 0
          );

      const ratePerSession =
        matchingPr?.pay_per_session || c.pay_per_session || c.payPerSession || 100000;
      const isApproved = matchingPr?.status === "Approved";

      // Aturan: Sebelum di-ACC admin, totalHonor = 0 (tidak masuk perhitungan keuangan).
      const approvedHonor = isApproved ? (matchingPr.total_amount || sessionsCount * ratePerSession) : 0;
      const estimatedHonor = sessionsCount * ratePerSession + (matchingPr?.bonus_amount || 0);

      return {
        id: c.id || `coach-${idx}`,
        name: c.name,
        spec: c.spec || "Instruktur Renang",
        phone: c.phone,
        avatar: c.avatar,
        verifiedCount: verifiedCoachAttendances.length,
        completedSchedulesCount: completedSchedules.length,
        sessionsCount,
        ratePerSession,
        totalHonor: approvedHonor, // HANYA honor disetujui yang masuk perhitungan keuangan
        estimatedHonor,
        isApproved,
        status: isApproved
          ? ("Approved" as const)
          : sessionsCount > 0
            ? ("Pending" as const)
            : ("Belum Ada Sesi" as const),
        approvedAt: matchingPr?.approved_at,
        notes: matchingPr?.notes || "",
        recentAttendances: verifiedCoachAttendances.slice(0, 5),
      };
    });
  };

  // Selected Month Breakdown Calculations
  const activeMonthCoachPayrolls = useMemo(() => {
    return calculateCoachPayrollForMonth(selectedMonthKey);
  }, [selectedMonthKey, coaches, schedules, attendances, payrolls, now]);

  const activeMonthApprovedCoachesCount = useMemo(() => {
    return activeMonthCoachPayrolls.filter((c) => c.isApproved).length;
  }, [activeMonthCoachPayrolls]);

  const activeMonthPendingCoachesCount = useMemo(() => {
    return activeMonthCoachPayrolls.filter((c) => !c.isApproved && c.sessionsCount > 0).length;
  }, [activeMonthCoachPayrolls]);

  const activeMonthCoachExpenses = useMemo(() => {
    return activeMonthCoachPayrolls.reduce((acc, curr) => acc + curr.totalHonor, 0);
  }, [activeMonthCoachPayrolls]);

  const activeMonthPaidInvoices = useMemo(() => {
    return paidInvoices.filter((inv) => getInvoiceMonthKey(inv) === selectedMonthKey);
  }, [paidInvoices, selectedMonthKey]);

  const activeMonthStudentIncome = useMemo(() => {
    return activeMonthPaidInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [activeMonthPaidInvoices]);

  const activeMonthManualIncome = useMemo(() => {
    return manualTransactions
      .filter((t) => t.type === "income" && getMonthKeyFromDate(t.date) === selectedMonthKey)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [manualTransactions, selectedMonthKey]);

  const activeMonthManualExpense = useMemo(() => {
    return manualTransactions
      .filter((t) => t.type === "expense" && getMonthKeyFromDate(t.date) === selectedMonthKey)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [manualTransactions, selectedMonthKey]);

  // Grand Totals for Active Selected Month
  const activeMonthTotalIncome = activeMonthStudentIncome + activeMonthManualIncome;
  const activeMonthTotalExpense = activeMonthCoachExpenses + activeMonthManualExpense;
  const activeMonthNetProfit = activeMonthTotalIncome - activeMonthTotalExpense;
  const activeMonthProfitMargin =
    activeMonthTotalIncome > 0
      ? Math.round((activeMonthNetProfit / activeMonthTotalIncome) * 100)
      : 0;

  // Monthly Financial Data for Bar Chart (Rolling 6 Months - Pure Database Aggregations, No Duplications)
  const monthlyChartData = useMemo(() => {
    return rollingMonths.map((m) => {
      // 1. Paid student SPP invoices belonging to this month
      const monthPaidInvoices = paidInvoices.filter(
        (inv) => getInvoiceMonthKey(inv) === m.key
      );
      const studentIncome = monthPaidInvoices.reduce(
        (sum, inv) => sum + (inv.amount || 0),
        0
      );

      // 2. Custom financial transactions (non-duplicate) from database for this month
      const customIncome = manualTransactions
        .filter((t) => t.type === "income" && getMonthKeyFromDate(t.date) === m.key)
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const customExpense = manualTransactions
        .filter((t) => t.type === "expense" && getMonthKeyFromDate(t.date) === m.key)
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // 3. Coach completed session honor for this month
      const monthCoachPayroll = calculateCoachPayrollForMonth(m.key);
      const coachExpense = monthCoachPayroll.reduce((acc, curr) => acc + curr.totalHonor, 0);

      const totalMonthIncome = studentIncome + customIncome;
      const totalMonthExpense = coachExpense + customExpense;

      return {
        key: m.key,
        month: m.shortLabel,
        fullPeriod: m.fullLabel,
        income: totalMonthIncome,
        expenses: totalMonthExpense,
        studentIncome,
        customIncome,
        coachExpense,
        customExpense,
        isCurrent: m.key === currentMonthKey,
        isSelected: m.key === selectedMonthKey,
      };
    });
  }, [
    rollingMonths,
    paidInvoices,
    manualTransactions,
    coaches,
    schedules,
    attendances,
    payrolls,
    currentMonthKey,
    selectedMonthKey,
    now,
  ]);

  // Max value for chart vertical scaling (dynamic based on highest data point)
  const maxChartValue = useMemo(() => {
    const highest = Math.max(
      ...monthlyChartData.map((d) => Math.max(d.income, d.expenses)),
      500000
    );
    return Math.ceil((highest * 1.25) / 200000) * 200000;
  }, [monthlyChartData]);

  // Filtered Student SPP list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.desc && inv.desc.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "PAID") return isPaid(inv.status);
      if (statusFilter === "PENDING") return isUnpaid(inv.status);
      if (statusFilter === "CONFIRM") return isPendingConfirm(inv.status);
      return true;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Handler: Add Custom Transaction to PostgreSQL Backend
  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const parsedAmount = parseFloat(txAmount.replace(/[^0-9]/g, ""));
    if (!txTitle.trim()) {
      setFormError("Judul transaksi wajib diisi.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Nominal transaksi harus berupa angka positif.");
      return;
    }
    if (!txDate) {
      setFormError("Tanggal transaksi wajib dipilih.");
      return;
    }

    try {
      setIsSubmittingTx(true);
      if (onAddFinancialTransaction) {
        await onAddFinancialTransaction({
          type: txType,
          category: txCategory,
          title: txTitle.trim(),
          amount: parsedAmount,
          date: txDate,
          notes: txNotes.trim(),
        });
      }

      setTxTitle("");
      setTxAmount("");
      setTxNotes("");
      setShowAddTransactionModal(false);
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan transaksi ke database.");
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Handler: Export Total Income & Expense Breakdown to Excel CSV based on selected month
  const handleExportExcel = () => {
    const periodName = selectedPeriodObj.fullLabel;
    const cleanPeriodStr = selectedPeriodObj.shortPeriod.replace(/\s+/g, "_");
    const fileName = `Laporan_Keuangan_GIM_${cleanPeriodStr}.csv`;

    const selectedManualIncomes = manualTransactions.filter(
      (t) => t.type === "income" && getMonthKeyFromDate(t.date) === selectedMonthKey
    );
    const selectedManualExpenses = manualTransactions.filter(
      (t) => t.type === "expense" && getMonthKeyFromDate(t.date) === selectedMonthKey
    );

    const csvRows: string[][] = [];

    const pushRow = (...cols: (string | number)[]) => {
      csvRows.push(
        cols.map((col) => {
          const str = String(col ?? "").replace(/"/g, '""');
          return `"${str}"`;
        })
      );
    };

    // Document Header
    pushRow("LAPORAN KEUANGAN GIM SWIMMING ACADEMY");
    pushRow("Periode Bulan", periodName);
    pushRow("Tanggal Export", new Date().toLocaleDateString("id-ID"));
    pushRow("");

    // Ringkasan Keuangan (Summary)
    pushRow("=== RINGKASAN KEUANGAN ===");
    pushRow("Kategori", "Jumlah (Rp)");
    pushRow("Total Pemasukan (Income)", activeMonthTotalIncome);
    pushRow("Total Pengeluaran (Expense)", activeMonthTotalExpense);
    pushRow("Sisa Kas / Net Profit", activeMonthNetProfit);
    pushRow("Margin Keuntungan", `${activeMonthProfitMargin}%`);
    pushRow("");

    // Rincian Pemasukan (Income Breakdown)
    pushRow("=== RINCIAN PEMASUKAN ===");
    pushRow("No", "Tanggal", "Kategori", "Nama Siswa / Item", "Deskripsi / Catatan", "Status", "Nominal (Rp)");

    let incomeIdx = 1;
    activeMonthPaidInvoices.forEach((inv) => {
      pushRow(
        incomeIdx++,
        inv.date || inv.createdAt || "-",
        "SPP Siswa",
        inv.name || "Siswa",
        inv.desc || "Pembayaran SPP",
        inv.status || "Lunas",
        inv.amount || 0
      );
    });

    selectedManualIncomes.forEach((t) => {
      pushRow(
        incomeIdx++,
        t.date || "-",
        t.category || "Pemasukan Lainnya",
        t.title || "-",
        t.notes || "-",
        "Terverifikasi",
        t.amount || 0
      );
    });

    pushRow("", "", "", "", "", "TOTAL PEMASUKAN", activeMonthTotalIncome);
    pushRow("");

    // Rincian Pengeluaran (Expense Breakdown)
    pushRow("=== RINCIAN PENGELUARAN ===");
    pushRow("No", "Tanggal", "Kategori", "Nama Pelatih / Item", "Rincian / Catatan", "Status", "Nominal (Rp)");

    let expenseIdx = 1;
    activeMonthCoachPayrolls.forEach((cp) => {
      if (cp.totalHonor > 0 || cp.isApproved) {
        pushRow(
          expenseIdx++,
          cp.approvedAt ? new Date(cp.approvedAt).toLocaleDateString("id-ID") : "-",
          "Gaji Pelatih",
          cp.name,
          `${cp.sessionsCount} Sesi x Rp ${cp.ratePerSession.toLocaleString("id-ID")}`,
          cp.status === "Approved" ? "Lunas / ACC" : cp.status,
          cp.totalHonor
        );
      }
    });

    selectedManualExpenses.forEach((t) => {
      pushRow(
        expenseIdx++,
        t.date || "-",
        t.category || "Pengeluaran Lainnya",
        t.title || "-",
        t.notes || "-",
        "Terverifikasi",
        t.amount || 0
      );
    });

    pushRow("", "", "", "", "", "TOTAL PENGELUARAN", activeMonthTotalExpense);

    // CSV Blob Download with UTF-8 BOM for Microsoft Excel compatibility
    const csvContent = "\uFEFF" + csvRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-28 sm:pb-24 bg-[#f8fafc] min-h-full font-sans antialiased">
      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (RESPONSIVE PWA)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(1.25rem,calc(env(safe-area-inset-top)+0.5rem))] sm:pt-6 pb-10 sm:pb-12 px-4 sm:px-8 shadow-lg shadow-blue-700/15 overflow-hidden rounded-none">
        {/* Subtle Concentric Decorative Rings */}
        <div className="absolute -top-10 -right-10 h-52 w-52 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -top-4 -right-4 h-36 w-36 rounded-full border border-white/15 pointer-events-none" />

        {/* Ambient Glow */}
        <div className="absolute -bottom-10 right-0 h-36 w-36 rounded-full bg-blue-500/25 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 flex items-center justify-between gap-2.5">
          {/* Title: Keuangan & Subtitle */}
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5 leading-tight">
              <span>Keuangan</span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-cyan-100 border border-white/20 shrink-0">
                Admin
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-cyan-100/90 font-medium mt-0.5 truncate">
              Arus Kas &amp; Rekapitulasi SPP Bulan Berjalan
            </p>
          </div>

          {/* Action Buttons: Periode, Export & + Catat Transaksi */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/15 hover:bg-white/25 text-white text-[11px] sm:text-xs font-bold border border-white/20 backdrop-blur-xs transition cursor-pointer shadow-2xs active:scale-95"
              title="Ganti Periode Bulan"
            >
              <CalendarDays size={13} className="shrink-0" />
              <span>{selectedPeriodObj.shortPeriod}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-emerald-500/90 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-black border border-emerald-400/30 transition cursor-pointer shadow-2xs active:scale-95"
              title="Export Laporan Keuangan ke Excel"
            >
              <Download size={13} className="shrink-0" />
              <span>Export</span>
            </button>

            <button
              onClick={() => setShowAddTransactionModal(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white text-blue-700 hover:bg-cyan-50 text-[11px] sm:text-xs font-black transition cursor-pointer shadow-sm active:scale-95"
              title="Catat Pemasukan atau Pengeluaran"
            >
              <Plus size={14} className="stroke-[3] shrink-0" />
              <span className="hidden sm:inline">Catat</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          MAIN CONTAINER (FLOATING CARDS - COMPACT PWA)
          ========================================== */}
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 space-y-3.5 sm:space-y-4 -mt-6 sm:-mt-8 relative z-20">
        {loadingData ? (
          <div className="space-y-3.5 sm:space-y-4">
            {/* Skeleton Card 0: Summary */}
            <div className="p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-md shadow-slate-200/50 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="h-4 w-36 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-4 w-20 bg-slate-200 rounded-lg animate-pulse" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Skeleton Card 1: Chart */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-44 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-4 w-28 bg-slate-200 rounded-lg animate-pulse" />
              </div>
              <div className="h-44 sm:h-56 bg-slate-50/70 rounded-2xl p-4 flex items-end justify-between gap-3 border border-slate-100/60">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex-1 flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                    <div className="w-1/2 bg-slate-200 rounded-t-md animate-pulse" style={{ height: `${30 + (i % 3) * 20}%` }} />
                    <div className="w-1/2 bg-slate-200/60 rounded-t-md animate-pulse" style={{ height: `${20 + (i % 2) * 25}%` }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton Card 2: Transactions / SPP */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
              <div className="h-4 w-36 bg-slate-200 rounded-lg animate-pulse" />
              <div className="divide-y divide-slate-100">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-xl animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-28 bg-slate-200 rounded animate-pulse" />
                        <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* ==========================================
            SECTION 0: SIMPLE & COMPACT FINANCIAL SUMMARY
            ========================================== */}
        <div className="p-3.5 sm:p-4.5 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-md shadow-slate-200/50 space-y-2.5">
          {/* Header row with Period & Status */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
              <h3 className="font-black text-slate-800 text-[11px] sm:text-xs truncate">
                Ringkasan {selectedPeriodObj.fullLabel}
              </h3>
              {selectedMonthKey === currentMonthKey ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                  Bulan Berjalan
                </span>
              ) : (
                <button
                  onClick={() => setSelectedMonthKey(currentMonthKey)}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 cursor-pointer transition shrink-0 flex items-center gap-0.5"
                >
                  <Sparkles size={10} />
                  <span>Ke Bulan Ini</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setShowPeriodModal(true)}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-bold shrink-0 cursor-pointer"
            >
              Ubah Periode
            </button>
          </div>

          {/* Compact 3-Column Stats Grid */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center sm:text-left">
            {/* 1. PEMASUKAN */}
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-50/60 border border-emerald-100/80 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] sm:text-[11px] font-black text-emerald-800 uppercase tracking-tight flex items-center gap-0.5 truncate">
                  <ArrowUpRight size={12} className="stroke-[3] text-emerald-600 shrink-0 hidden sm:inline" />
                  <span>Pemasukan</span>
                </span>
                <span className="text-[9px] font-bold text-emerald-700/80 hidden sm:inline">
                  +{activeMonthPaidInvoices.length} SPP
                </span>
              </div>
              <p className="text-[12px] sm:text-base font-black text-emerald-950 tracking-tight truncate" title={formatIDR(activeMonthTotalIncome)}>
                {formatIDR(activeMonthTotalIncome)}
              </p>
              <p className="text-[9px] text-emerald-700 font-medium sm:hidden mt-0.5 truncate">
                {activeMonthPaidInvoices.length} SPP Lunas
              </p>
            </div>

            {/* 2. PENGELUARAN */}
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-50/60 border border-amber-100/80 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] sm:text-[11px] font-black text-amber-800 uppercase tracking-tight flex items-center gap-0.5 truncate">
                  <ArrowDownRight size={12} className="stroke-[3] text-amber-600 shrink-0 hidden sm:inline" />
                  <span>Pengeluaran</span>
                </span>
                <span className="text-[9px] font-bold text-amber-700/80 hidden sm:inline">
                  Honor &amp; Ops
                </span>
              </div>
              <p className="text-[12px] sm:text-base font-black text-amber-950 tracking-tight truncate" title={formatIDR(activeMonthTotalExpense)}>
                {formatIDR(activeMonthTotalExpense)}
              </p>
              <p className="text-[9px] text-amber-700 font-medium sm:hidden mt-0.5 truncate">
                Honor Pelatih
              </p>
            </div>

            {/* 3. SISA KAS / NET */}
            <div
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border flex flex-col justify-between ${
                activeMonthNetProfit >= 0
                  ? "bg-blue-50/60 border-blue-100/80 text-blue-950"
                  : "bg-rose-50/60 border-rose-100/80 text-rose-950"
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={`text-[10px] sm:text-[11px] font-black uppercase tracking-tight flex items-center gap-0.5 truncate ${
                    activeMonthNetProfit >= 0 ? "text-blue-800" : "text-rose-800"
                  }`}
                >
                  {activeMonthNetProfit >= 0 ? (
                    <TrendingUp size={12} className="stroke-[3] text-blue-600 shrink-0 hidden sm:inline" />
                  ) : (
                    <TrendingDown size={12} className="stroke-[3] text-rose-600 shrink-0 hidden sm:inline" />
                  )}
                  <span>Sisa Kas</span>
                </span>
                <span
                  className={`text-[9px] font-bold px-1 py-0.2 rounded hidden sm:inline ${
                    activeMonthNetProfit >= 0 ? "text-emerald-700 bg-emerald-100/60" : "text-rose-700 bg-rose-100/60"
                  }`}
                >
                  {activeMonthProfitMargin}%
                </span>
              </div>
              <p className="text-[12px] sm:text-base font-black tracking-tight truncate" title={formatIDR(activeMonthNetProfit)}>
                {activeMonthNetProfit >= 0 ? "+" : ""}
                {formatIDR(activeMonthNetProfit)}
              </p>
              <p
                className={`text-[9px] font-bold sm:hidden mt-0.5 truncate ${
                  activeMonthNetProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {activeMonthNetProfit >= 0 ? "Surplus" : "Defisit"} ({activeMonthProfitMargin}%)
              </p>
            </div>
          </div>
        </div>

        {/* ==========================================
            CARD 1: FINANCIAL OVERVIEW & 6-MONTH CHART
            ========================================== */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3 sm:space-y-4">
          {/* Top Title & Legend */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                Financial Overview (6 Bulan)
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                Income vs Expenses bulanan
              </p>
            </div>

            <div className="flex items-center gap-3 text-[10px] sm:text-xs font-bold">
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-600 shadow-2xs" />
                <span className="text-slate-700">Income</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500 shadow-2xs" />
                <span className="text-slate-700">Expense</span>
              </div>
            </div>
          </div>

          {/* Vertical Bar Chart Container (Dynamic 6 Months Rolling) */}
          <div className="pt-1">
            <div className="relative h-44 sm:h-56 flex items-end justify-between gap-1 sm:gap-2 pb-6 pt-5 px-1.5 sm:px-3 bg-slate-50/70 rounded-xl sm:rounded-2xl border border-slate-100">
              {/* Background Grid Lines & Y-Axis Labels */}
              <div className="absolute inset-x-2 sm:inset-x-3 top-5 bottom-6 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-b border-slate-300 border-dashed w-full relative">
                  <span className="absolute -top-3 -left-0.5 text-[8px] sm:text-[9px] font-bold text-slate-400">
                    {formatShortK(maxChartValue)}
                  </span>
                </div>
                <div className="border-b border-slate-300 border-dashed w-full relative">
                  <span className="absolute -top-3 -left-0.5 text-[8px] sm:text-[9px] font-bold text-slate-400">
                    {formatShortK(maxChartValue * 0.5)}
                  </span>
                </div>
                <div className="border-b border-slate-300 w-full relative">
                  <span className="absolute -top-3 -left-0.5 text-[8px] sm:text-[9px] font-bold text-slate-400">
                    0
                  </span>
                </div>
              </div>

              {/* Monthly Bar Pairs */}
              {monthlyChartData.map((item, idx) => {
                const incomeHeight =
                  item.income > 0
                    ? Math.min(100, Math.max(6, Math.round((item.income / maxChartValue) * 100)))
                    : 0;
                const expenseHeight =
                  item.expenses > 0
                    ? Math.min(100, Math.max(6, Math.round((item.expenses / maxChartValue) * 100)))
                    : 0;

                const isSelected = item.key === selectedMonthKey;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedMonthKey(item.key)}
                    className={`flex-1 flex flex-col items-center justify-end h-full relative group z-10 cursor-pointer p-0.5 rounded-lg transition ${
                      isSelected ? "bg-blue-100/35 ring-1.5 ring-blue-500/40" : "hover:bg-slate-100/50"
                    }`}
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-14 bg-slate-900 text-white text-[9px] py-1.5 px-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap shadow-xl z-30 space-y-0.5">
                      <p className="font-black text-white">
                        {item.month} ({item.fullPeriod}):
                      </p>
                      <p className="text-cyan-300 font-bold">
                        Income: {formatIDR(item.income)}
                      </p>
                      <p className="text-amber-300 font-bold">
                        Expense: {formatIDR(item.expenses)}
                      </p>
                    </div>

                    {/* Dual Bars Wrapper */}
                    <div className="flex items-end justify-center gap-0.5 sm:gap-1.5 w-full max-w-[28px] sm:max-w-[36px] h-full pb-0.5">
                      {/* Income Bar (Blue) */}
                      <div
                        className={`w-1/2 rounded-t-sm sm:rounded-t-md group-hover:brightness-110 cursor-pointer ${
                          incomeHeight > 0
                            ? "bg-gradient-to-t from-blue-700 via-blue-600 to-blue-500 shadow-2xs"
                            : "bg-slate-200/60"
                        }`}
                        style={{ height: `${Math.max(2, incomeHeight)}%` }}
                        title={`${item.month} Income: ${formatIDR(item.income)}`}
                      />

                      {/* Expense Bar (Amber / Orange) */}
                      <div
                        className={`w-1/2 rounded-t-sm sm:rounded-t-md group-hover:brightness-110 cursor-pointer ${
                          expenseHeight > 0
                            ? "bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 shadow-2xs"
                            : "bg-slate-200/60"
                        }`}
                        style={{ height: `${Math.max(2, expenseHeight)}%` }}
                        title={`${item.month} Expense: ${formatIDR(item.expenses)}`}
                      />
                    </div>

                    {/* Month Label */}
                    <span
                      className={`absolute -bottom-5 text-[9px] sm:text-[11px] font-black transition ${
                        isSelected ? "text-blue-700 underline font-black" : "text-slate-600"
                      }`}
                    >
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==========================================
            CARD 2: TRANSACTION HISTORY & REKAP PERIODE
            ========================================== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1">
              <span>Transaction History ({selectedPeriodObj.shortPeriod})</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              Rincian SPP &amp; Honor
            </span>
          </div>

          <div className="space-y-2">
            {/* Item 1: Payment received */}
            <div
              onClick={() => setShowPaymentReceivedModal(true)}
              className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-slate-100 shadow-2xs flex items-center justify-between gap-2.5 cursor-pointer transition active:scale-98"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100">
                  <CreditCard size={17} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    Payment received
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                    {activeMonthPaidInvoices.length} transaksi SPP lunas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-emerald-100">
                  +{formatIDR(activeMonthStudentIncome)}
                </span>
                <ChevronRight size={14} className="text-slate-400" />
              </div>
            </div>

            {/* Item 2: Coach payment */}
            <div
              onClick={() => setShowCoachPaymentModal(true)}
              className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-slate-50/80 border border-slate-100 shadow-2xs flex items-center justify-between gap-2.5 cursor-pointer transition active:scale-98"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 shrink-0 border border-cyan-100">
                  <Handshake size={17} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      Coach payment
                    </h4>
                    {activeMonthPendingCoachesCount > 0 && (
                      <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        {activeMonthPendingCoachesCount} Menunggu ACC
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                    {activeMonthApprovedCoachesCount > 0
                      ? `${activeMonthApprovedCoachesCount} pelatih telah di-ACC (masuk keuangan)`
                      : "Belum ada honor pelatih yang di-ACC"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-amber-100">
                  -{formatIDR(activeMonthCoachExpenses)}
                </span>
                <ChevronRight size={14} className="text-slate-400" />
              </div>
            </div>

            {/* Item 3 (If any): Manual Transactions recorded */}
            {manualTransactions.length > 0 && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-[11px] sm:text-xs font-black text-slate-700">
                  <span>Transaksi Manual ({manualTransactions.length})</span>
                  <span className="text-[9px] text-slate-400 font-normal">Database</span>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {manualTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{tx.title}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-400">
                          {tx.category} • {tx.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-xs font-black ${
                            tx.type === "income" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {formatIDR(tx.amount)}
                        </span>
                        {onDeleteFinancialTransaction && (
                          <button
                            onClick={() => onDeleteFinancialTransaction(tx.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Hapus Transaksi"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            PENDING CONFIRMATION ALERT (BUKTI TRANSFER BARU)
            ========================================== */}
        {pendingInvoices.length > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <h4 className="text-xs sm:text-sm font-black text-amber-950">
                  Perlu Konfirmasi ({pendingInvoices.length})
                </h4>
              </div>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Review
              </span>
            </div>

            <div className="space-y-1.5">
              {pendingInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-2.5 sm:p-3 rounded-xl bg-white border border-amber-100 shadow-2xs flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 capitalize truncate">{inv.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {inv.desc} • <span className="font-bold text-amber-900">{formatIDR(inv.amount)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                    {inv.uploadReceipt && (
                      <button
                        onClick={() => setSelectedReceiptInvoice(inv)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-0.5"
                        title="Lihat Bukti Transfer"
                      >
                        <Eye size={11} />
                        <span>Bukti</span>
                      </button>
                    )}
                    <button
                      onClick={() => onVerifyPayment(inv.id, true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition cursor-pointer shadow-xs flex items-center gap-0.5"
                    >
                      <Check size={11} />
                      <span>Terima</span>
                    </button>
                    <button
                      onClick={() => onVerifyPayment(inv.id, false)}
                      className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold transition cursor-pointer border border-rose-200 flex items-center gap-0.5"
                    >
                      <X size={11} />
                      <span>Tolak</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            CARD 3: STUDENT SPP PAYMENT STATUS
            ========================================== */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                Student SPP Status
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                {paidInvoices.length}/{invoices.length} Lunas
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl text-[10px] font-bold overflow-x-auto no-scrollbar">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  statusFilter === "ALL"
                    ? "bg-white text-blue-600 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Semua ({invoices.length})
              </button>
              <button
                onClick={() => setStatusFilter("PAID")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  statusFilter === "PAID"
                    ? "bg-white text-emerald-600 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Lunas ({paidInvoices.length})
              </button>
              <button
                onClick={() => setStatusFilter("PENDING")}
                className={`px-2 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  statusFilter === "PENDING"
                    ? "bg-white text-amber-600 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Pending ({unpaidInvoices.length})
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari nama siswa atau tagihan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-8 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-100 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-black text-[11px]">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-2.5">Tagihan</th>
                    <th className="py-2.5 px-2.5">Amount</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic text-xs">
                        Tidak ada data tagihan SPP.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isPaid = inv.status === "Lunas";
                      const isPending = inv.status === "Belum Dibayar";

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/60 transition group cursor-pointer"
                          onClick={() => {
                            if (inv.uploadReceipt) setSelectedReceiptInvoice(inv);
                          }}
                        >
                          {/* Name */}
                          <td className="py-2.5 px-3">
                            <p className="font-black text-slate-900 capitalize text-xs">{inv.name}</p>
                            <p className="text-[9px] text-slate-400 font-medium">
                              ID: {inv.studentId || inv.id}
                            </p>
                          </td>

                          {/* Tagihan / Desc */}
                          <td className="py-2.5 px-2.5 text-slate-500 font-medium text-xs whitespace-nowrap">
                            {inv.desc || "SPP Bulanan"}
                          </td>

                          {/* Amount */}
                          <td className="py-2.5 px-2.5 font-bold text-slate-800 text-xs whitespace-nowrap">
                            {formatIDR(inv.amount)}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : isPending
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : "bg-blue-50 text-blue-700 border border-blue-100 animate-pulse"
                              }`}
                            >
                              {isPaid ? "Paid" : isPending ? "Pending" : "Review"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* ==========================================
          MODAL: + CATAT TRANSAKSI (POSTGRESQL DB)
          ========================================== */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div
            onClick={() => setShowAddTransactionModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-3.5 my-auto max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Plus size={18} className="stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Catat Transaksi Keuangan
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Input Pemasukan atau Pengeluaran ke Database
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTransactionModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleAddTransactionSubmit} className="space-y-3">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Transaction Type Segmented Toggle */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  Jenis Transaksi
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType("income");
                      setTxCategory(incomeCategories[0]);
                    }}
                    className={`py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      txType === "income"
                        ? "bg-white text-blue-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <span>Income (Pemasukan)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxType("expense");
                      setTxCategory(expenseCategories[0]);
                    }}
                    className={`py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      txType === "expense"
                        ? "bg-white text-amber-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <span>Expense (Pengeluaran)</span>
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  Kategori
                </label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(txType === "income" ? incomeCategories : expenseCategories).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  Judul Transaksi
                </label>
                <input
                  type="text"
                  placeholder={
                    txType === "income"
                      ? "Contoh: Pendaftaran Siswa Baru"
                      : "Contoh: Sewa Jalur Kolam"
                  }
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Nominal */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Nominal (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      placeholder="500000"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full px-3 py-2 pl-8 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tambahan..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTransactionModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmittingTx ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: PAYMENT RECEIVED (DETAIL SPP MASUK)
          ========================================== */}
      {showPaymentReceivedModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div
            onClick={() => setShowPaymentReceivedModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <CreditCard size={17} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Payment Received (SPP)
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    {modalViewAllTime ? "Semua Periode" : selectedPeriodObj.fullLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentReceivedModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Toggle Periode Ini vs Semua */}
            <div className="flex items-center justify-between bg-slate-100 p-0.5 rounded-xl text-xs">
              <button
                onClick={() => setModalViewAllTime(false)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  !modalViewAllTime ? "bg-white text-blue-700 shadow-2xs font-black" : "text-slate-600"
                }`}
              >
                Periode {selectedPeriodObj.shortPeriod} ({activeMonthPaidInvoices.length})
              </button>
              <button
                onClick={() => setModalViewAllTime(true)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  modalViewAllTime ? "bg-white text-blue-700 shadow-2xs font-black" : "text-slate-600"
                }`}
              >
                Semua ({paidInvoices.length})
              </button>
            </div>

            {/* Total Display */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800">
                  Total Penerimaan SPP:
                </span>
                <p className="text-sm sm:text-base font-black text-emerald-950">
                  {formatIDR(
                    modalViewAllTime
                      ? paidInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0)
                      : activeMonthStudentIncome
                  )}
                </p>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                {(modalViewAllTime ? paidInvoices : activeMonthPaidInvoices).length} Transaksi
              </span>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {(modalViewAllTime ? paidInvoices : activeMonthPaidInvoices).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  Belum ada transaksi SPP lunas di periode ini.
                </p>
              ) : (
                (modalViewAllTime ? paidInvoices : activeMonthPaidInvoices).map((inv) => (
                  <div
                    key={inv.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 capitalize truncate">{inv.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {inv.desc || "SPP Bulanan"} {inv.date ? `• ${inv.date}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-emerald-600">
                        +{formatIDR(inv.amount)}
                      </p>
                      <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                        Lunas
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPaymentReceivedModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: COACH PAYMENT (PENGGAJIAN PELATIH)
          ========================================== */}
      {showCoachPaymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div
            onClick={() => setShowCoachPaymentModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                  <Handshake size={17} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Coach Payment
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Rekap Honor Pelatih ({selectedPeriodObj.shortPeriod})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCoachPaymentModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Total Coach Payment Display */}
            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-800">
                  Total Honor Disetujui ({selectedPeriodObj.shortPeriod}):
                </span>
                <p className="text-sm sm:text-base font-black text-amber-950">
                  {formatIDR(activeMonthCoachExpenses)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                  {activeMonthApprovedCoachesCount} Disetujui
                </span>
                {activeMonthPendingCoachesCount > 0 && (
                  <span className="block text-[9px] font-bold text-amber-700 mt-0.5">
                    {activeMonthPendingCoachesCount} Menunggu ACC
                  </span>
                )}
              </div>
            </div>

            {activeMonthPendingCoachesCount > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] sm:text-[11px] flex items-center justify-between gap-2">
                <span>
                  Sesi pelatih yang belum di-ACC admin <strong>tidak masuk</strong> ke perhitungan keuangan.
                </span>
                {setActiveTab && (
                  <button
                    onClick={() => {
                      setShowCoachPaymentModal(false);
                      setActiveTab("gaji_spp");
                    }}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[9px] whitespace-nowrap cursor-pointer transition shrink-0"
                  >
                    Buka Menu Gaji/SPP
                  </button>
                )}
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activeMonthCoachPayrolls.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-black text-slate-900 truncate">{c.name}</p>
                        {c.isApproved ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            Disetujui Admin
                          </span>
                        ) : c.sessionsCount > 0 ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            Menunggu ACC
                          </span>
                        ) : (
                          <span className="text-[8px] font-medium px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">
                            Belum Ada Sesi
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {c.spec} • <span className="font-bold text-blue-700">Rp {c.ratePerSession.toLocaleString("id-ID")}/sesi</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-black ${c.isApproved ? "text-amber-600" : "text-slate-400"}`}>
                        {c.isApproved ? `-${formatIDR(c.totalHonor)}` : "Rp 0"}
                      </p>
                      <span className="text-[8px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded">
                        {c.sessionsCount} Sesi
                      </span>
                    </div>
                  </div>

                  {/* Calculation Formula Pill */}
                  <div className={`p-1.5 rounded-lg border flex items-center justify-between text-[9px] font-bold ${
                    c.isApproved
                      ? "bg-blue-50/70 border-blue-100 text-blue-900"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}>
                    <span>
                      Formula: {c.sessionsCount} Sesi × Rp {c.ratePerSession.toLocaleString("id-ID")}
                      {!c.isApproved && c.sessionsCount > 0 && " (Belum di-ACC • Belum masuk keuangan)"}
                    </span>
                    <span className={`font-black ${c.isApproved ? "text-blue-700" : "text-slate-500"}`}>
                      {c.isApproved ? formatIDR(c.totalHonor) : `Rp 0 (Est: ${formatIDR(c.estimatedHonor)})`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowCoachPaymentModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: BUKTI TRANSFER & REVIEW
          ========================================== */}
      {selectedReceiptInvoice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div
            onClick={() => setSelectedReceiptInvoice(null)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Bukti Transfer SPP
                </h4>
                <p className="text-xs text-slate-500">{selectedReceiptInvoice.name}</p>
              </div>
              <button
                onClick={() => setSelectedReceiptInvoice(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-black text-slate-900">
                  {formatIDR(selectedReceiptInvoice.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Pengirim:</span>
                <span className="font-bold text-slate-800">{selectedReceiptInvoice.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">File:</span>
                <span className="font-mono text-cyan-700 truncate max-w-[180px]">
                  {selectedReceiptInvoice.uploadReceipt || "transfer_receipt.jpg"}
                </span>
              </div>
            </div>

            {selectedReceiptInvoice.status === "Menunggu Konfirmasi" && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    onVerifyPayment(selectedReceiptInvoice.id, true);
                    setSelectedReceiptInvoice(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-1"
                >
                  <Check size={13} />
                  <span>Terima</span>
                </button>
                <button
                  onClick={() => {
                    onVerifyPayment(selectedReceiptInvoice.id, false);
                    setSelectedReceiptInvoice(null);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition cursor-pointer border border-rose-200 flex items-center justify-center gap-1"
                >
                  <X size={13} />
                  <span>Tolak</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: PILIH PERIODE
          ========================================== */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div
            onClick={() => setShowPeriodModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-sm bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 my-auto">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                Pilih Periode Keuangan
              </h4>
              <p className="text-[10px] text-slate-400">
                Pilih bulan untuk melihat rekapitulasi arus kas
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {rollingMonths.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setSelectedMonthKey(m.key);
                    setShowPeriodModal(false);
                  }}
                  className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                    selectedMonthKey === m.key
                      ? "bg-blue-600 text-white shadow-2xs font-black"
                      : "bg-slate-50 hover:bg-cyan-50 text-slate-700 border border-slate-100"
                  }`}
                >
                  <span>{m.shortPeriod}</span>
                  {m.key === currentMonthKey && (
                    <span
                      className={`text-[8px] px-1 py-0.2 rounded ${
                        selectedMonthKey === m.key
                          ? "bg-white/20 text-white"
                          : "bg-emerald-100 text-emerald-800 font-bold"
                      }`}
                    >
                      Bulan Ini
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPeriodModal(false)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
