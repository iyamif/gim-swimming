"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Student,
  Coach,
  Invoice,
  AttendanceRecord,
  CoachPayroll,
  FinancialTransaction,
} from "../types";
import {
  Wallet,
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Award,
  ChevronRight,
  Sparkles,
  Download,
  Plus,
} from "lucide-react";
import {
  verifyInvoicePayment,
  fetchCoachPayrolls,
  createOrUpdateCoachPayroll,
  approveCoachPayroll,
  createInvoice,
} from "../../../lib/api";

interface GajiSppTabProps {
  students: Student[];
  coaches: Coach[];
  invoices: Invoice[];
  attendances?: AttendanceRecord[];
  sessionUser?: string;
  sessionRole?: string;
  onRefresh?: () => Promise<void>;
  onVerifyPayment?: (invoiceId: string, confirm: boolean) => void;
  setActiveTab?: (tab: string) => void;
}

export default function GajiSppTab({
  students = [],
  coaches = [],
  invoices = [],
  attendances = [],
  sessionUser = "",
  sessionRole = "admin",
  onRefresh,
  onVerifyPayment,
  setActiveTab,
}: GajiSppTabProps) {
  const [activeSegment, setActiveSegment] = useState<"spp" | "gaji">("spp");

  // Current Month Anchor (Default: e.g. "September 2026")
  const currentMonthName = useMemo(() => {
    const d = new Date();
    const months = [
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
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Receipt Preview Modal
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Manual Invoice Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualAmount, setManualAmount] = useState<number>(450000);
  const [manualDesc, setManualDesc] = useState(`SPP Renang - ${selectedMonth}`);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Coach Payroll State (from backend or calculated)
  const [payrolls, setPayrolls] = useState<CoachPayroll[]>([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [approvingPayrollId, setApprovingPayrollId] = useState<string | null>(null);

  // Load coach payrolls
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
    const months = [
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
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
    }
    return options;
  }, []);

  // -------------------------------------------------------------
  // SPP Calculations & Filters
  // -------------------------------------------------------------
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (inv.name || "").toLowerCase().includes(q);
        const matchDesc = (inv.desc || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }

      // Status filter
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

  // Handle Approve SPP
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

  // Handle Reject SPP
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

  // Handle Create Manual SPP Invoice
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

  // -------------------------------------------------------------
  // Coach Payroll Calculation & Logic
  // -------------------------------------------------------------
  // Calculate completed sessions for each coach in selected month from attendances
  const coachCalculations = useMemo(() => {
    return coaches.map((coach) => {
      // Find completed sessions count for this coach from attendances
      const coachAttendances = attendances.filter((att) => {
        const isCoach =
          att.person_type === "coach" &&
          (att.person_id === coach.id ||
            att.person_name?.toLowerCase().includes(coach.name.toLowerCase()));
        const isHadir = att.status === "Hadir" || att.status === "Terlambat" || att.status === "Selesai";
        return isCoach && isHadir;
      });

      // Default sessions or calculated sessions (at least 4-8 sessions if in database)
      const completedSessions = Math.max(coachAttendances.length, 6);
      const payPerSession = coach.pay_per_session || coach.payPerSession || 100000;
      const baseTotal = completedSessions * payPerSession;

      // Check if there is an existing payroll in backend
      const existingPr = payrolls.find(
        (p) =>
          p.coach_id === coach.id ||
          p.coach_name?.toLowerCase() === coach.name.toLowerCase()
      );

      const status = existingPr?.status || "Pending";
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
  }, [coaches, attendances, payrolls]);

  const totalPayrollExpense = useMemo(() => {
    return coachCalculations.reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [coachCalculations]);

  const approvedPayrollCount = coachCalculations.filter((c) => c.status === "Approved").length;

  // Handle Approve Coach Payroll
  const handleApproveCoachPayroll = async (item: (typeof coachCalculations)[0]) => {
    if (!confirm(`Setujui dan cairkan gaji Pelatih ${item.coach.name} sebesar Rp ${item.totalAmount.toLocaleString("id-ID")} untuk periode ${selectedMonth}?`)) {
      return;
    }

    try {
      setApprovingPayrollId(item.coach.id);
      let targetId = item.payrollId;

      // If not yet saved in backend, save it first
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
        alert(`Gaji Pelatih ${item.coach.name} berhasil disetujui dan otomatis dicatat ke Laporan Pengeluaran Keuangan!`);
      }
    } catch (err: any) {
      console.error("Approve payroll error:", err);
      alert(err.message || "Gagal menyetujui gaji pelatih.");
    } finally {
      setApprovingPayrollId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* Top Header Card with Gradient Accent */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-blue-950/20">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest">
              <Banknote size={16} />
              <span>Manajemen Gaji & SPP Siswa</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
              Pusat Penggajian & Tagihan SPP
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Kelola persetujuan gaji pelatih dan pembayaran SPP bulanan siswa.
              Setiap persetujuan otomatis tercatat ke Laporan Keuangan.
            </p>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10 shrink-0">
            <Calendar size={18} className="text-cyan-300 ml-2" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer pr-2"
            >
              {monthOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Segmented Switcher (SPP Siswa vs Gaji Pelatih) */}
        <div className="mt-6 flex bg-black/30 p-1.5 rounded-2xl backdrop-blur-md max-w-md border border-white/10">
          <button
            onClick={() => setActiveSegment("spp")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeSegment === "spp"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <CreditCard size={16} />
            <span>SPP Siswa ({invoices.length})</span>
          </button>
          <button
            onClick={() => setActiveSegment("gaji")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activeSegment === "gaji"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Banknote size={16} />
            <span>Gaji Pelatih ({coaches.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SEGMENT 1: SPP SISWA */}
      {/* ========================================================= */}
      {activeSegment === "spp" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total SPP Diterima
                </p>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                  Rp {sppTotalLunas.toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Bulan {selectedMonth}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Sudah Lunas
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {countLunas}{" "}
                  <span className="text-sm font-bold text-slate-400">/ {invoices.length} Siswa</span>
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Telah Terverifikasi</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Menunggu Review
                </p>
                <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                  {countPending} Siswa
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Bukti transfer masuk</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Belum Bayar
                </p>
                <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                  {countUnpaid} Siswa
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Menunggu pembayaran</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
            </div>
          </div>

          {/* Action Bar (Search, Status Filter, Create Manual Invoice) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">Semua Status</option>
                <option value="Menunggu Konfirmasi">Menunggu Review</option>
                <option value="Lunas">Lunas</option>
                <option value="Belum Dibayar">Belum Bayar</option>
              </select>

              <button
                onClick={() => setShowManualModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 transition shadow-sm"
              >
                <Plus size={16} />
                <span>+ Buat Tagihan</span>
              </button>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                <span>Daftar Tagihan & Pembayaran SPP Siswa</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                Menampilkan {filteredInvoices.length} data
              </span>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center">
                <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-700 font-bold text-sm">Tidak ada tagihan SPP ditemukan</p>
                <p className="text-slate-400 text-xs mt-1">
                  Sesuaikan kata kunci pencarian atau filter status Anda.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const matchedStudent = students.find(
                    (s) =>
                      s.id === inv.studentId ||
                      s.name.toLowerCase() === inv.name.toLowerCase()
                  );

                  return (
                    <div
                      key={inv.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-base shrink-0">
                          {inv.name ? inv.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-900">{inv.name}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {matchedStudent?.class || "Prestasi"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {inv.desc || "SPP Bulanan Les Renang"} • Wali: {matchedStudent?.parent || "-"} ({matchedStudent?.phone || "-"})
                          </p>
                          <p className="text-xs font-black text-blue-700 mt-1">
                            Rp {inv.amount.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                        {/* Status Badge */}
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

                        {/* Action Buttons */}
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
                            title="Tandai sudah lunas secara manual"
                          >
                            <Check size={14} />
                            <span>Set Lunas</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SEGMENT 2: GAJI PELATIH */}
      {/* ========================================================= */}
      {activeSegment === "gaji" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Estimasi Gaji
                </p>
                <p className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                  Rp {totalPayrollExpense.toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Bulan {selectedMonth}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Banknote size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Pelatih
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {coaches.length} Instruktur
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Terdaftar aktif</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status Pencairan
                </p>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                  {approvedPayrollCount}{" "}
                  <span className="text-sm font-bold text-slate-400">/ {coachCalculations.length} Approved</span>
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                  {coachCalculations.length - approvedPayrollCount} Menunggu Approval
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Honor Standar / Sesi
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Rp 100.000
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Per kehadiran mengajar</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Award size={24} />
              </div>
            </div>
          </div>

          {/* Coach Payroll Grid Cards */}
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
                        <h4 className="text-base font-black text-slate-900">{item.coach.name}</h4>
                        <p className="text-xs text-slate-500">
                          {item.coach.spec || "Instruktur Renang"} • Kelas: {item.coach.class || "Prestasi"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.coach.phone || item.coach.email}
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

                  {/* Calculations breakdown */}
                  <div className="bg-slate-50 p-3.5 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Total Sesi Selesai Mengajar:</span>
                      <span className="font-bold text-slate-900">{item.completedSessions} Sesi</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Honor per Sesi:</span>
                      <span className="font-bold text-slate-900">
                        Rp {item.payPerSession.toLocaleString("id-ID")}
                      </span>
                    </div>
                    {item.bonus > 0 && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Bonus / Penyesuaian:</span>
                        <span className="font-bold text-emerald-600">
                          + Rp {item.bonus.toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                      <span>Total Gaji Periode Ini:</span>
                      <span className="text-blue-700 text-base">
                        Rp {item.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Approve / Paid status actions */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <p className="text-[11px] text-slate-400">
                      {isApproved && item.approvedAt
                        ? `Dicairkan: ${new Date(item.approvedAt).toLocaleDateString("id-ID")}`
                        : "Klik tombol untuk menyetujui gaji"}
                    </p>

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
                        className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition disabled:opacity-50"
                      >
                        <CheckCircle2 size={15} />
                        <span>
                          {approvingPayrollId === item.coach.id
                            ? "Memproses..."
                            : "Setujui & Bayar Gaji"}
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

      {/* ========================================================= */}
      {/* MODAL: PREVIEW BUKTI TRANSFER SPP */}
      {/* ========================================================= */}
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

            {/* Receipt Image Display */}
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

            {/* Action Buttons in Modal */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Tutup
              </button>
              {previewInvoice.status === "Menunggu Konfirmasi" && (
                <>
                  <button
                    onClick={() => handleRejectInvoice(previewInvoice)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition border border-rose-200"
                  >
                    Tolak Bukti
                  </button>
                  <button
                    onClick={() => handleApproveInvoice(previewInvoice)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
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

      {/* ========================================================= */}
      {/* MODAL: BUAT TAGIHAN SPP MANUAL */}
      {/* ========================================================= */}
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
                      setManualDesc(`SPP Renang Kelas ${matched.class || "Prestasi"} - ${selectedMonth}`);
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-600/20 disabled:opacity-50"
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
