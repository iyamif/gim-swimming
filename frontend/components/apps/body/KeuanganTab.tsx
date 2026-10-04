import React, { useState, useMemo } from "react";
import {
  Invoice,
  Student,
  Coach,
  AttendanceRecord,
  ScheduleSession,
  FinancialTransaction,
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
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  FileCheck2,
  Sparkles,
} from "lucide-react";

interface KeuanganTabProps {
  invoices: Invoice[];
  sessionRole: string;
  students?: Student[];
  coaches?: Coach[];
  schedules?: ScheduleSession[];
  attendances?: AttendanceRecord[];
  financialTransactions?: FinancialTransaction[];
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

  // Invoices categorization
  const pendingInvoices = invoices.filter((i) => i.status === "Menunggu Konfirmasi");
  const paidInvoices = invoices.filter((i) => i.status === "Lunas");
  const unpaidInvoices = invoices.filter((i) => i.status === "Belum Dibayar");

  // Filter financial transactions to exclude duplicate auto-recorded SPP invoices
  const manualTransactions = useMemo(() => {
    return financialTransactions.filter((t) => {
      const isAutoSpp =
        t.category === "SPP Siswa" ||
        (t.notes && t.notes.toLowerCase().includes("auto-recorded dari approval spp"));
      return !isAutoSpp;
    });
  }, [financialTransactions]);

  // Dynamic Coach Payments calculation for any specified month key
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

      const sessionsCount = Math.max(
        completedSchedules.length,
        verifiedCoachAttendances.length,
        coachSchedules.length > 0 ? coachSchedules.length : 0
      );

      const ratePerSession = c.pay_per_session || c.payPerSession || 100000;
      const totalHonor = sessionsCount * ratePerSession;

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
        totalHonor,
        status: "Sudah Ditransfer" as const,
        recentAttendances: verifiedCoachAttendances.slice(0, 5),
      };
    });
  };

  // Selected Month Breakdown Calculations
  const activeMonthCoachPayrolls = useMemo(() => {
    return calculateCoachPayrollForMonth(selectedMonthKey);
  }, [selectedMonthKey, coaches, schedules, attendances, now]);

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

  // Current Month (Bulan Berjalan) Totals for Quick Compare
  const currentMonthPaidInvoices = useMemo(() => {
    return paidInvoices.filter((inv) => getInvoiceMonthKey(inv) === currentMonthKey);
  }, [paidInvoices, currentMonthKey]);

  const currentMonthStudentIncome = useMemo(() => {
    return currentMonthPaidInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [currentMonthPaidInvoices]);

  const currentMonthManualIncome = useMemo(() => {
    return manualTransactions
      .filter((t) => t.type === "income" && getMonthKeyFromDate(t.date) === currentMonthKey)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [manualTransactions, currentMonthKey]);

  const currentMonthCoachPayrolls = useMemo(() => {
    return calculateCoachPayrollForMonth(currentMonthKey);
  }, [currentMonthKey, coaches, schedules, attendances, now]);

  const currentMonthCoachExpense = useMemo(() => {
    return currentMonthCoachPayrolls.reduce((acc, curr) => acc + curr.totalHonor, 0);
  }, [currentMonthCoachPayrolls]);

  const currentMonthManualExpense = useMemo(() => {
    return manualTransactions
      .filter((t) => t.type === "expense" && getMonthKeyFromDate(t.date) === currentMonthKey)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [manualTransactions, currentMonthKey]);

  const currentMonthTotalIncome = currentMonthStudentIncome + currentMonthManualIncome;
  const currentMonthTotalExpense = currentMonthCoachExpense + currentMonthManualExpense;
  const currentMonthNetProfit = currentMonthTotalIncome - currentMonthTotalExpense;

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
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.desc.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "PAID") return inv.status === "Lunas";
    if (statusFilter === "PENDING") return inv.status === "Belum Dibayar";
    if (statusFilter === "CONFIRM") return inv.status === "Menunggu Konfirmasi";
    return true;
  });

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

  return (
    <div className="space-y-4 pb-28 bg-[#f8fafc] min-h-full font-sans">
      {/* ==========================================
          1. TOP VIBRANT BLUE HEADER (FULL WIDTH)
          ========================================== */}
      <div className="relative w-full bg-[#1d4ed8] text-white pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))] sm:pt-6 pb-12 sm:pb-14 px-5 sm:px-8 shadow-xl shadow-blue-700/15 overflow-hidden rounded-none">
        {/* Subtle Concentric Decorative Rings */}
        <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute -top-4 -right-4 h-44 w-44 rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute top-2 right-2 h-28 w-28 rounded-full border border-white/25 pointer-events-none" />

        {/* Ambient Depth Glow */}
        <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 flex items-center justify-between">
          {/* Title: Keuangan & Subtitle */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Keuangan</span>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-cyan-100 border border-white/20">
                Admin
              </span>
            </h2>
            <p className="text-xs text-cyan-100 font-medium mt-1">
              Financial Overview, Arus Kas &amp; Rekapitulasi SPP Bulan Berjalan
            </p>
          </div>

          {/* Action Buttons: Periode & + Catat Transaksi */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 backdrop-blur-xs transition cursor-pointer shadow-xs active:scale-95"
              title="Ganti Periode Bulan"
            >
              <CalendarDays size={14} />
              <span>{selectedPeriodObj.shortPeriod}</span>
            </button>

            <button
              onClick={() => setShowAddTransactionModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white text-blue-700 hover:bg-cyan-50 text-xs font-black transition cursor-pointer shadow-md active:scale-95"
              title="Catat Pemasukan atau Pengeluaran Lainnya"
            >
              <Plus size={15} className="stroke-[3]" />
              <span className="hidden sm:inline">Catat Transaksi</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          MAIN CONTAINER (FLOATING CARDS)
          ========================================== */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4 -mt-8 sm:-mt-10 relative z-20">
        {/* ==========================================
            SECTION 0: HIGHLIGHT RINGKASAN KEUANGAN BULAN BERJALAN (ADMIN SUMMARY)
            ========================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <Wallet size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Ringkasan Keuangan {selectedPeriodObj.fullLabel}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {selectedMonthKey === currentMonthKey ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Periode Bulan Berjalan (Aktif)
                    </span>
                  ) : (
                    <span>Arsip Periode {selectedPeriodObj.shortPeriod}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Switcher to Current Month if viewing past archive */}
            {selectedMonthKey !== currentMonthKey && (
              <button
                onClick={() => setSelectedMonthKey(currentMonthKey)}
                className="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black transition cursor-pointer border border-blue-100 flex items-center gap-1"
              >
                <Sparkles size={12} />
                <span>Kembali ke Bulan Berjalan</span>
              </button>
            )}
          </div>

          {/* 3 Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. TOTAL PEMASUKAN */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-100/90 space-y-2 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                  Total Pemasukan
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700">
                  <ArrowUpRight size={15} className="stroke-[2.5]" />
                </div>
              </div>

              <div>
                <p className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight">
                  {formatIDR(activeMonthTotalIncome)}
                </p>
                <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  +{activeMonthPaidInvoices.length} SPP Lunas
                </p>
              </div>

              <div className="pt-2 border-t border-emerald-100/70 text-[10px] space-y-0.5 text-emerald-900/80 font-medium">
                <div className="flex justify-between">
                  <span>SPP Siswa:</span>
                  <span className="font-bold">{formatIDR(activeMonthStudentIncome)}</span>
                </div>
                {activeMonthManualIncome > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Lainnya:</span>
                    <span>+{formatIDR(activeMonthManualIncome)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. TOTAL PENGELUARAN */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/40 border border-amber-100/90 space-y-2 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider">
                  Total Pengeluaran
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700">
                  <ArrowDownRight size={15} className="stroke-[2.5]" />
                </div>
              </div>

              <div>
                <p className="text-lg sm:text-xl font-black text-amber-950 tracking-tight">
                  {formatIDR(activeMonthTotalExpense)}
                </p>
                <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                  Honor {coaches.length} Pelatih &amp; Ops
                </p>
              </div>

              <div className="pt-2 border-t border-amber-100/70 text-[10px] space-y-0.5 text-amber-900/80 font-medium">
                <div className="flex justify-between">
                  <span>Honor Pelatih:</span>
                  <span className="font-bold">{formatIDR(activeMonthCoachExpenses)}</span>
                </div>
                {activeMonthManualExpense > 0 && (
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Operasional:</span>
                    <span>+{formatIDR(activeMonthManualExpense)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. SURPLUS / SISA SALDO */}
            <div
              className={`p-4 rounded-2xl border space-y-2 relative overflow-hidden ${
                activeMonthNetProfit >= 0
                  ? "bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border-blue-100/90"
                  : "bg-gradient-to-br from-rose-50/80 to-orange-50/40 border-rose-100/90"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    activeMonthNetProfit >= 0 ? "text-blue-800" : "text-rose-800"
                  }`}
                >
                  Sisa Saldo / Margin
                </span>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-xl ${
                    activeMonthNetProfit >= 0
                      ? "bg-blue-100/80 text-blue-700"
                      : "bg-rose-100/80 text-rose-700"
                  }`}
                >
                  {activeMonthNetProfit >= 0 ? (
                    <TrendingUp size={15} className="stroke-[2.5]" />
                  ) : (
                    <TrendingDown size={15} className="stroke-[2.5]" />
                  )}
                </div>
              </div>

              <div>
                <p
                  className={`text-lg sm:text-xl font-black tracking-tight ${
                    activeMonthNetProfit >= 0 ? "text-blue-950" : "text-rose-950"
                  }`}
                >
                  {activeMonthNetProfit >= 0 ? "+" : ""}
                  {formatIDR(activeMonthNetProfit)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black ${
                      activeMonthNetProfit >= 0
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200/60"
                        : "bg-rose-100 text-rose-800 border border-rose-200/60"
                    }`}
                  >
                    {activeMonthNetProfit >= 0 ? "Surplus Kas" : "Defisit Kas"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    Margin {activeMonthProfitMargin}%
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/50 text-[10px] flex justify-between text-slate-600 font-medium">
                <span>Rasio Bersih:</span>
                <span className="font-black text-slate-800">
                  {activeMonthTotalIncome > 0
                    ? `${Math.round(
                        (activeMonthNetProfit / activeMonthTotalIncome) * 100
                      )}% dari Income`
                    : "0%"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            CARD 1: FINANCIAL OVERVIEW & 6-MONTH CHART
            ========================================== */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 space-y-5 animate-fadeIn">
          {/* Top Title & Period Selector */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Financial Overview (6 Bulan Terakhir)
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Perbandingan Arus Kas Bulanan: Income vs Expenses
              </p>
            </div>

            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 border border-slate-200/80 transition cursor-pointer shadow-2xs"
              title="Pilih Periode Keuangan"
            >
              <CalendarDays size={16} />
            </button>
          </div>

          {/* Income & Expenses Subheader + Legend */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-t border-slate-100 pt-3">
            <h4 className="text-xs sm:text-sm font-black text-slate-900">
              Grafik Arus Kas Bulanan
            </h4>

            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-blue-600 shadow-2xs" />
                <span className="text-slate-700">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-amber-500 shadow-2xs" />
                <span className="text-slate-700">Expenses</span>
              </div>
            </div>
          </div>

          {/* Vertical Bar Chart Container (Dynamic 6 Months Rolling) */}
          <div className="pt-2">
            <div className="relative h-56 sm:h-64 flex items-end justify-between gap-1.5 sm:gap-3 pb-8 pt-6 px-2 sm:px-4 bg-slate-50/70 rounded-2xl border border-slate-100">
              {/* Background Grid Lines & Y-Axis Labels */}
              <div className="absolute inset-x-2 sm:inset-x-4 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-b border-slate-300 border-dashed w-full relative">
                  <span className="absolute -top-3.5 -left-1 text-[9px] font-bold text-slate-400">
                    {formatShortK(maxChartValue)}
                  </span>
                </div>
                <div className="border-b border-slate-300 border-dashed w-full relative">
                  <span className="absolute -top-3.5 -left-1 text-[9px] font-bold text-slate-400">
                    {formatShortK(maxChartValue * 0.75)}
                  </span>
                </div>
                <div className="border-b border-slate-300 border-dashed w-full relative">
                  <span className="absolute -top-3.5 -left-1 text-[9px] font-bold text-slate-400">
                    {formatShortK(maxChartValue * 0.5)}
                  </span>
                </div>
                <div className="border-b border-slate-300 border-dashed w-full relative">
                  <span className="absolute -top-3.5 -left-1 text-[9px] font-bold text-slate-400">
                    {formatShortK(maxChartValue * 0.25)}
                  </span>
                </div>
                <div className="border-b border-slate-300 w-full relative">
                  <span className="absolute -top-3.5 -left-1 text-[9px] font-bold text-slate-400">
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
                    className={`flex-1 flex flex-col items-center justify-end h-full relative group z-10 cursor-pointer p-1 rounded-xl transition ${
                      isSelected ? "bg-blue-100/30 ring-2 ring-blue-500/30" : "hover:bg-slate-100/50"
                    }`}
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-16 bg-slate-900 text-white text-[9px] py-2 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap shadow-xl z-30 space-y-0.5">
                      <p className="font-black text-white">
                        {item.month} ({item.fullPeriod}) {item.isCurrent ? "• Bulan Ini" : ""}:
                      </p>
                      <p className="text-cyan-300 font-bold">
                        Income: {formatIDR(item.income)} (SPP: {formatIDR(item.studentIncome)})
                      </p>
                      <p className="text-amber-300 font-bold">
                        Expense: {formatIDR(item.expenses)} (Gaji: {formatIDR(item.coachExpense)})
                      </p>
                      <p
                        className={`font-black pt-0.5 border-t border-slate-700 ${
                          item.income >= item.expenses ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        Net: {item.income >= item.expenses ? "+" : ""}
                        {formatIDR(item.income - item.expenses)}
                      </p>
                    </div>

                    {/* Dual Bars Wrapper with h-full */}
                    <div className="flex items-end justify-center gap-1 sm:gap-2 w-full max-w-[40px] h-full pb-0.5">
                      {/* Income Bar (Blue) */}
                      <div
                        className={`w-1/2 rounded-t-md transition-all duration-500 group-hover:brightness-110 cursor-pointer ${
                          incomeHeight > 0
                            ? "bg-gradient-to-t from-blue-700 via-blue-600 to-blue-500 shadow-xs"
                            : "bg-slate-200/60"
                        }`}
                        style={{ height: `${Math.max(2, incomeHeight)}%` }}
                        title={`${item.month} Income: ${formatIDR(item.income)}`}
                      />

                      {/* Expense Bar (Amber / Orange) */}
                      <div
                        className={`w-1/2 rounded-t-md transition-all duration-500 group-hover:brightness-110 cursor-pointer ${
                          expenseHeight > 0
                            ? "bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 shadow-xs"
                            : "bg-slate-200/60"
                        }`}
                        style={{ height: `${Math.max(2, expenseHeight)}%` }}
                        title={`${item.month} Expense: ${formatIDR(item.expenses)}`}
                      />
                    </div>

                    {/* Month Label */}
                    <span
                      className={`absolute -bottom-6 text-[10px] sm:text-xs font-black transition ${
                        isSelected ? "text-blue-700 underline" : "text-slate-600"
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
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>Transaction History &amp; Penggajian ({selectedPeriodObj.shortPeriod})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">
              Klik untuk rincian transaksi
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Item 1: Payment received */}
            <div
              onClick={() => setShowPaymentReceivedModal(true)}
              className="p-4 sm:p-4.5 rounded-3xl bg-white hover:bg-slate-50/80 border border-slate-100 shadow-sm flex items-center justify-between gap-3 cursor-pointer transition active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100 shadow-2xs">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>Payment received</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      ({selectedPeriodObj.shortPeriod})
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeMonthPaidInvoices.length} transaksi SPP lunas periode ini
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                  +{formatIDR(activeMonthStudentIncome)}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>

            {/* Item 2: Coach payment */}
            <div
              onClick={() => setShowCoachPaymentModal(true)}
              className="p-4 sm:p-4.5 rounded-3xl bg-white hover:bg-slate-50/80 border border-slate-100 shadow-sm flex items-center justify-between gap-3 cursor-pointer transition active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 shrink-0 border border-cyan-100 shadow-2xs">
                  <Handshake size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>Coach payment</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      ({selectedPeriodObj.shortPeriod})
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Honor &amp; insentif {coaches.length || activeMonthCoachPayrolls.length} pelatih renang
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100">
                  -{formatIDR(activeMonthCoachExpenses)}
                </span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>

            {/* Item 3 (If any): Manual Transactions recorded */}
            {manualTransactions.length > 0 && (
              <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between text-xs font-black text-slate-700">
                  <span>Transaksi Manual Tercatat ({manualTransactions.length})</span>
                  <span className="text-[10px] text-slate-400 font-medium">PostgreSQL Database</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {manualTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-900">{tx.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {tx.category} • {tx.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
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
            PENDING CONFIRMATION ALERT (JIKA ADA BUKTI TRANSFER BARU)
            ========================================== */}
        {pendingInvoices.length > 0 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <h4 className="text-xs sm:text-sm font-black text-amber-950">
                  Perlu Konfirmasi Pembayaran ({pendingInvoices.length})
                </h4>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Menunggu Review
              </span>
            </div>

            <div className="space-y-2">
              {pendingInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white border border-amber-100 shadow-2xs flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
                >
                  <div>
                    <p className="text-xs font-black text-slate-900">{inv.name}</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {inv.desc} • <span className="font-bold text-amber-900">{formatIDR(inv.amount)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                    {inv.uploadReceipt && (
                      <button
                        onClick={() => setSelectedReceiptInvoice(inv)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        title="Lihat Bukti Transfer"
                      >
                        <Eye size={12} />
                        <span>Bukti</span>
                      </button>
                    )}
                    <button
                      onClick={() => onVerifyPayment(inv.id, true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <Check size={12} />
                      <span>Terima</span>
                    </button>
                    <button
                      onClick={() => onVerifyPayment(inv.id, false)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer border border-rose-200 flex items-center gap-1"
                    >
                      <X size={12} />
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
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Student SPP Payment Status
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Daftar &amp; Status Tagihan SPP Siswa ({paidInvoices.length}/{invoices.length} Lunas)
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-[10px] font-bold">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white text-blue-600 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Semua ({invoices.length})
              </button>
              <button
                onClick={() => setStatusFilter("PAID")}
                className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                  statusFilter === "PAID"
                    ? "bg-white text-emerald-600 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Lunas ({paidInvoices.length})
              </button>
              <button
                onClick={() => setStatusFilter("PENDING")}
                className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
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
              className="w-full px-3.5 py-2.5 pl-9 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-black">
                    <th className="py-3 px-3.5">Name</th>
                    <th className="py-3 px-3">Tagihan</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        Tidak ada data tagihan SPP yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isPaid = inv.status === "Lunas";
                      const isPending = inv.status === "Belum Dibayar";
                      const isConfirm = inv.status === "Menunggu Konfirmasi";

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/60 transition group cursor-pointer"
                          onClick={() => {
                            if (inv.uploadReceipt) setSelectedReceiptInvoice(inv);
                          }}
                        >
                          {/* Name */}
                          <td className="py-3.5 px-3.5">
                            <p className="font-black text-slate-900 capitalize">{inv.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              ID: {inv.studentId || inv.id}
                            </p>
                          </td>

                          {/* Tagihan / Desc */}
                          <td className="py-3.5 px-3 text-slate-500 font-medium whitespace-nowrap">
                            {inv.desc || "SPP Bulanan Renang"}
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {formatIDR(inv.amount)}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black ${
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
      </div>

      {/* ==========================================
          MODAL: + CATAT TRANSAKSI (POSTGRESQL DB)
          ========================================== */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setShowAddTransactionModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Plus size={20} className="stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Catat Transaksi Keuangan
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Input Pemasukan atau Pengeluaran ke Database
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTransactionModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Transaction Type Segmented Toggle */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Jenis Transaksi
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType("income");
                      setTxCategory(incomeCategories[0]);
                    }}
                    className={`py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
                    className={`py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Kategori
                </label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Judul Transaksi
                </label>
                <input
                  type="text"
                  placeholder={
                    txType === "income"
                      ? "Contoh: Pendaftaran Siswa Baru, Penjualan Kacamata"
                      : "Contoh: Sewa 3 Jalur Kolam, Beli Pelampung"
                  }
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nominal */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Nominal (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      placeholder="500000"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 pl-9 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tambahan transaksi..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTransactionModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSubmittingTx ? "Menyimpan..." : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: PAYMENT RECEIVED (DETAIL PEMBAYARAN MASUK)
          ========================================== */}
      {showPaymentReceivedModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setShowPaymentReceivedModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Payment Received
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {modalViewAllTime ? (
                      <span>Semua Periode ({paidInvoices.length} Transaksi)</span>
                    ) : (
                      <span>Periode: {selectedPeriodObj.fullLabel}</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentReceivedModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Switch between Periode Ini and Semua */}
            <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setModalViewAllTime(false)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  !modalViewAllTime ? "bg-white text-blue-700 shadow-2xs font-black" : "text-slate-600"
                }`}
              >
                Periode {selectedPeriodObj.shortPeriod} ({activeMonthPaidInvoices.length})
              </button>
              <button
                onClick={() => setModalViewAllTime(true)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  modalViewAllTime ? "bg-white text-blue-700 shadow-2xs font-black" : "text-slate-600"
                }`}
              >
                Semua Periode ({paidInvoices.length})
              </button>
            </div>

            {/* Total Display */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800">
                  Total Penerimaan SPP:
                </span>
                <p className="text-base font-black text-emerald-950">
                  {formatIDR(
                    modalViewAllTime
                      ? paidInvoices.reduce((acc, curr) => acc + (curr.amount || 0), 0)
                      : activeMonthStudentIncome
                  )}
                </p>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800">
                {(modalViewAllTime ? paidInvoices : activeMonthPaidInvoices).length} Transaksi Lunas
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(modalViewAllTime ? paidInvoices : activeMonthPaidInvoices).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  Belum ada transaksi pembayaran SPP yang tercatat lunas di periode ini.
                </p>
              ) : (
                (modalViewAllTime ? paidInvoices : activeMonthPaidInvoices).map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-900 capitalize">{inv.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {inv.desc || "SPP Bulanan"} {inv.date ? `• ${inv.date}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-600">
                        +{formatIDR(inv.amount)}
                      </p>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
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
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setShowCoachPaymentModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100">
                  <Handshake size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Coach Payment
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Rekap Honor Pelatih Periode {selectedPeriodObj.fullLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCoachPaymentModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Total Coach Payment Display */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-800">
                  Total Honor Pelatih ({selectedPeriodObj.shortPeriod}):
                </span>
                <p className="text-base font-black text-amber-950">
                  {formatIDR(activeMonthCoachExpenses)}
                </p>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800">
                {coaches.length} Pelatih Aktif
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {activeMonthCoachPayrolls.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-900">{c.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {c.spec} •{" "}
                        <span className="font-bold text-blue-700">
                          Rp {c.ratePerSession.toLocaleString("id-ID")}/sesi
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-amber-600">
                        -{formatIDR(c.totalHonor)}
                      </p>
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                        {selectedPeriodObj.shortPeriod}
                      </span>
                    </div>
                  </div>

                  {/* Calculation Formula Pill */}
                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-[10px] font-bold text-blue-900">
                    <span>
                      Formula Gaji: {c.sessionsCount} Sesi × Rp {c.ratePerSession.toLocaleString("id-ID")}
                    </span>
                    <span className="font-black text-blue-700">{formatIDR(c.totalHonor)}</span>
                  </div>

                  {/* Attendance Verification Benchmark Badge */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-600 font-semibold">
                        Basis:{" "}
                        <span className="font-bold text-slate-900">
                          {c.verifiedCount > 0
                            ? `${c.verifiedCount} Sesi Tervalidasi`
                            : `${c.sessionsCount} Sesi Selesai`}
                        </span>
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 flex items-center gap-1">
                      <MapPin size={10} />
                      <span>GPS Radius ≤ 2km</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowCoachPaymentModal(false)}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setSelectedReceiptInvoice(null)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Bukti Transfer SPP
                </h4>
                <p className="text-xs text-slate-500">{selectedReceiptInvoice.name}</p>
              </div>
              <button
                onClick={() => setSelectedReceiptInvoice(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-sm transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Nominal Transfer:</span>
                <span className="font-black text-slate-900">
                  {formatIDR(selectedReceiptInvoice.amount)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Nama Pengirim:</span>
                <span className="font-bold text-slate-800">{selectedReceiptInvoice.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">File Bukti:</span>
                <span className="font-mono text-cyan-700">
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
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Terima Pembayaran</span>
                </button>
                <button
                  onClick={() => {
                    onVerifyPayment(selectedReceiptInvoice.id, false);
                    setSelectedReceiptInvoice(null);
                  }}
                  className="px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition cursor-pointer border border-rose-200 flex items-center justify-center gap-1.5"
                >
                  <X size={14} />
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div
            onClick={() => setShowPeriodModal(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-sm bg-white border border-slate-100 rounded-3xl p-5 shadow-2xl space-y-4 my-auto">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-sm font-black text-slate-900">
                Pilih Periode Keuangan
              </h4>
              <p className="text-[11px] text-slate-400">
                Lihat arus kas dan rekapitulasi berdasarkan bulan
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {rollingMonths.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setSelectedMonthKey(m.key);
                    setShowPeriodModal(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                    selectedMonthKey === m.key
                      ? "bg-blue-600 text-white shadow-xs font-black"
                      : "bg-slate-50 hover:bg-cyan-50 text-slate-700 border border-slate-100"
                  }`}
                >
                  <span>{m.shortPeriod}</span>
                  {m.key === currentMonthKey && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md ${
                        selectedMonthKey === m.key
                          ? "bg-white/20 text-white"
                          : "bg-emerald-100 text-emerald-800"
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
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
